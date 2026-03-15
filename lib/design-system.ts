import type { PatientStatus } from "@/types/patient";

// ─── Status ───────────────────────────────────────────────────────────────────

export const statusStyles = {
  active: {
    label: "Active",
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700",
    cardBorder: "border-green-200",
    progress: "bg-green-400",
  },
  filling: {
    label: "Filling in progress",
    dot: "bg-brand-purple animate-pulse",
    badge: "bg-brand-soft text-brand-purple",
    cardBorder: "border-brand-soft shadow-brand-soft/20",
    progress: "bg-brand-purple",
  },
  updated: {
    label: "Updated",
    dot: "bg-sky-500 animate-pulse",
    badge: "bg-sky-50 text-sky-600",
    cardBorder: "border-sky-200",
    progress: "bg-sky-400",
  },
  submitted: {
    label: "Submitted",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    cardBorder: "border-emerald-200",
    progress: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600",
    cardBorder: "border-slate-200",
    progress: "bg-slate-300",
  },
} satisfies Record<
  PatientStatus,
  { label: string; dot: string; badge: string; cardBorder: string; progress: string }
>;

// ─── Connection ───────────────────────────────────────────────────────────────

export const connectionStyles = {
  connected: {
    label: "Live",
    dot: "bg-emerald-500 animate-pulse",
    badge: "bg-emerald-100 text-emerald-700",
  },
  disconnected: {
    label: "Reconnecting...",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-600",
  },
};

// ─── Typography ───────────────────────────────────────────────────────────────

export const text = {
  pageTitle: "text-2xl font-bold text-slate-900",
  pageSubtitle: "text-sm text-slate-500 mt-1",
  sectionTitle: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4",
  label: "block text-sm font-medium text-slate-700 mb-1",
  muted: "text-xs text-slate-400",
  error: "mt-1 text-xs text-red-500",
};

// ─── Card ─────────────────────────────────────────────────────────────────────

export const card = {
  base: "bg-white rounded-2xl border border-slate-200 shadow-sm",
  section: "bg-white rounded-2xl border border-slate-200 p-6 shadow-sm",
};

// ─── Input ────────────────────────────────────────────────────────────────────

const inputBase =
  "w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors";

const inputVariants = {
  default: `${inputBase} border-slate-200 focus:ring-brand-soft focus:border-brand-purple bg-white`,
  error: `${inputBase} border-red-300 focus:ring-red-300 bg-red-50`,
};

export function inputClass(hasError?: string) {
  return hasError ? inputVariants.error : inputVariants.default;
}

export function selectClass(hasError?: string) {
  return `${hasError ? inputVariants.error : inputVariants.default} appearance-none pr-10`;
}

// ─── Button ───────────────────────────────────────────────────────────────────

export const btn = {
  primary:
    "bg-brand-purple hover:bg-brand-lavender active:bg-brand-purple text-white font-semibold rounded-xl transition-colors shadow-sm",
  outline:
    "bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 font-medium rounded-xl transition-colors shadow-sm",
  page:
    "px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
  filter: {
    wrap: "flex items-center gap-1 bg-slate-100 rounded-lg p-1",
    item: "px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize",
    active: "bg-white text-slate-700 shadow-sm",
    inactive: "text-slate-500 hover:text-slate-700",
  },
};

// ─── Step indicator ───────────────────────────────────────────────────────────

export const step = {
  circle: {
    done: "bg-brand-purple text-white",
    active: "bg-brand-purple text-white ring-4 ring-brand-soft",
    pending: "bg-slate-100 text-slate-400",
  },
  connector: {
    done: "bg-brand-lavender",
    pending: "bg-slate-200",
  },
  label: {
    active: "text-brand-purple",
    done: "text-slate-500",
    pending: "text-slate-300",
  },
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const sidebar = {
  base: "bg-brand-mist",
  border: "border-slate-200",
  toggle: "text-slate-500 hover:text-brand-purple hover:bg-brand-soft/50",
  sectionLabel: "text-brand-purple/50",
  nav: {
    active: "bg-white text-brand-purple border-l-2 border-brand-purple shadow-sm",
    inactive: "text-slate-600 hover:bg-white/60 hover:text-brand-purple",
    iconActive: "text-brand-purple",
    iconInactive: "text-slate-400",
  },
  logo: {
    badge: "bg-brand-purple",
    text: "text-slate-800",
  },
  footer: {
    avatar: "bg-brand-soft",
    avatarText: "text-brand-purple text-sm font-semibold",
    name: "text-slate-700 text-sm font-medium",
    role: "text-slate-400 text-xs capitalize",
    switchRole: "text-slate-500 hover:text-brand-purple hover:bg-white/60",
  },
};

// ─── Badge ────────────────────────────────────────────────────────────────────

export const badgeBase =
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";

export const badgeLarge =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium";

export const badgeStyles = {
  role: "bg-brand-soft text-brand-purple",
  dot: {
    role: "w-1.5 h-1.5 rounded-full bg-brand-purple",
  },
};
