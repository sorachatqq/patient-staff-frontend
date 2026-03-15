# Development Documentation

## Table of Contents

1. [Local Setup](#1-local-setup)
2. [Environment Variables](#2-environment-variables)
3. [Project Structure](#3-project-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [WebSocket Protocol](#5-websocket-protocol)
6. [State & Session Management](#6-state--session-management)
7. [Design System](#7-design-system)
8. [Type Reference](#8-type-reference)
9. [Adding New Features](#9-adding-new-features)

---

## 1. Local Setup

**Requirements:** [Bun](https://bun.sh) ≥ 1.x

```bash
bun install
cp .env.local.example .env.local
bun run dev
```

`bun run dev` starts `server.ts` which internally spawns `bun next dev` as a subprocess. Both processes share a single terminal output. There is no need to start them separately.

| Process   | Port | Description              |
| --------- | ---- | ------------------------ |
| Next.js   | 3000 | Web application          |
| WebSocket | 3001 | Real-time session server |

---

## 2. Environment Variables

| Variable              | Required | Description                           |
| --------------------- | -------- | ------------------------------------- |
| `WS_PORT`             | Yes      | WebSocket server port (server-side)   |
| `NEXT_PUBLIC_WS_PORT` | Yes      | WebSocket port exposed to the browser |

Both default to `3001`. If changed, both must match.

---

## 3. Project Structure

```
app/                        # Next.js App Router
  (portal)/                 # Route group: shared layout (sidebar + socket)
    error.tsx               # Error boundary scoped to portal
    layout.tsx              # Wraps SocketProvider, Sidebar, TopHeader
    patient/page.tsx
    staff/page.tsx
  global-error.tsx          # Catches errors in root layout.tsx itself
  layout.tsx                # Root layout: font, metadata, global CSS
  not-found.tsx
  page.tsx                  # Landing / role selector

components/
  layout/
    Sidebar.tsx             # Collapsible sidebar with nav + role switcher
    TopHeader.tsx           # Mobile header (menu toggle)
  patient/
    PatientForm.tsx         # Multi-step form, session management, broadcast logic
    AddressFields.tsx       # Thai postal code lookup + auto-fill
  staff/
    StaffView.tsx           # Live session dashboard + patient detail modal
  ui/
    ErrorView.tsx           # Shared error UI (reused by error.tsx + global-error.tsx)
    Twemoji.tsx             # Cross-platform SVG emoji via @twemoji/api

lib/
  design-system.ts          # All class token exports (single source of truth)
  thai-address.ts           # Thai address data utilities (lazy singleton cache)
  use-socket.tsx            # SocketProvider context + useSocket hook

styles/
  globals.css               # Tailwind v4 @import + @theme color tokens

types/
  patient.ts                # Shared TypeScript types (PatientFormData, WSMessage, …)

server.ts                   # Bun: WebSocket server + Next.js subprocess
tsconfig.json               # Next.js TS config (excludes server.ts)
tsconfig.server.json        # Bun-specific TS config (covers server.ts only)
```

---

## 4. Architecture Overview

### Data Flow

```
PatientForm (client)
  │  handleChange / select / date
  ▼
broadcastNow(status, data)
  │  JSON.stringify → PatientUpdate
  ▼
SocketProvider.send()
  ├─► updates cachedSnapshotRef (local merge)
  ├─► notifies current listeners (same-tab instant update)
  └─► ws.send() → server.ts
            │
            ▼
     server merges into
     sessions Map<sessionId, PatientUpdate>
            │
            ▼
     broadcast to all OTHER connected clients
            │
            ▼
     StaffView.handleMessage()
       → setPatients() → re-render
```

### Same-Tab Role Switch (Patient → Staff)

Because `SocketProvider` lives in `(portal)/layout.tsx`, the WebSocket connection persists across navigation. The server only echoes messages to _other_ clients, so a same-tab switch requires a different mechanism:

1. `SocketProvider` maintains `cachedSnapshotRef` — a merged snapshot of all known session data.
2. Every outgoing `patient-update` (via `send()`) immediately merges into `cachedSnapshotRef` and dispatches to all active listeners.
3. When `StaffView` mounts, `useSocket` calls `addListener` inside a `useLayoutEffect` (runs before paint). The listener is immediately called with `cachedSnapshotRef`, so staff sees the latest state with no flash.

This means:

- PatientForm unmounts → `send({status: "inactive"})` → `cachedSnapshotRef` updated → StaffView listener notified instantly.
- No round-trip to the server needed for same-tab transitions.

### SocketProvider Internals

```
SocketProvider
  wsRef            WebSocket instance
  listenersRef     Set<(data: string) => void>
  cachedSnapshotRef  string | null  (latest "snapshot" JSON)
  queueRef         string[]  (messages queued before connection opens)

  addListener(fn)  → adds fn, immediately calls fn(cachedSnapshot) if available
  send(data)       → merges into cache + notifies listeners + ws.send()
```

---

## 5. WebSocket Protocol

All messages are JSON strings.

### Server → Client: Snapshot

Sent once on `ws.open` (new connection) if sessions exist. Also synthesized locally by `SocketProvider` for same-tab navigation.

```ts
{
  type: "snapshot",
  sessions: PatientUpdate[]   // all current sessions
}
```

### Client → Server / Server → Other Clients: Patient Update

```ts
{
  type: "patient-update",
  sessionId: string,          // UUID, stable per browser session
  formData: Partial<PatientFormData>,
  status: PatientStatus,
  lastUpdated: string,        // ISO 8601
  currentStep?: number        // 0-indexed step the patient is currently on
}
```

### Session Lifecycle on the Server

```
first message  →  session created in Map
subsequent     →  formData merged (partial updates accumulate)
inactive/submitted  →  TTL countdown begins
  submitted    →  removed after 10 minutes
  inactive     →  removed after 30 minutes
  active/filling/updated  →  kept indefinitely (Infinity TTL)
```

---

## 6. State & Session Management

### PatientForm State

| State         | Type                     | Description                                 |
| ------------- | ------------------------ | ------------------------------------------- |
| `formData`    | `PatientFormData`        | All form field values                       |
| `status`      | `PatientStatus`          | Current broadcast status                    |
| `sessionId`   | `string`                 | UUID, restored from `sessionStorage` or new |
| `currentStep` | `number`                 | Active step (0–3)                           |
| `maxStep`     | `number`                 | Furthest step reached (never decreases)     |
| `errors`      | `Record<string, string>` | Per-field validation messages               |
| `submitted`   | `boolean`                | True after successful submit                |

### Ref Sync Pattern

All state values that are read inside timers, effects, or the unmount cleanup are mirrored into refs via a single `useLayoutEffect`:

```ts
useLayoutEffect(() => {
  formDataRef.current = formData;
  statusRef.current = status;
  // …
});
```

This avoids stale closures without adding exhaustive-deps to every callback.

### sessionStorage Schema

Key: `patient_session`

```ts
{
  sessionId: string,
  formData: PatientFormData,
  currentStep: number,
  maxStep: number
}
```

- Written on every state change.
- Restored on mount if present.
- Cleared on successful form submission.
- On unmount (navigation away), `inactive` is broadcast but storage is **not** cleared — the session is recoverable if the patient returns.

### Status Transitions

```
(initial)  →  active      on sessionId assigned + first broadcast
active     →  filling     on text input change
active     →  updated     on select / date change
filling    →  active      after 1s idle timer
updated    →  active      after 1s idle timer
any        →  inactive    on 30s inactivity / tab hidden / unmount
any        →  submitted   on successful form submit
```

---

## 7. Design System

All visual tokens live in `lib/design-system.ts`. Components import from there — no ad-hoc Tailwind strings in component files.

### Brand Colors (`styles/globals.css`)

```css
@theme {
  --color-brand-purple: #6367ff; /* primary actions, active states */
  --color-brand-lavender: #8494ff; /* hover states */
  --color-brand-soft: #c9beff; /* focus rings, subtle tints */
  --color-brand-mist: #e5e4f7; /* sidebar background */
}
```

Usage in Tailwind classes: `bg-brand-purple`, `text-brand-soft`, `border-brand-mist`, etc.

### Key Exports

| Export              | Type     | Usage                                          |
| ------------------- | -------- | ---------------------------------------------- |
| `statusStyles`      | object   | Badge, dot, card border, progress per status   |
| `connectionStyles`  | object   | Live / Reconnecting indicator                  |
| `text`              | object   | Typography: `pageTitle`, `label`, `error`, …   |
| `card`              | object   | `base`, `section` card containers              |
| `btn`               | object   | `primary`, `outline`, `page`, `filter.*`       |
| `step`              | object   | Step indicator: `circle`, `connector`, `label` |
| `sidebar`           | object   | All sidebar sub-tokens                         |
| `badgeBase`         | string   | Base classes for inline status badges          |
| `inputClass(err?)`  | function | Returns input classes, error variant if truthy |
| `selectClass(err?)` | function | Same as `inputClass` + `appearance-none pr-10` |

### Adding a New Status

1. Add the literal to `PatientStatus` in `types/patient.ts`
2. Add a corresponding entry to `statusStyles` in `lib/design-system.ts`
3. Add it to `SESSION_TTL` in `server.ts`
4. Add it to `VALID_STATUSES` in `StaffView.tsx` if it should appear in the dashboard

---

## 8. Type Reference

```ts
// types/patient.ts

interface PatientFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  phoneNumber: string;
  email: string;
  addressLine: string;
  postalCode: string;
  subDistrict: string;
  district: string;
  province: string;
  preferredLanguage: string;
  religion: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
}

type PatientStatus =
  | "active"
  | "filling"
  | "updated"
  | "submitted"
  | "inactive";

interface PatientUpdate {
  type: "patient-update";
  sessionId: string;
  formData: Partial<PatientFormData>;
  status: PatientStatus;
  lastUpdated: string; // ISO 8601
  currentStep?: number;
}

interface SnapshotMessage {
  type: "snapshot";
  sessions: PatientUpdate[];
}

type WSMessage = PatientUpdate | SnapshotMessage;
```

---

## 9. Adding New Features

### New Form Field

1. Add the field key to `PatientFormData` in `types/patient.ts`
2. Add an `<input>` or `<select>` in `PatientForm.tsx` in the appropriate step
3. Add the field label to `FIELD_LABELS` and the key to `FIELD_ORDER` in `StaffView.tsx` to show it in the staff dashboard and missing-fields tooltip
4. Add validation logic in the `validate()` function in `PatientForm.tsx`

### New Form Step

1. Add a new entry to the `STEPS` array in `PatientForm.tsx`
2. Add a corresponding render block inside the `{currentStep === N && ...}` section
3. Update `validate()` to include the new step index

### New WebSocket Message Type

1. Add a new interface to `types/patient.ts` and extend `WSMessage`
2. Handle the new type in `SocketProvider.onmessage` (update cache if relevant)
3. Handle it in `StaffView.handleMessage` or wherever the consumer lives

### New Page Route

Routes within the portal (with sidebar) go under `app/(portal)/`. Pages that should be full-screen (no sidebar) go directly under `app/`.
