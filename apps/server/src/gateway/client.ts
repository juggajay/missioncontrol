import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';
import {
  type GatewayFrame,
  type RequestFrame,
  type HelloOkPayload,
  type ChallengePayload,
  CLIENT_INFO,
  OPERATOR_SCOPES,
  PROTOCOL_VERSION,
  CONNECT_TIMEOUT,
  REQUEST_TIMEOUT,
  RECONNECT_INITIAL_DELAY,
  RECONNECT_MULTIPLIER,
  RECONNECT_MAX_DELAY,
} from '@mission-control/shared';
import { log } from '../lib/logger.js';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class GatewayClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private pending = new Map<string, PendingRequest>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = RECONNECT_INITIAL_DELAY;
  private wasConnected = false;
  private _connected = false;
  private _authenticated = false;
  private _features: { methods: string[]; events: string[] } = { methods: [], events: [] };

  get connected() { return this._connected; }
  get authenticated() { return this._authenticated; }
  get features() { return this._features; }

  constructor(url: string, token: string) {
    super();
    this.url = url;
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.removeAllListeners();
        this.ws.close();
      }

      this._connected = false;
      this._authenticated = false;
      this.emit('status', 'connecting');
      log.info('gateway', `Connecting to ${this.url}...`);

      const connectTimeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        this.ws?.close();
      }, CONNECT_TIMEOUT);

      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        log.info('gateway', 'WebSocket open, waiting for challenge...');
      });

      this.ws.on('message', (data) => {
        let frame: GatewayFrame;
        try {
          frame = JSON.parse(data.toString());
        } catch {
          log.warn('gateway', 'Failed to parse frame');
          return;
        }

        this.handleFrame(frame, () => {
          clearTimeout(connectTimeout);
          resolve();
        });
      });

      this.ws.on('close', (code, reason) => {
        const wasAuth = this._authenticated;
        this._connected = false;
        this._authenticated = false;
        log.warn('gateway', `Disconnected (code=${code}, reason=${reason.toString()})`);
        this.emit('status', 'disconnected');
        this.emit('disconnected');

        // Reject all pending requests
        for (const [id, req] of this.pending) {
          clearTimeout(req.timeout);
          req.reject(new Error('Connection closed'));
          this.pending.delete(id);
        }

        // Auto-reconnect if we were previously connected
        if (this.wasConnected && code !== 1000) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        log.error('gateway', `WebSocket error: ${err.message}`);
        clearTimeout(connectTimeout);
        reject(err);
      });
    });
  }

  private handleFrame(frame: GatewayFrame, onAuthenticated?: () => void) {
    // Handle challenge
    if (frame.type === 'event' && frame.event === 'connect.challenge') {
      this.handleChallenge(frame.payload as ChallengePayload);
      return;
    }

    // Handle hello-ok response
    if (frame.type === 'res' && frame.ok) {
      const payload = frame.payload as Record<string, unknown>;
      if (payload?.type === 'hello-ok') {
        this.handleHelloOk(payload as unknown as HelloOkPayload);
        onAuthenticated?.();
        return;
      }
    }

    // Handle RPC responses
    if (frame.type === 'res') {
      const pending = this.pending.get(frame.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pending.delete(frame.id);
        if (frame.ok) {
          pending.resolve(frame.payload);
        } else {
          pending.reject(frame.error || new Error('Request failed'));
        }
      }
      return;
    }

    // Handle events
    if (frame.type === 'event') {
      this.routeEvent(frame.event, frame.payload, frame.seq);
    }
  }

  private handleChallenge(_challenge: ChallengePayload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    log.info('gateway', 'Challenge received, sending connect...');

    const req: RequestFrame = {
      type: 'req',
      id: `connect-${Date.now()}`,
      method: 'connect',
      params: {
        minProtocol: PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        client: CLIENT_INFO,
        role: 'operator',
        scopes: OPERATOR_SCOPES,
        caps: [],
        auth: this.token ? { token: this.token } : undefined,
      },
    };

    this.ws.send(JSON.stringify(req));
  }

  private handleHelloOk(payload: HelloOkPayload) {
    this._connected = true;
    this._authenticated = true;
    this._features = payload.features;
    this.wasConnected = true;
    this.reconnectDelay = RECONNECT_INITIAL_DELAY;

    log.success('gateway', `Authenticated! Protocol v${payload.protocol}`);
    log.info('gateway', `Methods: ${payload.features.methods.length}, Events: ${payload.features.events.length}`);
    log.info('gateway', `Uptime: ${Math.round(payload.snapshot.uptimeMs / 1000)}s`);

    this.emit('status', 'connected');
    this.emit('connected');
    this.emit('hello', payload);
  }

  private routeEvent(event: string, payload: unknown, seq?: number) {
    // Skip noisy events
    if (event === 'tick') return;

    this.emit('event', { event, payload, seq });

    switch (event) {
      case 'agent':
        this.emit('agent', payload);
        break;
      case 'chat':
        this.emit('chat', payload);
        break;
      case 'exec.started':
        this.emit('exec', { subtype: 'started', ...(payload as object) });
        break;
      case 'exec.output':
        this.emit('exec', { subtype: 'output', ...(payload as object) });
        break;
      case 'exec.completed':
        this.emit('exec', { subtype: 'completed', ...(payload as object) });
        break;
      case 'presence':
        this.emit('presence', payload);
        break;
      case 'health':
        this.emit('health', payload);
        break;
      case 'exec.approval.requested':
        this.emit('approval', payload);
        break;
      case 'shutdown':
        log.warn('gateway', 'Gateway shutting down');
        this.emit('gateway-shutdown', payload);
        break;
      default:
        log.info('gateway', `Unhandled event: ${event}`);
    }
  }

  async call<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to gateway');
    }

    const id = uuid();
    const req: RequestFrame = { type: 'req', id, method, params };

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, REQUEST_TIMEOUT);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      this.ws!.send(JSON.stringify(req));
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.wasConnected = false;
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    log.info('gateway', `Reconnecting in ${Math.round(this.reconnectDelay)}ms...`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (err) {
        log.error('gateway', `Reconnect failed: ${(err as Error).message}`);
        this.reconnectDelay = Math.min(this.reconnectDelay * RECONNECT_MULTIPLIER, RECONNECT_MAX_DELAY);
        this.scheduleReconnect();
      }
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * RECONNECT_MULTIPLIER, RECONNECT_MAX_DELAY);
  }
}
