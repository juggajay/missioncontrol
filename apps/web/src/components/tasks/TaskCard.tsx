import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTaskStore } from '@/stores/tasks';
import { Bot, Clock } from 'lucide-react';
import type { Task } from '@mission-control/shared';

const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: 'bg-cyber-red/15', text: 'text-cyber-red', label: 'URGENT' },
  high: { bg: 'bg-cyber-orange/15', text: 'text-cyber-orange', label: 'HIGH' },
  normal: { bg: 'bg-cyber-cyan/15', text: 'text-cyber-cyan', label: 'NORMAL' },
  low: { bg: 'bg-cyber-bg-surface', text: 'text-cyber-text-muted', label: 'LOW' },
};

const statusBorderColors: Record<string, string> = {
  planning: 'border-l-cyber-blue',
  inbox: 'border-l-cyber-cyan',
  assigned: 'border-l-cyber-purple',
  in_progress: 'border-l-cyber-green',
  testing: 'border-l-cyber-yellow',
  review: 'border-l-cyber-orange',
  done: 'border-l-cyber-green',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + 'Z').getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface TaskCardProps {
  task: Task;
  isDragOverlay?: boolean;
}

export function TaskCard({ task, isDragOverlay }: TaskCardProps) {
  const setSelectedTask = useTaskStore((s) => s.setSelectedTask);
  const fetchTask = useTaskStore((s) => s.fetchTask);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityStyles[task.priority] || priorityStyles.normal;
  const borderColor = statusBorderColors[task.status] || 'border-l-cyber-border';

  function handleClick() {
    fetchTask(task.id);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`
        bg-cyber-bg-tertiary border border-cyber-border rounded-md cursor-pointer
        border-l-2 ${borderColor}
        hover:border-cyber-cyan/20 hover:bg-cyber-bg-surface/50
        transition-all duration-200
        ${isDragging ? 'opacity-30' : ''}
        ${isDragOverlay ? 'shadow-glow-cyan rotate-2' : ''}
      `}
    >
      <div className="p-2.5 space-y-2">
        {/* Title */}
        <p className="text-xs font-medium text-cyber-text line-clamp-2 leading-snug">
          {task.title}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2">
          {/* Priority badge */}
          <span className={`${priority.bg} ${priority.text} font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded`}>
            {priority.label}
          </span>

          <div className="flex items-center gap-2">
            {/* Agent */}
            {task.assigned_agent_id && (
              <div className="flex items-center gap-0.5 text-cyber-purple" title={task.assigned_agent_id}>
                <Bot size={10} />
                <span className="font-mono text-[9px] truncate max-w-[50px]">{task.assigned_agent_id}</span>
              </div>
            )}

            {/* Time */}
            <div className="flex items-center gap-0.5 text-cyber-text-disabled">
              <Clock size={9} />
              <span className="font-mono text-[9px]">{timeAgo(task.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
