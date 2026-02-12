// App-level data models

// --- Monitor (Agent Visualization) ---

export interface MonitorSession {
  key: string;
  agentId: string;
  platform: string;
  recipient: string;
  isGroup: boolean;
  lastActivityAt: number;
  status: 'idle' | 'active' | 'thinking';
  spawnedBy?: string;
}

export interface MonitorAction {
  id: string;
  runId: string;
  sessionKey: string;
  seq: number;
  type: 'start' | 'streaming' | 'complete' | 'aborted' | 'error' | 'tool_call' | 'tool_result';
  eventType: 'chat' | 'agent' | 'system';
  timestamp: number;
  content?: string;
  toolName?: string;
  toolArgs?: unknown;
  startedAt?: number;
  endedAt?: number;
  duration?: number;
  inputTokens?: number;
  outputTokens?: number;
  stopReason?: string;
}

export interface MonitorExecProcess {
  id: string;
  runId: string;
  pid: number;
  command: string;
  sessionKey?: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  exitCode?: number;
  outputs: MonitorExecOutput[];
  timestamp: number;
}

export interface MonitorExecOutput {
  stream: string;
  text: string;
  timestamp: number;
}

// --- Tasks ---

export type TaskStatus = 'planning' | 'inbox' | 'assigned' | 'in_progress' | 'testing' | 'review' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_agent_id?: string;
  assigned_session_key?: string;
  planning_messages?: string;
  planning_spec?: string;
  dispatch_idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  activity_type: string;
  message: string;
  metadata?: string;
  created_at: string;
}

// --- Agents ---

export interface AgentEntry {
  id?: string;
  name?: string;
  model?: string;
  status?: string;
}
