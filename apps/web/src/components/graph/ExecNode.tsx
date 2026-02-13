import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MonitorExecProcess } from '@mission-control/shared';
import { Terminal, ChevronDown, ChevronRight } from 'lucide-react';

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  running: {
    color: 'text-cyber-green',
    bg: 'bg-cyber-green-dim',
    label: 'RUNNING',
  },
  completed: {
    color: 'text-cyber-cyan',
    bg: 'bg-cyber-cyan-dim',
    label: 'DONE',
  },
  failed: {
    color: 'text-cyber-red',
    bg: 'bg-cyber-red-dim',
    label: 'FAILED',
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function ExecNodeComponent({ data }: NodeProps) {
  const exec = data.exec as MonitorExecProcess;
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[exec.status] || statusConfig.completed;
  const isRunning = exec.status === 'running';

  return (
    <div
      className={`
        bg-cyber-bg border border-cyber-border rounded-md overflow-hidden
        ${isRunning ? 'border-cyber-green/30' : exec.status === 'failed' ? 'border-cyber-red/30' : 'border-cyber-border'}
        hover:border-cyber-cyan/20 transition-all duration-200
      `}
      style={{ width: 300, minHeight: 100 }}
    >
      {/* Terminal-style header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-cyber-bg-tertiary border-b border-cyber-border">
        <div className="flex items-center gap-1.5">
          <Terminal size={12} className="text-cyber-green" />
          <span className="font-mono text-[10px] text-cyber-green font-semibold">EXEC</span>
        </div>

        <div className="flex items-center gap-2">
          {exec.durationMs != null && (
            <span className="font-mono text-[10px] text-cyber-text-muted">
              {formatDuration(exec.durationMs)}
            </span>
          )}
          <span className={`font-mono text-[10px] font-bold px-1 py-0.5 rounded ${status.bg} ${status.color}`}>
            {isRunning && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyber-green mr-1 animate-pulse" />
            )}
            {status.label}
          </span>
        </div>
      </div>

      <div className="p-2.5">
        {/* Command */}
        <div className="font-mono text-xs text-cyber-green truncate" title={exec.command}>
          $ {exec.command}
        </div>

        {/* Exit code + PID */}
        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-cyber-text-muted">
          <span>PID: {exec.pid}</span>
          {exec.exitCode != null && (
            <span className={exec.exitCode === 0 ? 'text-cyber-green' : 'text-cyber-red'}>
              EXIT: {exec.exitCode}
            </span>
          )}
        </div>

        {/* Output toggle */}
        {exec.outputs && exec.outputs.length > 0 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="flex items-center gap-1 mt-2 text-[10px] text-cyber-text-muted hover:text-cyber-green transition-colors"
            >
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <span>Output ({exec.outputs.length} lines)</span>
            </button>

            {expanded && (
              <div className="mt-1.5 p-2 bg-cyber-bg rounded border border-cyber-border-muted max-h-40 overflow-auto">
                {exec.outputs.map((output, i) => (
                  <div
                    key={i}
                    className={`font-mono text-[10px] leading-relaxed whitespace-pre-wrap ${
                      output.stream === 'stderr' ? 'text-cyber-red' : 'text-cyber-green'
                    }`}
                  >
                    {output.text}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-cyber-border !border-cyber-bg !w-1.5 !h-1.5" />
    </div>
  );
}

export const ExecNode = memo(ExecNodeComponent);
