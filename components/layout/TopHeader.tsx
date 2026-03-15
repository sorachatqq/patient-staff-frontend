"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { badgeBase, badgeStyles } from "@/lib/design-system";

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/patient": { title: "Patient Registration", description: "New patient intake form" },
  "/staff": { title: "Staff Monitor", description: "Real-time patient tracking" },
};

interface TopHeaderProps {
  onMenuToggle: () => void;
}

export default function TopHeader({ onMenuToggle }: TopHeaderProps) {
  const pathname = usePathname();
  const meta = PAGE_META[pathname] ?? { title: "", description: "" };
  const isStaff = pathname.startsWith("/staff");

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-900 leading-tight truncate">
            {meta.title}
          </h1>
          <p className="text-xs text-slate-400 leading-tight hidden sm:block truncate">
            {meta.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`hidden sm:inline-flex ${badgeBase} ${badgeStyles.role}`}>
          <span className={badgeStyles.dot.role} />
          {isStaff ? "Staff" : "Patient"}
        </span>
      </div>
    </header>
  );
}
