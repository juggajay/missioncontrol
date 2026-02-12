import { useGatewayStore } from '@/stores/gateway';
import { useAgentStore } from '@/stores/agents';

export function DashboardPage() {
  const status = useGatewayStore((s) => s.connectionStatus);
  const snapshot = useGatewayStore((s) => s.snapshot);
  const features = useGatewayStore((s) => s.features);
  const sessions = useAgentStore((s) => s.sessions);
  const actions = useAgentStore((s) => s.actions);
  const approvals = useGatewayStore((s) => s.approvals);

  const activeSessions = Array.from(sessions.values()).filter((s) => s.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan text-glow-cyan">
          DASHBOARD
        </h2>
        <p className="text-cyber-text-muted text-sm mt-1">System overview and real-time metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="GATEWAY"
          value={status === 'connected' ? 'ONLINE' : 'OFFLINE'}
          color={status === 'connected' ? 'cyan' : 'red'}
        />
        <KPICard
          label="SESSIONS"
          value={`${activeSessions} / ${sessions.size}`}
          sublabel="active / total"
          color="green"
        />
        <KPICard
          label="ACTIONS"
          value={String(actions.size)}
          sublabel="tracked"
          color="purple"
        />
        <KPICard
          label="APPROVALS"
          value={String(approvals.length)}
          sublabel="pending"
          color={approvals.length > 0 ? 'red' : 'cyan'}
        />
      </div>

      {/* System Info */}
      {snapshot && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg p-4 border-t-2 border-t-cyber-cyan/50">
            <h3 className="font-display text-sm font-semibold tracking-wider text-cyber-text-muted uppercase mb-3">
              Gateway Info
            </h3>
            <div className="space-y-2 font-mono text-sm">
              <InfoRow label="Uptime" value={formatUptime(snapshot.uptimeMs)} />
              <InfoRow label="Methods" value={String(features.methods.length)} />
              <InfoRow label="Events" value={String(features.events.length)} />
            </div>
          </div>

          <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg p-4 border-t-2 border-t-cyber-purple/50">
            <h3 className="font-display text-sm font-semibold tracking-wider text-cyber-text-muted uppercase mb-3">
              Active Sessions
            </h3>
            <div className="space-y-2">
              {sessions.size === 0 ? (
                <p className="text-cyber-text-muted text-sm">No sessions yet</p>
              ) : (
                Array.from(sessions.values()).slice(0, 5).map((session) => (
                  <div key={session.key} className="flex items-center gap-2 font-mono text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${session.status === 'active' ? 'bg-cyber-green status-dot-active' : 'bg-cyber-text-disabled'}`} />
                    <span className="text-cyber-text truncate">{session.agentId}</span>
                    <span className="text-cyber-text-muted">{session.platform}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {status === 'disconnected' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-cyber-red-dim border border-cyber-red/30 flex items-center justify-center mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h3 className="font-display text-lg text-cyber-text mb-2">Gateway Disconnected</h3>
          <p className="text-cyber-text-muted text-sm max-w-md">
            Make sure the OpenClaw Gateway is running at the configured address.
            The server will auto-reconnect when the gateway becomes available.
          </p>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, sublabel, color }: { label: string; value: string; sublabel?: string; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: 'border-t-cyber-cyan/50 text-cyber-cyan',
    green: 'border-t-cyber-green/50 text-cyber-green',
    purple: 'border-t-cyber-purple/50 text-cyber-purple',
    red: 'border-t-cyber-red/50 text-cyber-red',
    yellow: 'border-t-cyber-yellow/50 text-cyber-yellow',
  };

  return (
    <div className={`bg-cyber-bg-secondary border border-cyber-border rounded-lg p-4 border-t-2 ${colorClasses[color]?.split(' ')[0]}`}>
      <p className="font-mono text-[10px] font-semibold tracking-widest text-cyber-text-muted uppercase">
        {label}
      </p>
      <p className={`font-display text-2xl font-bold mt-1 ${colorClasses[color]?.split(' ')[1]}`}>
        {value}
      </p>
      {sublabel && (
        <p className="font-mono text-[10px] text-cyber-text-muted mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-cyber-text-muted">{label}</span>
      <span className="text-cyber-cyan">{value}</span>
    </div>
  );
}

function formatUptime(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
