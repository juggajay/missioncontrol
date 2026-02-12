# Phase 3: Config & File Editing

## Goal
Add a CodeMirror 6 editor for editing agent workspace files, gateway configuration, and session settings. Add cron job management.

## Prerequisites
- Phase 1 complete (gateway connected)
- Phase 2 complete (task management working)

## Build Order

### Step 1: CodeMirror 6 Editor Component
**Session scope: ~1 session**

Create `apps/web/src/components/editor/FileEditor.tsx`:

```
Dependencies:
  @codemirror/view, @codemirror/state
  @codemirror/lang-json, @codemirror/lang-markdown, @codemirror/lang-yaml
  @codemirror/theme-one-dark (base, then customize for cyberpunk)

FileEditor component:
  Props:
    - value: string
    - onChange: (value: string) => void
    - language: 'json' | 'markdown' | 'yaml' | 'text'
    - readOnly?: boolean
    - onSave?: () => void (Ctrl+S handler)

  Features:
    - Cyberpunk theme (dark bg matching --bg-primary, cyan accents)
    - JSON validation (red underline on syntax errors)
    - Line numbers
    - Bracket matching
    - Auto-indent
    - Search/replace (Ctrl+F)
    - Ctrl+S to trigger save callback
    - Responsive height (fill container)

  Cyberpunk CodeMirror theme:
    - Background: #0a0a0f
    - Gutter background: #0d1117
    - Selection: rgba(0, 240, 255, 0.15)
    - Cursor: #00f0ff
    - Active line: rgba(0, 240, 255, 0.05)
    - Matching bracket: rgba(0, 240, 255, 0.3) border
    - String: #00ff88 (green)
    - Number: #ffcc00 (yellow)
    - Keyword: #b44dff (purple)
    - Property: #00f0ff (cyan)
    - Comment: #484f58 (muted)
```

### Step 2: Gateway Config Editor
**Session scope: same session as Step 1**

```
Backend:
  GET  /api/config       → gatewayClient.call('config.get', {})
                           Returns: { config: {...}, hash: "abc123" }
  PATCH /api/config      → gatewayClient.call('config.patch', {
                             patch: <partial-config>,
                             baseHash: <hash-from-get>
                           })
                           Hash guard prevents clobbering.
  GET  /api/config/schema → gatewayClient.call('config.schema', {})

ConfigPage.tsx:
  - Two-panel layout:
    - Left: Tree view of config sections (agents, gateway, channels, etc.)
    - Right: CodeMirror editor showing selected section as JSON
  - "Save" button (Ctrl+S)
  - Hash conflict detection: if baseHash doesn't match, show warning
  - JSON validation before save (prevent sending invalid config)
  - Success/error toast notifications
  - Diff view (optional): show changes before saving
```

### Step 3: Agent Workspace Files
**Session scope: ~1 session**

```
Backend:
  GET  /api/agents/:id/files?path=<path>
    → gatewayClient.call('agents.files.get', { agentId, path })
  PUT  /api/agents/:id/files
    → gatewayClient.call('agents.files.set', { agentId, path, content })

Frontend:
  AgentFilesPanel.tsx:
    - Agent selector dropdown
    - File tree (if agents.files supports listing, otherwise manual path input)
    - CodeMirror editor for selected file
    - Language detection from file extension
    - Save button + Ctrl+S
    - Common quick-access files:
      - CLAUDE.md (agent instructions)
      - Agent config files
```

### Step 4: Session Settings Manager
**Session scope: same session as Step 3**

```
Backend:
  GET  /api/sessions                    → sessions.list
  PATCH /api/sessions/:key              → sessions.patch
    Body: { model?, thinkingLevel?, verbose? }
  POST /api/sessions/:key/reset         → sessions.reset
  GET  /api/sessions/:key/history       → chat.history
  POST /api/sessions/:key/inject        → chat.inject

SessionsPage.tsx:
  - Table of all sessions (from sessions.list)
    Columns: Session Key, Display Name, Channel, Model, Tokens (in/out), Updated
  - Click row → SessionDetail panel

SessionDetail.tsx:
  - Session info header
  - Settings form:
    - Model selector (from models.list or features.methods)
    - Thinking level: low / medium / high
    - Verbose toggle
    - Save button → sessions.patch
  - Conversation history viewer
    - Scrollable message list
    - User messages (right-aligned, muted border)
    - Agent messages (left-aligned, cyan border)
    - Tool calls (collapsible, purple border)
  - Actions:
    - "Reset Session" button (with confirmation) → sessions.reset
    - "Inject Message" input → chat.inject
```

### Step 5: Cron Job Manager
**Session scope: ~1 session**

```
Backend:
  GET    /api/cron           → cron.list
  POST   /api/cron           → cron.add { schedule, sessionKey, message, ... }
  POST   /api/cron/:id/run   → cron.run { id }
  DELETE /api/cron/:id       → cron.remove { id }
  PATCH  /api/cron/:id       → cron.enable or cron.disable

CronPage.tsx:
  - Table of cron jobs
    Columns: ID, Schedule (cron expression), Session, Status (enabled/disabled), Last Run, Next Run
  - Toggle switch for enable/disable
  - "Run Now" button per job
  - "Delete" button with confirmation
  - "Add Job" dialog:
    - Cron expression input (with human-readable preview)
    - Session key selector
    - Message/prompt text area
    - Submit → cron.add
```

## Acceptance Criteria
- [ ] CodeMirror editor renders with cyberpunk theme
- [ ] Can view and edit gateway config with hash-guarded saves
- [ ] Can view and edit agent workspace files
- [ ] Session settings can be changed (model, thinking level)
- [ ] Session history is viewable with proper formatting
- [ ] Can reset sessions with confirmation
- [ ] Cron jobs can be listed, created, run manually, toggled, and deleted
- [ ] All editor changes validate before saving (JSON syntax check)
- [ ] Ctrl+S saves in editor
- [ ] Error toasts on save failure
