# Patient Registration System

A real-time patient registration form with a live staff monitoring dashboard, built with Next.js, TailwindCSS v4, and native WebSockets.

---

## Features

- **Patient Form** — Multi-step form (4 steps) with validation and Thai address auto-fill via postal code
- **Staff Dashboard** — Real-time monitoring of all active patient sessions
- **5 Session Statuses** — `active` · `filling` · `updated` · `submitted` · `inactive`
- **Instant Updates** — Every input event broadcasts immediately (no debounce)
- **Session Persistence** — Form state saved to `sessionStorage`; survives tab refresh and role switches
- **Inactivity Detection** — Auto-marks session inactive after 30s of no input
- **Snapshot on Connect** — New staff clients instantly receive all current sessions on connect
- **Patient Detail Modal** — Click any patient card in history to view full form data
- **Field Progress Tooltip** — Hover the `x/17 fields` indicator to see which fields are missing
- **Cross-platform Emoji** — Twemoji renders consistent SVG emoji across all OS/browsers

---

## Tech Stack

| Concern       | Choice                          |
| ------------- | ------------------------------- |
| Framework     | Next.js 16 (App Router)         |
| Styling       | TailwindCSS v4 (CSS-first config) |
| Real-Time     | Native WebSocket (`bun` server) |
| Language      | TypeScript                      |
| Runtime       | Bun                             |

---

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_WS_PORT=3001
WS_PORT=3001
```

### 3. Run locally

```bash
bun run dev
```

This starts both the WebSocket server (`server.ts`) and Next.js dev server concurrently.

| URL                        | Description              |
| -------------------------- | ------------------------ |
| http://localhost:3000      | Landing page (role selector) |
| http://localhost:3000/patient | Patient registration form |
| http://localhost:3000/staff   | Staff monitoring dashboard |

Open `/staff` in one tab and `/patient` in another — the staff view updates live as the patient fills in the form.

---

## Project Structure

```
├── app/
│   ├── (portal)/
│   │   ├── error.tsx           # Error boundary for portal routes
│   │   ├── layout.tsx          # Portal layout (sidebar + header + SocketProvider)
│   │   ├── patient/
│   │   │   ├── loading.tsx     # Skeleton UI while patient page loads
│   │   │   └── page.tsx
│   │   └── staff/
│   │       ├── loading.tsx     # Skeleton UI while staff page loads
│   │       └── page.tsx
│   ├── global-error.tsx        # Root-level error boundary (replaces root layout)
│   ├── layout.tsx              # Root layout (font, metadata)
│   ├── not-found.tsx           # 404 page
│   └── page.tsx                # Landing page
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Collapsible navigation sidebar
│   │   └── TopHeader.tsx       # Mobile top header with menu toggle
│   ├── patient/
│   │   ├── AddressFields.tsx   # Thai postal code → sub-district/district/province auto-fill
│   │   └── PatientForm.tsx     # Multi-step registration form with real-time broadcast
│   ├── staff/
│   │   └── StaffView.tsx       # Live patient session dashboard with modal detail view
│   └── ui/
│       ├── ErrorView.tsx       # Shared error UI (used by error.tsx + global-error.tsx)
│       └── Twemoji.tsx         # Cross-platform SVG emoji renderer
│
├── lib/
│   ├── design-system.ts        # Centralized class tokens (colors, variants, badges)
│   ├── thai-address.ts         # Thai address data utilities
│   └── use-socket.tsx          # SocketProvider context + useSocket hook
│
├── styles/
│   └── globals.css             # Tailwind v4 CSS-first config (@theme tokens)
│
├── types/
│   └── patient.ts              # Shared TypeScript types
│
├── server.ts                   # Bun WebSocket server + Next.js subprocess launcher
├── tsconfig.json               # Next.js TypeScript config
└── tsconfig.server.json        # Bun-specific TypeScript config (for server.ts)
```

---

## Architecture

### Real-Time Flow

```
Patient types a field
        │
        ▼
handleChange() → broadcastNow(newData, status)
        │
        ▼
SocketProvider.send() ─→ updates local snapshot cache
        │                        │
        ▼                        ▼
WebSocket server          notify local listeners
merges into session       (same-tab role switch: instant)
store, broadcasts to
all OTHER clients
        │
        ▼
StaffView.handleMessage() → setPatients() → re-render
```

### Session Statuses

| Status      | Trigger                                              |
| ----------- | ---------------------------------------------------- |
| `active`    | Patient has the form open but is idle                |
| `filling`   | Patient is actively typing in a text field           |
| `updated`   | Patient changed a select or date field               |
| `submitted` | Patient completed and submitted the form             |
| `inactive`  | 30s of inactivity, tab hidden, or patient navigated away |

### WebSocket Snapshot Cache

`SocketProvider` caches the latest server snapshot in memory. When any component registers a new listener (e.g. StaffView navigating to the page), it immediately receives the cached snapshot — no round-trip to the server needed. Outgoing `patient-update` messages also update the cache and notify existing listeners, so same-tab role switches reflect the latest status instantly.

### Session Persistence

`PatientForm` saves `{ sessionId, formData, currentStep, maxStep }` to `sessionStorage` on every change. On mount, it restores from storage if available. On submit, storage is cleared. On unmount (navigation), it broadcasts `inactive` and the session is recoverable if the patient returns.

---

## Deployment (Railway)

The app runs as a single Railway service — `server.ts` listens on Railway's injected `PORT`, handles WebSocket connections directly, and proxies all HTTP traffic to Next.js running internally on `NEXT_PORT`.

### Setup

1. Connect GitHub repo to Railway
2. **Build** → Pre-deploy Command: `bun run build`
3. **Deploy** → Custom Start Command: `bun run start`
4. **Deploy** → Disable **Enable Serverless** (WebSocket requires always-on process)
5. **Networking** → Generate Domain → port `3000`
6. **Environment Variables**:

```env
NEXT_PORT=3001
NEXT_PUBLIC_WS_URL=wss://your-app.up.railway.app
```

`PORT` is injected automatically by Railway — do not set it manually.

---

## Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `bun run dev`   | Start dev server (WS + Next.js)      |
| `bun run build` | Build Next.js for production         |
| `bun run start` | Start production server              |
| `bun run lint`  | Run ESLint on `app/`, `components/`, `lib/` |
