import { create } from 'zustand';
import type { MonitorSession, MonitorAction, MonitorExecProcess } from '@mission-control/shared';

interface AgentState {
  sessions: Map<string, MonitorSession>;
  actions: Map<string, MonitorAction>;
  execs: Map<string, MonitorExecProcess>;
  runSessionMap: Map<string, string>; // runId → sessionKey

  upsertSession: (session: Partial<MonitorSession> & { key: string }) => void;
  upsertAction: (action: MonitorAction) => void;
  upsertExec: (id: string, update: Partial<MonitorExecProcess>) => void;
  clear: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  sessions: new Map(),
  actions: new Map(),
  execs: new Map(),
  runSessionMap: new Map(),

  upsertSession: (session) =>
    set((state) => {
      const sessions = new Map(state.sessions);
      const existing = sessions.get(session.key);
      sessions.set(session.key, { ...existing, ...session } as MonitorSession);
      return { sessions };
    }),

  upsertAction: (action) =>
    set((state) => {
      const actions = new Map(state.actions);
      const existing = actions.get(action.id);

      // Merge: keep startedAt from earlier event, update endedAt
      const merged: MonitorAction = {
        ...existing,
        ...action,
        startedAt: existing?.startedAt || action.startedAt,
      };

      // Calculate duration if we have both timestamps
      if (merged.startedAt && merged.endedAt) {
        merged.duration = merged.endedAt - merged.startedAt;
      }

      actions.set(action.id, merged);

      // Track runId → sessionKey mapping
      const runSessionMap = new Map(state.runSessionMap);
      if (action.sessionKey && action.runId) {
        runSessionMap.set(action.runId, action.sessionKey);
      }

      return { actions, runSessionMap };
    }),

  upsertExec: (id, update) =>
    set((state) => {
      const execs = new Map(state.execs);
      const existing = execs.get(id);
      execs.set(id, { ...existing, ...update, id } as MonitorExecProcess);
      return { execs };
    }),

  clear: () =>
    set({
      sessions: new Map(),
      actions: new Map(),
      execs: new Map(),
      runSessionMap: new Map(),
    }),
}));
