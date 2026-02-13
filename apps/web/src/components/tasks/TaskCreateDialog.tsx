import { useState } from 'react';
import { useTaskStore } from '@/stores/tasks';
import { X } from 'lucide-react';

const priorityOptions = ['low', 'normal', 'high', 'urgent'] as const;

export function TaskCreateDialog({ onClose }: { onClose: () => void }) {
  const createTask = useTaskStore((s) => s.createTask);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('normal');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createTask({ title: title.trim(), description: description.trim() || undefined, priority });
      onClose();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-cyber-bg-secondary border border-cyber-border rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border">
          <span className="font-display text-sm uppercase tracking-wider text-cyber-cyan">
            New Task
          </span>
          <button onClick={onClose} className="text-cyber-text-muted hover:text-cyber-text transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold mb-1.5 block">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              autoFocus
              className="w-full bg-cyber-bg-surface border border-cyber-border rounded px-3 py-2 text-sm text-cyber-text placeholder:text-cyber-text-disabled focus:border-cyber-cyan/50 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={4}
              className="w-full bg-cyber-bg-surface border border-cyber-border rounded px-3 py-2 text-sm text-cyber-text font-mono placeholder:text-cyber-text-disabled resize-none focus:border-cyber-cyan/50 focus:outline-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-cyber-text-muted font-semibold mb-1.5 block">
              Priority
            </label>
            <div className="flex gap-2">
              {priorityOptions.map((p) => {
                const colors: Record<string, string> = {
                  low: 'text-cyber-text-muted border-cyber-border',
                  normal: 'text-cyber-cyan border-cyber-cyan/30',
                  high: 'text-cyber-orange border-cyber-orange/30',
                  urgent: 'text-cyber-red border-cyber-red/30',
                };
                const activeBg: Record<string, string> = {
                  low: 'bg-cyber-bg-surface',
                  normal: 'bg-cyber-cyan/15',
                  high: 'bg-cyber-orange/15',
                  urgent: 'bg-cyber-red/15',
                };
                const isActive = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`
                      flex-1 py-1.5 rounded text-[10px] font-mono font-bold uppercase border transition-all
                      ${colors[p]}
                      ${isActive ? activeBg[p] : 'bg-transparent opacity-50 hover:opacity-80'}
                    `}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-mono text-cyber-text-muted hover:text-cyber-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="px-4 py-1.5 rounded text-xs font-mono font-semibold uppercase
                bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan
                hover:bg-cyber-cyan/20 hover:shadow-glow-cyan
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
