import { Router } from 'express';
import type { GatewayClient } from '../gateway/client.js';
import { createGatewayMethods } from '../gateway/methods.js';

export function createApiRouter(gatewayClient: GatewayClient) {
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

  router.patch('/sessions/:key(*)', async (req, res) => {
    try {
      const sessionKey = req.params.key;
      await gw.sessionsPatch({ sessionKey, ...req.body });
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.post('/sessions/:key(*)/reset', async (req, res) => {
    try {
      await gw.sessionsReset(req.params.key);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.post('/sessions/:key(*)/send', async (req, res) => {
    try {
      const { text, idempotencyKey } = req.body;
      const result = await gw.chatSend(req.params.key, text, idempotencyKey);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.post('/sessions/:key(*)/abort', async (req, res) => {
    try {
      await gw.chatAbort(req.params.key);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  router.get('/sessions/:key(*)/history', async (req, res) => {
    try {
      const history = await gw.chatHistory(req.params.key);
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
