# Phase 1: Connect + Monitor

## Goal
Connect to the OpenClaw Gateway, stream events in real-time, and visualize agent activity in a ReactFlow graph. This is the MVP — a read-only live dashboard.

## Prerequisites
- OpenClaw Gateway running at `ws://127.0.0.1:18789`
- Auth token in `~/.openclaw/openclaw.json` at `gateway.auth.token`

## Build Order

### Step 1: Project Scaffold
**Session scope: ~1 session**

Create the full monorepo skeleton with all tooling configured but minimal code.

Files to create:
```
pnpm-workspace.yaml
package.json (root — scripts: dev, build, lint, clean)
tsconfig.base.json
.gitignore
.env.example

apps/web/
  package.json
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  index.html
  src/main.tsx
  src/App.tsx
  src/globals.css (cyberpunk theme vars)
  src/lib/utils.ts (cn helper)
  components.json (shadcn config)

apps/server/
  package.json
  tsconfig.json
  src/index.ts (Express + WS server hello world)

packages/shared/
  package.json
  tsconfig.json
  src/index.ts
```

Key config decisions:
- Vite proxy: `/api` → `http://localhost:3001`, `/ws` → `ws://localhost:3001`
- Express: CORS allow `localhost:5173`
- TypeScript: strict mode, path aliases
- Root `pnpm dev` runs both apps concurrently (use `concurrently` package)

Install shadcn components: `button`, `card`, `badge`, `dialog`, `input`, `label`, `separator`, `tooltip`, `scroll-area`, `dropdown-menu`, `toast` (via sonner)

Install Google Fonts: Orbitron (display), Inter (body), JetBrains Mono (code)

### Step 2: Shared Protocol Types
**Session scope: same session as Step 1**

Define all OpenClaw Gateway types in `packages/shared/src/`:

```typescript
// protocol.ts
export interface RequestFrame {
  type: 'req';
  id: string;
  method: string;
  params?: unknown;
}

export interface ResponseFrame {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string };
}

export interface EventFrame {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: { presence: number; health: number };
}

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame;

export interface ConnectParams {
  minProtocol: 3;
  maxProtocol: 3;
  client: ClientInfo;
  role: 'operator';
  scopes: string[];
  caps: string[];
  auth?: { token?: string };
}

export interface ClientInfo {
  id: string;
  version: string;
  platform: string;
  mode: 'webchat' | 'cli' | 'ui';
}

export interface HelloOkPayload {
  type: 'hello-ok';
  protocol: number;
  features: { methods: string[]; events: string[] };
  snapshot: {
    presence: Record<string, unknown>;
    health: Record<string, unknown>;
    stateVersion: { presence: number; health: number };
    uptimeMs: number;
  };
  auth: {
    deviceToken: string;
    role: string;
    scopes: string[];
  };
  policy: {
    maxPayload: number;
    maxBufferedBytes: number;
    tickIntervalMs: number;
  };
}

// events.ts
export interface AgentEvent {
  runId: string;
  seq: number;
  stream: string;   // 'lifecycle', 'assistant', 'text', 'tool', 'thinking'
  ts: number;
  data: Record<string, unknown>;
  sessionKey?: string;
}

export interface ChatEvent {
  runId: string;
  sessionKey: string;
  seq: number;
  state: 'delta' | 'final' | 'aborted' | 'error';
  message?: unknown;
  errorMessage?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  stopReason?: string;
}

export interface ExecStartedEvent {
  pid: number;
  command: string;
  sessionId: string;
  runId: string;
  startedAt: number;
}

export interface ExecOutputEvent {
  pid: number;
  runId: string;
  sessionId?: string;
  stream: 'stdout' | 'stderr';
  output: string;
}

export interface ExecCompletedEvent {
  pid: number;
  runId: string;
  sessionId?: string;
  exitCode: number;
  durationMs: number;
  status: string;
}

// models.ts
export interface MonitorSession {
  key: string;
  agentId: string;
  platform: string;
  recipient: string;
  isGroup: boolean;
  lastActivityAt: number;
  status: 'idle' | 'active' | 'thinking';
  spawnedBy?: string;
}

export interface MonitorAction {
  id: string;
  runId: string;
  sessionKey: string;
  seq: number;
  type: 'start' | 'streaming' | 'complete' | 'aborted' | 'error' | 'tool_call' | 'tool_result';
  eventType: 'chat' | 'agent' | 'system';
  timestamp: number;
  content?: string;
  toolName?: string;
  toolArgs?: unknown;
  startedAt?: number;
  endedAt?: number;
  duration?: number;
  inputTokens?: number;
  outputTokens?: number;
  stopReason?: string;
}

export interface MonitorExecProcess {
  id: string;
  runId: string;
  pid: number;
  command: string;
  sessionKey?: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  exitCode?: number;
  outputs: Array<{ stream: string; text: string; timestamp: number }>;
  timestamp: number;
}

// ws-messages.ts — Messages from backend WS server to browser
export type WSMessage =
  | { type: 'connection'; status: 'connected' | 'disconnected' | 'connecting'; gateway: string }
  | { type: 'hello'; payload: HelloOkPayload }
  | { type: 'agent-event'; payload: AgentEvent }
  | { type: 'chat-event'; payload: ChatEvent }
  | { type: 'exec-event'; payload: ExecStartedEvent | ExecOutputEvent | ExecCompletedEvent; subtype: string }
  | { type: 'presence'; payload: unknown }
  | { type: 'approval-request'; payload: unknown }
  | { type: 'health'; payload: unknown }
  | { type: 'error'; message: string };
```

### Step 3: Gateway Client (Backend)
**Session scope: ~1 session**

Create `apps/server/src/gateway/client.ts`:

```
GatewayClient class (extends EventEmitter):
  Properties:
    - ws: WebSocket | null
    - url: string
    - token: string
    - connected: boolean
    - authenticated: boolean
    - features: { methods: string[], events: string[] }
    - reconnectTimer: NodeJS.Timeout
    - reconnectDelay: number (start 800ms, multiply 1.7x, max 15s)
    - pending: Map<string, { resolve, reject, timeout }>

  Constructor(url, token):
    - Store url and token
    - Don't auto-connect (let caller trigger)

  connect():
    - Open WebSocket to url
    - Set 10s connection timeout
    - On 'open': log connected
    - On 'message': route to handleFrame()
    - On 'close': handle reconnect
    - On 'error': log and handle

  handleFrame(data):
    - Parse JSON
    - If event 'connect.challenge': send connect request
    - If res with hello-ok payload: mark authenticated, store features, emit 'connected'
    - If res (other): resolve pending promise
    - If event: emit typed event ('agent', 'chat', 'exec.started', etc.)

  call(method, params): Promise<any>
    - Generate UUID id
    - Send req frame
    - Return promise (30s timeout)

  disconnect():
    - Close WS with code 1000
    - Clear reconnect timer

  scheduleReconnect():
    - Wait reconnectDelay
    - Multiply delay by 1.7 (max 15s)
    - Call connect()
```

Create `apps/server/src/gateway/events.ts`:

```
parseEventFrame(frame: EventFrame) → ParsedEvent | null
  - Skip 'health' and 'tick' events
  - Route by frame.event:
    'agent' → parseAgentEvent(frame.payload)
    'chat' → parseChatEvent(frame.payload)
    'exec.started' → parseExecStarted(frame.payload)
    'exec.output' → parseExecOutput(frame.payload)
    'exec.completed' → parseExecCompleted(frame.payload)
    'presence' → { type: 'presence', payload }
    'exec.approval.requested' → { type: 'approval', payload }
```

Create `apps/server/src/lib/config.ts`:

```
readOpenClawConfig():
  - Read ~/.openclaw/openclaw.json (JSON5 parse or plain JSON)
  - Return { gatewayUrl, token }
  - Fallback to env vars OPENCLAW_GATEWAY_URL, OPENCLAW_GATEWAY_TOKEN
  - Fallback to defaults (ws://127.0.0.1:18789, empty token)
```

### Step 4: WS Server + Event Bridge
**Session scope: same session as Step 3**

Create `apps/server/src/ws/server.ts`:

```
createWSServer(httpServer):
  - Create ws.WebSocketServer on path '/ws'
  - Track connected browser clients (Set)
  - On connection: add to set, send current gateway status
  - On close: remove from set

broadcast(message: WSMessage):
  - JSON.stringify and send to all connected clients

bridgeGatewayEvents(gatewayClient, broadcast):
  - gatewayClient.on('connected', () => broadcast({ type: 'connection', status: 'connected' }))
  - gatewayClient.on('disconnected', () => broadcast({ type: 'connection', status: 'disconnected' }))
  - gatewayClient.on('hello', (payload) => broadcast({ type: 'hello', payload }))
  - gatewayClient.on('agent', (payload) => broadcast({ type: 'agent-event', payload }))
  - gatewayClient.on('chat', (payload) => broadcast({ type: 'chat-event', payload }))
  - gatewayClient.on('exec.*', (payload, subtype) => broadcast({ type: 'exec-event', payload, subtype }))
  - gatewayClient.on('presence', (payload) => broadcast({ type: 'presence', payload }))
  - gatewayClient.on('approval', (payload) => broadcast({ type: 'approval-request', payload }))
```

Wire up in `apps/server/src/index.ts`:

```
- Read config
- Create Express app
- Create HTTP server
- Create GatewayClient(url, token)
- Create WS server on HTTP server
- Bridge gateway events to WS broadcast
- Connect to gateway
- Start listening on port 3001
- Add basic REST routes: GET /api/gateway/status, GET /api/sessions, GET /api/agents, GET /api/health
```

### Step 5: Frontend Shell + Connection UI
**Session scope: ~1 session**

Create the app shell with cyberpunk styling:

```
Shell.tsx:
  - Full-screen dark layout with grid background
  - Fixed sidebar (left, 60px collapsed)
  - Fixed topbar (64px height, blur backdrop)
  - Main content area (scrollable)

Sidebar.tsx:
  - Icons: Activity (monitor), CheckSquare (tasks), Terminal (sessions),
    Settings (config), Clock (cron), Shield (approvals)
  - Active state: left cyan border + surface bg
  - Collapsed by default, expand on hover

Topbar.tsx:
  - Left: "MISSION CONTROL" in Orbitron font, cyan color
  - Center: ConnectionStatus component
  - Right: settings icon

ConnectionStatus.tsx:
  - Show gateway URL
  - Status dot (green pulse = connected, red = disconnected, yellow pulse = connecting)
  - "Connected" / "Disconnected" text in mono font
```

Create WebSocket hook:

```
use-ws.ts:
  - Connect to ws://localhost:3001/ws (or via Vite proxy)
  - Auto-reconnect on close
  - Parse incoming JSON messages
  - Dispatch to Zustand stores based on message type

stores/gateway.ts (Zustand):
  - connectionStatus: 'connected' | 'disconnected' | 'connecting'
  - gatewayUrl: string
  - features: { methods: string[], events: string[] }
  - snapshot: HelloOkPayload['snapshot'] | null
  - setConnection(status, url)
  - setHello(payload)
```

### Step 6: ReactFlow Agent Graph
**Session scope: ~1 session**

This is the core visualization. Borrow layout patterns from Crabwalk.

```
stores/agents.ts (Zustand):
  - sessions: Map<string, MonitorSession>
  - actions: Map<string, MonitorAction>
  - execs: Map<string, MonitorExecProcess>
  - runSessionMap: Map<string, string>  // runId → sessionKey
  - upsertSession(session)
  - upsertAction(action)
  - upsertExec(exec)

MonitorPage.tsx:
  - Full-height ReactFlow canvas
  - Compute nodes/edges from Zustand store
  - Re-layout on data change (debounced)

AgentGraph.tsx:
  - Custom node types: session, action, exec
  - Custom edge types: default, spawn (animated cyan)
  - MiniMap in bottom-right corner
  - Controls panel (zoom, fit)

graph-layout.ts:
  - Column-based hierarchical layout
  - Root sessions in column 0
  - Subagent sessions in column N (depth)
  - Actions/execs below their session, sorted by timestamp
  - Constants: COLUMN_GAP=400, ROW_GAP=80
  - Node dimensions: session=280x140, action=220x100, exec=300x120

SessionNode.tsx:
  - Cyberpunk card style
  - Platform icon (Discord/Telegram/WhatsApp/Slack/Web)
  - Agent name (mono font)
  - Status dot with animation
  - Token count display

ActionNode.tsx:
  - Compact card
  - Tool name in mono (or "Streaming..." / "Complete")
  - Expandable args/payload (click to expand)
  - Status-colored top border
  - Duration badge

ExecNode.tsx:
  - Terminal-style card (dark bg, green text)
  - Command display (mono)
  - Status badge (running/completed/failed)
  - Exit code (green for 0, red for non-zero)
  - Expandable stdout/stderr
```

### Step 7: Exec Approval Queue
**Session scope: same session as Step 6**

```
stores/approvals.ts (Zustand):
  - approvals: ApprovalRequest[]
  - addApproval(request)
  - removeApproval(id)

ApprovalQueue.tsx:
  - Fixed bottom panel or sidebar panel
  - List of pending approvals
  - Each shows: command, args, working dir, agent, host
  - Approve (green) / Deny (red) buttons
  - On click: POST /api/approvals/:id/resolve

Backend:
  POST /api/approvals/:id/resolve
    → gatewayClient.call('exec.approval.resolve', { approvalId, approved: true/false })
```

## Acceptance Criteria
- [ ] `pnpm dev` starts both frontend and backend
- [ ] Backend connects to OpenClaw Gateway and authenticates
- [ ] Backend auto-reconnects on disconnect with exponential backoff
- [ ] Browser connects to backend WS and receives events
- [ ] ConnectionStatus shows live gateway status
- [ ] ReactFlow graph populates with session/action/exec nodes as agents work
- [ ] Nodes update in real-time as events stream in
- [ ] Exec approval requests appear in the queue and can be approved/denied
- [ ] Cyberpunk theme is applied throughout (dark bg, neon accents, Orbitron headers)
- [ ] App is responsive (sidebar collapses on small screens)
