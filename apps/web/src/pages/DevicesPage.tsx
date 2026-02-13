import { useState, useEffect, useCallback } from 'react';
import {
  Cpu, RefreshCw, ChevronRight, X, Play, Wifi, WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface DeviceNode {
  nodeId: string;
  name?: string;
  type?: string;
  status?: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export function DevicesPage() {
  const [nodes, setNodes] = useState<DeviceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DeviceNode | null>(null);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nodes');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setNodes(Array.isArray(data) ? data : data.nodes || []);
    } catch (err) {
      toast.error(`Failed to load devices: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan text-glow-cyan">
            DEVICES
          </h2>
          <p className="text-cyber-text-muted text-sm mt-1">
            {nodes.length} connected node{nodes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchNodes}
          disabled={loading}
          className="p-2 rounded text-cyber-text-muted hover:text-cyber-cyan hover:bg-cyber-bg-surface transition-all"
          title="Refresh nodes"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Node List */}
      <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyber-border">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Node</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Type</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Status</th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Capabilities</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading && nodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 rounded-full border-2 border-dashed border-cyber-cyan/50 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                  </td>
                </tr>
              ) : nodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-cyber-text-muted font-mono text-xs">
                    No devices connected
                  </td>
                </tr>
              ) : (
                nodes.map((node) => (
                  <tr
                    key={node.nodeId}
                    onClick={() => setSelected(node)}
                    className={`
                      border-b border-cyber-border/50 cursor-pointer transition-all
                      ${selected?.nodeId === node.nodeId
                        ? 'bg-cyber-cyan/5'
                        : 'hover:bg-cyber-bg-surface'
                      }
                    `}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-cyber-blue shrink-0" />
                        <div>
                          <div className="font-mono text-xs text-cyber-text">{node.name || node.nodeId}</div>
                          <div className="font-mono text-[10px] text-cyber-text-disabled truncate max-w-[200px]">
                            {node.nodeId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-cyber-text-muted">{node.type || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <NodeStatusBadge status={node.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-xs text-cyber-text-muted">
                        {node.capabilities?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-2">
                      <ChevronRight size={12} className="text-cyber-text-disabled" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <DeviceDetailPanel
          node={selected}
          onClose={() => setSelected(null)}
          onRefresh={fetchNodes}
        />
      )}
    </div>
  );
}

// --- Status Badge ---

function NodeStatusBadge({ status }: { status?: string }) {
  const s = status?.toLowerCase() || 'unknown';
  const colorMap: Record<string, string> = {
    online: 'bg-cyber-green/15 text-cyber-green border-cyber-green/30',
    connected: 'bg-cyber-green/15 text-cyber-green border-cyber-green/30',
    active: 'bg-cyber-green/15 text-cyber-green border-cyber-green/30',
    offline: 'bg-cyber-text-disabled/15 text-cyber-text-disabled border-cyber-text-disabled/30',
    disconnected: 'bg-cyber-text-disabled/15 text-cyber-text-disabled border-cyber-text-disabled/30',
    error: 'bg-cyber-red/15 text-cyber-red border-cyber-red/30',
  };
  const classes = colorMap[s] || 'bg-cyber-blue/15 text-cyber-blue border-cyber-blue/30';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${classes}`}>
      {s === 'online' || s === 'connected' || s === 'active' ? (
        <Wifi size={10} />
      ) : s === 'offline' || s === 'disconnected' ? (
        <WifiOff size={10} />
      ) : null}
      {s}
    </span>
  );
}

// --- Detail Panel ---

interface DeviceDetailPanelProps {
  node: DeviceNode;
  onClose: () => void;
  onRefresh: () => void;
}

function DeviceDetailPanel({ node, onClose, onRefresh }: DeviceDetailPanelProps) {
  const [invoking, setInvoking] = useState<string | null>(null);
  const [invokeResult, setInvokeResult] = useState<unknown>(null);

  async function handleInvoke(capability: string) {
    setInvoking(capability);
    setInvokeResult(null);
    try {
      const res = await fetch('/api/nodes/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: node.nodeId, capability }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setInvokeResult(data);
      toast.success(`Invoked ${capability}`);
      onRefresh();
    } catch (err) {
      toast.error(`Invoke failed: ${(err as Error).message}`);
    } finally {
      setInvoking(null);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] z-50 bg-cyber-bg-secondary border-l border-cyber-border shadow-xl overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cyber-bg-secondary border-b border-cyber-border px-4 py-3 flex items-center justify-between">
        <span className="font-display text-xs uppercase tracking-wider text-cyber-text-muted">
          Device Detail
        </span>
        <button onClick={onClose} className="text-cyber-text-muted hover:text-cyber-text transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Node Info */}
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-cyber-text flex items-center gap-2">
            <Cpu size={16} className="text-cyber-blue" />
            {node.name || node.nodeId}
          </h3>
          <div className="font-mono text-[10px] text-cyber-text-disabled break-all bg-cyber-bg/50 rounded px-2 py-1">
            {node.nodeId}
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <MetaRow label="Type">
            <span className="font-mono text-xs text-cyber-text">{node.type || '—'}</span>
          </MetaRow>
          <MetaRow label="Status">
            <NodeStatusBadge status={node.status} />
          </MetaRow>
        </div>

        {/* Extra metadata */}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold">
              Metadata
            </span>
            <div className="bg-cyber-bg rounded-lg p-3 font-mono text-[11px] text-cyber-text-muted overflow-x-auto max-h-[200px] overflow-y-auto">
              <pre>{JSON.stringify(node.metadata, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Capabilities */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold flex items-center gap-1">
            <Play size={10} /> Capabilities
          </span>
          {(!node.capabilities || node.capabilities.length === 0) ? (
            <p className="text-cyber-text-disabled text-xs font-mono">No capabilities reported</p>
          ) : (
            <div className="space-y-1.5">
              {node.capabilities.map((cap) => (
                <div
                  key={cap}
                  className="flex items-center justify-between bg-cyber-bg rounded px-3 py-2 border border-cyber-border/50"
                >
                  <span className="font-mono text-xs text-cyber-text">{cap}</span>
                  <button
                    onClick={() => handleInvoke(cap)}
                    disabled={invoking === cap}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-semibold bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/20 hover:shadow-glow-cyan transition-all disabled:opacity-40"
                  >
                    <Play size={10} />
                    {invoking === cap ? 'Running...' : 'Invoke'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoke Result */}
        {invokeResult !== null && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold">
              Last Result
            </span>
            <div className="bg-cyber-bg rounded-lg p-3 font-mono text-[11px] text-cyber-green overflow-x-auto max-h-[300px] overflow-y-auto">
              <pre>{JSON.stringify(invokeResult, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold">{label}</span>
      {children}
    </div>
  );
}
