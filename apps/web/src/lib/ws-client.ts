import type { WSServerMessage } from '@mission-control/shared';

type MessageHandler = (message: WSServerMessage) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers = new Set<MessageHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 10000;
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.shouldReconnect = true;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectDelay = 1000;
        console.log('[ws] Connected to backend');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSServerMessage;
          for (const handler of this.handlers) {
            handler(message);
          }
        } catch (err) {
          console.warn('[ws] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[ws] Disconnected');
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error('[ws] Error:', err);
      };
    } catch (err) {
      console.error('[ws] Connection failed:', err);
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }
}

// Singleton
let client: WSClient | null = null;

export function getWSClient(): WSClient {
  if (!client) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
    client = new WSClient(url);
  }
  return client;
}
