# Phase 4: Full Control

## Goal
Complete the mission control with active agent control, usage dashboards, device management, and multi-agent orchestration views.

## Prerequisites
- Phases 1-3 complete

## Build Order

### Step 1: Agent Control Actions
**Session scope: ~1 session**

```
Backend:
  POST /api/sessions/:key/abort    → chat.abort { sessionKey }
  POST /api/sessions/:key/send     → chat.send { sessionKey, text, idempotencyKey }
  POST /api/sessions/:key/inject   → chat.inject { sessionKey, text }

Frontend enhancements:
  - Add "Abort" button to active agent sessions (red, with confirmation)
  - Add "Send Message" input to session detail panel
  - Add "Inject Note" for adding context without triggering an agent run
  - Real-time status: show "Aborting..." state while waiting for confirmation

  Session control bar (shown when viewing active session):
    - Input field for sending messages
    - Send button (cyan)
    - Abort button (red, pulsing when agent is active)
    - Model quick-switch dropdown
```

### Step 2: Usage & Cost Dashboard
**Session scope: ~1 session**

```
Data sources:
  - chat events carry usage: { inputTokens, outputTokens }
  - sessions.list returns per-session token counts
  - health endpoint returns system metrics

stores/usage.ts (Zustand):
  - totalInputTokens: number
  - totalOutputTokens: number
  - sessionUsage: Map<string, { input: number, output: number }>
  - usageHistory: Array<{ timestamp: number, input: number, output: number }>
  - Update from chat events and session list refreshes

DashboardPage.tsx:
  - Top row: KPI cards (cyberpunk styled)
    - Total Sessions (active/total)
    - Total Tokens (input/output)
    - Active Runs
    - Gateway Uptime
    - Pending Approvals count
  - Middle: Usage chart (tokens over time)
    - Use recharts or lightweight chart library
    - Line chart with neon-colored lines (cyan for input, magenta for output)
    - Dark background matching theme
  - Bottom: Recent activity feed
    - Last N agent events, task changes, approvals
    - Auto-scroll with "scroll to bottom" button
    - Color-coded by event type

KPI Card component:
  - Cyberpunk card with top accent border
  - Label in uppercase mono (small)
  - Value in large Orbitron font
  - Trend indicator (up/down arrow, green/red)
  - Subtle glow on the value
```

### Step 3: Device/Node Management
**Session scope: ~1 session**

```
Backend:
  GET  /api/nodes          → node.list
  POST /api/nodes/:id/invoke → node.invoke { nodeId, capability, params }

NodesPage.tsx (or section in ConfigPage):
  - Grid of device cards
  - Each card shows:
    - Device name/ID
    - Connection status (online/offline)
    - Capabilities list (shell, camera, screen, etc.)
    - Connected since timestamp
  - Click card → device detail with:
    - Capability details
    - Invoke capability button (for testing)
    - Command allowlist
```

### Step 4: Multi-Agent Orchestration View
**Session scope: ~1 session**

Enhanced agent graph for multi-agent scenarios:

```
Enhancements to MonitorPage:
  - Subagent spawn detection (10s window inference from Crabwalk)
  - Animated spawn edges (cyan glow, dashed)
  - Agent-to-agent message flow visualization
  - Session grouping by agent (collapse/expand)
  - Timeline view toggle:
    - Graph view (ReactFlow, default)
    - Timeline view (horizontal timeline with agent lanes)
  - Filter controls:
    - By agent
    - By platform
    - By time range
    - By action type (tool calls only, text only, etc.)

AgentTimeline.tsx (alternative to graph view):
  - Horizontal timeline with agent swimlanes
  - Actions rendered as blocks on the timeline
  - Color-coded by action type
  - Hover to see details
  - Click to expand
  - Zoom in/out on time axis
```

### Step 5: Notification System
**Session scope: same session as any step**

```
Toast system (sonner):
  - Agent started/completed notifications
  - Task status change notifications
  - Error notifications (gateway disconnect, RPC failures)
  - Approval request notifications (with "Review" action button)

Notification bell icon in topbar:
  - Badge count for unread notifications
  - Dropdown panel with notification list
  - Mark as read
  - Click to navigate to relevant page

Browser notifications (optional):
  - Request permission on first visit
  - Send browser notification for approval requests and task completions
  - Only when tab is not focused
```

### Step 6: Keyboard Shortcuts
**Session scope: same session as any step**

```
Global shortcuts:
  Ctrl+K       → Command palette (search everything)
  Ctrl+1-6     → Navigate to pages (Dashboard, Monitor, Tasks, Sessions, Config, Cron)
  Ctrl+N       → New task
  Escape       → Close detail panel / dialog

Monitor shortcuts:
  F            → Fit graph to view
  R            → Reset zoom
  Space        → Toggle auto-layout

Task board shortcuts:
  Ctrl+Enter   → Dispatch selected task
  Delete       → Delete selected task (with confirmation)

Editor shortcuts:
  Ctrl+S       → Save
  Ctrl+Z       → Undo
  Ctrl+Shift+Z → Redo
```

## Acceptance Criteria
- [ ] Can abort active agent runs from the UI
- [ ] Can send messages to agents directly
- [ ] Dashboard shows live KPI cards and usage charts
- [ ] Token usage tracks correctly from chat events
- [ ] Device/node list shows connected devices with capabilities
- [ ] Multi-agent spawn relationships visualized in graph
- [ ] Timeline view provides alternative visualization
- [ ] Filter controls work on agent graph
- [ ] Toast notifications appear for key events
- [ ] Keyboard shortcuts work globally
- [ ] All components maintain cyberpunk aesthetic
