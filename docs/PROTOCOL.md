# OpenClaw Gateway Protocol Reference

## Network
| Service | Port | Purpose |
|---------|------|---------|
| Gateway (WS + HTTP) | 18789 | WebSocket control plane + HTTP APIs |
| Browser Control | 18791 | Browser automation |
| Canvas Host | 18793 | Agent-editable HTML / A2UI |

Default bind: `ws://127.0.0.1:18789` (loopback only).
Config file: `~/.openclaw/openclaw.json` (JSON5 format).

## Wire Protocol (v3)

### Frame Types

**Request (client → gateway):**
```json
{
  "type": "req",
  "id": "<uuid>",
  "method": "<method-name>",
  "params": { }
}
```

**Response (gateway → client):**
```json
{
  "type": "res",
  "id": "<request-uuid>",
  "ok": true,
  "payload": { }
}
```

**Error Response:**
```json
{
  "type": "res",
  "id": "<request-uuid>",
  "ok": false,
  "error": { "code": "<code>", "message": "<human-readable>" }
}
```

**Event (gateway → client, push):**
```json
{
  "type": "event",
  "event": "<event-name>",
  "payload": { },
  "seq": 123,
  "stateVersion": { "presence": 5, "health": 3 }
}
```

Events carry monotonically increasing `seq`. Detect gaps and refresh via `health` + `system-presence`.

## Connection Handshake

### Flow
1. Client opens WebSocket to `ws://127.0.0.1:18789`
2. Gateway sends challenge:
   ```json
   { "type": "event", "event": "connect.challenge", "payload": { "nonce": "<random>", "ts": 1707753600000 } }
   ```
3. Client sends connect request (MUST be first req frame):
   ```json
   {
     "type": "req",
     "id": "<uuid>",
     "method": "connect",
     "params": {
       "minProtocol": 3,
       "maxProtocol": 3,
       "client": {
         "id": "mission-control",
         "version": "1.0.0",
         "platform": "web",
         "mode": "webchat"
       },
       "role": "operator",
       "scopes": ["operator.admin", "operator.approvals", "operator.pairing"],
       "caps": [],
       "auth": { "token": "<gateway-auth-token>" }
     }
   }
   ```
4. Gateway responds with hello-ok:
   ```json
   {
     "type": "res",
     "id": "<req-id>",
     "ok": true,
     "payload": {
       "type": "hello-ok",
       "protocol": 3,
       "features": {
         "methods": ["<~79 method names>"],
         "events": ["<~18 event names>"]
       },
       "snapshot": {
         "presence": { },
         "health": { },
         "stateVersion": { "presence": 5, "health": 3 },
         "uptimeMs": 86400000
       },
       "auth": {
         "deviceToken": "<scoped-token>",
         "role": "operator",
         "scopes": ["operator.admin", "operator.approvals", "operator.pairing"]
       },
       "policy": {
         "maxPayload": 1048576,
         "maxBufferedBytes": 4194304,
         "tickIntervalMs": 30000
       }
     }
   }
   ```

### Authentication Modes
| Mode | Config Key | Env Var | Connect Param |
|------|-----------|---------|---------------|
| Token | `gateway.auth.token` | `OPENCLAW_GATEWAY_TOKEN` | `auth.token` |
| Password | `gateway.auth.password` | `OPENCLAW_GATEWAY_PASSWORD` | `auth.password` |
| Device token | (issued by gateway) | N/A | `auth.token` (reuse `deviceToken` from hello-ok) |

### Reconnection Strategy
- Initial backoff: 800ms
- Multiplier: 1.7x per attempt
- Max delay: 15,000ms
- Reset backoff on successful hello-ok

### Roles & Scopes
**Roles:** `operator` (UI/CLI clients), `node` (device hosts)
**Operator Scopes:** `operator.read`, `operator.write`, `operator.admin`, `operator.approvals`, `operator.pairing`

## RPC Methods (Complete)

### Connection & System
| Method | Description |
|--------|-------------|
| `connect` | Auth handshake (must be first frame) |
| `health` | Full health snapshot |
| `status` | Gateway status probe |
| `system-presence` | List all connected devices/clients |
| `wake` | Trigger heartbeat |

### Chat Operations
| Method | Params | Description |
|--------|--------|-------------|
| `chat.send` | `{sessionKey, text, idempotencyKey}` | Send message, non-blocking. Returns `{runId, status: "started"}`. Same idempotencyKey returns `"in_flight"` while running. |
| `chat.abort` | `{sessionKey}` | Stop active agent run |
| `chat.history` | `{sessionKey}` | Conversation history |
| `chat.inject` | `{sessionKey, text}` | Append to transcript (no agent run) |

### Session Management
| Method | Description |
|--------|-------------|
| `sessions.list` | List all sessions with metadata |
| `sessions.patch` | Update session settings (model, thinking level, verbose) |
| `sessions.reset` | Reset session transcript |

### Agent Operations
| Method | Description |
|--------|-------------|
| `agents.list` | List configured agents |
| `agents.files.get` | Read agent workspace files |
| `agents.files.set` | Write agent workspace files |

### Configuration
| Method | Description |
|--------|-------------|
| `config.get` | Get current config + hash |
| `config.set` | Set specific config value |
| `config.patch` | JSON Merge Patch (base-hash guard prevents clobbering) |
| `config.apply` | Replace entire config with validation + restart |
| `config.schema` | Get form schema including plugin schemas |

### Cron / Scheduling
| Method | Description |
|--------|-------------|
| `cron.list` | List scheduled jobs |
| `cron.add` | Create scheduled job |
| `cron.run` | Execute job manually |
| `cron.remove` | Delete job |
| `cron.enable` / `cron.disable` | Toggle job state |

### Node Operations
| Method | Description |
|--------|-------------|
| `node.list` | List paired devices + capabilities |
| `node.invoke` | Invoke capability on device |

### Other
| Method | Description |
|--------|-------------|
| `channels.status` | Messaging channel status |
| `models.list` | Available models |
| `skills.*` | Skill management |
| `exec.approvals.*` | Exec allowlist management |
| `exec.approval.resolve` | Resolve approval request |
| `canvas.*` | Canvas operations |
| `logs.tail` | Live log tail |
| `update.run` | Package update |
| `send` | Transmit to channel (requires idempotency key) |

## Event Types

### Agent Events (`event: "agent"`)
Streamed during active agent runs:
```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "runId": "run_abc123",
    "seq": 1,
    "stream": "tool",
    "ts": 1707753600000,
    "data": { "tool": "search_web", "arguments": {"query": "example"} },
    "sessionKey": "agent:main:main"
  }
}
```

**Sub-streams:**
| Stream | Content |
|--------|---------|
| `"lifecycle"` | `data.phase: "start"` or `"end"` — agent run lifecycle |
| `"assistant"` / `"text"` | `data.text` — streaming text (cumulative) |
| Any stream with `data.type: "tool_use"` | Tool invocation (name + args) |
| Any stream with `data.type: "tool_result"` | Tool return value |
| `"thinking"` | Reasoning content |

### Chat Events (`event: "chat"`)
```json
{
  "runId": "run_abc",
  "sessionKey": "agent:main:discord:channel:123",
  "seq": 1,
  "state": "delta" | "final" | "aborted" | "error",
  "message": { "content": [{"type": "text", "text": "..."}] },
  "usage": { "inputTokens": 100, "outputTokens": 50 },
  "stopReason": "end_turn"
}
```

### Exec Events
```json
// exec.started
{ "pid": 1234, "command": "npm test", "sessionId": "...", "runId": "...", "startedAt": 1707753600000 }

// exec.output
{ "pid": 1234, "runId": "...", "stream": "stdout" | "stderr", "output": "..." }

// exec.completed
{ "pid": 1234, "runId": "...", "exitCode": 0, "durationMs": 5000, "status": "completed" }
```

### Other Events
| Event | Description |
|-------|-------------|
| `connect.challenge` | Auth challenge (nonce + ts) |
| `presence` | Connection status changes |
| `health` | System health changes |
| `tick` | Keepalive (30s) |
| `shutdown` | Gateway stopping |
| `cron` | Cron execution events |
| `exec.approval.requested` | Command needs approval |
| `heartbeat` | Scheduled task status |

## Session Key Format
```
agent:<agentId>:<platform>:<type>:<identifier>
```

Examples:
- `agent:main:main` — direct user interaction
- `agent:main:discord:channel:123456` — Discord channel
- `agent:main:telegram:group:-123` — Telegram group
- `agent:main:whatsapp:dm:+15555550123` — WhatsApp DM
- `cron:<jobId>` — cron job session

## HTTP Endpoints (same port 18789)
| Endpoint | Description |
|----------|-------------|
| `GET /` | Built-in control UI |
| `POST /v1/chat/completions` | OpenAI-compatible API |
| `POST /v1/responses` | OpenResponses API |
| `POST /tools/invoke` | Direct tool invocation |

Auth: `Authorization: Bearer <token>`
Agent selection: `model: "openclaw:<agentId>"` or `x-openclaw-agent-id` header

## Environment Variables
| Variable | Purpose |
|----------|---------|
| `OPENCLAW_CONFIG_PATH` | Override config file |
| `OPENCLAW_STATE_DIR` | Override state dir (~/.openclaw) |
| `OPENCLAW_GATEWAY_PORT` | Override port |
| `OPENCLAW_GATEWAY_TOKEN` | Auth token |
| `OPENCLAW_GATEWAY_PASSWORD` | Auth password |
| `OPENCLAW_GATEWAY_BIND` | Bind mode |

## Data Structures

### Session Entry (sessions.list)
```json
{
  "sessionKey": "agent:main:main",
  "sessionId": "<uuid>",
  "updatedAt": "2026-02-12T...",
  "displayName": "Main",
  "channel": "webchat",
  "origin": { "label": "direct", "provider": "webchat", "from": "user", "to": "main" },
  "inputTokens": 1234,
  "outputTokens": 5678,
  "totalTokens": 6912,
  "contextTokens": 4096
}
```

### Session Patch (sessions.patch)
```json
{
  "sessionKey": "agent:main:main",
  "model": "anthropic/claude-opus-4-6",
  "thinkingLevel": "low",
  "verbose": true
}
```

### Exec Approval
```json
{
  "command": "rm -rf /tmp/old",
  "arguments": ["-rf", "/tmp/old"],
  "workingDirectory": "/home/user",
  "agentId": "main",
  "resolvedExecutable": "/usr/bin/rm",
  "host": "my-machine",
  "approvalId": "<uuid>"
}
```

## Minimal Client Implementation
```typescript
const ws = new WebSocket("ws://127.0.0.1:18789");
const pending = new Map<string, { resolve: Function; reject: Function }>();
let requestId = 0;

ws.onmessage = (ev) => {
  const frame = JSON.parse(ev.data);

  if (frame.type === "event" && frame.event === "connect.challenge") {
    ws.send(JSON.stringify({
      type: "req",
      id: String(++requestId),
      method: "connect",
      params: {
        minProtocol: 3, maxProtocol: 3,
        client: { id: "mission-control", version: "1.0.0", platform: "web", mode: "webchat" },
        role: "operator",
        scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
        caps: [],
        auth: { token: "<TOKEN>" }
      }
    }));
    return;
  }

  if (frame.type === "res") {
    const p = pending.get(frame.id);
    if (p) { pending.delete(frame.id); frame.ok ? p.resolve(frame.payload) : p.reject(frame.error); }
    return;
  }

  if (frame.type === "event") {
    // Route: agent, chat, exec.started, exec.output, exec.completed, presence, etc.
  }
};

function call(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = String(++requestId);
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ type: "req", id, method, params }));
  });
}
```
