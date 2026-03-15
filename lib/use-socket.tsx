"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

type MessageListener = (data: string) => void;

interface SocketContextValue {
  send: (data: string) => void;
  connected: boolean;
  addListener: (fn: MessageListener) => void;
  removeListener: (fn: MessageListener) => void;
}

const SocketContext = createContext<SocketContextValue>({
  send: () => {},
  connected: false,
  addListener: () => {},
  removeListener: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<Set<MessageListener>>(new Set());
  const queueRef = useRef<string[]>([]);
  const cachedSnapshotRef = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);

  const addListener = (fn: MessageListener) => {
    listenersRef.current.add(fn);
    if (cachedSnapshotRef.current) fn(cachedSnapshotRef.current);
  };
  const removeListener = (fn: MessageListener) => listenersRef.current.delete(fn);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsPort = process.env.NEXT_PUBLIC_WS_PORT ?? "3001";
      const ws = new WebSocket(`${protocol}//${window.location.hostname}:${wsPort}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        const pending = queueRef.current.splice(0);
        pending.forEach((msg) => ws.send(msg));
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();

      ws.onmessage = (event: MessageEvent) => {
        const raw = event.data as string;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.type === "snapshot") cachedSnapshotRef.current = raw;
        } catch { /* ignore */ }
        listenersRef.current.forEach((fn) => fn(raw));
      };
    }

    connect();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);

  function send(data: string) {
    // Mirror outgoing patient-updates into the local snapshot cache so that
    // same-tab role switches (patient → staff) see the latest status immediately
    // without waiting for a server echo (server only broadcasts to OTHER clients).
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === "patient-update") {
        const current = cachedSnapshotRef.current
          ? (JSON.parse(cachedSnapshotRef.current) as { type: string; sessions: typeof parsed[] })
          : { type: "snapshot", sessions: [] as typeof parsed[] };
        const idx = current.sessions.findIndex((s) => s.sessionId === parsed.sessionId);
        if (idx >= 0) {
          current.sessions[idx] = {
            ...current.sessions[idx],
            ...parsed,
            formData: { ...current.sessions[idx].formData, ...parsed.formData },
          };
        } else {
          current.sessions.push(parsed);
        }
        cachedSnapshotRef.current = JSON.stringify(current);
        // Notify current listeners so same-tab role switches see the update immediately
        // (server only echoes to OTHER clients, not the sender)
        const snap = cachedSnapshotRef.current;
        listenersRef.current.forEach((fn) => fn(snap));
      }
    } catch { /* ignore malformed */ }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    } else {
      queueRef.current.push(data);
    }
  }

  return (
    <SocketContext.Provider value={{ send, connected, addListener, removeListener }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(onMessage?: (data: string) => void) {
  const { send, connected, addListener, removeListener } = useContext(SocketContext);
  const callbackRef = useRef(onMessage);
  useLayoutEffect(() => { callbackRef.current = onMessage; });

  useLayoutEffect(() => {
    if (!onMessage) return;
    const handler = (data: string) => callbackRef.current?.(data);
    addListener(handler);
    return () => removeListener(handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { send, connected };
}
