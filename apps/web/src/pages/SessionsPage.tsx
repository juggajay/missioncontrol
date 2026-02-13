import { useState, useEffect, useCallback } from 'react';
import {
  Monitor, RefreshCw, Settings, MessageSquare, RotateCcw,
  ChevronRight, X, Send, AlertTriangle, Bot, Brain, Volume2,
  OctagonX,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SessionEntry } from '@mission-control/shared';

export function SessionsPage() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionEntry | null>(null);

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

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan text-glow-cyan">
            SESSIONS
          </h2>
          <p className="text-cyber-text-muted text-sm mt-1">
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="p-2 rounded text-cyber-text-muted hover:text-cyber-cyan hover:bg-cyber-bg-surface transition-all"
          title="Refresh sessions"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Session Table */}
      <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyber-border">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Session</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Channel</th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Tokens</th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-cyber-text-muted font-display">Updated</th>
                <th className="w-10"></th>
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
                    No sessions found
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr
                    key={session.sessionKey}
                    onClick={() => setSelectedSession(session)}
                    className={`
                      border-b border-cyber-border/50 cursor-pointer transition-all
                      ${selectedSession?.sessionKey === session.sessionKey
                        ? 'bg-cyber-cyan/5'
                        : 'hover:bg-cyber-bg-surface'
                      }
                    `}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Monitor size={14} className="text-cyber-purple shrink-0" />
                        <div>
                          <div className="font-mono text-xs text-cyber-text">{session.displayName || session.sessionKey}</div>
                          <div className="font-mono text-[10px] text-cyber-text-disabled truncate max-w-[200px]">
                            {session.sessionKey}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-cyber-text-muted">{session.channel || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-xs text-cyber-text-muted">
                        {formatTokens(session.totalTokens)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-[10px] text-cyber-text-disabled">
                        {formatDate(session.updatedAt)}
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

      {/* Session Detail Panel */}
      {selectedSession && (
        <SessionDetailPanel
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onRefresh={fetchSessions}
        />
      )}
    </div>
  );
}

// --- Session Detail Side Panel ---

interface SessionDetailPanelProps {
  session: SessionEntry;
  onClose: () => void;
  onRefresh: () => void;
}

function SessionDetailPanel({ session, onClose, onRefresh }: SessionDetailPanelProps) {
  const [model, setModel] = useState('');
  const [thinkingLevel, setThinkingLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [verbose, setVerbose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<unknown[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [aborting, setAborting] = useState(false);

  useEffect(() => {
    setConfirmReset(false);
  }, [session.sessionKey]);

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { sessionKey: session.sessionKey };
      if (model) body.model = model;
      body.thinkingLevel = thinkingLevel;
      body.verbose = verbose;

      const res = await fetch('/api/sessions/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Session settings updated');
      onRefresh();
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleAbort() {
    setAborting(true);
    try {
      const res = await fetch('/api/sessions/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey: session.sessionKey }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Abort signal sent');
      onRefresh();
    } catch (err) {
      toast.error(`Abort failed: ${(err as Error).message}`);
    } finally {
      setAborting(false);
    }
  }

  async function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/sessions/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey: session.sessionKey }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Session reset');
      setConfirmReset(false);
      onRefresh();
    } catch (err) {
      toast.error(`Reset failed: ${(err as Error).message}`);
    } finally {
      setResetting(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/sessions/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey: session.sessionKey }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : data.messages || data.history || []);
    } catch (err) {
      toast.error(`Failed to load history: ${(err as Error).message}`);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] z-50 bg-cyber-bg-secondary border-l border-cyber-border shadow-xl overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cyber-bg-secondary border-b border-cyber-border px-4 py-3 flex items-center justify-between">
        <span className="font-display text-xs uppercase tracking-wider text-cyber-text-muted">
          Session Detail
        </span>
        <button onClick={onClose} className="text-cyber-text-muted hover:text-cyber-text transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Session Info */}
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-cyber-text flex items-center gap-2">
            <Monitor size={16} className="text-cyber-purple" />
            {session.displayName || 'Session'}
          </h3>
          <div className="font-mono text-[10px] text-cyber-text-disabled break-all bg-cyber-bg/50 rounded px-2 py-1">
            {session.sessionKey}
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <MetaRow label="Channel">
            <span className="font-mono text-xs text-cyber-text">{session.channel || '—'}</span>
          </MetaRow>
          <MetaRow label="Total Tokens">
            <span className="font-mono text-xs text-cyber-cyan">{session.totalTokens.toLocaleString()}</span>
          </MetaRow>
          <MetaRow label="Input / Output">
            <span className="font-mono text-[10px] text-cyber-text-muted">
              {session.inputTokens.toLocaleString()} / {session.outputTokens.toLocaleString()}
            </span>
          </MetaRow>
          <MetaRow label="Context">
            <span className="font-mono text-[10px] text-cyber-text-muted">
              {session.contextTokens.toLocaleString()} tokens
            </span>
          </MetaRow>
          <MetaRow label="Updated">
            <span className="font-mono text-[10px] text-cyber-text-muted">{formatDate(session.updatedAt)}</span>
          </MetaRow>
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <span className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold flex items-center gap-1">
            <Settings size={10} /> Settings
          </span>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold mb-1 block">
              <Bot size={10} className="inline mr-1" />
              Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. claude-sonnet-4-5-20250929"
              className="w-full bg-cyber-bg-surface border border-cyber-border rounded px-3 py-1.5 text-xs font-mono text-cyber-text focus:border-cyber-cyan/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold mb-1 block">
              <Brain size={10} className="inline mr-1" />
              Thinking Level
            </label>
            <div className="flex gap-1">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setThinkingLevel(level)}
                  className={`
                    flex-1 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all
                    ${thinkingLevel === level
                      ? 'bg-cyber-purple/15 border border-cyber-purple/40 text-cyber-purple'
                      : 'bg-cyber-bg-surface border border-cyber-border text-cyber-text-muted hover:text-cyber-text'
                    }
                  `}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold flex items-center gap-1">
              <Volume2 size={10} />
              Verbose
            </label>
            <button
              onClick={() => setVerbose(!verbose)}
              className={`
                w-10 h-5 rounded-full transition-all relative
                ${verbose
                  ? 'bg-cyber-cyan/30 border border-cyber-cyan/50'
                  : 'bg-cyber-bg-surface border border-cyber-border'
                }
              `}
            >
              <span
                className={`
                  absolute top-0.5 w-4 h-4 rounded-full transition-all
                  ${verbose
                    ? 'left-5 bg-cyber-cyan shadow-glow-cyan'
                    : 'left-0.5 bg-cyber-text-disabled'
                  }
                `}
              />
            </button>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-semibold bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/20 hover:shadow-glow-cyan transition-all disabled:opacity-40"
          >
            <Send size={12} />
            {saving ? 'Saving...' : 'Apply Settings'}
          </button>
        </div>

        {/* History */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold flex items-center gap-1">
              <MessageSquare size={10} /> Conversation History
            </span>
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="text-[10px] font-mono text-cyber-cyan/60 hover:text-cyber-cyan transition-colors"
            >
              {historyLoading ? 'Loading...' : history ? 'Reload' : 'Load'}
            </button>
          </div>

          {history && (
            <div className="max-h-[400px] overflow-y-auto space-y-2 bg-cyber-bg rounded-lg p-2">
              {history.length === 0 ? (
                <p className="text-center text-cyber-text-disabled text-xs font-mono py-4">No messages</p>
              ) : (
                history.map((msg: unknown, i: number) => (
                  <HistoryMessage key={i} message={msg} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-cyber-border space-y-2">
          <button
            onClick={handleAbort}
            disabled={aborting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all bg-cyber-orange/10 border border-cyber-orange/30 text-cyber-orange hover:bg-cyber-orange/20 hover:shadow-[0_0_10px_rgba(255,107,43,0.2)] disabled:opacity-40"
          >
            <OctagonX size={12} />
            {aborting ? 'Aborting...' : 'Abort Session'}
          </button>
          <button
            onClick={handleReset}
            disabled={resetting}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all
              ${confirmReset
                ? 'bg-cyber-red/20 border border-cyber-red/50 text-cyber-red shadow-glow-red'
                : 'bg-cyber-red/10 border border-cyber-red/30 text-cyber-red hover:bg-cyber-red/20'
              }
              disabled:opacity-40
            `}
          >
            {confirmReset ? <AlertTriangle size={12} /> : <RotateCcw size={12} />}
            {confirmReset ? 'Confirm Reset' : 'Reset Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold">{label}</span>
      {children}
    </div>
  );
}

function HistoryMessage({ message }: { message: unknown }) {
  const msg = message as Record<string, unknown>;
  const role = (msg.role as string) || 'unknown';
  const content = typeof msg.content === 'string'
    ? msg.content
    : typeof msg.text === 'string'
      ? msg.text
      : JSON.stringify(msg.content || msg, null, 2);

  const isUser = role === 'user' || role === 'human';
  const isAssistant = role === 'assistant';
  const isTool = role === 'tool' || role === 'tool_result';

  return (
    <div
      className={`
        rounded px-3 py-2 text-xs font-mono
        ${isUser
          ? 'ml-8 bg-cyber-bg-surface border-r-2 border-cyber-text-disabled text-cyber-text-muted'
          : isAssistant
            ? 'mr-8 bg-cyber-bg-secondary border-l-2 border-cyber-cyan text-cyber-text'
            : isTool
              ? 'mx-4 bg-cyber-bg border-l-2 border-cyber-purple text-cyber-text-muted text-[10px]'
              : 'bg-cyber-bg-surface text-cyber-text-muted'
        }
      `}
    >
      <div className="text-[9px] uppercase tracking-wider text-cyber-text-disabled mb-1">{role}</div>
      <div className="whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{content}</div>
    </div>
  );
}

// --- Utilities ---

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}
