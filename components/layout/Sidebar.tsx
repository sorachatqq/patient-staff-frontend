"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardPlus, MonitorCheck, X, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { sidebar } from "@/lib/design-system";

const NAV_ITEMS = [
  { label: "Patient Registration", href: "/patient", icon: ClipboardPlus, role: "patient" as const },
  { label: "Staff Monitor", href: "/staff", icon: MonitorCheck, role: "staff" as const },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onCollapseToggle }: SidebarProps) {
  const pathname = usePathname();

  const role = pathname.startsWith("/staff") ? "staff" : "patient";
  const visibleItems = NAV_ITEMS.filter((item) => item.role === role);
  const roleLabel = role === "staff" ? "Staff" : "Patient";
  const roleInitial = role === "staff" ? "ST" : "PT";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 ${sidebar.base} flex flex-col overflow-y-auto
          transition-all duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:inset-auto md:translate-x-0 md:shrink-0
          ${isCollapsed ? "w-64 md:w-16" : "w-64"}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-14 px-4 border-b ${sidebar.border} shrink-0 gap-2
          ${isCollapsed ? "md:justify-center" : "justify-between"}`}
        >
          <div className={`flex items-center justify-center min-w-0 flex-1 ${isCollapsed ? "md:hidden" : ""}`}>
            <p className={`${sidebar.logo.text} text-base font-semibold leading-none truncate`}>
              Patient System
            </p>
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={onCollapseToggle}
            className={`hidden md:flex items-center justify-center w-7 h-7 rounded-lg ${sidebar.toggle} transition-colors shrink-0`}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className={`md:hidden p-1 rounded ${sidebar.toggle} shrink-0`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          <p className={`px-3 pb-2 text-xs font-semibold ${sidebar.sectionLabel} uppercase tracking-wider transition-all duration-200 ${isCollapsed ? "md:hidden" : ""}`}>
            Menu
          </p>
          {visibleItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                title={isCollapsed ? label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-100
                  ${isCollapsed ? "md:justify-center md:px-0" : ""}
                  ${active ? sidebar.nav.active : sidebar.nav.inactive}
                `}
              >
                <Icon
                  size={16}
                  className={`shrink-0 ${active ? sidebar.nav.iconActive : sidebar.nav.iconInactive}`}
                />
                <span className={`transition-all duration-200 ${isCollapsed ? "md:hidden" : ""}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`px-4 py-4 border-t ${sidebar.border} shrink-0 space-y-3 ${isCollapsed ? "md:px-2" : ""}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? "md:justify-center" : ""}`}>
            <div className={`w-8 h-8 rounded-full ${sidebar.footer.avatar} flex items-center justify-center shrink-0`}>
              <span className={sidebar.footer.avatarText}>{roleInitial}</span>
            </div>
            <div className={`transition-all duration-200 ${isCollapsed ? "md:hidden" : ""}`}>
              <p className={sidebar.footer.name}>{roleLabel} User</p>
              <p className={sidebar.footer.role}>{role} portal</p>
            </div>
          </div>
          <Link
            href="/"
            title={isCollapsed ? "Switch role" : undefined}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${sidebar.footer.switchRole} transition-colors ${isCollapsed ? "md:justify-center" : ""}`}
          >
            <LogOut size={13} className="shrink-0" />
            <span className={`transition-all duration-200 ${isCollapsed ? "md:hidden" : ""}`}>
              Switch role
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
