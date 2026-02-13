import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import type { Task } from '@mission-control/shared';

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  tasks: Task[];
}

export function KanbanColumn({ id, label, color, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col min-w-[220px] w-[220px] shrink-0
        bg-cyber-bg-secondary/50 rounded-lg border border-dashed
        transition-all duration-200
        ${isOver ? 'border-cyber-cyan/40 bg-cyber-cyan/5' : 'border-cyber-border/50'}
      `}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-cyber-border/30">
        <div className="flex items-center justify-between">
          <span className={`font-display text-[11px] font-semibold uppercase tracking-wider text-${color}`}>
            {label}
          </span>
          <span className={`font-mono text-[10px] font-bold bg-${color}/20 text-${color} px-1.5 py-0.5 rounded min-w-[20px] text-center`}>
            {tasks.length}
          </span>
        </div>
        <div className={`h-0.5 mt-1.5 rounded-full bg-${color}/40`} />
      </div>

      {/* Cards */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
