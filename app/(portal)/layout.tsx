"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopHeader from "@/components/layout/TopHeader";
import { SocketProvider } from "@/lib/use-socket";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SocketProvider>
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopHeader onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {children}
        </main>
      </div>
    </div>
    </SocketProvider>
  );
}
