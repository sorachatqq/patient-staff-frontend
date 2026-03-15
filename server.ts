// @ts-nocheck -- This file runs under Bun (not tsc). See tsconfig.server.json for Bun-aware type checking.
import type { ServerWebSocket } from "bun";

const dev = process.env.NODE_ENV !== "production";

// Railway injects PORT for the public-facing port.
// Next.js runs internally on NEXT_PORT; all other traffic is proxied to it.
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const NEXT_PORT = parseInt(process.env.NEXT_PORT ?? "3000", 10);

// Spawn Next.js as a subprocess on its own internal port
Bun.spawn(
  dev
    ? ["bun", "next", "dev", "-p", String(NEXT_PORT)]
    : ["bun", "next", "start", "-p", String(NEXT_PORT)],
  {
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env },
  }
);

type PatientStatus = "active" | "filling" | "updated" | "submitted" | "inactive";

type PatientUpdate = {
  type: "patient-update";
  sessionId: string;
  formData: Record<string, string>;
  status: PatientStatus;
  lastUpdated: string;
  currentStep?: number;
};

const sessions = new Map<string, PatientUpdate>();
const clients = new Set<ServerWebSocket<unknown>>();

const SESSION_TTL: Record<PatientStatus, number> = {
  submitted: 10 * 60 * 1000,
  inactive: 30 * 60 * 1000,
  active: Infinity,
  filling: Infinity,
  updated: Infinity,
};

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    const ttl = SESSION_TTL[session.status];
    if (ttl === Infinity) continue;
    if (now - new Date(session.lastUpdated).getTime() > ttl) sessions.delete(id);
  }
}

setInterval(cleanupSessions, 60 * 1000);

Bun.serve({
  port: PORT,
  fetch(req, server) {
    // WebSocket upgrade
    if (server.upgrade(req)) return undefined;

    // Proxy everything else to Next.js
    const url = new URL(req.url);
    url.hostname = "localhost";
    url.port = String(NEXT_PORT);

    const headers = new Headers(req.headers);
    headers.set("host", `localhost:${NEXT_PORT}`);
    headers.delete("accept-encoding"); // prevent double-compression in proxy chain

    return fetch(url.toString(), {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    });
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      if (sessions.size > 0) {
        ws.send(JSON.stringify({ type: "snapshot", sessions: Array.from(sessions.values()) }));
      }
    },

    message(ws, msg) {
      try {
        const update = JSON.parse(msg.toString()) as PatientUpdate;
        if (update.sessionId && update.type === "patient-update") {
          const prev = sessions.get(update.sessionId);
          sessions.set(update.sessionId, {
            ...prev,
            ...update,
            formData: { ...(prev?.formData ?? {}), ...update.formData },
          });
        }
      } catch {
        // ignore malformed messages
      }
      for (const client of clients) {
        if (client !== ws) client.send(msg);
      }
    },

    close(ws) {
      clients.delete(ws);
    },

    error(ws, error) {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    },
  },
});

console.log(`> Server ready on port ${PORT} (Next.js internal: ${NEXT_PORT})`);

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => process.exit(0));
}
