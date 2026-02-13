import { useState, useEffect, useCallback } from 'react';
import {
  Clock, RefreshCw, Play, Trash2, Plus, AlertTriangle,
  ToggleLeft, ToggleRight, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface CronJob {
  id: string;
  schedule: string;
  sessionKey: string;
  message: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  [key: string]: unknown;
}

export function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cron');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : data.jobs || []);
    } catch (err) {
      toast.error(`Failed to load cron jobs: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function handleToggle(job: CronJob) {
    try {
      const res = await fetch(`/api/cron/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !job.enabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(job.enabled ? 'Job disabled' : 'Job enabled');
      fetchJobs();
    } catch (err) {
      toast.error(`Toggle failed: ${(err as Error).message}`);
    }
  }

  async function handleRunNow(jobId: string) {
    try {
      const res = await fetch(`/api/cron/${jobId}/run`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Job triggered');
    } catch (err) {
      toast.error(`Run failed: ${(err as Error).message}`);
    }
  }

  async function handleDelete(jobId: string) {
    try {
      const res = await fetch(`/api/cron/${jobId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Job deleted');
      fetchJobs();
    } catch (err) {
      toast.error(`Delete failed: ${(err as Error).message}`);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan text-glow-cyan">
            CRON JOBS
          </h2>
          <p className="text-cyber-text-muted text-sm mt-1">
            {jobs.length} scheduled job{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="p-2 rounded text-cyber-text-muted hover:text-cyber-cyan hover:bg-cyber-bg-surface transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/20 hover:shadow-glow-cyan transition-all"
          >
            <Plus size={12} />
            Add Job
          </button>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyber-border">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Status</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Schedule</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Session</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Message</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Last Run</th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 rounded-full border-2 border-dashed border-cyber-cyan/50 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-cyber-text-muted font-mono text-xs">
                    No cron jobs configured
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <CronJobRow
                    key={job.id}
                    job={job}
                    onToggle={() => handleToggle(job)}
                    onRun={() => handleRunNow(job.id)}
                    onDelete={() => handleDelete(job.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Job Dialog */}
      {showAdd && (
        <AddCronJobDialog
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            fetchJobs();
          }}
        />
      )}
    </div>
  );
}

// --- Cron Job Row ---

function CronJobRow({
  job,
  onToggle,
  onRun,
  onDelete,
}: {
  job: CronJob;
  onToggle: () => void;
  onRun: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <tr className="border-b border-cyber-border/50 hover:bg-cyber-bg-surface transition-all">
      {/* Status toggle */}
      <td className="px-4 py-3">
        <button onClick={onToggle} className="transition-colors" title={job.enabled ? 'Disable' : 'Enable'}>
          {job.enabled ? (
            <ToggleRight size={20} className="text-cyber-green" />
          ) : (
            <ToggleLeft size={20} className="text-cyber-text-disabled" />
          )}
        </button>
      </td>

      {/* Schedule */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-cyber-cyan shrink-0" />
          <span className="font-mono text-xs text-cyber-text">{job.schedule}</span>
        </div>
        {job.nextRun && (
          <div className="font-mono text-[9px] text-cyber-text-disabled mt-0.5">
            Next: {formatDate(job.nextRun)}
          </div>
        )}
      </td>

      {/* Session */}
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-cyber-text-muted truncate block max-w-[150px]">
          {job.sessionKey}
        </span>
      </td>

      {/* Message */}
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-cyber-text-muted truncate block max-w-[200px]">
          {job.message}
        </span>
      </td>

      {/* Last Run */}
      <td className="px-4 py-3">
        <span className="font-mono text-[10px] text-cyber-text-disabled">
          {job.lastRun ? formatDate(job.lastRun) : '—'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onRun}
            className="p-1.5 rounded text-cyber-green/70 hover:text-cyber-green hover:bg-cyber-green/10 transition-all"
            title="Run now"
          >
            <Play size={13} />
          </button>
          <button
            onClick={() => {
              if (confirmDelete) {
                onDelete();
                setConfirmDelete(false);
              } else {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }
            }}
            className={`
              p-1.5 rounded transition-all
              ${confirmDelete
                ? 'text-cyber-red bg-cyber-red/15 shadow-glow-red'
                : 'text-cyber-red/50 hover:text-cyber-red hover:bg-cyber-red/10'
              }
            `}
            title={confirmDelete ? 'Click again to confirm' : 'Delete'}
          >
            {confirmDelete ? <AlertTriangle size={13} /> : <Trash2 size={13} />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// --- Add Cron Job Dialog ---

function AddCronJobDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [schedule, setSchedule] = useState('');
  const [sessionKey, setSessionKey] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [sessions, setSessions] = useState<{ sessionKey: string; displayName: string }[]>([]);

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.sessions || [];
        setSessions(list.map((s: { sessionKey: string; displayName?: string }) => ({
          sessionKey: s.sessionKey,
          displayName: s.displayName || s.sessionKey,
        })));
      })
      .catch(() => { /* best effort */ });
  }, []);

  async function handleCreate() {
    if (!schedule || !sessionKey || !message) {
      toast.error('All fields are required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, sessionKey, message }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Cron job created');
      onCreated();
    } catch (err) {
      toast.error(`Create failed: ${(err as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg w-[480px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyber-border">
          <h3 className="font-display text-sm uppercase tracking-wider text-cyber-cyan">
            Add Cron Job
          </h3>
          <button onClick={onClose} className="text-cyber-text-muted hover:text-cyber-text transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold mb-1 block">
              Cron Expression
            </label>
            <input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="*/5 * * * *"
              className="w-full bg-cyber-bg-surface border border-cyber-border rounded px-3 py-2 text-sm font-mono text-cyber-text focus:border-cyber-cyan/50 focus:outline-none"
            />
            <CronPreview schedule={schedule} />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold mb-1 block">
              Session
            </label>
            {sessions.length > 0 ? (
              <select
                value={sessionKey}
                onChange={(e) => setSessionKey(e.target.value)}
                className="w-full bg-cyber-bg-surface border border-cyber-border rounded px-3 py-2 text-sm font-mono text-cyber-text focus:border-cyber-cyan/50 focus:outline-none"
              >
                <option value="">Select session...</option>
                {sessions.map((s) => (
                  <option key={s.sessionKey} value={s.sessionKey}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={sessionKey}
                onChange={(e) => setSessionKey(e.target.value)}
                placeholder="Session key..."
                className="w-full bg-cyber-bg-surface border border-cyber-border rounded px-3 py-2 text-sm font-mono text-cyber-text focus:border-cyber-cyan/50 focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold mb-1 block">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What should the agent do on this schedule?"
              rows={3}
              className="w-full bg-cyber-bg-surface border border-cyber-border rounded px-3 py-2 text-sm font-mono text-cyber-text resize-none focus:border-cyber-cyan/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-cyber-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-mono text-cyber-text-muted hover:text-cyber-text transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !schedule || !sessionKey || !message}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-mono font-semibold bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/20 hover:shadow-glow-cyan transition-all disabled:opacity-40"
          >
            <Plus size={12} />
            {creating ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Cron Expression Preview ---

function CronPreview({ schedule }: { schedule: string }) {
  if (!schedule.trim()) return null;
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) {
    return <p className="text-[10px] text-cyber-red font-mono mt-1">Need 5 fields: min hour day month weekday</p>;
  }

  const labels = ['minute', 'hour', 'day', 'month', 'weekday'];
  return (
    <div className="flex gap-2 mt-1">
      {parts.slice(0, 5).map((part, i) => (
        <div key={i} className="text-center">
          <div className="font-mono text-xs text-cyber-cyan">{part}</div>
          <div className="text-[8px] text-cyber-text-disabled uppercase">{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}

// --- Utilities ---

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 0) {
      const absDiff = -diff;
      if (absDiff < 60_000) return 'in <1m';
      if (absDiff < 3600_000) return `in ${Math.floor(absDiff / 60_000)}m`;
      if (absDiff < 86400_000) return `in ${Math.floor(absDiff / 3600_000)}h`;
      return d.toLocaleDateString();
    }
    if (diff < 60_000) return 'just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}
