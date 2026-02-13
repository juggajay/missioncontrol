import { Router, type Router as RouterType } from 'express';
import { v4 as uuid } from 'uuid';
import { listTasks, getTask, createTask, updateTask, deleteTask, insertActivity, saveDatabase } from '../db/index.js';
import type { GatewayClient } from '../gateway/client.js';
import type { WSServerMessage } from '@mission-control/shared';
import { log } from '../lib/logger.js';

export function createTaskRouter(
  gatewayClient: GatewayClient,
  broadcast: (msg: WSServerMessage) => void,
): RouterType {
  const router = Router();

  // List tasks
  router.get('/', (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const agent = req.query.agent as string | undefined;
      const tasks = listTasks({ status, agent });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Create task
  router.post('/', (req, res) => {
    try {
      const { title, description, priority } = req.body;
      if (!title) {
        res.status(400).json({ error: 'title is required' });
        return;
      }
      const task = createTask({ title, description, priority });
      broadcast({ type: 'task-update', payload: task });
      res.status(201).json(task);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get task by ID
  router.get('/:id', (req, res) => {
    try {
      const task = getTask(req.params.id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.json(task);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Update task
  router.patch('/:id', (req, res) => {
    try {
      const task = updateTask(req.params.id, req.body);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      broadcast({ type: 'task-update', payload: task });
      res.json(task);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Delete task
  router.delete('/:id', (req, res) => {
    try {
      const deleted = deleteTask(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Assign agent to task
  router.post('/:id/assign', (req, res) => {
    try {
      const { agentId, sessionKey } = req.body;
      if (!agentId || !sessionKey) {
        res.status(400).json({ error: 'agentId and sessionKey are required' });
        return;
      }

      const task = updateTask(req.params.id, {
        assigned_agent_id: agentId,
        assigned_session_key: sessionKey,
        status: 'assigned',
      });
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      broadcast({ type: 'task-update', payload: task });
      res.json(task);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Dispatch task to agent
  router.post('/:id/dispatch', async (req, res) => {
    try {
      const existing = getTask(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      if (!existing.assigned_agent_id || !existing.assigned_session_key) {
        res.status(400).json({ error: 'Task must be assigned to an agent before dispatch' });
        return;
      }

      const idempotencyKey = uuid();

      // Build dispatch message
      const priorityLabel = existing.priority === 'urgent' ? 'URGENT' : existing.priority.toUpperCase();
      const dispatchMessage = [
        `## Task: ${existing.title}`,
        `**Priority:** ${priorityLabel}`,
        existing.description ? `\n${existing.description}` : '',
        `\nPlease complete this task and report back when finished.`,
      ].filter(Boolean).join('\n');

      // Send via gateway
      const result = await gatewayClient.call<{ runId: string; status: string }>(
        'chat.send',
        {
          sessionKey: existing.assigned_session_key,
          message: dispatchMessage,
          idempotencyKey,
        },
      );

      // Update task
      const updated = updateTask(req.params.id, {
        status: 'in_progress',
        dispatch_idempotency_key: idempotencyKey,
      });
      insertActivity(req.params.id, 'dispatched', `Dispatched to agent (runId: ${result.runId})`);
      saveDatabase();

      if (updated) {
        broadcast({ type: 'task-update', payload: updated });
      }

      log.success('tasks', `Task "${existing.title}" dispatched → ${existing.assigned_session_key}`);
      res.json({ ok: true, runId: result.runId });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  return router;
}
