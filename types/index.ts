export type LeadCategory =
  | "Emergency"
  | "Non-Emergency"
  | "General Inquiry"
  | "Appointment"
  | "Escalation";

export type LeadStatus =
  | "new"
  | "in-progress"
  | "escalated"
  | "resolved"
  | "closed"
  | "completed";

export type Language = "en" | "ta";

export type InquiryType =
  | "Doctor Appointment"
  | "Specialist Consultation"
  | "Department Consultation"
  | "Scan Booking"
  | "MRI"
  | "CT"
  | "X-Ray"
  | "Lab Investigation"
  | "Admission Enquiry"
  | "Emergency"
  | "General Inquiry"
  | "Callback Request";

export type EmergencyStage =
  | "detected"
  | "collecting_details"
  | "alerting_gre"
  | "alerting_hospital"
  | "preparing_admission"
  | "connecting_human";

export type ArrivalStage =
  | "patient_travelling"
  | "receiving_unit_notified"
  | "medical_team_notified"
  | "admission_prepared"
  | "ready_for_arrival";

export type EscalationReason =
  | "emergency_detected"
  | "caller_requested"
  | "low_confidence"
  | "repeated_misunderstanding"
  | "unknown_question"
  | "three_failed_attempts"
  | "user_frustrated";

export type GREStatus = "available" | "busy" | "offline";

export type NotificationPriority = "high" | "normal" | "low";

export type NotificationType =
  | "emergency"
  | "appointment"
  | "general"
  | "escalation"
  | "arrival";

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  language: Language;
  category: LeadCategory;
  inquiryType?: InquiryType;
  department?: string;
  emergency?: boolean;
  location?: string;
  emergencyType?: string;
  isTravelling?: boolean;
  eta?: string;
  patientName?: string;
  hospitalUnit?: string;
  transportType?: string;
  attenderName?: string;
  doctor?: string;
  preferredDate?: string;
  preferredTime?: string;
  reason?: string;
  requestedService?: string;
  serviceType?: string;
  conversationSummary?: string;
  escalationStatus?: string;
  appointmentStatus?: string;
  escalationReason?: EscalationReason;
  escalationId?: string;
  callbackRequested?: boolean;
  callDurationSeconds?: number;
  responseTimeMs?: number;
  emergencyStage?: EmergencyStage;
  arrivalStage?: ArrivalStage;
  greAssigned?: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  conversation: ConversationMessage[];
  referenceId?: string;
  ticketId?: string;
}

export interface LeadInput {
  name?: string;
  phone?: string;
  language?: Language;
  category?: LeadCategory;
  inquiryType?: InquiryType;
  department?: string;
  emergency?: boolean;
  location?: string;
  emergencyType?: string;
  isTravelling?: boolean;
  eta?: string;
  patientName?: string;
  hospitalUnit?: string;
  transportType?: string;
  attenderName?: string;
  doctor?: string;
  preferredDate?: string;
  preferredTime?: string;
  reason?: string;
  requestedService?: string;
  serviceType?: string;
  conversationSummary?: string;
  conversation?: ConversationMessage[];
  callbackRequested?: boolean;
}

export interface EmergencyInput {
  name: string;
  phone: string;
  location: string;
  emergencyType: string;
  isTravelling: boolean;
  eta?: string;
  patientName?: string;
  hospitalUnit?: string;
  transportType?: string;
  attenderName?: string;
  language?: Language;
  conversation?: ConversationMessage[];
  conversationSummary?: string;
  referenceId?: string;
}

export interface AppointmentInput {
  name: string;
  phone: string;
  doctor?: string;
  department: string;
  preferredDate: string;
  preferredTime: string;
  inquiryType?: InquiryType;
  serviceType?: string;
  reason?: string;
  requestedService?: string;
  callbackRequested?: boolean;
  language?: Language;
  conversation?: ConversationMessage[];
  conversationSummary?: string;
  referenceId?: string;
}

export interface EscalationInput {
  name?: string;
  phone?: string;
  reason: string;
  escalationReason?: EscalationReason;
  language?: Language;
  conversation?: ConversationMessage[];
  conversationSummary?: string;
}

export interface ArrivalInput {
  leadId?: string;
  patientName: string;
  hospitalUnit: string;
  estimatedArrival: string;
  transportType: string;
  attenderName: string;
  phone?: string;
  language?: Language;
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  targetTeam: string;
  leadId?: string;
  referenceId?: string;
  read: boolean;
  createdAt: string;
}

export interface GREMember {
  id: string;
  name: string;
  shift: "morning" | "afternoon" | "night";
  status: GREStatus;
  line: "emergency" | "support";
  callsHandled: number;
}

export interface KnowledgeBaseEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

export interface KnowledgeBase {
  departments: KnowledgeBaseEntry[];
  doctors: KnowledgeBaseEntry[];
  specialties: KnowledgeBaseEntry[];
  diagnostics: KnowledgeBaseEntry[];
  services: KnowledgeBaseEntry[];
  processes: KnowledgeBaseEntry[];
  faqs: KnowledgeBaseEntry[];
  visitingHours: string;
  billing: string;
  insurance: string;
}

export interface TrainingDataset {
  id: string;
  name: string;
  description: string;
  recordCount: number;
  lastUpdated: string;
  progress: number;
}

export interface PilotUnit {
  id: string;
  name: string;
  location: string;
  phase: 1 | 2 | 3;
  status: "ready" | "pilot" | "live" | "planned";
  launchDate?: string;
}

export interface DashboardStats {
  totalCalls: number;
  emergency: number;
  appointments: number;
  escalations: number;
  general: number;
  completed: number;
  avgResponseTimeMs: number;
  avgCallDurationSeconds: number;
  dailyCalls: number;
  weeklyCalls: number;
  monthlyCalls: number;
  emergencySuccessRate: number;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "processing"
  | "error";

export type VoiceMode = "realtime" | "fallback";

export type ConversationStateType =
  | "IDLE"
  | "GREETING"
  | "CLASSIFICATION"
  | "EMERGENCY"
  | "NON_EMERGENCY"
  | "GENERAL"
  | "COLLECTING_NAME"
  | "COLLECTING_PHONE"
  | "COLLECTING_LOCATION"
  | "COLLECTING_DEPARTMENT"
  | "COLLECTING_DOCTOR"
  | "COLLECTING_DATE"
  | "COLLECTING_TIME"
  | "CONFIRMATION"
  | "COMPLETED"
  | "GOODBYE"
  | "SESSION_CLOSED";

export type ConversationIntent =
  | "appointment"
  | "emergency"
  | "general"
  | "escalation"
  | null;

export type WorkflowType = "appointment" | "emergency" | "faq" | null;

export type WorkflowStatus = "idle" | "active" | "completed" | "closed";

export type WorkflowStep =
  | "classify"
  | "ask_name"
  | "ask_phone"
  | "ask_location"
  | "ask_emergency_type"
  | "ask_travelling"
  | "ask_department"
  | "ask_doctor"
  | "ask_date"
  | "ask_time"
  | "anything_else"
  | "closed";

export interface ConversationContext {
  conversationId?: string;
  state: ConversationStateType;
  currentWorkflow: WorkflowType;
  workflowStatus: WorkflowStatus;
  currentStep: WorkflowStep;
  intent: ConversationIntent;
  language: Language;
  name?: string;
  phone?: string;
  department?: string;
  doctor?: string;
  preferredDate?: string;
  preferredTime?: string;
  location?: string;
  isTravelling?: boolean;
  emergencyType?: string;
  isEmergency?: boolean;
  appointmentId?: string;
  referenceId?: string;
  summary?: string;
  greeted: boolean;
  awaitingAnythingElse: boolean;
  appointmentSaved: boolean;
}

export function createInitialContext(language: Language = "en"): ConversationContext {
  return {
    conversationId: `conv-${Date.now()}`,
    state: "IDLE",
    currentWorkflow: null,
    workflowStatus: "idle",
    currentStep: "classify",
    intent: null,
    language,
    greeted: false,
    awaitingAnythingElse: false,
    appointmentSaved: false,
  };
}

