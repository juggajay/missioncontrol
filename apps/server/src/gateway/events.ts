import type {
  AgentEvent,
  ChatEvent,
  ExecStartedEvent,
  ExecOutputEvent,
  ExecCompletedEvent,
  MonitorSession,
  MonitorAction,
} from '@mission-control/shared';
import { parseSessionKey } from '@mission-control/shared';

export interface ParsedEvent {
  session?: Partial<MonitorSession>;
  action?: MonitorAction;
  execEvent?: { subtype: string; payload: unknown };
  approval?: unknown;
  presence?: unknown;
}

export function parseAgentEvent(payload: AgentEvent): ParsedEvent {
  const result: ParsedEvent = {};
  const { runId, seq, stream, ts, data, sessionKey } = payload;

  // Update session status
  if (sessionKey) {
    const parsed = parseSessionKey(sessionKey);
    result.session = {
      key: sessionKey,
      ...parsed,
      lastActivityAt: ts,
      status: 'active',
    };
  }

  // Lifecycle events
  if (stream === 'lifecycle') {
    const phase = data.phase as string;
    if (phase === 'start') {
      result.action = {
        id: `${runId}-action`,
        runId,
        sessionKey: sessionKey || '',
        seq,
        type: 'start',
        eventType: 'agent',
        timestamp: ts,
        startedAt: ts,
      };
    } else if (phase === 'end') {
      result.action = {
        id: `${runId}-action`,
        runId,
        sessionKey: sessionKey || '',
        seq,
        type: 'complete',
        eventType: 'agent',
        timestamp: ts,
        endedAt: ts,
      };
      // Mark session idle on completion
      if (result.session) {
        result.session.status = 'idle';
      }
    }
    return result;
  }

  // Assistant text streaming
  if (stream === 'assistant' || stream === 'text') {
    result.action = {
      id: `${runId}-action`,
      runId,
      sessionKey: sessionKey || '',
      seq,
      type: 'streaming',
      eventType: 'agent',
      timestamp: ts,
      content: data.text as string,
    };
    return result;
  }

  // Tool use
  if (data.type === 'tool_use') {
    result.action = {
      id: `${runId}-${seq}`,
      runId,
      sessionKey: sessionKey || '',
      seq,
      type: 'tool_call',
      eventType: 'agent',
      timestamp: ts,
      toolName: data.name as string,
      toolArgs: data.input,
    };
    return result;
  }

  // Tool result
  if (data.type === 'tool_result') {
    result.action = {
      id: `${runId}-${seq}`,
      runId,
      sessionKey: sessionKey || '',
      seq,
      type: 'tool_result',
      eventType: 'agent',
      timestamp: ts,
      content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content),
    };
    return result;
  }

  return result;
}

export function parseChatEvent(payload: ChatEvent): ParsedEvent {
  const result: ParsedEvent = {};
  const { runId, sessionKey, seq, state, message, usage } = payload;

  // Update session
  const parsed = parseSessionKey(sessionKey);
  result.session = {
    key: sessionKey,
    ...parsed,
    lastActivityAt: Date.now(),
    status: state === 'final' || state === 'aborted' || state === 'error' ? 'idle' : 'active',
  };

  // Map chat state to action type
  let actionType: MonitorAction['type'];
  switch (state) {
    case 'delta': actionType = 'streaming'; break;
    case 'final': actionType = 'complete'; break;
    case 'aborted': actionType = 'aborted'; break;
    case 'error': actionType = 'error'; break;
    default: actionType = 'streaming';
  }

  // Extract text content
  let content: string | undefined;
  if (message && typeof message === 'object') {
    const msg = message as Record<string, unknown>;
    if (Array.isArray(msg.content)) {
      const textBlock = (msg.content as Array<Record<string, unknown>>).find(b => b.type === 'text');
      content = textBlock?.text as string;
    } else if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (typeof msg.text === 'string') {
      content = msg.text;
    }
  } else if (typeof message === 'string') {
    content = message;
  }

  result.action = {
    id: `${runId}-action`,
    runId,
    sessionKey,
    seq,
    type: actionType,
    eventType: 'chat',
    timestamp: Date.now(),
    content,
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    stopReason: payload.stopReason,
  };

  return result;
}

export function parseGatewayEvent(eventName: string, payload: unknown): ParsedEvent | null {
  switch (eventName) {
    case 'agent':
      return parseAgentEvent(payload as AgentEvent);
    case 'chat':
      return parseChatEvent(payload as ChatEvent);
    case 'exec.started':
    case 'exec.output':
    case 'exec.completed':
      return { execEvent: { subtype: eventName.split('.')[1], payload } };
    case 'presence':
      return { presence: payload };
    case 'exec.approval.requested':
      return { approval: payload };
    case 'health':
    case 'tick':
      return null;
    default:
      return null;
  }
}
