// OpenClaw Gateway Event Types

export interface AgentEvent {
  runId: string;
  seq: number;
  stream: string; // 'lifecycle', 'assistant', 'text', 'tool', 'thinking'
  ts: number;
  data: Record<string, unknown>;
  sessionKey?: string;
}

export interface ChatEvent {
  runId: string;
  sessionKey: string;
  seq: number;
  state: 'delta' | 'final' | 'aborted' | 'error';
  message?: unknown;
  errorMessage?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  stopReason?: string;
}

export interface ExecStartedEvent {
  pid: number;
  command: string;
  sessionId: string;
  runId: string;
  startedAt: number;
}

export interface ExecOutputEvent {
  pid: number;
  runId: string;
  sessionId?: string;
  stream: 'stdout' | 'stderr';
  output: string;
}

export interface ExecCompletedEvent {
  pid: number;
  runId: string;
  sessionId?: string;
  exitCode: number;
  durationMs: number;
  status: string;
}

export type ExecEvent = ExecStartedEvent | ExecOutputEvent | ExecCompletedEvent;
