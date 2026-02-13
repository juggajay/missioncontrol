import { useAgentStore } from '@/stores/agents';
import { AgentGraph } from '@/components/graph/AgentGraph';

export function MonitorPage() {
  const sessions = useAgentStore((s) => s.sessions);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan text-glow-cyan">
            AGENT MONITOR
          </h2>
          <p className="text-cyber-text-muted text-sm mt-1">
            Live agent visualization &mdash; {sessions.size} active session{sessions.size !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Session count badges */}
        {sessions.size > 0 && (
          <div className="flex items-center gap-3">
            {(() => {
              const counts = { active: 0, thinking: 0, idle: 0 };
              for (const s of sessions.values()) counts[s.status]++;
              return (
                <>
                  {counts.active > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="h-2 w-2 rounded-full bg-cyber-green animate-pulse" />
                      <span className="text-cyber-green">{counts.active} active</span>
                    </span>
                  )}
                  {counts.thinking > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="h-2 w-2 rounded-full bg-cyber-purple animate-pulse" />
                      <span className="text-cyber-purple">{counts.thinking} thinking</span>
                    </span>
                  )}
                  {counts.idle > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="h-2 w-2 rounded-full bg-cyber-text-disabled" />
                      <span className="text-cyber-text-muted">{counts.idle} idle</span>
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 bg-cyber-bg-secondary border border-cyber-border rounded-lg overflow-hidden relative">
        {sessions.size === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <p className="font-display text-lg text-cyber-text-muted mb-2">No Active Sessions</p>
              <p className="text-cyber-text-disabled text-sm">
                Agent activity will appear here when agents start working
              </p>
            </div>
          </div>
        ) : (
          <AgentGraph />
        )}
      </div>
    </div>
  );
}
