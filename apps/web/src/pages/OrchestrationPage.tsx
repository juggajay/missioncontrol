import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GitBranch, RefreshCw, Bot, CheckSquare, Monitor, ArrowRight,
} from 'lucide-react';
import type { SessionEntry, Task } from '@mission-control/shared';

export function OrchestrationPage() {
  const [apiSessions, setApiSessions] = useState<SessionEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessRes, taskRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/tasks'),
      ]);

      if (sessRes.ok) {
        const data = await sessRes.json();
        const arr = Array.isArray(data) ? data : Array.isArray(data?.sessions) ? data.sessions : [];
        // Defensive: filter out entries without sessionKey
        setApiSessions(arr.filter((s: unknown) => s && typeof (s as SessionEntry).sessionKey === 'string'));
      }

      if (taskRes.ok) {
        const data = await taskRes.json();
        const arr = Array.isArray(data) ? data : [];
        setTasks(arr.filter((t: unknown) => t && typeof (t as Task).id === 'string'));
      }
    } catch (err) {
      console.error('[OrchestrationPage] fetchData error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group sessions by agent — defensive
  const agents = useMemo(() => {
    const map = new Map<string, { sessions: SessionEntry[]; tasks: Task[] }>();

    for (const s of apiSessions) {
      try {
        const agentId = String(s.sessionKey || '').split(':')[0] || 'unknown';
        if (!map.has(agentId)) map.set(agentId, { sessions: [], tasks: [] });
        map.get(agentId)!.sessions.push(s);
      } catch {
        // skip malformed session
      }
    }

    for (const task of tasks) {
      try {
        const aid = task.assigned_agent_id;
        if (aid && map.has(aid)) {
          map.get(aid)!.tasks.push(task);
        }
      } catch {
        // skip malformed task
      }
    }

    return map;
  }, [apiSessions, tasks]);

  const unassignedTasks = tasks.filter((t) => !t.assigned_agent_id);
  const activeTasks = tasks.filter((t) => t.status !== 'done').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan text-glow-cyan">
            ORCHESTRATION
          </h2>
          <p className="text-cyber-text-muted text-sm mt-1">
            Multi-agent overview &mdash; {agents.size} agent{agents.size !== 1 ? 's' : ''},{' '}
            {apiSessions.length} session{apiSessions.length !== 1 ? 's' : ''},{' '}
            {activeTasks} active task{activeTasks !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded text-cyber-text-muted hover:text-cyber-cyan hover:bg-cyber-bg-surface transition-all"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniKPI label="Agents" value={agents.size} color="purple" />
        <MiniKPI label="Sessions" value={apiSessions.length} color="cyan" />
        <MiniKPI label="Active Tasks" value={activeTasks} color="green" />
        <MiniKPI label="Unassigned" value={unassignedTasks.length} color={unassignedTasks.length > 0 ? 'yellow' : 'cyan'} />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-cyber-red/10 border border-cyber-red/30 rounded-lg p-4 text-cyber-red font-mono text-xs">
          Error: {error}
        </div>
      )}

      {/* Loading */}
      {loading && agents.size === 0 && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-cyber-cyan/50 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      )}

      {/* Empty */}
      {!loading && agents.size === 0 && unassignedTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GitBranch size={40} className="text-cyber-text-disabled mb-3" />
          <p className="font-display text-lg text-cyber-text-muted mb-2">No Active Orchestration</p>
          <p className="text-cyber-text-disabled text-sm">
            Agent relationships and task assignments will appear here when agents start working
          </p>
        </div>
      )}

      {/* Agent Cards */}
      {Array.from(agents.entries()).map(([agentId, data]) => (
        <AgentCard key={agentId} agentId={agentId} data={data} />
      ))}

      {/* Unassigned Tasks */}
      {unassignedTasks.length > 0 && (
        <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg border-t-2 border-t-cyber-yellow/50">
          <div className="px-4 py-3 border-b border-cyber-border flex items-center gap-2">
            <CheckSquare size={14} className="text-cyber-yellow" />
            <span className="font-display text-sm font-semibold tracking-wider text-cyber-yellow uppercase">
              Unassigned Tasks
            </span>
            <span className="font-mono text-xs text-cyber-text-muted ml-auto">{unassignedTasks.length}</span>
          </div>
          <div className="p-3 space-y-1.5">
            {unassignedTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Agent Card ---

function AgentCard({
  agentId,
  data,
}: {
  agentId: string;
  data: { sessions: SessionEntry[]; tasks: Task[] };
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg border-t-2 border-t-cyber-purple/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cyber-bg-surface/30 transition-colors"
      >
        <Bot size={16} className="text-cyber-purple shrink-0" />
        <span className="font-mono text-sm text-cyber-text font-semibold">{agentId}</span>
        <div className="flex items-center gap-3 ml-auto text-[10px] font-mono text-cyber-text-muted">
          <span className="flex items-center gap-1">
            <Monitor size={10} className="text-cyber-cyan" />
            {data.sessions.length} session{data.sessions.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <CheckSquare size={10} className="text-cyber-yellow" />
            {data.tasks.length} task{data.tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <ArrowRight size={12} className={`text-cyber-text-disabled transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-cyber-border">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x lg:divide-cyber-border">
            {/* Sessions */}
            <div className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-display font-semibold mb-2 flex items-center gap-1">
                <Monitor size={10} /> Sessions
              </div>
              {data.sessions.length === 0 ? (
                <p className="text-cyber-text-disabled text-xs font-mono">No sessions</p>
              ) : (
                <div className="space-y-1.5">
                  {data.sessions.map((session) => (
                    <div
                      key={session.sessionKey}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-cyber-bg/50 border border-cyber-border/30"
                    >
                      <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-cyber-text-disabled" />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs text-cyber-text truncate">
                          {session.displayName || session.sessionKey || 'Unknown'}
                        </div>
                        <div className="font-mono text-[10px] text-cyber-text-disabled">
                          {session.channel || 'unknown'} &middot; {formatTokens(session.totalTokens ?? 0)} tokens
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-display font-semibold mb-2 flex items-center gap-1">
                <CheckSquare size={10} /> Assigned Tasks
              </div>
              {data.tasks.length === 0 ? (
                <p className="text-cyber-text-disabled text-xs font-mono">No tasks assigned</p>
              ) : (
                <div className="space-y-1.5">
                  {data.tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Task Row ---

function TaskRow({ task }: { task: Task }) {
  const statusColors: Record<string, string> = {
    planning: 'border-l-cyber-blue bg-cyber-blue/5',
    inbox: 'border-l-cyber-cyan bg-cyber-cyan/5',
    assigned: 'border-l-cyber-purple bg-cyber-purple/5',
    in_progress: 'border-l-cyber-green bg-cyber-green/5',
    testing: 'border-l-cyber-yellow bg-cyber-yellow/5',
    review: 'border-l-cyber-orange bg-cyber-orange/5',
    done: 'border-l-cyber-green/50 bg-cyber-green/5',
  };
  const classes = statusColors[task.status] || 'border-l-cyber-text-disabled';

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded border-l-2 ${classes}`}>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs text-cyber-text truncate">{task.title || 'Untitled'}</div>
      </div>
      <span className="font-mono text-[9px] uppercase tracking-wider text-cyber-text-muted shrink-0">
        {(task.status || 'unknown').replace('_', ' ')}
      </span>
    </div>
  );
}

// --- Mini KPI ---

function MiniKPI({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, { border: string; text: string }> = {
    cyan: { border: 'border-t-cyber-cyan/50', text: 'text-cyber-cyan' },
    green: { border: 'border-t-cyber-green/50', text: 'text-cyber-green' },
    purple: { border: 'border-t-cyber-purple/50', text: 'text-cyber-purple' },
    yellow: { border: 'border-t-cyber-yellow/50', text: 'text-cyber-yellow' },
  };
  const c = colorMap[color] || colorMap.cyan;

  return (
    <div className={`bg-cyber-bg-secondary border border-cyber-border rounded-lg p-3 border-t-2 ${c.border}`}>
      <p className="font-mono text-[10px] font-semibold tracking-widest text-cyber-text-muted uppercase">{label}</p>
      <p className={`font-display text-xl font-bold ${c.text}`}>{value ?? 0}</p>
    </div>
  );
}

// --- Utils ---

function formatTokens(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
