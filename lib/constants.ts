export const CONVERSATION_STORAGE_KEY = "cipaca-conversation";

export const STORAGE_KEY = "cipaca-leads";
export const NOTIFICATIONS_STORAGE_KEY = "cipaca-notifications";
export const KNOWLEDGE_STORAGE_KEY = "cipaca-knowledge";

export const EMERGENCY_TYPES = [
  "Accident",
  "Trauma",
  "Unconscious Patient",
  "Critical Illness",
  "Emergency Admission",
  "Chest Pain",
  "Stroke",
  "Severe Bleeding",
  "Difficulty Breathing",
] as const;

export const EMERGENCY_STAGES = [
  { id: "detected", label: "Emergency Detected" },
  { id: "collecting_details", label: "Collecting Patient Details" },
  { id: "alerting_gre", label: "Alerting GRE Team" },
  { id: "alerting_hospital", label: "Alerting Hospital Unit" },
  { id: "preparing_admission", label: "Preparing Admission" },
  { id: "connecting_human", label: "Connecting to Human Executive" },
] as const;

export const ARRIVAL_STAGES = [
  { id: "patient_travelling", label: "Patient Travelling" },
  { id: "receiving_unit_notified", label: "Receiving Unit Notified" },
  { id: "medical_team_notified", label: "Medical Team Notified" },
  { id: "admission_prepared", label: "Admission Prepared" },
  { id: "ready_for_arrival", label: "Ready for Arrival" },
] as const;

export const INQUIRY_TYPES = [
  "Doctor Appointment",
  "Specialist Consultation",
  "Department Consultation",
  "Scan Booking",
  "MRI",
  "CT",
  "X-Ray",
  "Lab Investigation",
  "Admission Enquiry",
] as const;
