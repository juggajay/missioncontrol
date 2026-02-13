import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MonitorSession } from '@mission-control/shared';
import {
  MessageSquare,
  Monitor,
  Globe,
  Smartphone,
  Bot,
} from 'lucide-react';

const platformIcons: Record<string, typeof Monitor> = {
  discord: MessageSquare,
  telegram: MessageSquare,
  whatsapp: Smartphone,
  slack: MessageSquare,
  web: Globe,
  webchat: Globe,
  cli: Monitor,
};

const statusColors: Record<string, { dot: string; glow: string; label: string }> = {
  active: {
    dot: 'bg-cyber-green',
    glow: 'shadow-glow-green',
    label: 'ACTIVE',
  },
  thinking: {
    dot: 'bg-cyber-purple',
    glow: 'shadow-glow-purple',
    label: 'THINKING',
  },
  idle: {
    dot: 'bg-cyber-text-disabled',
    glow: '',
    label: 'IDLE',
  },
};

function SessionNodeComponent({ data }: NodeProps) {
  const session = data.session as MonitorSession;
  const Icon = platformIcons[session.platform] || Bot;
  const status = statusColors[session.status] || statusColors.idle;
  const isActive = session.status === 'active' || session.status === 'thinking';

  return (
    <div
      className={`
        bg-cyber-bg-secondary border rounded-lg overflow-hidden
        transition-all duration-300
        ${isActive
          ? 'border-cyber-cyan/30 shadow-glow-cyan'
          : 'border-cyber-border hover:border-cyber-cyan/20'
        }
      `}
      style={{ width: 280, minHeight: 140 }}
    >
      {/* Top accent bar */}
      <div className={`h-0.5 ${isActive ? 'bg-cyber-cyan' : 'bg-cyber-border'}`} />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-cyber-cyan" />
            <span className="font-mono text-sm font-semibold text-cyber-cyan truncate max-w-[180px]">
              {session.agentId}
            </span>
          </div>

          {/* Status dot */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              {isActive && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.dot} opacity-75`} />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.dot} ${status.glow}`} />
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-cyber-text-muted uppercase tracking-wider text-[10px]">Platform</span>
            <span className="font-mono text-cyber-text">{session.platform}</span>
          </div>

          {session.recipient && (
            <div className="flex items-center justify-between">
              <span className="text-cyber-text-muted uppercase tracking-wider text-[10px]">Recipient</span>
              <span className="font-mono text-cyber-text truncate max-w-[140px]">{session.recipient}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-cyber-text-muted uppercase tracking-wider text-[10px]">Status</span>
            <span className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              session.status === 'active' ? 'bg-cyber-green-dim text-cyber-green' :
              session.status === 'thinking' ? 'bg-cyber-purple-dim text-cyber-purple' :
              'bg-cyber-bg-surface text-cyber-text-muted'
            }`}>
              {status.label}
            </span>
          </div>

          {session.isGroup && (
            <div className="flex items-center justify-between">
              <span className="text-cyber-text-muted uppercase tracking-wider text-[10px]">Type</span>
              <span className="font-mono text-cyber-blue text-[10px]">GROUP</span>
            </div>
          )}
        </div>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} className="!bg-cyber-cyan !border-cyber-bg-secondary !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-cyber-cyan !border-cyber-bg-secondary !w-2 !h-2" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="children"
        className="!bg-cyber-border !border-cyber-bg-secondary !w-2 !h-2"
      />
    </div>
  );
}

export const SessionNode = memo(SessionNodeComponent);
