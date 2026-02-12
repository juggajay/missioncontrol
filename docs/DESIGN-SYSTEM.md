# Mission Control — Cyberpunk Design System

## Theme Philosophy
Futuristic command center aesthetic. Think Blade Runner meets NASA mission control.
Dark backgrounds with neon accent lighting. Glowing borders. Scanline textures.
Data-dense but readable. Every element feels like it belongs on a spaceship HUD.

## Color Palette

### Base Colors (CSS Variables)
```css
:root {
  /* Backgrounds — deep space */
  --bg-primary: #0a0a0f;        /* Main background — near black with blue tint */
  --bg-secondary: #0d1117;      /* Card/panel backgrounds */
  --bg-tertiary: #161b22;       /* Elevated surfaces */
  --bg-surface: #1c2333;        /* Interactive surface (hover states) */
  --bg-overlay: rgba(0, 0, 0, 0.8); /* Modal/overlay backdrop */

  /* Neon Accents */
  --neon-cyan: #00f0ff;          /* Primary accent — status, links, active states */
  --neon-magenta: #ff00aa;       /* Secondary accent — alerts, important actions */
  --neon-blue: #4d7cff;          /* Tertiary — informational */
  --neon-green: #00ff88;         /* Success states */
  --neon-yellow: #ffcc00;        /* Warnings */
  --neon-red: #ff3366;           /* Errors, destructive actions */
  --neon-purple: #b44dff;        /* Agent/AI indicators */
  --neon-orange: #ff6b2b;        /* Priority/urgent */

  /* Text */
  --text-primary: #e6edf3;      /* Main text */
  --text-secondary: #8b949e;    /* Muted text */
  --text-tertiary: #484f58;     /* Disabled/placeholder */
  --text-accent: #00f0ff;       /* Highlighted text */

  /* Borders */
  --border-default: #21262d;    /* Default border */
  --border-muted: #161b22;      /* Subtle border */
  --border-accent: #00f0ff33;   /* Accent border (with transparency) */

  /* Glow Effects */
  --glow-cyan: 0 0 10px rgba(0, 240, 255, 0.3), 0 0 40px rgba(0, 240, 255, 0.1);
  --glow-magenta: 0 0 10px rgba(255, 0, 170, 0.3), 0 0 40px rgba(255, 0, 170, 0.1);
  --glow-green: 0 0 10px rgba(0, 255, 136, 0.3), 0 0 40px rgba(0, 255, 136, 0.1);
  --glow-red: 0 0 10px rgba(255, 51, 102, 0.3), 0 0 40px rgba(255, 51, 102, 0.1);
}
```

### Tailwind Config Extension
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: { DEFAULT: '#0a0a0f', secondary: '#0d1117', tertiary: '#161b22', surface: '#1c2333' },
          cyan: { DEFAULT: '#00f0ff', dim: '#00f0ff33', glow: '#00f0ff1a' },
          magenta: { DEFAULT: '#ff00aa', dim: '#ff00aa33', glow: '#ff00aa1a' },
          blue: { DEFAULT: '#4d7cff', dim: '#4d7cff33' },
          green: { DEFAULT: '#00ff88', dim: '#00ff8833' },
          yellow: { DEFAULT: '#ffcc00', dim: '#ffcc0033' },
          red: { DEFAULT: '#ff3366', dim: '#ff336633' },
          purple: { DEFAULT: '#b44dff', dim: '#b44dff33' },
          orange: { DEFAULT: '#ff6b2b', dim: '#ff6b2b33' },
          text: { DEFAULT: '#e6edf3', muted: '#8b949e', disabled: '#484f58' },
          border: { DEFAULT: '#21262d', muted: '#161b22', accent: '#00f0ff33' },
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],  /* Headers/titles — techy angular font */
      },
      boxShadow: {
        'glow-cyan': '0 0 10px rgba(0,240,255,0.3), 0 0 40px rgba(0,240,255,0.1)',
        'glow-magenta': '0 0 10px rgba(255,0,170,0.3), 0 0 40px rgba(255,0,170,0.1)',
        'glow-green': '0 0 10px rgba(0,255,136,0.3), 0 0 40px rgba(0,255,136,0.1)',
        'glow-red': '0 0 10px rgba(255,51,102,0.3), 0 0 40px rgba(255,51,102,0.1)',
        'glow-purple': '0 0 10px rgba(180,77,255,0.3), 0 0 40px rgba(180,77,255,0.1)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'data-stream': 'data-stream 20s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'data-stream': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
        'scanline-overlay': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    }
  }
}
```

## Typography

### Font Stack
- **Display/Headers**: Orbitron (angular, tech feel) — page titles, section headers
- **Body/UI**: Inter — clean, readable at all sizes
- **Code/Data**: JetBrains Mono — monospace for code, logs, IDs, timestamps

### Scale
| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Page title | Orbitron | 24px / text-2xl | 700 | --neon-cyan |
| Section header | Orbitron | 18px / text-lg | 600 | --text-primary |
| Card title | Inter | 16px / text-base | 600 | --text-primary |
| Body text | Inter | 14px / text-sm | 400 | --text-primary |
| Caption/label | Inter | 12px / text-xs | 500 | --text-secondary, uppercase, tracking-wider |
| Code/mono | JetBrains Mono | 13px | 400 | --neon-cyan |
| Status badge | JetBrains Mono | 11px | 600 | varies, uppercase |

## Component Patterns

### Cards (Panel)
```
- Background: bg-secondary with border border-default
- On hover: border-accent with subtle glow-cyan shadow
- Corner cut effect: clip-path polygon for top-right corner (optional)
- Header bar: 2px top border in accent color
- Inner padding: p-4
```
```tsx
<div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg
  hover:border-cyber-cyan/20 hover:shadow-glow-cyan transition-all duration-300
  border-t-2 border-t-cyber-cyan/50">
```

### Status Indicators
| Status | Color | Effect |
|--------|-------|--------|
| Active/Running | neon-green | Pulse animation + glow |
| Idle/Standby | neon-cyan | Static |
| Working/Processing | neon-purple | Pulse animation |
| Warning | neon-yellow | Static |
| Error/Failed | neon-red | Glow |
| Offline/Disabled | text-tertiary | No glow, dim |
| Planning | neon-blue | Pulse |
| Review | neon-orange | Static |

### Status Dot Component
```tsx
<span className="relative flex h-2.5 w-2.5">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75"></span>
  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyber-green shadow-glow-green"></span>
</span>
```

### Buttons
```
Primary: bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan
  hover: bg-cyber-cyan/20 shadow-glow-cyan
Destructive: bg-cyber-red/10 border border-cyber-red/30 text-cyber-red
  hover: bg-cyber-red/20 shadow-glow-red
Ghost: bg-transparent text-text-secondary
  hover: bg-surface text-text-primary
```

### Kanban Columns
```
Each column:
- Header: Orbitron font, uppercase, tracking-wide, accent color underline
- Count badge: monospace, neon-colored number
- Background: bg-secondary/50 with dashed border-muted
- Cards within: standard card style with status-colored left border

Column accent colors:
  Planning  → neon-blue
  Inbox     → neon-cyan
  Assigned  → neon-purple
  In Progress → neon-green (animated)
  Testing   → neon-yellow
  Review    → neon-orange
  Done      → neon-green (static)
```

### ReactFlow Nodes
```
Session Node:
  - bg-secondary with colored left border (platform color)
  - Platform icon + agent name
  - Status dot (animated for active)
  - Token count in monospace
  - Dimensions: 280x140

Action Node:
  - bg-tertiary with status-colored top border
  - Tool name in monospace
  - Expandable args/payload
  - Duration badge
  - Dimensions: 220x100

Exec Node:
  - bg-tertiary with terminal-style header (green text on dark bg)
  - Command in monospace
  - stdout/stderr toggle
  - Exit code badge (green for 0, red for non-zero)
  - Dimensions: 300x120

Edges:
  - Default: cyber-border color, animated dashes for active
  - Spawn: neon-cyan, animated with glow
  - Error: neon-red
```

### Sidebar Navigation
```
Fixed left sidebar, 60px wide (collapsed) / 240px (expanded)
- bg-primary with right border
- Icon-only when collapsed
- Tooltip on hover (collapsed)
- Active item: left border accent + bg-surface
- Items: Dashboard, Agents, Tasks, Sessions, Config, Cron, Logs
```

### Header/Topbar
```
Fixed top, full width
- bg-primary/80 with backdrop-blur
- Left: Logo + "MISSION CONTROL" in Orbitron
- Center: Connection status (gateway URL + green/red dot)
- Right: Settings gear, theme toggle (future), user avatar
- Bottom border: 1px gradient from cyan to magenta
```

### Data Tables
```
- Monospace font for IDs, timestamps, token counts
- Row hover: bg-surface
- Sortable column headers with chevron icons
- Status columns use colored badges
- Alternating row opacity (subtle): odd rows slightly lighter
```

### Terminal/Log Viewer
```
- bg-primary (darkest)
- Green monospace text (classic terminal)
- Timestamps in text-tertiary
- Log levels: DEBUG (text-secondary), INFO (neon-cyan), WARN (neon-yellow), ERROR (neon-red)
- Auto-scroll with "scroll to bottom" button
- Line numbers in text-tertiary
```

### Toast/Notifications
```
- Bottom-right corner
- bg-secondary with left border in status color
- Slide in from right, auto-dismiss after 5s
- Agent events: neon-purple left border
- Errors: neon-red left border
- Success: neon-green left border
```

## Special Effects

### Background Grid
Applied to the main content area for a "HUD" feel:
```tsx
<div className="bg-grid-pattern bg-grid">
```

### Scanline Overlay (Subtle)
Optional CRT-like scanlines over panels. Use sparingly:
```tsx
<div className="relative">
  <div className="absolute inset-0 bg-scanline-overlay pointer-events-none opacity-30" />
  {/* content */}
</div>
```

### Corner Cut (HUD Style)
For special panels/headers:
```css
.corner-cut {
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
}
```

### Glowing Border Animation
For active/important elements:
```css
@keyframes border-glow {
  0%, 100% { border-color: rgba(0, 240, 255, 0.3); }
  50% { border-color: rgba(0, 240, 255, 0.6); }
}
```

### Data Stream Background
For loading states or active panels:
```css
.data-stream {
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(0, 240, 255, 0.02) 50%,
    transparent 100%
  );
  background-size: 100% 200%;
  animation: data-stream 3s linear infinite;
}
```

## shadcn/ui Customization

Override shadcn defaults in `globals.css`:
```css
@layer base {
  :root {
    --background: 230 50% 4%;      /* bg-primary */
    --foreground: 213 31% 91%;     /* text-primary */
    --card: 215 28% 7%;            /* bg-secondary */
    --card-foreground: 213 31% 91%;
    --popover: 215 28% 7%;
    --popover-foreground: 213 31% 91%;
    --primary: 186 100% 50%;       /* neon-cyan */
    --primary-foreground: 230 50% 4%;
    --secondary: 215 14% 14%;     /* bg-tertiary */
    --secondary-foreground: 213 31% 91%;
    --muted: 215 14% 14%;
    --muted-foreground: 215 14% 56%;
    --accent: 186 100% 50%;
    --accent-foreground: 230 50% 4%;
    --destructive: 343 100% 60%;  /* neon-red */
    --destructive-foreground: 0 0% 100%;
    --border: 215 14% 15%;
    --input: 215 14% 15%;
    --ring: 186 100% 50%;
    --radius: 0.5rem;
  }
}
```

## Responsive Breakpoints
- **sm (640px)**: Collapse sidebar, stack panels
- **md (768px)**: Two-column layout
- **lg (1024px)**: Full sidebar + main content
- **xl (1280px)**: Three-column layouts (sidebar + main + detail panel)
- **2xl (1536px)**: Expanded dashboard with all panels visible

## Icon Library
Use **Lucide React** (already included with shadcn/ui):
- Consistent stroke-width: 1.5
- Size: 16px for inline, 20px for buttons, 24px for nav
- Color: inherit from text color
