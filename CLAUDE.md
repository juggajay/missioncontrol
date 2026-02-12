# Mission Control — OpenClaw Agent Dashboard

## What This Is
A unified mission control UI for OpenClaw agents combining:
- **Task management** (Kanban board with AI-guided planning + dispatch)
- **Live agent visualization** (ReactFlow graph of sessions, actions, tool calls)
- **File/config editing** (CodeMirror 6 editor for agent configs, CLAUDE.md, gateway settings)
- **Exec approval queue** (approve/deny sandboxed commands from the UI)
- **Session management** (model switching, abort, reset, cron jobs)

## Tech Stack
- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend**: Express + Node.js + TypeScript
- **Database**: SQLite (better-sqlite3) for task persistence
- **Real-time**: WebSocket (ws) — backend pushes gateway events to browser
- **Code Editor**: CodeMirror 6
- **Agent Viz**: ReactFlow (@xyflow/react)
- **Package Manager**: pnpm (workspaces)
- **UI Theme**: Cyberpunk / futuristic dark theme (see docs/DESIGN-SYSTEM.md)

## Monorepo Structure
```
mission-control/
  apps/
    web/          — Vite + React frontend (port 5173)
    server/       — Express backend (port 3001)
  packages/
    shared/       — Shared TypeScript types, protocol definitions, utils
  docs/           — Architecture, specs, protocol reference
  pnpm-workspace.yaml
```

## Core Integration
- **OpenClaw Gateway** at `ws://127.0.0.1:18789` (primary data source)
- Auth token from `~/.openclaw/openclaw.json` at path `gateway.auth.token`
- Protocol v3: challenge-response handshake, JSON req/res/event frames
- See `docs/PROTOCOL.md` for full reference

## Key Design Decisions
1. Backend proxies all gateway communication (browser never connects directly)
2. Gateway events stream to browser via WebSocket (backend WS server on port 3001)
3. Tasks persisted in SQLite (not just in-memory) for durability
4. Vendor `GatewayBrowserClient.ts` pattern from OpenClaw Studio as reference
5. ReactFlow graph layout borrowed from Crabwalk's hierarchical column approach
6. Cyberpunk dark theme with neon accents (cyan/magenta/electric blue)

## Build Phases & Progress

### Phase 1: Connect + Monitor [IN PROGRESS]
- [x] Project scaffold (pnpm workspace, Vite, Express, shared types)
- [x] Gateway client (WS connection, auth, reconnection)
- [x] Event streaming pipeline (gateway → backend → browser)
- [x] Connection status UI
- [ ] ReactFlow agent graph (sessions, actions, exec nodes)
- [ ] Exec approval queue

### Phase 2: Task Management [NOT STARTED]
- [ ] SQLite schema + task CRUD API
- [ ] Kanban board UI (planning → inbox → assigned → in_progress → testing → review → done)
- [ ] Task dispatch via chat.send
- [ ] Agent assignment + lifecycle
- [ ] AI-guided planning flow
- [ ] SSE/WS push for task state changes

### Phase 3: Config & File Editing [NOT STARTED]
- [ ] CodeMirror 6 editor component
- [ ] Gateway config viewer/editor (config.get/patch)
- [ ] Agent workspace file editor (agents.files.get/set)
- [ ] Session settings (model, thinking level) via sessions.patch
- [ ] Cron job manager (cron.list/add/run/remove)

### Phase 4: Full Control [NOT STARTED]
- [ ] chat.abort for interrupting agents
- [ ] sessions.reset for resetting sessions
- [ ] Device management (node.list/invoke)
- [ ] Usage/cost dashboard (token consumption from chat events)
- [ ] Multi-agent orchestration view

## How to Run
```bash
pnpm install
pnpm dev          # starts both frontend (5173) and backend (3001)
```

## How to Resume Development
1. Read this file for current status
2. Read the relevant PHASE-X-SPEC.md for what to build next
3. Check git log for recent changes
4. Pick up the next unchecked item in the phase
5. After completing work, update the checkboxes above and commit

## Key Reference Files
- `docs/ARCHITECTURE.md` — Full system architecture
- `docs/PROTOCOL.md` — OpenClaw Gateway protocol (79 methods, 18 events)
- `docs/DESIGN-SYSTEM.md` — Cyberpunk theme, colors, components
- `docs/PHASE-1-SPEC.md` through `docs/PHASE-4-SPEC.md` — Detailed build specs
