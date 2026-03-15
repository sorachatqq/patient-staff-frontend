"use client";

import { useState, useEffect, useCallback } from "react";
import Twemoji from "@/components/ui/Twemoji";
import { PatientUpdate, PatientStatus, WSMessage } from "@/types/patient";
import { useSocket } from "@/lib/use-socket";
import {
  statusStyles,
  connectionStyles,
  badgeBase,
  badgeLarge,
  card,
  text,
  btn,
} from "@/lib/design-system";

const FIELD_ORDER = [
  "firstName", "lastName", "dateOfBirth", "gender", "nationality",
  "phoneNumber", "email", "addressLine", "postalCode", "subDistrict", "district", "province",
  "preferredLanguage", "religion",
  "emergencyContactName", "emergencyContactRelationship",
];

const STEP_TITLES = ["Personal", "Contact", "Preferences", "Emergency"];

const FIELD_LABELS: Record<string, string> = {
  firstName: "First Name", middleName: "Middle Name", lastName: "Last Name",
  dateOfBirth: "Date of Birth", gender: "Gender", nationality: "Nationality",
  phoneNumber: "Phone", email: "Email", addressLine: "Address",
  postalCode: "Postal Code", subDistrict: "Sub-district", district: "District", province: "Province",
  preferredLanguage: "Language", religion: "Religion",
  emergencyContactName: "Emergency Name", emergencyContactRelationship: "Emergency Relationship",
};

const VALID_STATUSES: PatientStatus[] = ["active", "filling", "updated", "submitted", "inactive"];

const PAGE_SIZE = 10;

type HistoryFilter = "all" | "submitted" | "inactive";

function StatusBadge({ status }: { status: PatientStatus }) {
  const s = statusStyles[status] ?? statusStyles.inactive;
  return (
    <span className={`${badgeBase} ${s.badge} shrink-0`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function mergeUpdate(
  prev: Record<string, PatientUpdate>,
  update: PatientUpdate
): Record<string, PatientUpdate> {
  if (!update.sessionId || !VALID_STATUSES.includes(update.status)) return prev;
  return {
    ...prev,
    [update.sessionId]: {
      ...prev[update.sessionId],
      ...update,
      formData: {
        ...(prev[update.sessionId]?.formData ?? {}),
        ...update.formData,
      },
    },
  };
}

function cap(str?: string | null) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function getDisplayName(fd: PatientUpdate["formData"]) {
  return (
    [cap(fd.firstName), fd.middleName ? `(${cap(fd.middleName)})` : null, cap(fd.lastName)].filter(Boolean).join(" ") || "Anonymous"
  );
}

function FieldCell({ label, value, span }: { label: string; value?: string | null; span?: 2 }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <p className="text-xs text-slate-400 leading-none mb-0.5">{label}</p>
      <p className={`text-sm font-medium truncate leading-tight ${value ? "text-slate-800" : "text-slate-300 italic"}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function FieldsTooltip({ filled, total, fd }: { filled: number; total: number; fd: PatientUpdate["formData"] }) {
  const missing = FIELD_ORDER.filter((k) => !fd[k as keyof typeof fd]).map((k) => FIELD_LABELS[k] ?? k);
  if (missing.length === 0) {
    return <span className="text-xs font-medium text-slate-500">{filled}/{total} fields · 100%</span>;
  }
  const progress = Math.min(Math.round((filled / total) * 100), 100);
  return (
    <span className="relative group">
      <span className="text-xs font-medium text-slate-500 cursor-default underline decoration-dotted decoration-slate-300 underline-offset-2">
        {filled}/{total} fields · {progress}%
      </span>
      <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-48 rounded-xl bg-slate-800 px-3 py-2.5 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span className="block text-slate-400 mb-1.5 font-medium">Missing fields</span>
        {missing.map((label) => (
          <span key={label} className="flex items-center gap-1.5 leading-relaxed">
            <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
            {label}
          </span>
        ))}
      </span>
    </span>
  );
}

function SectionHeader({ title, filledRequired, totalRequired }: { title: string; filledRequired: number; totalRequired: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      {filledRequired === 0 && totalRequired > 0 && <span className="text-xs text-slate-300">pending</span>}
      {filledRequired > 0 && filledRequired < totalRequired && (
        <span className="text-xs text-brand-lavender">{filledRequired}/{totalRequired}</span>
      )}
      {filledRequired === totalRequired && totalRequired > 0 && (
        <span className="text-xs text-emerald-500">✓ complete</span>
      )}
    </div>
  );
}

export default function StaffView() {
  const [patients, setPatients] = useState<Record<string, PatientUpdate>>({});
  const [tick, setTick] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<PatientUpdate | null>(null);

  const handleMessage = useCallback((data: string) => {
    try {
      const msg = JSON.parse(data) as WSMessage;
      if (msg.type === "snapshot") {
        setPatients(
          msg.sessions.reduce((acc, s) => mergeUpdate(acc, s), {} as Record<string, PatientUpdate>)
        );
      } else if (msg.type === "patient-update") {
        setPatients((prev) => mergeUpdate(prev, msg));
      }
    } catch {
      // ignore malformed messages
    }
  }, []);

  const { connected } = useSocket(handleMessage);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const conn = connected ? connectionStyles.connected : connectionStyles.disconnected;

  const allPatients = Object.values(patients).sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );

  const activeList = allPatients.filter((p) => p.status === "active" || p.status === "filling" || p.status === "updated");
  const historyList = allPatients.filter((p) => p.status === "inactive" || p.status === "submitted");

  const filteredHistory =
    historyFilter === "all" ? historyList : historyList.filter((p) => p.status === historyFilter);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const safePage = Math.min(historyPage, totalPages);
  const pagedHistory = filteredHistory.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filter changes
  const handleFilterChange = (f: HistoryFilter) => {
    setHistoryFilter(f);
    setHistoryPage(1);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {selectedPatient && (
        <PatientModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={text.pageTitle}>Staff Dashboard</h1>
          <p className={text.pageSubtitle}>Real-time patient form monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${badgeLarge} ${conn.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${conn.dot}`} />
            {conn.label}
          </span>
          <span className={text.muted}>
            {activeList.length} active · {historyList.length} history
          </span>
        </div>
      </div>

      {/* Active sessions — cards */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Active Sessions
          {activeList.length > 0 && (
            <span className="ml-2 text-xs font-medium text-slate-400 normal-case">
              ({activeList.length})
            </span>
          )}
        </h2>

        {activeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200">
            <Twemoji className="text-4xl mb-3">📋</Twemoji>
            <p className="text-sm font-medium text-slate-500">No active sessions</p>
            <p className="text-xs text-slate-400 mt-1">Patients will appear here as they fill in the form.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeList.map((patient) => (
              <PatientCard key={patient.sessionId} patient={patient} tick={tick} />
            ))}
          </div>
        )}
      </section>

      {/* History — list */}
      {historyList.length > 0 && (
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              History
              <span className="ml-2 text-xs font-medium text-slate-400 normal-case">
                ({filteredHistory.length})
              </span>
            </h2>
            {/* Filter tabs */}
            <div className={btn.filter.wrap}>
              {(["all", "submitted", "inactive"] as HistoryFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className={`${btn.filter.item} ${historyFilter === f ? btn.filter.active : btn.filter.inactive}`}
                >
                  {f === "all" ? `All (${historyList.length})` : f === "submitted"
                    ? `Submitted (${historyList.filter(p => p.status === "submitted").length})`
                    : `Inactive (${historyList.filter(p => p.status === "inactive").length})`}
                </button>
              ))}
            </div>
          </div>

          <div className={`${card.base} divide-y divide-slate-100 overflow-hidden`}>
            {pagedHistory.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No sessions match this filter.</p>
            ) : (
              pagedHistory.map((patient) => (
                <PatientRow key={patient.sessionId} patient={patient} tick={tick} onClick={() => setSelectedPatient(patient)} />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-slate-400">
                Page {safePage} of {totalPages} · {filteredHistory.length} sessions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className={btn.page}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className={btn.page}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ─── Active card (full detail) ────────────────────────────────────────────────

function PatientCard({ patient, tick: _tick }: { patient: PatientUpdate; tick: number }) {
  const s = statusStyles[patient.status] ?? statusStyles.inactive;
  const fd = patient.formData;
  const filledFields = FIELD_ORDER.filter((k) => fd[k as keyof typeof fd]);
  const progress = Math.min(Math.round((filledFields.length / FIELD_ORDER.length) * 100), 100);
  const maxStep = patient.currentStep ?? 0;
  const name = getDisplayName(fd);

  const personalRequired = ["firstName", "lastName", "dateOfBirth", "gender", "nationality"];
  const contactRequired = ["phoneNumber", "addressLine", "postalCode", "subDistrict", "district", "province"];
  const prefRequired = ["preferredLanguage"];
  const emergencyRequired: string[] = [];

  const countFilled = (fields: string[]) => fields.filter((f) => fd[f as keyof typeof fd]).length;

  const emergencyContact = fd.emergencyContactName
    ? `${cap(fd.emergencyContactName)}${fd.emergencyContactRelationship ? ` (${fd.emergencyContactRelationship})` : ""}`
    : null;

  return (
    <div className={`${card.base} overflow-hidden ${s.cardBorder}`}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-base leading-tight truncate">{name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              #{patient.sessionId}
              <span className="mx-1.5 text-slate-300">·</span>
              <span suppressHydrationWarning>{timeAgo(patient.lastUpdated)}</span>
            </p>
          </div>
          <StatusBadge status={patient.status} />
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 pb-4">
        <div className="flex gap-1 mb-2">
          {STEP_TITLES.map((title, i) => (
            <div
              key={i}
              title={title}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= maxStep ? s.progress : "bg-slate-100"}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Step {maxStep + 1}/4
            <span className="ml-1 text-slate-300">·</span>
            <span className="ml-1">{STEP_TITLES[maxStep]}</span>
          </span>
          <FieldsTooltip filled={filledFields.length} total={FIELD_ORDER.length} fd={fd} />
        </div>
      </div>

      {/* Field sections */}
      <div className="border-t border-slate-100 px-5 py-4 space-y-4 max-h-64 overflow-y-auto">
        <div>
          <SectionHeader title="Personal" filledRequired={countFilled(personalRequired)} totalRequired={personalRequired.length} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <FieldCell label="Full Name" value={name !== "Anonymous" ? name : null} span={2} />
            <FieldCell label="Date of Birth" value={fd.dateOfBirth} />
            <FieldCell label="Gender" value={fd.gender} />
            <FieldCell label="Nationality" value={fd.nationality} span={2} />
          </div>
        </div>
        <div>
          <SectionHeader title="Contact" filledRequired={countFilled(contactRequired)} totalRequired={contactRequired.length} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <FieldCell label="Phone" value={fd.phoneNumber} />
            <FieldCell label="Email" value={fd.email} />
            <FieldCell label="Address" value={fd.addressLine} span={2} />
            <FieldCell label="Postal Code" value={fd.postalCode} />
            <FieldCell label="Sub-district" value={fd.subDistrict} />
            <FieldCell label="District" value={fd.district} />
            <FieldCell label="Province" value={fd.province} />
          </div>
        </div>
        <div>
          <SectionHeader title="Preferences" filledRequired={countFilled(prefRequired)} totalRequired={prefRequired.length} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <FieldCell label="Language" value={fd.preferredLanguage} />
            <FieldCell label="Religion" value={fd.religion} />
          </div>
        </div>
        <div>
          <SectionHeader title="Emergency" filledRequired={countFilled(emergencyRequired)} totalRequired={emergencyRequired.length} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <FieldCell label="Contact" value={emergencyContact} span={2} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── History row (compact) ────────────────────────────────────────────────────

function PatientRow({ patient, tick: _tick, onClick }: { patient: PatientUpdate; tick: number; onClick: () => void }) {
  const s = statusStyles[patient.status] ?? statusStyles.inactive;
  const fd = patient.formData;
  const filledFields = FIELD_ORDER.filter((k) => fd[k as keyof typeof fd]);
  const progress = Math.min(Math.round((filledFields.length / FIELD_ORDER.length) * 100), 100);
  const maxStep = patient.currentStep ?? 0;
  const name = getDisplayName(fd);

  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
      {/* Name + ID */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-700 truncate">{name}</p>
        <p className="text-xs text-slate-400">#{patient.sessionId}</p>
      </div>

      {/* Step progress bar (compact) */}
      <div className="hidden sm:flex gap-0.5 w-16 shrink-0">
        {STEP_TITLES.map((title, i) => (
          <div
            key={i}
            title={title}
            className={`h-1 flex-1 rounded-full ${i <= maxStep ? s.progress : "bg-slate-100"}`}
          />
        ))}
      </div>

      {/* Fields % */}
      <span className="hidden sm:block text-xs text-slate-400 w-10 text-right shrink-0">
        {progress}%
      </span>

      {/* Status badge */}
      <StatusBadge status={patient.status} />

      {/* Time */}
      <span className="text-xs text-slate-400 w-14 text-right shrink-0" suppressHydrationWarning>
        {timeAgo(patient.lastUpdated)}
      </span>
    </button>
  );
}

// ─── Patient detail modal ──────────────────────────────────────────────────────

function PatientModal({ patient, onClose }: { patient: PatientUpdate; onClose: () => void }) {
  const s = statusStyles[patient.status] ?? statusStyles.inactive;
  const fd = patient.formData;
  const filledFields = FIELD_ORDER.filter((k) => fd[k as keyof typeof fd]);
  const maxStep = patient.currentStep ?? 0;
  const name = getDisplayName(fd);

  const emergencyContact = fd.emergencyContactName
    ? `${cap(fd.emergencyContactName)}${fd.emergencyContactRelationship ? ` (${fd.emergencyContactRelationship})` : ""}`
    : null;

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className={`bg-white rounded-2xl shadow-xl border ${s.cardBorder} w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-base leading-tight truncate">{name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              #{patient.sessionId}
              <span className="mx-1.5 text-slate-300">·</span>
              <span suppressHydrationWarning>{timeAgo(patient.lastUpdated)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={patient.status} />
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="flex gap-1 mb-1.5">
            {STEP_TITLES.map((title, i) => (
              <div key={i} title={title} className={`h-1.5 flex-1 rounded-full ${i <= maxStep ? s.progress : "bg-slate-100"}`} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Step {maxStep + 1}/4 · {STEP_TITLES[maxStep]}
            </span>
            <FieldsTooltip filled={filledFields.length} total={FIELD_ORDER.length} fd={fd} />
          </div>
        </div>

        {/* Fields */}
        <div className="px-6 py-4 space-y-5 overflow-y-auto">
          {/* Personal */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Personal</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FieldCell label="Full Name" value={name !== "Anonymous" ? name : null} span={2} />
              <FieldCell label="Date of Birth" value={fd.dateOfBirth} />
              <FieldCell label="Gender" value={fd.gender} />
              <FieldCell label="Nationality" value={fd.nationality} span={2} />
            </div>
          </div>
          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contact</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FieldCell label="Phone" value={fd.phoneNumber} />
              <FieldCell label="Email" value={fd.email} />
              <FieldCell label="Address" value={fd.addressLine} span={2} />
              <FieldCell label="Postal Code" value={fd.postalCode} />
              <FieldCell label="Sub-district" value={fd.subDistrict} />
              <FieldCell label="District" value={fd.district} />
              <FieldCell label="Province" value={fd.province} />
            </div>
          </div>
          {/* Preferences */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preferences</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FieldCell label="Language" value={fd.preferredLanguage} />
              <FieldCell label="Religion" value={fd.religion} />
            </div>
          </div>
          {/* Emergency */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Emergency</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FieldCell label="Contact" value={emergencyContact} span={2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
