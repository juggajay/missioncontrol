import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, RefreshCw, DollarSign, Zap, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SessionEntry } from '@mission-control/shared';

// Approximate Claude pricing per 1M tokens (USD)
const PRICING = {
  input: 3.0,   // $3 per 1M input tokens (Sonnet-class)
  output: 15.0,  // $15 per 1M output tokens (Sonnet-class)
} as const;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * PRICING.input + (outputTokens / 1_000_000) * PRICING.output;
}

export function UsagePage() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<'totalTokens' | 'inputTokens' | 'outputTokens' | 'cost'>('totalTokens');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : data.sessions || []);
    } catch (err) {
      toast.error(`Failed to load sessions: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const aggregates = useMemo(() => {
    let totalInput = 0;
    let totalOutput = 0;
    let totalContext = 0;
    let totalAll = 0;
    for (const s of sessions) {
      totalInput += s.inputTokens;
      totalOutput += s.outputTokens;
      totalContext += s.contextTokens;
      totalAll += s.totalTokens;
    }
    return {
      totalInput,
      totalOutput,
      totalContext,
      totalAll,
      totalCost: estimateCost(totalInput, totalOutput),
      sessionCount: sessions.length,
    };
  }, [sessions]);

  const sortedSessions = useMemo(() => {
    const copy = [...sessions];
    copy.sort((a, b) => {
      let va: number, vb: number;
      if (sortKey === 'cost') {
        va = estimateCost(a.inputTokens, a.outputTokens);
        vb = estimateCost(b.inputTokens, b.outputTokens);
      } else {
        va = a[sortKey];
        vb = b[sortKey];
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return copy;
  }, [sessions, sortKey, sortDir]);

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const SortIndicator = ({ col }: { col: typeof sortKey }) =>
    sortKey === col ? (
      <span className="ml-1 text-cyber-cyan">{sortDir === 'desc' ? '▼' : '▲'}</span>
    ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan text-glow-cyan">
            USAGE & COSTS
          </h2>
          <p className="text-cyber-text-muted text-sm mt-1">
            Token consumption and cost estimates across {aggregates.sessionCount} session{aggregates.sessionCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="p-2 rounded text-cyber-text-muted hover:text-cyber-cyan hover:bg-cyber-bg-surface transition-all"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          icon={<Zap size={16} />}
          label="TOTAL TOKENS"
          value={formatTokens(aggregates.totalAll)}
          color="cyan"
        />
        <KPICard
          icon={<ArrowUpRight size={16} />}
          label="INPUT TOKENS"
          value={formatTokens(aggregates.totalInput)}
          sublabel={`${aggregates.totalAll > 0 ? Math.round((aggregates.totalInput / aggregates.totalAll) * 100) : 0}% of total`}
          color="blue"
        />
        <KPICard
          icon={<ArrowDownRight size={16} />}
          label="OUTPUT TOKENS"
          value={formatTokens(aggregates.totalOutput)}
          sublabel={`${aggregates.totalAll > 0 ? Math.round((aggregates.totalOutput / aggregates.totalAll) * 100) : 0}% of total`}
          color="purple"
        />
        <KPICard
          icon={<DollarSign size={16} />}
          label="EST. COST"
          value={`$${aggregates.totalCost.toFixed(2)}`}
          sublabel="Sonnet-class pricing"
          color="green"
        />
      </div>

      {/* Context token bar */}
      {aggregates.totalContext > 0 && (
        <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg p-4 border-t-2 border-t-cyber-yellow/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-display font-semibold">
              Context Window Usage
            </span>
            <span className="font-mono text-xs text-cyber-yellow">{formatTokens(aggregates.totalContext)} context tokens</span>
          </div>
          <div className="text-[10px] text-cyber-text-disabled font-mono">
            Average: {formatTokens(Math.round(aggregates.totalContext / Math.max(aggregates.sessionCount, 1)))} per session
          </div>
        </div>
      )}

      {/* Token distribution visualization */}
      {sessions.length > 0 && (
        <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg p-4 border-t-2 border-t-cyber-cyan/50">
          <h3 className="font-display text-sm font-semibold tracking-wider text-cyber-text-muted uppercase mb-4">
            Token Distribution by Session
          </h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {sortedSessions.slice(0, 20).map((session) => {
              const pct = aggregates.totalAll > 0 ? (session.totalTokens / aggregates.totalAll) * 100 : 0;
              const inputPct = session.totalTokens > 0 ? (session.inputTokens / session.totalTokens) * 100 : 0;
              return (
                <div key={session.sessionKey} className="group">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono text-[10px] text-cyber-text truncate max-w-[250px]">
                      {session.displayName || session.sessionKey}
                    </span>
                    <span className="font-mono text-[10px] text-cyber-text-muted ml-2 shrink-0">
                      {formatTokens(session.totalTokens)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-cyber-bg rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div
                        className="bg-cyber-blue/60 transition-all"
                        style={{ width: `${inputPct * (pct / 100)}%`, minWidth: pct > 0 ? '1px' : '0' }}
                      />
                      <div
                        className="bg-cyber-purple/60 transition-all"
                        style={{ width: `${(100 - inputPct) * (pct / 100)}%`, minWidth: pct > 0 ? '1px' : '0' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] font-mono text-cyber-text-disabled">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyber-blue/60" /> Input</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyber-purple/60" /> Output</span>
          </div>
        </div>
      )}

      {/* Per-Session Table */}
      <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyber-border">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">
                  Session
                </th>
                <th
                  className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display cursor-pointer hover:text-cyber-cyan transition-colors"
                  onClick={() => handleSort('inputTokens')}
                >
                  Input <SortIndicator col="inputTokens" />
                </th>
                <th
                  className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display cursor-pointer hover:text-cyber-cyan transition-colors"
                  onClick={() => handleSort('outputTokens')}
                >
                  Output <SortIndicator col="outputTokens" />
                </th>
                <th
                  className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display cursor-pointer hover:text-cyber-cyan transition-colors"
                  onClick={() => handleSort('totalTokens')}
                >
                  Total <SortIndicator col="totalTokens" />
                </th>
                <th
                  className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display cursor-pointer hover:text-cyber-cyan transition-colors"
                  onClick={() => handleSort('cost')}
                >
                  Est. Cost <SortIndicator col="cost" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 rounded-full border-2 border-dashed border-cyber-cyan/50 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-cyber-text-muted font-mono text-xs">
                    No session data available
                  </td>
                </tr>
              ) : (
                sortedSessions.map((session) => {
                  const cost = estimateCost(session.inputTokens, session.outputTokens);
                  return (
                    <tr
                      key={session.sessionKey}
                      className="border-b border-cyber-border/50 hover:bg-cyber-bg-surface transition-all"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BarChart3 size={14} className="text-cyber-cyan shrink-0" />
                          <div>
                            <div className="font-mono text-xs text-cyber-text">
                              {session.displayName || session.sessionKey}
                            </div>
                            <div className="font-mono text-[10px] text-cyber-text-disabled">
                              {session.channel || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-xs text-cyber-blue">{session.inputTokens.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-xs text-cyber-purple">{session.outputTokens.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-xs text-cyber-text">{session.totalTokens.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-xs text-cyber-green">${cost.toFixed(4)}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sessions.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-cyber-border bg-cyber-bg-surface/50">
                  <td className="px-4 py-3 font-display text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold">
                    Totals
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-xs text-cyber-blue font-semibold">{aggregates.totalInput.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-xs text-cyber-purple font-semibold">{aggregates.totalOutput.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-xs text-cyber-text font-semibold">{aggregates.totalAll.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-xs text-cyber-green font-semibold">${aggregates.totalCost.toFixed(2)}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// --- KPI Card ---

function KPICard({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
}) {
  const colorClasses: Record<string, { border: string; text: string }> = {
    cyan: { border: 'border-t-cyber-cyan/50', text: 'text-cyber-cyan' },
    blue: { border: 'border-t-cyber-blue/50', text: 'text-cyber-blue' },
    green: { border: 'border-t-cyber-green/50', text: 'text-cyber-green' },
    purple: { border: 'border-t-cyber-purple/50', text: 'text-cyber-purple' },
    yellow: { border: 'border-t-cyber-yellow/50', text: 'text-cyber-yellow' },
  };
  const c = colorClasses[color] || colorClasses.cyan;

  return (
    <div className={`bg-cyber-bg-secondary border border-cyber-border rounded-lg p-4 border-t-2 ${c.border}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={c.text}>{icon}</span>
        <p className="font-mono text-[10px] font-semibold tracking-widest text-cyber-text-muted uppercase">{label}</p>
      </div>
      <p className={`font-display text-2xl font-bold ${c.text}`}>{value}</p>
      {sublabel && <p className="font-mono text-[10px] text-cyber-text-muted mt-0.5">{sublabel}</p>}
    </div>
  );
}

// --- Utilities ---

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
