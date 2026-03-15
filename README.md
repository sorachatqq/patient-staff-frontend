# Patient Registration System

A real-time patient input form and staff monitoring dashboard built with Next.js, TailwindCSS, and Pusher.

## Live Demo

> Add your deployed URL here after deployment.

---

## Features

- **Patient Form** — Responsive multi-section form with full validation
- **Staff View** — Real-time dashboard updating as patients type
- **Status Indicators** — Filling / Submitted / Inactive states with animated indicators
- **Progress Tracking** — Per-session fill progress bar on the staff dashboard
- **Inactivity Detection** — Automatically marks a session inactive after 10s of no input
- **Multi-session Support** — Staff view tracks multiple concurrent patient sessions

---

## Tech Stack

| Concern   | Choice                  |
| --------- | ----------------------- |
| Framework | Next.js 14 (App Router) |
| Styling   | TailwindCSS             |
| Real-Time | Pusher Channels         |
| Language  | TypeScript              |
| Hosting   | Vercel                  |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your Pusher credentials:

```bash
cp .env.local.example .env.local
```

Get credentials by signing up at [pusher.com](https://pusher.com) → **Channels** → Create new app.

```env
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

| Route      | Description                           |
| ---------- | ------------------------------------- |
| `/`        | Landing page with links to both views |
| `/patient` | Patient registration form             |
| `/staff`   | Staff real-time monitoring dashboard  |

Open `/staff` in one tab and `/patient` in another — the staff view updates live as the patient types.

---

## Project Structure

```
patient-staff-frontend/
├── app/
│   ├── layout.tsx              # Root layout, global font & styles
│   ├── page.tsx                # Home / landing page
│   ├── patient/
│   │   └── page.tsx            # Patient portal page
│   ├── staff/
│   │   └── page.tsx            # Staff dashboard page
│   └── api/
│       └── patient-update/
│           └── route.ts        # POST endpoint — triggers Pusher event
├── components/
│   ├── PatientForm.tsx         # Form with validation & real-time broadcast
│   └── StaffView.tsx           # Live dashboard subscribing to Pusher
├── lib/
│   ├── pusher.ts               # Server-side Pusher instance
│   └── pusher-client.ts        # Client-side Pusher instance
├── types/
│   └── patient.ts              # Shared TypeScript types
├── .env.local.example          # Environment variable template
└── README.md
```

---

## Design Decisions

### Responsive Layout

- Mobile-first grid: single column on small screens, two columns on `sm+`
- Sticky nav bar on both pages for easy back-navigation
- Patient cards on the staff view use a scrollable field list to avoid overflow

### Component Architecture

**`PatientForm`**

- Controlled form with `useState` for all fields
- Debounce-free: broadcasts on every field change via `useEffect` watching `formData`
- Inactivity timer (10s) auto-sets status to `inactive` and broadcasts
- Client-side validation runs on submit; per-field error messages appear inline

**`StaffView`**

- Subscribes to `patient-channel` on mount, unsubscribes on unmount
- Merges incoming partial `formData` into existing session state (accumulates all fields)
- Sessions sorted by `lastUpdated` descending (most recent first)
- A 10-second `setInterval` ticks to refresh relative timestamps (`"just now"`, `"2m ago"`)

### Real-Time Synchronization Flow

```
Patient types a field
      │
      ▼
handleChange() updates local state
      │
      ▼
useEffect fires → POST /api/patient-update
      │
      ▼
API route calls pusherServer.trigger("patient-channel", "patient-update", payload)
      │
      ▼
Pusher broadcasts to all subscribers on "patient-channel"
      │
      ▼
StaffView channel.bind("patient-update") merges data into patients map
      │
      ▼
React re-renders PatientCard with updated fields
```

Each broadcast payload includes:

- `sessionId` — unique per browser session (used as map key)
- `formData` — partial object with only current field values
- `status` — `"filling"` | `"submitted"` | `"inactive"`
- `lastUpdated` — ISO timestamp

---

## Deployment on Vercel

1. Push repository to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add environment variables in **Project Settings → Environment Variables**:
   - `PUSHER_APP_ID`
   - `PUSHER_SECRET`
   - `NEXT_PUBLIC_PUSHER_KEY`
   - `NEXT_PUBLIC_PUSHER_CLUSTER`
4. Deploy — Vercel auto-detects Next.js

---

## Bonus Features

- **Progress bar** per patient session showing % of fields filled
- **Multi-session** support — unlimited concurrent patients, each tracked independently
- **Patient name display** in staff card header once name fields are filled
- **Inactivity auto-detection** — 10s timeout marks session inactive and notifies staff
