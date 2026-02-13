import type { Node, Edge } from '@xyflow/react';
import type { MonitorSession, MonitorAction, MonitorExecProcess } from '@mission-control/shared';

// Layout constants
const COLUMN_GAP = 400;
const ROW_GAP = 16;
const SESSION_WIDTH = 280;
const SESSION_HEIGHT = 140;
const ACTION_WIDTH = 220;
const ACTION_HEIGHT = 100;
const EXEC_WIDTH = 300;
const EXEC_HEIGHT = 120;
const SESSION_CHILD_INDENT = 20;

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

/** Compute the spawn depth of a session (0 = root) */
function getDepth(
  sessionKey: string,
  sessions: Map<string, MonitorSession>,
  cache: Map<string, number>,
): number {
  if (cache.has(sessionKey)) return cache.get(sessionKey)!;

  const session = sessions.get(sessionKey);
  if (!session?.spawnedBy) {
    cache.set(sessionKey, 0);
    return 0;
  }

  const parentDepth = getDepth(session.spawnedBy, sessions, cache);
  const depth = parentDepth + 1;
  cache.set(sessionKey, depth);
  return depth;
}

/** Build ReactFlow nodes and edges from agent store data */
export function computeGraphLayout(
  sessions: Map<string, MonitorSession>,
  actions: Map<string, MonitorAction>,
  execs: Map<string, MonitorExecProcess>,
  runSessionMap: Map<string, string>,
): GraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (sessions.size === 0) return { nodes, edges };

  // Group sessions by depth
  const depthCache = new Map<string, number>();
  const depthGroups = new Map<number, MonitorSession[]>();

  for (const session of sessions.values()) {
    const depth = getDepth(session.key, sessions, depthCache);
    if (!depthGroups.has(depth)) depthGroups.set(depth, []);
    depthGroups.get(depth)!.push(session);
  }

  // Sort sessions within each depth by lastActivityAt (most recent first)
  for (const group of depthGroups.values()) {
    group.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }

  // Group actions by sessionKey
  const actionsBySession = new Map<string, MonitorAction[]>();
  for (const action of actions.values()) {
    if (!action.sessionKey) continue;
    if (!actionsBySession.has(action.sessionKey)) actionsBySession.set(action.sessionKey, []);
    actionsBySession.get(action.sessionKey)!.push(action);
  }

  // Sort actions within each session by timestamp (newest first, limited)
  for (const [key, sessionActions] of actionsBySession) {
    sessionActions.sort((a, b) => b.timestamp - a.timestamp);
    // Keep only the 10 most recent actions per session to avoid clutter
    actionsBySession.set(key, sessionActions.slice(0, 10));
  }

  // Group execs by sessionKey (via runSessionMap)
  const execsBySession = new Map<string, MonitorExecProcess[]>();
  for (const exec of execs.values()) {
    const sessionKey = exec.sessionKey || runSessionMap.get(exec.runId);
    if (!sessionKey) continue;
    if (!execsBySession.has(sessionKey)) execsBySession.set(sessionKey, []);
    execsBySession.get(sessionKey)!.push(exec);
  }

  // Sort execs by startedAt (newest first, limited)
  for (const [key, sessionExecs] of execsBySession) {
    sessionExecs.sort((a, b) => b.startedAt - a.startedAt);
    execsBySession.set(key, sessionExecs.slice(0, 5));
  }

  // Track y position per column
  const columnY = new Map<number, number>();

  // Layout sessions and their children
  const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => a - b);

  for (const depth of sortedDepths) {
    const group = depthGroups.get(depth)!;
    let y = columnY.get(depth) || 0;
    const x = depth * COLUMN_GAP;

    for (const session of group) {
      // Session node
      nodes.push({
        id: `session-${session.key}`,
        type: 'session',
        position: { x, y },
        data: { session },
        style: { width: SESSION_WIDTH, height: SESSION_HEIGHT },
      });

      // Spawn edge from parent
      if (session.spawnedBy) {
        edges.push({
          id: `spawn-${session.spawnedBy}-${session.key}`,
          source: `session-${session.spawnedBy}`,
          target: `session-${session.key}`,
          type: 'spawn',
          animated: true,
        });
      }

      let childY = y + SESSION_HEIGHT + ROW_GAP;

      // Action nodes for this session
      const sessionActions = actionsBySession.get(session.key) || [];
      for (const action of sessionActions) {
        nodes.push({
          id: `action-${action.id}`,
          type: 'action',
          position: { x: x + SESSION_CHILD_INDENT, y: childY },
          data: { action },
          style: { width: ACTION_WIDTH, height: ACTION_HEIGHT },
        });

        edges.push({
          id: `edge-session-action-${session.key}-${action.id}`,
          source: `session-${session.key}`,
          target: `action-${action.id}`,
          type: 'default',
        });

        childY += ACTION_HEIGHT + ROW_GAP;
      }

      // Exec nodes for this session
      const sessionExecs = execsBySession.get(session.key) || [];
      for (const exec of sessionExecs) {
        nodes.push({
          id: `exec-${exec.id}`,
          type: 'exec',
          position: { x: x + SESSION_CHILD_INDENT, y: childY },
          data: { exec },
          style: { width: EXEC_WIDTH, height: EXEC_HEIGHT },
        });

        edges.push({
          id: `edge-session-exec-${session.key}-${exec.id}`,
          source: `session-${session.key}`,
          target: `exec-${exec.id}`,
          type: 'default',
        });

        childY += EXEC_HEIGHT + ROW_GAP;
      }

      // Update column Y for next session in this depth
      y = childY + ROW_GAP * 2;
    }

    columnY.set(depth, y);
  }

  return { nodes, edges };
}
