import { useEffect, useState } from 'react';
import { useTaskStore } from '@/stores/tasks';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { TaskCreateDialog } from '@/components/tasks/TaskCreateDialog';
import { Plus } from 'lucide-react';

export function TasksPage() {
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const selectedTask = useTaskStore((s) => s.selectedTask);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return (
    <div className="space-y-4 h-[calc(100vh-5rem)]">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan">
          TASK BOARD
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold uppercase
            bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan
            hover:bg-cyber-cyan/20 hover:shadow-glow-cyan transition-all duration-200"
        >
          <Plus size={14} />
          New Task
        </button>
      </div>

      <TaskBoard />

      {selectedTask && <TaskDetail />}
      {showCreate && <TaskCreateDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
