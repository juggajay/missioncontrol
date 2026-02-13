import { create } from 'zustand';
import type { Task, TaskActivity } from '@mission-control/shared';

interface TasksState {
  tasks: Task[];
  selectedTask: (Task & { activities?: TaskActivity[] }) | null;
  loading: boolean;

  fetchTasks: () => Promise<void>;
  createTask: (data: { title: string; description?: string; priority?: string }) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  fetchTask: (id: string) => Promise<void>;
  setSelectedTask: (task: (Task & { activities?: TaskActivity[] }) | null) => void;
  handleTaskUpdate: (task: Task) => void;
  dispatchTask: (id: string) => Promise<{ runId: string }>;
  assignTask: (id: string, agentId: string, sessionKey: string) => Promise<Task>;
}

export const useTaskStore = create<TasksState>((set, get) => ({
  tasks: [],
  selectedTask: null,
  loading: false,

  fetchTasks: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/tasks');
      const tasks = await res.json();
      set({ tasks, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createTask: async (data) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const task = await res.json();
    if (!res.ok) throw new Error(task.error);
    set((s) => ({ tasks: [task, ...s.tasks] }));
    return task;
  },

  updateTask: async (id, data) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const task = await res.json();
    if (!res.ok) throw new Error(task.error);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? task : t)),
      selectedTask: s.selectedTask?.id === id ? { ...s.selectedTask, ...task } : s.selectedTask,
    }));
    return task;
  },

  deleteTask: async (id) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      selectedTask: s.selectedTask?.id === id ? null : s.selectedTask,
    }));
  },

  fetchTask: async (id) => {
    const res = await fetch(`/api/tasks/${id}`);
    if (!res.ok) return;
    const task = await res.json();
    set({ selectedTask: task });
  },

  setSelectedTask: (task) => set({ selectedTask: task }),

  handleTaskUpdate: (task) => {
    set((s) => {
      const exists = s.tasks.some((t) => t.id === task.id);
      return {
        tasks: exists
          ? s.tasks.map((t) => (t.id === task.id ? task : t))
          : [task, ...s.tasks],
        selectedTask: s.selectedTask?.id === task.id
          ? { ...s.selectedTask, ...task }
          : s.selectedTask,
      };
    });
  },

  dispatchTask: async (id) => {
    const res = await fetch(`/api/tasks/${id}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    // Refresh the task
    get().fetchTask(id);
    get().fetchTasks();
    return data;
  },

  assignTask: async (id, agentId, sessionKey) => {
    const res = await fetch(`/api/tasks/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, sessionKey }),
    });
    const task = await res.json();
    if (!res.ok) throw new Error(task.error);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? task : t)),
      selectedTask: s.selectedTask?.id === id ? { ...s.selectedTask, ...task } : s.selectedTask,
    }));
    return task;
  },
}));
