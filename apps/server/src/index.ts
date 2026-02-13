import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { loadConfig } from './lib/config.js';
import { GatewayClient } from './gateway/client.js';
import { createWSServer } from './ws/server.js';
import { createApiRouter } from './api/router.js';
import { createTaskRouter } from './api/tasks.js';
import { initDatabase } from './db/index.js';
import { log } from './lib/logger.js';

async function main() {
  const config = loadConfig();

  log.info('server', '=================================');
  log.info('server', '  MISSION CONTROL - Server');
  log.info('server', '=================================');
  log.info('server', `Gateway: ${config.gatewayUrl}`);
  log.info('server', `Token: ${config.gatewayToken ? '***' + config.gatewayToken.slice(-4) : '(none)'}`);

  // Initialize SQLite database
  await initDatabase();

  // Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // HTTP server (shared between Express and WebSocket)
  const httpServer = createServer(app);

  // Gateway client
  const gatewayClient = new GatewayClient(config.gatewayUrl, config.gatewayToken);

  // WebSocket server (browser ← backend)
  const { broadcast } = createWSServer(httpServer, gatewayClient, config.gatewayUrl);

  // REST API
  app.use('/api', createApiRouter(gatewayClient));
  app.use('/api/tasks', createTaskRouter(gatewayClient, broadcast));

  // Start HTTP server
  httpServer.listen(config.port, '0.0.0.0', () => {
    log.success('server', `Listening on http://0.0.0.0:${config.port}`);
    log.info('server', `WS endpoint: ws://0.0.0.0:${config.port}/ws`);
    log.info('server', `API endpoint: http://0.0.0.0:${config.port}/api`);
  });

  // Connect to gateway (non-blocking, will auto-reconnect)
  try {
    await gatewayClient.connect();
  } catch (err) {
    log.warn('server', `Initial gateway connection failed: ${(err as Error).message}`);
    log.warn('server', 'Will retry automatically...');
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    log.info('server', 'Shutting down...');
    gatewayClient.disconnect();
    httpServer.close();
    process.exit(0);
  });
}

main().catch((err) => {
  log.error('server', `Fatal: ${err.message}`);
  process.exit(1);
});
