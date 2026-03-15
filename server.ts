// @ts-nocheck -- This file runs under Bun (not tsc). See tsconfig.server.json for Bun-aware type checking.
import type { ServerWebSocket } from "bun";

const dev = process.env.NODE_ENV !== "production";
const WS_PORT = parseInt(process.env.WS_PORT ?? "3001", 10);

// Spawn Next.js as a subprocess
Bun.spawn(dev ? ["bun", "next", "dev"] : ["bun", "next", "start"], {
  stdout: "inherit",
  stderr: "inherit",
  env: { ...process.env },
});

type PatientStatus = "active" | "filling" | "updated" | "submitted" | "inactive";

type PatientUpdate = {
  type: "patient-update";
  sessionId: string;
  formData: Record<string, string>;
  status: PatientStatus;
  lastUpdated: string;
  currentStep?: number;
};

// In-memory session store: sessionId → merged PatientUpdate
const sessions = new Map<string, PatientUpdate>();
const clients = new Set<ServerWebSocket<unknown>>();

// Clean up stale sessions periodically:
// - submitted sessions older than 10 minutes
// - inactive sessions older than 30 minutes
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
    const age = now - new Date(session.lastUpdated).getTime();
    if (age > ttl) {
      sessions.delete(id);
    }
  }
}

setInterval(cleanupSessions, 60 * 1000);

Bun.serve({
  port: WS_PORT,
  fetch(req, server) {
    if (server.upgrade(req)) return undefined;
    return new Response("WebSocket endpoint", { status: 200 });
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      // Send snapshot of all active sessions to the newly connected client
      if (sessions.size > 0) {
        ws.send(
          JSON.stringify({
            type: "snapshot",
            sessions: Array.from(sessions.values()),
          })
        );
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
      // Broadcast to all other clients
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

console.log(`> WebSocket ready on ws://localhost:${WS_PORT}`);

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => process.exit(0));
}
