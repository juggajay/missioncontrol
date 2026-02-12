# Phase 2: Task Management

## Goal
Add a Kanban task board with full CRUD, AI-guided planning, and agent dispatch via the OpenClaw Gateway. Tasks persist in local SQLite.

## Prerequisites
- Phase 1 complete (gateway connected, events streaming)
- OpenClaw Gateway running with at least one configured agent

## Build Order

### Step 1: SQLite Schema + Task CRUD API
**Session scope: ~1 session**

Create `apps/server/src/db/schema.ts`:

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inbox'
    CHECK (status IN ('planning', 'inbox', 'assigned', 'in_progress', 'testing', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_agent_id TEXT,
  assigned_session_key TEXT,
  planning_messages TEXT,        -- JSON array of {role, content, timestamp}
  planning_spec TEXT,            -- JSON spec from AI planning
  dispatch_idempotency_key TEXT, -- For chat.send idempotency
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_activities (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,   -- 'created', 'status_changed', 'dispatched', 'completed', etc.
  message TEXT NOT NULL,
  metadata TEXT,                 -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_agent ON tasks(assigned_agent_id);
CREATE INDEX idx_activities_task ON task_activities(task_id, created_at DESC);
```

Create `apps/server/src/db/index.ts`:
- Initialize better-sqlite3 with WAL mode
- Run schema migrations on startup
- Export db instance

Create `apps/server/src/api/tasks.ts`:
```
GET    /api/tasks          → List tasks (filter: ?status=, ?agent=)
POST   /api/tasks          → Create task { title, description, priority }
GET    /api/tasks/:id      → Get task + activities
PATCH  /api/tasks/:id      → Update task (status, title, description, priority, assigned_agent_id)
DELETE /api/tasks/:id      → Delete task + cascade activities
```

On status change: insert activity + broadcast WS `task-update` event.
On agent assignment: if status is 'assigned' and agent is set, auto-dispatch (see Step 3).

### Step 2: Kanban Board UI
**Session scope: ~1 session**

```
stores/tasks.ts (Zustand):
  - tasks: Task[]
  - selectedTask: Task | null
  - fetchTasks()        → GET /api/tasks
  - createTask(data)    → POST /api/tasks
  - updateTask(id, data) → PATCH /api/tasks/:id
  - deleteTask(id)      → DELETE /api/tasks/:id
  - setSelectedTask(task)
  - handleTaskUpdate(task) — called from WS message handler

TasksPage.tsx:
  - Full Kanban layout with 7 columns
  - Column headers in Orbitron font, uppercase, colored underlines
  - Task count badges per column (mono font)

TaskBoard.tsx:
  - Uses @dnd-kit/core + @dnd-kit/sortable for drag-and-drop
  - Columns: Planning | Inbox | Assigned | In Progress | Testing | Review | Done
  - Column accent colors per DESIGN-SYSTEM.md
  - Drag card between columns → PATCH status
  - "+ New Task" button in Inbox column header

TaskCard.tsx:
  - Compact card with cyberpunk styling
  - Title (truncated, 2 lines max)
  - Priority badge (color-coded: urgent=red, high=orange, normal=cyan, low=muted)
  - Assigned agent name + avatar emoji (or "Unassigned")
  - Created timestamp (relative: "2m ago")
  - Click → open TaskDetail panel
  - Left border color matches status column color

TaskDetail.tsx:
  - Slide-in panel from right (or dialog)
  - Full task details: title, description, status, priority, agent
  - Activity timeline (list of activities, most recent first)
  - Edit form for title, description, priority
  - Agent assignment dropdown (populated from GET /api/agents)
  - Status transition buttons (contextual):
    - Inbox → "Assign Agent" → Assigned
    - Assigned → "Dispatch" → In Progress
    - In Progress → "Mark for Testing" → Testing
    - Testing → "Send to Review" → Review
    - Review → "Complete" → Done
  - Delete button (with confirmation dialog)

TaskCreate.tsx:
  - Dialog/modal form
  - Fields: title, description (textarea), priority (select)
  - Submit → POST /api/tasks → close + refresh
```

### Step 3: Task Dispatch via chat.send
**Session scope: same session as Step 2 or separate**

Create `apps/server/src/api/tasks.ts` dispatch endpoint:

```
POST /api/tasks/:id/dispatch
  1. Load task from SQLite
  2. Validate: task has assigned_agent_id and assigned_session_key
  3. Build dispatch message (structured prompt):
     - Task title, description, priority
     - Instructions for the agent
  4. Generate idempotency key (store in task)
  5. Call gatewayClient.call('chat.send', {
       sessionKey: task.assigned_session_key,
       text: dispatchMessage,
       idempotencyKey
     })
  6. Update task status → 'in_progress'
  7. Insert activity: 'dispatched'
  8. Broadcast task-update WS event
  9. Return { runId, status }
```

Agent assignment flow:
```
POST /api/tasks/:id/assign
  1. Load task
  2. Set assigned_agent_id and assigned_session_key
  3. Fetch agent's session key from agents.list or let user select session
  4. Update status → 'assigned'
  5. Insert activity: 'agent_assigned'
  6. Broadcast task-update
```

### Step 4: Agent List + Assignment UI
**Session scope: same session as Step 3**

```
Backend:
  GET /api/agents → gatewayClient.call('agents.list', {})
  GET /api/sessions → gatewayClient.call('sessions.list', {})

Frontend:
  Agent picker component in TaskDetail:
    - Dropdown of available agents (from agents.list)
    - Show agent name, model, status
    - On select: assign agent + pick/create session
    - Session key construction: use existing session or create new one

  Agent status indicators in sidebar or dashboard:
    - List all agents with status (from presence events)
    - Active task count per agent
```

### Step 5: AI-Guided Planning (Optional Enhancement)
**Session scope: ~1 session**

This mirrors mission-control's planning flow:

```
POST /api/tasks/:id/planning/start
  1. Create planning session key: agent:main:planning:{taskId}
  2. Send planning prompt via chat.send (ask AI to generate questions)
  3. Poll chat.history for response
  4. Store planning_messages in task
  5. Return first question

POST /api/tasks/:id/planning/answer
  1. Append user answer to planning_messages
  2. Send answer + context via chat.send
  3. Poll for AI response (next question or completion)
  4. If complete: store spec, move task to inbox
  5. Return next question or completion
```

UI:
```
PlanningDialog.tsx:
  - Step-by-step Q&A flow
  - AI-generated multiple choice or text questions
  - Progress indicator (question N of M)
  - "Approve Spec" button on completion
  - Stores planning context in task
```

## Shared Types Addition

```typescript
// packages/shared/src/models.ts — add:
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'planning' | 'inbox' | 'assigned' | 'in_progress' | 'testing' | 'review' | 'done';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_agent_id?: string;
  assigned_session_key?: string;
  planning_messages?: string;
  planning_spec?: string;
  dispatch_idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  activity_type: string;
  message: string;
  metadata?: string;
  created_at: string;
}

export type TaskStatus = Task['status'];
export type TaskPriority = Task['priority'];

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'planning', 'inbox', 'assigned', 'in_progress', 'testing', 'review', 'done'
];
```

## Acceptance Criteria
- [ ] Tasks persist in SQLite across server restarts
- [ ] Kanban board shows all 7 columns with proper styling
- [ ] Can create, edit, and delete tasks
- [ ] Can drag tasks between columns (status changes)
- [ ] Can assign agents to tasks
- [ ] Dispatching a task sends it to the agent via chat.send
- [ ] Task activities log all state transitions
- [ ] Real-time task updates via WebSocket
- [ ] Priority badges are color-coded
- [ ] All components use cyberpunk theme
