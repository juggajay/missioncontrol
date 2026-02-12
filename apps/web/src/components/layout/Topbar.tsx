import { useGatewayStore } from '@/stores/gateway';
import { Shield } from 'lucide-react';

export function Topbar() {
  const status = useGatewayStore((s) => s.connectionStatus);
  const gatewayUrl = useGatewayStore((s) => s.gatewayUrl);
  const approvalCount = useGatewayStore((s) => s.approvals.length);

  const statusColor = {
    connected: 'bg-cyber-green',
    disconnected: 'bg-cyber-red',
    connecting: 'bg-cyber-yellow',
  }[status];

  const statusGlow = {
    connected: 'shadow-glow-green',
    disconnected: 'shadow-glow-red',
    connecting: 'shadow-glow-cyan',
  }[status];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-cyber-bg/80 backdrop-blur-md border-b border-cyber-border flex items-center px-4 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <h1 className="font-display font-bold text-lg tracking-wider text-cyber-cyan text-glow-cyan">
          MISSION CONTROL
        </h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Connection Status */}
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="relative flex h-2 w-2">
          {status === 'connected' && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor} ${statusGlow}`} />
        </span>
        <span className="text-cyber-text-muted">
          {gatewayUrl || 'No gateway'}
        </span>
        <span className={status === 'connected' ? 'text-cyber-green' : 'text-cyber-red'}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Approval Badge */}
      {approvalCount > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyber-red-dim border border-cyber-red/30">
          <Shield className="w-3.5 h-3.5 text-cyber-red" />
          <span className="font-mono text-xs text-cyber-red font-semibold">{approvalCount}</span>
        </div>
      )}

      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-magenta opacity-50" />
    </header>
  );
}
