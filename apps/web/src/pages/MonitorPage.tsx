import { useAgentStore } from '@/stores/agents';

export function MonitorPage() {
  const sessions = useAgentStore((s) => s.sessions);
  const actions = useAgentStore((s) => s.actions);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan text-glow-cyan">
          AGENT MONITOR
        </h2>
        <p className="text-cyber-text-muted text-sm mt-1">
          Live agent visualization — ReactFlow graph coming in Phase 1 Step 6
        </p>
      </div>

      {/* Placeholder — will be replaced with ReactFlow */}
      <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg p-8 min-h-[500px] flex flex-col items-center justify-center">
        {sessions.size === 0 ? (
          <div className="text-center">
            <p className="font-display text-lg text-cyber-text-muted mb-2">No Active Sessions</p>
            <p className="text-cyber-text-disabled text-sm">
              Agent activity will appear here when agents start working
            </p>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(sessions.values()).map((session) => (
                <div
                  key={session.key}
                  className="bg-cyber-bg-tertiary border border-cyber-border rounded-lg p-4 hover:border-cyber-cyan/20 hover:shadow-glow-cyan transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-2 w-2 rounded-full ${
                      session.status === 'active' ? 'bg-cyber-green status-dot-active' :
                      session.status === 'thinking' ? 'bg-cyber-purple status-dot-active' :
                      'bg-cyber-text-disabled'
                    }`} />
                    <span className="font-mono text-sm text-cyber-cyan">{session.agentId}</span>
                  </div>
                  <div className="font-mono text-xs text-cyber-text-muted space-y-1">
                    <div>Platform: {session.platform}</div>
                    <div>Recipient: {session.recipient || 'direct'}</div>
                    <div>Status: {session.status}</div>
                  </div>
                </div>
              ))}
            </div>

            {actions.size > 0 && (
              <div className="mt-6">
                <h3 className="font-display text-sm font-semibold tracking-wider text-cyber-text-muted uppercase mb-3">
                  Recent Actions ({actions.size})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Array.from(actions.values())
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 20)
                    .map((action) => (
                      <div key={action.id} className="flex items-center gap-3 font-mono text-xs py-1 px-2 rounded bg-cyber-bg/50">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          action.type === 'tool_call' ? 'bg-cyber-purple-dim text-cyber-purple' :
                          action.type === 'streaming' ? 'bg-cyber-cyan-dim text-cyber-cyan' :
                          action.type === 'complete' ? 'bg-cyber-green-dim text-cyber-green' :
                          action.type === 'error' ? 'bg-cyber-red-dim text-cyber-red' :
                          'bg-cyber-bg-surface text-cyber-text-muted'
                        }`}>
                          {action.type}
                        </span>
                        <span className="text-cyber-text-muted truncate">
                          {action.toolName || action.content?.slice(0, 60) || action.runId.slice(0, 8)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
