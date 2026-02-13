import { useState, useEffect } from 'react';
import { useTaskStore } from '@/stores/tasks';
import {
  X, Trash2, Send, Bot, Clock, ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type { Task, TaskStatus, TaskActivity } from '@mission-control/shared';

const STATUS_TRANSITIONS: Record<string, { label: string; next: TaskStatus; color: string }[]> = {
  planning: [{ label: 'Move to Inbox', next: 'inbox', color: 'cyber-cyan' }],
  inbox: [{ label: 'Assign Agent', next: 'assigned', color: 'cyber-purple' }],
  assigned: [{ label: 'Dispatch', next: 'in_progress', color: 'cyber-green' }],
  in_progress: [{ label: 'Mark for Testing', next: 'testing', color: 'cyber-yellow' }],
  testing: [{ label: 'Send to Review', next: 'review', color: 'cyber-orange' }],
  review: [{ label: 'Complete', next: 'done', color: 'cyber-green' }],
  done: [],
};

const priorityOptions = ['low', 'normal', 'high', 'urgent'] as const;

export function TaskDetail() {
  const selectedTask = useTaskStore((s) => s.selectedTask);
  const setSelectedTask = useTaskStore((s) => s.setSelectedTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const dispatchTask = useTaskStore((s) => s.dispatchTask);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setDescription(selectedTask.description || '');
      setPriority(selectedTask.priority);
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [selectedTask?.id]);

  if (!selectedTask) return null;

  const transitions = STATUS_TRANSITIONS[selectedTask.status] || [];

  async function handleSave() {
    await updateTask(selectedTask!.id, { title, description, priority: priority as Task['priority'] });
    setEditing(false);
  }

  async function handleTransition(nextStatus: TaskStatus) {
    if (nextStatus === 'in_progress' && selectedTask!.assigned_agent_id) {
      setDispatching(true);
      try {
        await dispatchTask(selectedTask!.id);
      } catch {
        // Fallback: just move the status
        await updateTask(selectedTask!.id, { status: nextStatus });
      }
      setDispatching(false);
    } else {
      await updateTask(selectedTask!.id, { status: nextStatus });
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteTask(selectedTask!.id);
    setSelectedTask(null);
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] z-50 bg-cyber-bg-secondary border-l border-cyber-border shadow-xl overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cyber-bg-secondary border-b border-cyber-border px-4 py-3 flex items-center justify-between">
        <span className="font-display text-xs uppercase tracking-wider text-cyber-text-muted">
          Task Detail
        </span>
        <button onClick={() => setSelectedTask(null)} className="text-cyber-text-muted hover:text-cyber-text transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Title + Description */}
        {editing ? (
          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-cyber-bg-surface border border-cyber-border rounded px-3 py-2 text-sm text-cyber-text font-medium focus:border-cyber-cyan/50 focus:outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Description..."
              className="w-full bg-cyber-bg-surface border border-cyber-border rounded px-3 py-2 text-sm text-cyber-text font-mono resize-none focus:border-cyber-cyan/50 focus:outline-none"
            />
            <div>
              <label className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold mb-1 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-cyber-bg-surface border border-cyber-border rounded px-3 py-1.5 text-sm text-cyber-text font-mono focus:border-cyber-cyan/50 focus:outline-none"
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded text-xs font-mono font-semibold bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/20 transition-all"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 rounded text-xs font-mono text-cyber-text-muted hover:text-cyber-text transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h3
              className="text-base font-semibold text-cyber-text cursor-pointer hover:text-cyber-cyan transition-colors"
              onClick={() => setEditing(true)}
            >
              {selectedTask.title}
            </h3>
            {selectedTask.description && (
              <p className="text-sm text-cyber-text-muted mt-2 font-mono whitespace-pre-wrap">
                {selectedTask.description}
              </p>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-[10px] uppercase tracking-wider text-cyber-cyan/60 hover:text-cyber-cyan mt-2 font-mono transition-colors"
            >
              Edit
            </button>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2">
          <MetaRow label="Status">
            <span className="font-mono text-xs text-cyber-text uppercase">{selectedTask.status.replace('_', ' ')}</span>
          </MetaRow>
          <MetaRow label="Priority">
            <PriorityBadge priority={selectedTask.priority} />
          </MetaRow>
          <MetaRow label="Agent">
            {selectedTask.assigned_agent_id ? (
              <span className="flex items-center gap-1 font-mono text-xs text-cyber-purple">
                <Bot size={11} /> {selectedTask.assigned_agent_id}
              </span>
            ) : (
              <span className="text-xs text-cyber-text-disabled font-mono">Unassigned</span>
            )}
          </MetaRow>
          <MetaRow label="Created">
            <span className="flex items-center gap-1 font-mono text-xs text-cyber-text-muted">
              <Clock size={11} /> {new Date(selectedTask.created_at + 'Z').toLocaleString()}
            </span>
          </MetaRow>
        </div>

        {/* Status Transitions */}
        {transitions.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold">Actions</span>
            {transitions.map((t) => (
              <button
                key={t.next}
                onClick={() => handleTransition(t.next)}
                disabled={dispatching}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono font-semibold
                  bg-${t.color}/10 border border-${t.color}/30 text-${t.color}
                  hover:bg-${t.color}/20 transition-all duration-200
                  disabled:opacity-40
                `}
              >
                <span className="flex items-center gap-1.5">
                  {t.next === 'in_progress' && <Send size={12} />}
                  {t.label}
                </span>
                <ChevronRight size={12} />
              </button>
            ))}
          </div>
        )}

        {/* Activity Timeline */}
        {selectedTask.activities && selectedTask.activities.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold">Activity</span>
            <div className="space-y-1.5">
              {selectedTask.activities.map((activity: TaskActivity) => (
                <div key={activity.id} className="flex items-start gap-2 text-[11px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyber-border mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="text-cyber-text-muted">{activity.message}</span>
                    <span className="text-cyber-text-disabled ml-2 font-mono text-[9px]">
                      {new Date(activity.created_at + 'Z').toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="pt-4 border-t border-cyber-border">
          <button
            onClick={handleDelete}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold
              ${confirmDelete
                ? 'bg-cyber-red/20 border border-cyber-red/50 text-cyber-red shadow-glow-red'
                : 'bg-cyber-red/10 border border-cyber-red/30 text-cyber-red hover:bg-cyber-red/20'
              }
              transition-all duration-200
            `}
          >
            {confirmDelete ? <AlertTriangle size={12} /> : <Trash2 size={12} />}
            {confirmDelete ? 'Confirm Delete' : 'Delete Task'}
          </button>
        </div>
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

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: 'bg-cyber-red/15 text-cyber-red',
    high: 'bg-cyber-orange/15 text-cyber-orange',
    normal: 'bg-cyber-cyan/15 text-cyber-cyan',
    low: 'bg-cyber-bg-surface text-cyber-text-muted',
  };
  return (
    <span className={`${styles[priority] || styles.normal} font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded`}>
      {priority}
    </span>
  );
}
