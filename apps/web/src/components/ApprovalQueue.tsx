import { useState } from 'react';
import { useGatewayStore } from '@/stores/gateway';
import { ShieldAlert, CheckCircle, XCircle, Terminal, FolderOpen, Bot, Server, ChevronUp, ChevronDown } from 'lucide-react';
import type { ExecApprovalRequest } from '@mission-control/shared';

export function ApprovalQueue() {
  const approvals = useGatewayStore((s) => s.approvals);
  const removeApproval = useGatewayStore((s) => s.removeApproval);
  const [collapsed, setCollapsed] = useState(false);
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  if (approvals.length === 0) return null;

  async function resolve(approvalId: string, approved: boolean) {
    setResolving((prev) => new Set(prev).add(approvalId));
    try {
      const res = await fetch(`/api/approvals/${encodeURIComponent(approvalId)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      if (res.ok) {
        removeApproval(approvalId);
      }
    } catch {
      // Network error — leave in queue for retry
    } finally {
      setResolving((prev) => {
        const next = new Set(prev);
        next.delete(approvalId);
        return next;
      });
    }
  }

  return (
    <div className="fixed bottom-0 left-14 right-0 z-50">
      {/* Header bar — always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2 bg-cyber-bg-tertiary border-t border-cyber-magenta/30 hover:bg-cyber-bg-surface transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-cyber-magenta" />
          <span className="font-display text-xs uppercase tracking-wider text-cyber-magenta">
            Exec Approvals
          </span>
          <span className="font-mono text-[10px] font-bold bg-cyber-magenta/20 text-cyber-magenta px-1.5 py-0.5 rounded">
            {approvals.length}
          </span>
        </div>
        {collapsed ? (
          <ChevronUp size={14} className="text-cyber-text-muted" />
        ) : (
          <ChevronDown size={14} className="text-cyber-text-muted" />
        )}
      </button>

      {/* Approval list */}
      {!collapsed && (
        <div className="bg-cyber-bg-secondary border-t border-cyber-border max-h-64 overflow-y-auto">
          {approvals.map((approval) => (
            <ApprovalItem
              key={approval.approvalId}
              approval={approval}
              isResolving={resolving.has(approval.approvalId)}
              onResolve={resolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalItem({
  approval,
  isResolving,
  onResolve,
}: {
  approval: ExecApprovalRequest;
  isResolving: boolean;
  onResolve: (id: string, approved: boolean) => void;
}) {
  const cmdDisplay = approval.arguments.length > 0
    ? `${approval.command} ${approval.arguments.join(' ')}`
    : approval.command;

  return (
    <div className="px-4 py-3 border-b border-cyber-border/50 hover:bg-cyber-bg-surface/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Command info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Command */}
          <div className="flex items-center gap-2">
            <Terminal size={13} className="text-cyber-cyan shrink-0" />
            <code className="font-mono text-sm text-cyber-cyan truncate block">
              {cmdDisplay}
            </code>
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-4 text-[11px]">
            {approval.workingDirectory && (
              <div className="flex items-center gap-1 text-cyber-text-muted">
                <FolderOpen size={11} className="shrink-0" />
                <span className="font-mono truncate max-w-[200px]">{approval.workingDirectory}</span>
              </div>
            )}
            {approval.agentId && (
              <div className="flex items-center gap-1 text-cyber-text-muted">
                <Bot size={11} className="shrink-0" />
                <span className="font-mono">{approval.agentId}</span>
              </div>
            )}
            {approval.host && (
              <div className="flex items-center gap-1 text-cyber-text-muted">
                <Server size={11} className="shrink-0" />
                <span className="font-mono">{approval.host}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onResolve(approval.approvalId, true)}
            disabled={isResolving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold uppercase
              bg-cyber-green/10 border border-cyber-green/30 text-cyber-green
              hover:bg-cyber-green/20 hover:shadow-glow-green
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            <CheckCircle size={13} />
            Approve
          </button>
          <button
            onClick={() => onResolve(approval.approvalId, false)}
            disabled={isResolving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold uppercase
              bg-cyber-red/10 border border-cyber-red/30 text-cyber-red
              hover:bg-cyber-red/20 hover:shadow-glow-red
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            <XCircle size={13} />
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}
