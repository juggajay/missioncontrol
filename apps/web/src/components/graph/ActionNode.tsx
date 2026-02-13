import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MonitorAction } from '@mission-control/shared';
import { Wrench, MessageSquare, Play, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

const typeConfig: Record<string, { icon: typeof Play; color: string; bg: string; label: string }> = {
  start: {
    icon: Play,
    color: 'text-cyber-cyan',
    bg: 'bg-cyber-cyan-dim',
    label: 'START',
  },
  streaming: {
    icon: MessageSquare,
    color: 'text-cyber-cyan',
    bg: 'bg-cyber-cyan-dim',
    label: 'STREAMING',
  },
  complete: {
    icon: CheckCircle,
    color: 'text-cyber-green',
    bg: 'bg-cyber-green-dim',
    label: 'COMPLETE',
  },
  tool_call: {
    icon: Wrench,
    color: 'text-cyber-purple',
    bg: 'bg-cyber-purple-dim',
    label: 'TOOL',
  },
  tool_result: {
    icon: CheckCircle,
    color: 'text-cyber-blue',
    bg: 'bg-cyber-blue/20',
    label: 'RESULT',
  },
  error: {
    icon: XCircle,
    color: 'text-cyber-red',
    bg: 'bg-cyber-red-dim',
    label: 'ERROR',
  },
  aborted: {
    icon: AlertTriangle,
    color: 'text-cyber-yellow',
    bg: 'bg-cyber-yellow-dim',
    label: 'ABORTED',
  },
};

const defaultConfig = {
  icon: Play,
  color: 'text-cyber-text-muted',
  bg: 'bg-cyber-bg-surface',
  label: 'EVENT',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function ActionNodeComponent({ data }: NodeProps) {
  const action = data.action as MonitorAction;
  const [expanded, setExpanded] = useState(false);
  const config = typeConfig[action.type] || defaultConfig;
  const Icon = config.icon;

  const borderColor = action.type === 'tool_call' ? 'border-t-cyber-purple'
    : action.type === 'complete' ? 'border-t-cyber-green'
    : action.type === 'error' ? 'border-t-cyber-red'
    : action.type === 'streaming' ? 'border-t-cyber-cyan'
    : 'border-t-cyber-border';

  const hasExpandableContent = action.toolArgs || (action.content && action.content.length > 60);

  return (
    <div
      className={`
        bg-cyber-bg-tertiary border border-cyber-border rounded-md overflow-hidden
        border-t-2 ${borderColor}
        hover:border-cyber-cyan/20 transition-all duration-200
      `}
      style={{ width: 220, minHeight: 80 }}
    >
      <div className="p-2.5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Icon size={12} className={config.color} />
            <span className={`font-mono text-[10px] font-bold uppercase px-1 py-0.5 rounded ${config.bg} ${config.color}`}>
              {config.label}
            </span>
          </div>

          {action.duration != null && (
            <span className="font-mono text-[10px] text-cyber-text-muted">
              {formatDuration(action.duration)}
            </span>
          )}
        </div>

        {/* Tool name or content preview */}
        <div className="text-xs font-mono truncate text-cyber-text">
          {action.toolName || (action.content ? action.content.slice(0, 60) : action.runId.slice(0, 12))}
        </div>

        {/* Token counts */}
        {(action.inputTokens || action.outputTokens) && (
          <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-cyber-text-muted">
            {action.inputTokens && <span>IN: {action.inputTokens.toLocaleString()}</span>}
            {action.outputTokens && <span>OUT: {action.outputTokens.toLocaleString()}</span>}
          </div>
        )}

        {/* Expandable section */}
        {hasExpandableContent && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex items-center gap-1 mt-1.5 text-[10px] text-cyber-text-muted hover:text-cyber-cyan transition-colors"
          >
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <span>Details</span>
          </button>
        )}

        {expanded && (
          <div className="mt-1.5 p-1.5 bg-cyber-bg/80 rounded text-[10px] font-mono text-cyber-text-muted max-h-32 overflow-auto">
            {action.toolArgs
              ? JSON.stringify(action.toolArgs, null, 2)
              : action.content}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-cyber-border !border-cyber-bg-tertiary !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-cyber-border !border-cyber-bg-tertiary !w-1.5 !h-1.5" />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
