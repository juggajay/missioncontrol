import { Router, type Router as RouterType } from 'express';
import type { GatewayClient } from '../gateway/client.js';
import { createGatewayMethods } from '../gateway/methods.js';

export function createApiRouter(gatewayClient: GatewayClient): RouterType {
  const router = Router();
  const gw = createGatewayMethods(gatewayClient);

  // Gateway status
  router.get('/gateway/status', (_req, res) => {
    res.json({
      connected: gatewayClient.connected,
      authenticated: gatewayClient.authenticated,
      features: gatewayClient.features,
    });
  });

  // Sessions
  router.get('/sessions', async (_req, res) => {
    try {
      const sessions = await gw.sessionsList();
      res.json(sessions);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // Session operations use POST with sessionKey in body (keys contain colons)
  router.post('/sessions/patch', async (req, res) => {
    try {
      const { sessionKey, ...rest } = req.body;
      await gw.sessionsPatch({ sessionKey, ...rest });
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.post('/sessions/reset', async (req, res) => {
    try {
      const { sessionKey } = req.body;
      await gw.sessionsReset(sessionKey);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.post('/sessions/send', async (req, res) => {
    try {
      const { sessionKey, text, idempotencyKey } = req.body;
      const result = await gw.chatSend(sessionKey, text, idempotencyKey);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.post('/sessions/abort', async (req, res) => {
    try {
      const { sessionKey } = req.body;
      await gw.chatAbort(sessionKey);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.post('/sessions/history', async (req, res) => {
    try {
      const { sessionKey } = req.body;
      const history = await gw.chatHistory(sessionKey);
      res.json(history);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // Agents
  router.get('/agents', async (_req, res) => {
    try {
      const agents = await gw.agentsList();
      res.json(agents);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // Health
  router.get('/health', async (_req, res) => {
    try {
      const health = await gw.health();
      res.json(health);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // Approvals
  router.post('/approvals/:id/resolve', async (req, res) => {
    try {
      const { approved } = req.body;
      await gw.resolveApproval(req.params.id, approved);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // Config
  router.get('/config', async (_req, res) => {
    try {
      const config = await gw.configGet();
      res.json(config);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.patch('/config', async (req, res) => {
    try {
      const { patch, baseHash } = req.body;
      await gw.configPatch(patch, baseHash);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // Cron
  router.get('/cron', async (_req, res) => {
    try {
      const jobs = await gw.cronList();
      res.json(jobs);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.post('/cron', async (req, res) => {
    try {
      await gw.cronAdd(req.body);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.post('/cron/:id/run', async (req, res) => {
    try {
      await gw.cronRun(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.delete('/cron/:id', async (req, res) => {
    try {
      await gw.cronRemove(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  return router;
}
