"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef, Fragment } from "react";
import Twemoji from "@/components/ui/Twemoji";
import { PatientFormData, PatientStatus } from "@/types/patient";
import { useSocket } from "@/lib/use-socket";
import {
  statusStyles,
  text,
  card,
  inputClass,
  selectClass,
  badgeBase,
  btn,
  step,
} from "@/lib/design-system";
import { ChevronDown } from "lucide-react";
import AddressFields, { AddressValue } from "@/components/patient/AddressFields";

const INITIAL_FORM: PatientFormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  phoneNumber: "",
  email: "",
  addressLine: "",
  subDistrict: "",
  district: "",
  province: "",
  postalCode: "",
  preferredLanguage: "",
  nationality: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  religion: "",
};

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say", "Other"];
const LANGUAGES = ["English", "Thai", "Mandarin", "Spanish", "French", "Arabic", "Hindi", "Other"];

const STEPS = [
  { title: "Personal", description: "Basic information" },
  { title: "Contact", description: "How to reach you" },
  { title: "Preferences", description: "Language & religion" },
  { title: "Emergency", description: "Emergency contact" },
];

function generateSessionId() {
  return crypto.randomUUID().substring(0, 8).toUpperCase();
}

interface FormErrors {
  [key: string]: string;
}

export default function PatientForm() {
  const [formData, setFormData] = useState<PatientFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<PatientStatus>("inactive");
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Refs always reflecting latest values — safe to use inside timers/listeners
  const formDataRef = useRef(formData);
  const statusRef = useRef(status);
  const currentStepRef = useRef(currentStep);
  const maxStepRef = useRef(maxStep);
  const sessionIdRef = useRef(sessionId);
  const submittedRef = useRef(submitted);

  useLayoutEffect(() => {
    formDataRef.current = formData;
    statusRef.current = status;
    currentStepRef.current = currentStep;
    maxStepRef.current = maxStep;
    sessionIdRef.current = sessionId;
    submittedRef.current = submitted;
  });

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { send } = useSocket();

  // Core broadcast — always uses latest values via refs
  const broadcast = useCallback(
    (data: Partial<PatientFormData>, broadcastStatus: PatientStatus, step: number) => {
      if (!sessionIdRef.current) return;
      send(
        JSON.stringify({
          type: "patient-update",
          sessionId: sessionIdRef.current,
          formData: data,
          status: broadcastStatus,
          lastUpdated: new Date().toISOString(),
          currentStep: step,
        })
      );
    },
    [send]
  );

  const broadcastRef = useRef(broadcast);
  useLayoutEffect(() => { broadcastRef.current = broadcast; });

  // Immediate broadcast — always uses maxStep so staff view never goes backwards
  const broadcastNow = useCallback(
    (newStatus: PatientStatus, newMaxStep?: number, data?: Partial<PatientFormData>) => {
      broadcastRef.current(
        data ?? formDataRef.current,
        newStatus,
        newMaxStep ?? maxStepRef.current
      );
    },
    []
  );

  // Idle timer — after 1s of no input, go back to "active"
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setStatus("active");
      broadcastRef.current(formDataRef.current, "active", maxStepRef.current);
    }, 1000);
  }, []);

  // Restore saved session or generate a new one
  useEffect(() => {
    const saved = sessionStorage.getItem("patient_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          sessionId: string;
          formData: PatientFormData;
          currentStep: number;
          maxStep: number;
        };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSessionId(parsed.sessionId);
         
        setFormData(parsed.formData);
         
        setCurrentStep(parsed.currentStep);
         
        setMaxStep(parsed.maxStep);
      } catch {
         
        setSessionId(generateSessionId());
      }
    } else {
       
      setSessionId(generateSessionId());
    }

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      // Broadcast inactive when navigating away (socket stays alive in layout)
      if (!submittedRef.current && sessionIdRef.current) {
        broadcastRef.current(formDataRef.current, "inactive", maxStepRef.current);
      }
    };
  }, []);  

  // Persist session state to sessionStorage on every change
  useEffect(() => {
    if (!sessionId) return;
    sessionStorage.setItem(
      "patient_session",
      JSON.stringify({ sessionId, formData, currentStep, maxStep })
    );
  }, [sessionId, formData, currentStep, maxStep]);

  // Broadcast "active" when session starts (new or restored)
  useEffect(() => {
    if (!sessionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("active");
    // maxStepRef is already updated at render time — preserves step on restore
    broadcastNow("active");
  }, [sessionId, broadcastNow]);

  // Inactive when tab is hidden, active when tab is visible
  // Registered once — uses refs so never needs to re-register
  useEffect(() => {
    const handleVisibility = () => {
      if (submittedRef.current) return;
      if (document.hidden) {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        setStatus("inactive");
        broadcastRef.current(formDataRef.current, "inactive", currentStepRef.current);
      } else {
        setStatus("active");
        broadcastRef.current(formDataRef.current, "active", currentStepRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);  

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const newData = { ...formDataRef.current, [name]: value };
    setFormData(newData);
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));

    const isDiscrete = e.target.tagName === "SELECT" || (e.target as HTMLInputElement).type === "date";
    const newStatus = isDiscrete ? "updated" : "filling";
    setStatus(newStatus);
    statusRef.current = newStatus;
    broadcastNow(newStatus, undefined, newData);
    resetIdleTimer();
  };

  const handleAddressChange = (addr: AddressValue) => {
    const newData = { ...formDataRef.current, ...addr };
    setFormData(newData);
    setErrors((prev) => {
      const next = { ...prev };
      ["addressLine", "subDistrict", "postalCode"].forEach((k) => delete next[k]);
      return next;
    });

    // Postal code typing → "filling", sub-district select / auto-fill → "updated"
    const newStatus = addr.postalCode !== formDataRef.current.postalCode ? "filling" : "updated";
    setStatus(newStatus);
    statusRef.current = newStatus;
    broadcastNow(newStatus, undefined, newData);
    resetIdleTimer();
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (step === 0) {
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
      if (!formData.nationality.trim()) newErrors.nationality = "Nationality is required";
    } else if (step === 1) {
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = "Phone number is required";
      } else if (!/^\+?[\d\s\-().]{7,15}$/.test(formData.phoneNumber.trim())) {
        newErrors.phoneNumber = "Enter a valid phone number";
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Enter a valid email address";
      }
      if (!formData.addressLine.trim()) newErrors.addressLine = "Street / house number is required";
      if (!formData.subDistrict.trim()) newErrors.subDistrict = "Sub-district is required";
      if (!formData.postalCode.trim()) newErrors.postalCode = "Postal code is required";
    } else if (step === 2) {
      if (!formData.preferredLanguage) newErrors.preferredLanguage = "Preferred language is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    const next = currentStep + 1;
    const newMax = Math.max(maxStep, next);
    setCurrentStep(next);
    setMaxStep(newMax);
    maxStepRef.current = newMax;
    broadcastNow(statusRef.current, newMax);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
    // maxStep stays unchanged — staff view never goes backwards
  };

  const startPostSubmitFlow = useCallback(() => {
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setFormData(INITIAL_FORM);
      setErrors({});
      setStatus("inactive");
      setSubmitted(false);
      setCurrentStep(0);
      setMaxStep(0);
      setSessionId(generateSessionId()); // triggers new session → "active" broadcast
      setCountdown(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSkip = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    sessionStorage.removeItem("patient_session");
    setStatus("submitted");
    broadcastNow("submitted");
    setSubmitted(true);
    startPostSubmitFlow();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < STEPS.length - 1) {
      handleNext();
      return;
    }
    if (!validateStep(currentStep)) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    sessionStorage.removeItem("patient_session");
    setStatus("submitted");
    broadcastNow("submitted");
    setSubmitted(true);
    startPostSubmitFlow();
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-10 max-w-md w-full">
          <Twemoji className="text-5xl mb-4">✅</Twemoji>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Complete</h2>
          <p className="text-slate-500 mb-1">Your information has been submitted successfully.</p>
          <p className="text-sm text-slate-400 mb-6">Session ID: {sessionId}</p>
          <p className="text-sm text-slate-400">
            Returning to form in{" "}
            <span className="font-semibold text-slate-600">{countdown}s</span>
            ...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-8">
      {/* Desktop-only header */}
      <div className="hidden sm:block mb-8">
        <h1 className={text.pageTitle}>Patient Registration</h1>
        <p className={text.pageSubtitle}>Please fill in your personal details below.</p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`${badgeBase} ${statusStyles[status].badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[status].dot}`} />
            {statusStyles[status].label}
          </span>
          <span className={text.muted}>ID: {sessionId}</span>
        </div>
      </div>

      {/* Mobile compact top bar */}
      <div className="sm:hidden flex items-center justify-between mb-4">
        <span className={`${badgeBase} ${statusStyles[status].badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[status].dot}`} />
          {statusStyles[status].label}
        </span>
        <span className={text.muted}>
          {STEPS[currentStep].description} · {currentStep + 1}/{STEPS.length}
        </span>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center mb-4 sm:mb-8">
        {STEPS.map((s, i) => (
          <Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all
                  ${i < currentStep ? step.circle.done : i === currentStep ? step.circle.active : step.circle.pending}`}
              >
                {i < currentStep ? "✓" : i + 1}
              </div>
              <span
                className={`hidden sm:block text-xs font-medium text-center transition-colors
                  ${i === currentStep ? step.label.active : i < currentStep ? step.label.done : step.label.pending}`}
              >
                {s.title}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 flex items-center px-1 sm:px-2 sm:items-start sm:pt-4">
                <div className={`h-0.5 w-full transition-colors ${i < currentStep ? step.connector.done : step.connector.pending}`} />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Step 0: Personal Information */}
        {currentStep === 0 && (
          <section className={card.section}>
            <h2 className={text.sectionTitle}>Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" required error={errors.firstName}>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" className={inputClass(errors.firstName)} />
              </Field>
              <Field label="Middle Name">
                <input type="text" name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Optional" className={inputClass()} />
              </Field>
              <Field label="Last Name" required error={errors.lastName}>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" className={inputClass(errors.lastName)} />
              </Field>
              <Field label="Date of Birth" required error={errors.dateOfBirth}>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} max={new Date().toISOString().split("T")[0]} className={inputClass(errors.dateOfBirth)} />
              </Field>
              <Field label="Gender" required error={errors.gender}>
                <div className="relative">
                  <select name="gender" value={formData.gender} onChange={handleChange} className={selectClass(errors.gender)}>
                    <option value="">Select gender</option>
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>
              <Field label="Nationality" required error={errors.nationality}>
                <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} placeholder="e.g. Thai" className={inputClass(errors.nationality)} />
              </Field>
            </div>
          </section>
        )}

        {/* Step 1: Contact Information */}
        {currentStep === 1 && (
          <section className={card.section}>
            <h2 className={text.sectionTitle}>Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone Number" required error={errors.phoneNumber}>
                <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="+66 81 234 5678" className={inputClass(errors.phoneNumber)} />
              </Field>
              <Field label="Email" error={errors.email}>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className={inputClass(errors.email)} />
              </Field>
              <div className="sm:col-span-2">
                <AddressFields
                  value={{
                    addressLine: formData.addressLine,
                    postalCode: formData.postalCode,
                    subDistrict: formData.subDistrict,
                    district: formData.district,
                    province: formData.province,
                  }}
                  onChange={handleAddressChange}
                  errors={errors}
                />
              </div>
            </div>
          </section>
        )}

        {/* Step 2: Preferences */}
        {currentStep === 2 && (
          <section className={card.section}>
            <h2 className={text.sectionTitle}>Preferences</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Preferred Language" required error={errors.preferredLanguage}>
                <div className="relative">
                  <select name="preferredLanguage" value={formData.preferredLanguage} onChange={handleChange} className={selectClass(errors.preferredLanguage)}>
                    <option value="">Select language</option>
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>
              <Field label="Religion">
                <input type="text" name="religion" value={formData.religion} onChange={handleChange} placeholder="Optional" className={inputClass()} />
              </Field>
            </div>
          </section>
        )}

        {/* Step 3: Emergency Contact */}
        {currentStep === 3 && (
          <section className={card.section}>
            <h2 className={text.sectionTitle}>
              Emergency Contact{" "}
              <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact Name">
                <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} placeholder="Full name" className={inputClass()} />
              </Field>
              <Field label="Relationship">
                <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleChange} placeholder="e.g. Spouse, Parent" className={inputClass()} />
              </Field>
            </div>
          </section>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className={`py-3.5 px-5 ${btn.outline}`}
            >
              ← Back
            </button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className={`${currentStep > 0 ? "flex-1" : "w-full"} py-3.5 px-6 ${btn.primary}`}
            >
              Next →
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSkip}
                className={`py-3.5 px-5 ${btn.outline}`}
              >
                Skip
              </button>
              <button
                type="submit"
                className={`flex-1 py-3.5 px-6 ${btn.primary}`}
              >
                Submit
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={text.label}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className={text.error}>{error}</p>}
    </div>
  );
}
