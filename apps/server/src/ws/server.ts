import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { WSServerMessage } from '@mission-control/shared';
import type { GatewayClient } from '../gateway/client.js';
import { parseGatewayEvent } from '../gateway/events.js';
import { log } from '../lib/logger.js';

export function createWSServer(httpServer: Server, gatewayClient: GatewayClient, gatewayUrl: string) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<WebSocket>();

  function broadcast(message: WSServerMessage) {
    const data = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  wss.on('connection', (ws) => {
    clients.add(ws);
    log.info('ws', `Browser connected (${clients.size} total)`);

    // Send current gateway status
    const status = gatewayClient.connected ? 'connected' : 'disconnected';
    ws.send(JSON.stringify({ type: 'connection', status, gateway: gatewayUrl } satisfies WSServerMessage));

    ws.on('close', () => {
      clients.delete(ws);
      log.info('ws', `Browser disconnected (${clients.size} total)`);
    });

    ws.on('error', (err) => {
      log.error('ws', `Client error: ${err.message}`);
      clients.delete(ws);
    });
  });

  // Bridge gateway events to browser clients

  gatewayClient.on('status', (status: string) => {
    broadcast({ type: 'connection', status: status as WSServerMessage & { type: 'connection' } extends { status: infer S } ? S : never, gateway: gatewayUrl } as WSServerMessage);
  });

  gatewayClient.on('hello', (payload) => {
    broadcast({ type: 'hello', payload });
  });

  gatewayClient.on('agent', (payload) => {
    broadcast({ type: 'agent-event', payload });
  });

  gatewayClient.on('chat', (payload) => {
    broadcast({ type: 'chat-event', payload });
  });

  gatewayClient.on('exec', (payload: { subtype: string }) => {
    broadcast({ type: 'exec-event', subtype: payload.subtype as 'started' | 'output' | 'completed', payload });
  });

  gatewayClient.on('presence', (payload) => {
    broadcast({ type: 'presence', payload });
  });

  gatewayClient.on('approval', (payload) => {
    broadcast({ type: 'approval-request', payload });
  });

  gatewayClient.on('health', (payload) => {
    broadcast({ type: 'health', payload });
  });

  log.info('ws', 'WebSocket server ready on /ws');

  return { wss, broadcast, clients };
}
