# Mission Control — System Architecture

## High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                        │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────────────┐ │
│  │ Agent      │ │ Task       │ │ Config/File Editor       │ │
│  │ Monitor    │ │ Board      │ │ (CodeMirror 6)           │ │
│  │ (ReactFlow)│ │ (Kanban)   │ │                          │ │
│  └────────────┘ └────────────┘ └──────────────────────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────────────┐ │
│  │ Session    │ │ Approval   │ │ Cron Manager             │ │
│  │ Viewer     │ │ Queue      │ │                          │ │
│  └────────────┘ └────────────┘ └──────────────────────────┘ │
│                                                              │
│  State: Zustand store + TanStack Query                       │
│  Transport: WebSocket client → backend (port 3001)           │
└──────────────────────┬───────────────────────────────────────┘
                       │ WebSocket (JSON) + REST (HTTP)
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                  Backend (Express + Node.js)                  │
│                  Port 3001                                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Gateway Client (OpenClaw Protocol v3)                   │ │
│  │ - WS connection to ws://127.0.0.1:18789                 │ │
│  │ - Challenge-response auth                               │ │
│  │ - RPC method proxy                                      │ │
│  │ - Event stream forwarding                               │ │
│  │ - Auto-reconnect with backoff                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ WS Server    │  │ REST API     │  │ Task Store       │   │
│  │ (→ browser)  │  │ /api/*       │  │ (SQLite)         │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────┬───────────────────────────────────────┘
                       │ WebSocket (Protocol v3)
                       │
               ┌───────▼──────────┐
               │  OpenClaw Gateway │
               │  :18789           │
               │                  │
               │  Agents, Models, │
               │  Channels, Exec  │
               └──────────────────┘
```

## Monorepo Structure

```
mission-control/
├── CLAUDE.md                    # Project brain (auto-loaded by Claude Code)
├── pnpm-workspace.yaml          # Workspace config
├── package.json                 # Root scripts (dev, build, lint)
├── tsconfig.base.json           # Shared TS config
├── .env.example                 # Template for env vars
├── .gitignore
│
├── apps/
│   ├── web/                     # Frontend
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── globals.css      # Cyberpunk theme vars + shadcn base
│   │   │   ├── lib/
│   │   │   │   ├── utils.ts     # cn() helper, etc.
│   │   │   │   └── ws-client.ts # WebSocket client to backend
│   │   │   ├── stores/
│   │   │   │   ├── gateway.ts   # Gateway connection state (Zustand)
│   │   │   │   ├── agents.ts    # Agent/session state
│   │   │   │   ├── tasks.ts     # Task board state
│   │   │   │   └── ui.ts        # UI state (sidebar, modals)
│   │   │   ├── hooks/
│   │   │   │   ├── use-ws.ts    # WebSocket hook with reconnect
│   │   │   │   └── use-gateway.ts # Gateway status hook
│   │   │   ├── components/
│   │   │   │   ├── ui/          # shadcn components (button, card, etc.)
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── Topbar.tsx
│   │   │   │   │   └── Shell.tsx
│   │   │   │   ├── monitor/
│   │   │   │   │   ├── AgentGraph.tsx     # ReactFlow canvas
│   │   │   │   │   ├── SessionNode.tsx    # Session node component
│   │   │   │   │   ├── ActionNode.tsx     # Action/tool node
│   │   │   │   │   ├── ExecNode.tsx       # Exec process node
│   │   │   │   │   └── graph-layout.ts    # Layout algorithm
│   │   │   │   ├── tasks/
│   │   │   │   │   ├── TaskBoard.tsx      # Kanban board
│   │   │   │   │   ├── TaskCard.tsx       # Individual task card
│   │   │   │   │   ├── TaskDetail.tsx     # Task detail panel
│   │   │   │   │   └── TaskCreate.tsx     # Create task dialog
│   │   │   │   ├── editor/
│   │   │   │   │   └── FileEditor.tsx     # CodeMirror wrapper
│   │   │   │   ├── approvals/
│   │   │   │   │   └── ApprovalQueue.tsx  # Exec approval UI
│   │   │   │   ├── sessions/
│   │   │   │   │   ├── SessionList.tsx
│   │   │   │   │   └── SessionDetail.tsx
│   │   │   │   └── status/
│   │   │   │       └── ConnectionStatus.tsx
│   │   │   └── pages/
│   │   │       ├── DashboardPage.tsx
│   │   │       ├── MonitorPage.tsx
│   │   │       ├── TasksPage.tsx
│   │   │       ├── SessionsPage.tsx
│   │   │       ├── ConfigPage.tsx
│   │   │       └── CronPage.tsx
│   │   └── components.json       # shadcn config
│   │
│   └── server/                   # Backend
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts          # Express + WS server entry
│       │   ├── gateway/
│       │   │   ├── client.ts     # OpenClaw Gateway WS client
│       │   │   ├── protocol.ts   # Frame types, connect params
│       │   │   ├── events.ts     # Event parser (gateway → app types)
│       │   │   └── methods.ts    # RPC method wrappers
│       │   ├── ws/
│       │   │   └── server.ts     # WebSocket server (→ browser)
│       │   ├── api/
│       │   │   ├── router.ts     # Express router
│       │   │   ├── tasks.ts      # Task CRUD endpoints
│       │   │   ├── agents.ts     # Agent proxy endpoints
│       │   │   ├── config.ts     # Config proxy endpoints
│       │   │   ├── sessions.ts   # Session proxy endpoints
│       │   │   ├── cron.ts       # Cron proxy endpoints
│       │   │   └── files.ts      # File read/write endpoints
│       │   ├── db/
│       │   │   ├── schema.ts     # SQLite schema + migrations
│       │   │   └── index.ts      # Database connection
│       │   └── lib/
│       │       ├── config.ts     # Read ~/.openclaw/openclaw.json
│       │       └── logger.ts     # Structured logging
│       └── data/                 # SQLite database files (gitignored)
│
├── packages/
│   └── shared/                   # Shared types
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── protocol.ts       # Gateway frame types
│           ├── events.ts         # Agent/chat/exec event types
│           ├── models.ts         # Session, Agent, Task types
│           └── constants.ts      # Shared constants
│
└── docs/
    ├── ARCHITECTURE.md           # This file
    ├── PROTOCOL.md               # Gateway protocol reference
    ├── DESIGN-SYSTEM.md          # Cyberpunk theme spec
    ├── PHASE-1-SPEC.md           # Connect + Monitor
    ├── PHASE-2-SPEC.md           # Task Management
    ├── PHASE-3-SPEC.md           # Config & File Editing
    └── PHASE-4-SPEC.md           # Full Control
```

## Data Flow

### 1. Gateway Events → Browser

```
OpenClaw Gateway
  ──(WS event frame)──▶ Backend Gateway Client
  ──(parse + classify)──▶ Event Router
  ──(WS JSON message)──▶ Browser WS Client
  ──(Zustand dispatch)──▶ Store
  ──(React re-render)──▶ UI Components
```

### 2. User Action → Gateway RPC

```
UI Component (e.g., "Dispatch Task" button)
  ──(Zustand action)──▶ Store
  ──(REST POST /api/tasks/:id/dispatch)──▶ Backend API
  ──(WS req frame: chat.send)──▶ OpenClaw Gateway
  ──(WS res frame)──▶ Backend
  ──(REST response)──▶ Browser
  ──(Zustand update)──▶ UI
```

### 3. File Edit → Save

```
CodeMirror Editor (user types)
  ──(REST PUT /api/files)──▶ Backend Files API
  ──(WS req: agents.files.set or config.patch)──▶ Gateway
  ──(WS res)──▶ Backend
  ──(REST response)──▶ Browser
  ──(toast notification)──▶ UI
```

## Backend WebSocket Messages (→ Browser)

The backend WS server sends typed JSON messages to the browser:

```typescript
type WSMessage =
  // Gateway connection status
  | { type: 'connection'; status: 'connected' | 'disconnected' | 'connecting'; gateway: string }
  // Gateway hello-ok data (features, snapshot, etc.)
  | { type: 'hello'; payload: HelloOkPayload }
  // Agent run events (tool calls, text streaming, lifecycle)
  | { type: 'agent-event'; payload: AgentEvent }
  // Chat events (conversation streaming)
  | { type: 'chat-event'; payload: ChatEvent }
  // Exec events (process started/output/completed)
  | { type: 'exec-event'; payload: ExecEvent }
  // Presence changes
  | { type: 'presence'; payload: PresenceEvent }
  // Exec approval requests
  | { type: 'approval-request'; payload: ApprovalRequest }
  // Task state changes
  | { type: 'task-update'; payload: Task }
  // Health updates
  | { type: 'health'; payload: HealthSnapshot }
  // Error
  | { type: 'error'; message: string; code?: string }
```

## REST API Endpoints

### Gateway Proxy
| Endpoint | Method | Maps To |
|----------|--------|---------|
| `GET /api/gateway/status` | GET | Connection status |
| `POST /api/gateway/connect` | POST | Trigger connect |
| `POST /api/gateway/disconnect` | POST | Disconnect |
| `GET /api/sessions` | GET | `sessions.list` |
| `PATCH /api/sessions/:key` | PATCH | `sessions.patch` |
| `POST /api/sessions/:key/reset` | POST | `sessions.reset` |
| `GET /api/sessions/:key/history` | GET | `chat.history` |
| `POST /api/sessions/:key/send` | POST | `chat.send` |
| `POST /api/sessions/:key/abort` | POST | `chat.abort` |
| `GET /api/agents` | GET | `agents.list` |
| `GET /api/agents/:id/files` | GET | `agents.files.get` |
| `PUT /api/agents/:id/files` | PUT | `agents.files.set` |
| `GET /api/config` | GET | `config.get` |
| `PATCH /api/config` | PATCH | `config.patch` |
| `GET /api/cron` | GET | `cron.list` |
| `POST /api/cron` | POST | `cron.add` |
| `POST /api/cron/:id/run` | POST | `cron.run` |
| `DELETE /api/cron/:id` | DELETE | `cron.remove` |
| `GET /api/health` | GET | `health` |
| `POST /api/approvals/:id/resolve` | POST | `exec.approval.resolve` |

### Task Management (Local SQLite)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/tasks` | GET | List tasks (filter by status, agent) |
| `POST /api/tasks` | POST | Create task |
| `GET /api/tasks/:id` | GET | Get task detail |
| `PATCH /api/tasks/:id` | PATCH | Update task |
| `DELETE /api/tasks/:id` | DELETE | Delete task |
| `POST /api/tasks/:id/dispatch` | POST | Dispatch to agent via chat.send |

## Key Dependencies

### Frontend (apps/web)
```
react, react-dom, react-router-dom
@xyflow/react                 # ReactFlow for agent graph
@codemirror/view, @codemirror/state, @codemirror/lang-json  # Editor
zustand                       # State management
@tanstack/react-query         # Server state / caching
tailwindcss, @tailwindcss/vite
shadcn/ui components          # Button, Card, Dialog, etc.
lucide-react                  # Icons
framer-motion                 # Animations (optional, for polish)
@dnd-kit/core, @dnd-kit/sortable  # Kanban drag-and-drop
```

### Backend (apps/server)
```
express
ws                            # WebSocket server + client
better-sqlite3                # SQLite
uuid                          # Request IDs
cors
dotenv
```

### Shared (packages/shared)
```
zod                           # Schema validation (optional)
```
