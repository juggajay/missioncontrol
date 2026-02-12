// OpenClaw Gateway Protocol v3 — Frame Types

export interface RequestFrame {
  type: 'req';
  id: string;
  method: string;
  params?: unknown;
}

export interface ResponseFrame {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string };
}

export interface EventFrame {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: { presence: number; health: number };
}

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame;

// Connection handshake

export interface ConnectParams {
  minProtocol: 3;
  maxProtocol: 3;
  client: ClientInfo;
  role: 'operator';
  scopes: string[];
  caps: string[];
  auth?: { token?: string };
}

export interface ClientInfo {
  id: string;
  version: string;
  platform: string;
  mode: 'webchat' | 'cli' | 'ui';
}

export interface ChallengePayload {
  nonce: string;
  ts: number;
}

export interface HelloOkPayload {
  type: 'hello-ok';
  protocol: number;
  features: {
    methods: string[];
    events: string[];
  };
  snapshot: {
    presence: Record<string, unknown>;
    health: Record<string, unknown>;
    stateVersion: { presence: number; health: number };
    uptimeMs: number;
  };
  auth: {
    deviceToken: string;
    role: string;
    scopes: string[];
    issuedAtMs?: number;
  };
  policy: {
    maxPayload: number;
    maxBufferedBytes: number;
    tickIntervalMs: number;
  };
}

// Session data from sessions.list

export interface SessionEntry {
  sessionKey: string;
  sessionId: string;
  updatedAt: string;
  displayName: string;
  channel: string;
  origin?: {
    label: string;
    provider: string;
    from: string;
    to: string;
    accountId?: string | null;
    threadId?: string | null;
  };
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextTokens: number;
}

// Session patch

export interface SessionPatch {
  sessionKey: string;
  model?: string;
  thinkingLevel?: 'low' | 'medium' | 'high';
  verbose?: boolean;
}

// Exec approval

export interface ExecApprovalRequest {
  approvalId: string;
  command: string;
  arguments: string[];
  workingDirectory: string;
  agentId: string;
  resolvedExecutable?: string;
  host?: string;
}
