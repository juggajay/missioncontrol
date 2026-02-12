import { useEffect, useRef } from 'react';
import { getWSClient } from '@/lib/ws-client';
import { useGatewayStore } from '@/stores/gateway';
import { useAgentStore } from '@/stores/agents';
import type { WSServerMessage, AgentEvent, ChatEvent } from '@mission-control/shared';
import { parseSessionKey } from '@mission-control/shared';

export function useWebSocket() {
  const clientRef = useRef(getWSClient());
  const setConnection = useGatewayStore((s) => s.setConnection);
  const setHello = useGatewayStore((s) => s.setHello);
  const addApproval = useGatewayStore((s) => s.addApproval);
  const upsertSession = useAgentStore((s) => s.upsertSession);
  const upsertAction = useAgentStore((s) => s.upsertAction);

  useEffect(() => {
    const client = clientRef.current;

    const unsubscribe = client.onMessage((message: WSServerMessage) => {
      switch (message.type) {
        case 'connection':
          setConnection(message.status, message.gateway);
          break;

        case 'hello':
          setHello(message.payload);
          break;

        case 'agent-event': {
          const event = message.payload as AgentEvent;
          if (event.sessionKey) {
            const parsed = parseSessionKey(event.sessionKey);
            upsertSession({
              key: event.sessionKey,
              ...parsed,
              lastActivityAt: event.ts,
              status: 'active',
            });
          }

          // Map agent events to actions
          if (event.stream === 'lifecycle') {
            const phase = event.data.phase as string;
            upsertAction({
              id: `${event.runId}-action`,
              runId: event.runId,
              sessionKey: event.sessionKey || '',
              seq: event.seq,
              type: phase === 'start' ? 'start' : 'complete',
              eventType: 'agent',
              timestamp: event.ts,
              ...(phase === 'start' ? { startedAt: event.ts } : { endedAt: event.ts }),
            });
            if (phase === 'end' && event.sessionKey) {
              upsertSession({ key: event.sessionKey, status: 'idle' });
            }
          } else if (event.stream === 'assistant' || event.stream === 'text') {
            upsertAction({
              id: `${event.runId}-action`,
              runId: event.runId,
              sessionKey: event.sessionKey || '',
              seq: event.seq,
              type: 'streaming',
              eventType: 'agent',
              timestamp: event.ts,
              content: event.data.text as string,
            });
          } else if (event.data.type === 'tool_use') {
            upsertAction({
              id: `${event.runId}-${event.seq}`,
              runId: event.runId,
              sessionKey: event.sessionKey || '',
              seq: event.seq,
              type: 'tool_call',
              eventType: 'agent',
              timestamp: event.ts,
              toolName: event.data.name as string,
              toolArgs: event.data.input,
            });
          } else if (event.data.type === 'tool_result') {
            upsertAction({
              id: `${event.runId}-${event.seq}`,
              runId: event.runId,
              sessionKey: event.sessionKey || '',
              seq: event.seq,
              type: 'tool_result',
              eventType: 'agent',
              timestamp: event.ts,
              content: typeof event.data.content === 'string'
                ? event.data.content
                : JSON.stringify(event.data.content),
            });
          }
          break;
        }

        case 'chat-event': {
          const event = message.payload as ChatEvent;
          const parsed = parseSessionKey(event.sessionKey);
          const isDone = event.state === 'final' || event.state === 'aborted' || event.state === 'error';
          upsertSession({
            key: event.sessionKey,
            ...parsed,
            lastActivityAt: Date.now(),
            status: isDone ? 'idle' : 'active',
          });
          break;
        }

        case 'approval-request':
          addApproval(message.payload);
          break;
      }
    });

    client.connect();

    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, []);
}
