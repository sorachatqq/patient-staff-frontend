export interface PatientFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  email: string;
  addressLine: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  preferredLanguage: string;
  nationality: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  religion: string;
}

export type PatientStatus = "active" | "filling" | "updated" | "submitted" | "inactive";

export interface PatientUpdate {
  type: "patient-update";
  sessionId: string;
  formData: Partial<PatientFormData>;
  status: PatientStatus;
  lastUpdated: string;
  currentStep?: number;
}

export interface SnapshotMessage {
  type: "snapshot";
  sessions: PatientUpdate[];
}

export type WSMessage = PatientUpdate | SnapshotMessage;
