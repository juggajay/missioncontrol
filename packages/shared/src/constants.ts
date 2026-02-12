// Shared constants

export const GATEWAY_DEFAULT_URL = 'ws://127.0.0.1:18789';
export const GATEWAY_DEFAULT_PORT = 18789;
export const SERVER_DEFAULT_PORT = 3001;

export const PROTOCOL_VERSION = 3;

export const CLIENT_INFO = {
  id: 'mission-control',
  version: '0.1.0',
  platform: 'web',
  mode: 'webchat' as const,
};

export const OPERATOR_SCOPES = [
  'operator.admin',
  'operator.approvals',
  'operator.pairing',
];

// Reconnection
export const RECONNECT_INITIAL_DELAY = 800;
export const RECONNECT_MULTIPLIER = 1.7;
export const RECONNECT_MAX_DELAY = 15_000;

// Timeouts
export const CONNECT_TIMEOUT = 10_000;
export const REQUEST_TIMEOUT = 30_000;

// Task status order for Kanban
export const TASK_STATUS_ORDER = [
  'planning',
  'inbox',
  'assigned',
  'in_progress',
  'testing',
  'review',
  'done',
] as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  inbox: 'Inbox',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  testing: 'Testing',
  review: 'Review',
  done: 'Done',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  planning: 'blue',
  inbox: 'cyan',
  assigned: 'purple',
  in_progress: 'green',
  testing: 'yellow',
  review: 'orange',
  done: 'green',
};

// Session key helpers
export function parseSessionKey(key: string) {
  const parts = key.split(':');
  return {
    agentId: parts[1] || 'unknown',
    platform: parts[2] || 'unknown',
    recipient: parts.slice(3).join(':') || '',
    isGroup: parts[3] === 'group' || parts[3] === 'channel',
  };
}
