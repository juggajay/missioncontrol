// WebSocket messages from backend to browser

import type { HelloOkPayload, ExecApprovalRequest } from './protocol.js';
import type { AgentEvent, ChatEvent } from './events.js';
import type { MonitorSession, MonitorAction, MonitorExecProcess, Task } from './models.js';

export type WSServerMessage =
  | { type: 'connection'; status: 'connected' | 'disconnected' | 'connecting'; gateway: string }
  | { type: 'hello'; payload: HelloOkPayload }
  | { type: 'agent-event'; payload: AgentEvent }
  | { type: 'chat-event'; payload: ChatEvent }
  | { type: 'exec-event'; subtype: 'started' | 'output' | 'completed'; payload: unknown }
  | { type: 'presence'; payload: unknown }
  | { type: 'approval-request'; payload: ExecApprovalRequest }
  | { type: 'health'; payload: unknown }
  | { type: 'task-update'; payload: Task }
  | { type: 'error'; message: string };

// Messages from browser to backend (if needed for future bidirectional WS)
export type WSClientMessage =
  | { type: 'subscribe'; channels: string[] }
  | { type: 'unsubscribe'; channels: string[] };
