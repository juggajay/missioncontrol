import initSqlJs, { type Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { log } from '../lib/logger.js';

const DB_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DB_DIR, 'mission-control.db');

let db: Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inbox'
    CHECK (status IN ('planning', 'inbox', 'assigned', 'in_progress', 'testing', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_agent_id TEXT,
  assigned_session_key TEXT,
  planning_messages TEXT,
  planning_spec TEXT,
  dispatch_idempotency_key TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_activities (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_activities_task ON task_activities(task_id, created_at DESC);
`;

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    log.info('db', `Loaded existing database from ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    log.info('db', 'Created new in-memory database');
  }

  // Run schema
  db.run(SCHEMA);
  // Enable WAL-like behavior (pragma not available in sql.js but we persist manually)
  saveDatabase();

  log.success('db', 'Schema initialized');
  return db;
}

export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized — call initDatabase() first');
  return db;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Task CRUD ---

import type { Task, TaskActivity } from '@mission-control/shared';

export function listTasks(filters?: { status?: string; agent?: string }): Task[] {
  let sql = 'SELECT * FROM tasks';
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters?.agent) {
    conditions.push('assigned_agent_id = ?');
    params.push(filters.agent);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY created_at DESC';

  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const tasks: Task[] = [];
  while (stmt.step()) {
    tasks.push(rowToTask(stmt.getAsObject()));
  }
  stmt.free();
  return tasks;
}

export function getTask(id: string): (Task & { activities: TaskActivity[] }) | null {
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const task = rowToTask(stmt.getAsObject());
  stmt.free();

  const actStmt = db.prepare('SELECT * FROM task_activities WHERE task_id = ? ORDER BY created_at DESC');
  actStmt.bind([id]);
  const activities: TaskActivity[] = [];
  while (actStmt.step()) {
    const row = actStmt.getAsObject() as Record<string, unknown>;
    activities.push({
      id: row.id as string,
      task_id: row.task_id as string,
      activity_type: row.activity_type as string,
      message: row.message as string,
      metadata: row.metadata as string | undefined,
      created_at: row.created_at as string,
    });
  }
  actStmt.free();

  return { ...task, activities };
}

export function createTask(data: { title: string; description?: string; priority?: string }): Task {
  const id = generateId();
  const priority = data.priority || 'normal';
  db.run(
    'INSERT INTO tasks (id, title, description, priority) VALUES (?, ?, ?, ?)',
    [id, data.title, data.description || null, priority],
  );

  insertActivity(id, 'created', `Task "${data.title}" created`);
  saveDatabase();

  return getTask(id)! as Task;
}

export function updateTask(id: string, data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assigned_agent_id' | 'assigned_session_key' | 'planning_messages' | 'planning_spec' | 'dispatch_idempotency_key'>>): Task | null {
  const existing = getTask(id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (sets.length === 0) return existing;

  sets.push("updated_at = datetime('now')");
  params.push(id);

  db.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params as string[]);

  // Log status changes
  if (data.status && data.status !== existing.status) {
    insertActivity(id, 'status_changed', `Status: ${existing.status} → ${data.status}`);
  }
  if (data.assigned_agent_id && data.assigned_agent_id !== existing.assigned_agent_id) {
    insertActivity(id, 'agent_assigned', `Assigned to agent: ${data.assigned_agent_id}`);
  }

  saveDatabase();
  return getTask(id)! as Task;
}

export function deleteTask(id: string): boolean {
  const existing = getTask(id);
  if (!existing) return false;

  db.run('DELETE FROM task_activities WHERE task_id = ?', [id]);
  db.run('DELETE FROM tasks WHERE id = ?', [id]);
  saveDatabase();
  return true;
}

export function insertActivity(taskId: string, activityType: string, message: string, metadata?: unknown): void {
  const id = generateId();
  db.run(
    'INSERT INTO task_activities (id, task_id, activity_type, message, metadata) VALUES (?, ?, ?, ?, ?)',
    [id, taskId, activityType, message, metadata ? JSON.stringify(metadata) : null],
  );
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || undefined,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    assigned_agent_id: (row.assigned_agent_id as string) || undefined,
    assigned_session_key: (row.assigned_session_key as string) || undefined,
    planning_messages: (row.planning_messages as string) || undefined,
    planning_spec: (row.planning_spec as string) || undefined,
    dispatch_idempotency_key: (row.dispatch_idempotency_key as string) || undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
