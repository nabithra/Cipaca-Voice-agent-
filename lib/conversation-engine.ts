import type {
  CallCategory,
  ConversationContext,
  ConversationIntent,
  Language,
  WorkflowStep,
  WorkflowType,
} from "@/types";
import { createInitialContext } from "@/types";
import { classifyCall, isEscalationRequest, looksLikeQuestion } from "@/lib/classification";
import { normalizeForClassification } from "@/lib/tamil-input";
import { searchKnowledgeBase } from "@/lib/knowledge-base";
import { GRE_TEAM } from "@/lib/knowledge-base";
import { matchDepartment } from "@/lib/department-match";
import * as L from "@/lib/language-style";

export type { ConversationContext };
export { createInitialContext };

export interface EngineResult {
  reply: string;
  context: ConversationContext;
  shouldSaveAppointment?: boolean;
  shouldSaveEmergency?: boolean;
  shouldSaveLead?: boolean;
  shouldEscalate?: boolean;
  appointmentData?: {
    name: string;
    phone: string;
    department: string;
    doctor?: string;
    preferredDate: string;
    preferredTime: string;
    inquiryType?: string;
    referenceId?: string;
  };
  emergencyData?: {
    name: string;
    phone: string;
    location: string;
    emergencyType?: string;
    patientCondition?: string;
    isTravelling?: boolean;
    referenceId?: string;
  };
  leadData?: {
    name: string;
    phone: string;
    category: string;
    inquiryType?: string;
    department?: string;
    requestedService?: string;
    conversationSummary?: string;
  };
}

export interface WorkflowDebugInfo {
  callCategory?: CallCategory;
  workflow: WorkflowType;
  workflowStatus: ConversationContext["workflowStatus"];
  currentStep: WorkflowStep;
  nextStep: WorkflowStep | null;
  nextQuestion: string;
  collected: Record<string, string | boolean | undefined>;
  missing: string[];
  sessionState: ConversationContext["state"];
  leadPreview: Record<string, unknown>;
}

const GOODBYE_PATTERNS =
  /^(no|nothing|nope|that'?s all|that is all|thank you|thanks|thank|bye|goodbye|good bye|see you|ok bye|okay bye|namaste|நன்றி|போதும்|இல்லை|இல்ல)[\s!.]*$/i;

const ANYTHING_ELSE_NO =
  /^(no|nothing|nope|that'?s all|that is all|no thanks|i'?m good|all good|none|இல்லை|இல்ல|வேண்டாம்|போதும்)[\s!.]*$/i;

const TRAVELLING_YES =
  /^(yes|yeah|yep|y|traveling|travelling|on the way|coming|vandu|varu)[\s!.]*$|வந்த|varaveeng|vanduttu|on the way|coming/i;
const TRAVELLING_NO =
  /^(no|nope|n|not|already here|at hospital|இல்லை|இல்ல)[\s!.]*$|இன்னும் வரல|reach aagala/i;

const PILOT_UNIT = "Thiruvannamalai Unit";

function t(en: string, ta: string, lang: Language): string {
  return L.say(en, ta, lang);
}

function isGoodbye(text: string): boolean {
  return GOODBYE_PATTERNS.test(text.trim());
}

function declinesMoreHelp(text: string): boolean {
  const t = text.trim();
  if (ANYTHING_ELSE_NO.test(t) || isGoodbye(t)) return true;
  // Tamil polite declines (not always single-word)
  if (/வேற.*(வேண்டாம்|இல்ல)|ஒன்னும்.*வேண்டாம்|help.*(வேண்டாம்|இல்ல)|போதும்|நன்றி.*(மட்டும்|போத)/i.test(t)) {
    return true;
  }
  return false;
}

function workflowSteps(workflow: WorkflowType): WorkflowStep[] {
  switch (workflow) {
    case "appointment":
      return [
        "ask_name",
        "ask_phone",
        "ask_department",
        "ask_doctor",
        "ask_date",
        "ask_time",
      ];
    case "specialist":
      return [
        "ask_name",
        "ask_phone",
        "ask_department",
        "ask_doctor",
        "ask_date",
        "ask_time",
      ];
    case "diagnostic":
      return ["ask_name", "ask_phone", "ask_test_type", "ask_date", "ask_hospital_unit"];
    case "admission":
      return ["ask_name", "ask_phone", "ask_department", "ask_admission_reason", "ask_date"];
    case "emergency":
      return [
        "ask_name",
        "ask_phone",
        "ask_location",
        "ask_emergency_type",
        "ask_patient_condition",
        "ask_travelling",
      ];
    default:
      return [];
  }
}

function getNextStep(workflow: WorkflowType, current: WorkflowStep): WorkflowStep | null {
  const steps = workflowSteps(workflow);
  const idx = steps.indexOf(current);
  if (idx === -1) return steps[0] ?? null;
  return steps[idx + 1] ?? null;
}

function stateForStep(step: WorkflowStep): ConversationContext["state"] {
  const map: Partial<Record<WorkflowStep, ConversationContext["state"]>> = {
    ask_name: "COLLECTING_NAME",
    ask_phone: "COLLECTING_PHONE",
    ask_location: "COLLECTING_LOCATION",
    ask_department: "COLLECTING_DEPARTMENT",
    ask_doctor: "COLLECTING_DOCTOR",
    ask_date: "COLLECTING_DATE",
    ask_time: "COLLECTING_TIME",
    anything_else: "COMPLETED",
    closed: "SESSION_CLOSED",
  };
  return map[step] ?? "CLASSIFICATION";
}

function questionForStep(step: WorkflowStep, ctx: ConversationContext): string {
  const lang = ctx.language;
  switch (step) {
    case "ask_name":
      return L.askName(lang);
    case "ask_phone":
      return L.askPhone(lang, ctx.name);
    case "ask_location":
      return L.askLocation(lang);
    case "ask_emergency_type":
      return L.askEmergencyType(lang);
    case "ask_patient_condition":
      return L.askPatientCondition(lang);
    case "ask_travelling":
      return L.askTravelling(lang);
    case "ask_department":
      return L.askDepartment(lang);
    case "ask_specialist_required":
      return t("Do you need a specialist?", "Specialist venuma?", lang);
    case "ask_doctor":
      return L.askDoctor(lang);
    case "ask_test_type":
      return L.askTestType(lang);
    case "ask_hospital_unit":
      return L.askHospitalUnit(lang, PILOT_UNIT);
    case "ask_admission_reason":
      return L.askAdmissionReason(lang);
    case "ask_date":
      return L.askDate(lang);
    case "ask_time":
      return L.askTime(lang);
    default:
      return L.clarifyIntent(lang);
  }
}

function storeStepAnswer(ctx: ConversationContext, text: string): ConversationContext {
  const trimmed = text.trim();
  switch (ctx.currentStep) {
    case "ask_name":
      return { ...ctx, name: trimmed };
    case "ask_phone":
      return { ...ctx, phone: trimmed };
    case "ask_location":
      return { ...ctx, location: trimmed };
    case "ask_emergency_type":
      return { ...ctx, emergencyType: trimmed };
    case "ask_patient_condition":
      return { ...ctx, patientCondition: trimmed };
    case "ask_travelling":
      return {
        ...ctx,
        isTravelling: TRAVELLING_YES.test(trimmed)
          ? true
          : TRAVELLING_NO.test(trimmed)
            ? false
            : /yes|travel|way|coming|வந்த|varu|vandu/i.test(trimmed),
      };
    case "ask_department": {
      const { department, needsConfirm } = matchDepartment(trimmed);
      if (needsConfirm && department !== trimmed) {
        return { ...ctx, pendingConfirm: department };
      }
      return { ...ctx, department, pendingConfirm: undefined };
    }
    case "ask_specialist_required":
      return {
        ...ctx,
        specialistRequired: /yes|yeah|yep|specialist|need/i.test(trimmed),
      };
    case "ask_doctor":
      return {
        ...ctx,
        doctor: /general|any|no|don't know|not sure/i.test(trimmed)
          ? "General Consultation"
          : trimmed,
      };
    case "ask_test_type":
      return { ...ctx, testType: trimmed };
    case "ask_hospital_unit":
      return { ...ctx, hospitalUnit: trimmed || PILOT_UNIT };
    case "ask_admission_reason":
      return { ...ctx, summary: trimmed };
    case "ask_date":
      return { ...ctx, preferredDate: trimmed };
    case "ask_time":
      return { ...ctx, preferredTime: trimmed };
    default:
      return ctx;
  }
}

function categoryToWorkflow(category: CallCategory): WorkflowType {
  switch (category) {
    case "Emergency":
      return "emergency";
    case "Specialist Consultation":
      return "specialist";
    case "Scan Booking":
    case "Diagnostics":
      return "diagnostic";
    case "Admission":
      return "admission";
    case "Appointment":
      return "appointment";
    default:
      return "faq";
  }
}

function categoryToIntent(category: CallCategory): ConversationIntent {
  if (category === "Emergency") return "emergency";
  if (category === "Customer Care" || category === "Administrative Inquiry") return "escalation";
  if (category === "General Information") return "general";
  return "appointment";
}

function startMessage(category: CallCategory, lang: Language): string {
  switch (category) {
    case "Emergency":
      return L.startEmergency(lang);
    case "Scan Booking":
    case "Diagnostics":
      return L.startDiagnostic(lang);
    case "Admission":
      return L.startAdmission(lang);
    case "Specialist Consultation":
      return L.startSpecialist(lang);
    default:
      return L.startAppointment(lang);
  }
}

function startWorkflow(
  ctx: ConversationContext,
  workflow: WorkflowType,
  category: CallCategory,
  intent: ConversationIntent,
  firstReply: string
): EngineResult {
  const firstStep: WorkflowStep = "ask_name";
  return {
    reply: firstReply,
    context: {
      ...ctx,
      currentWorkflow: workflow,
      workflowStatus: "active",
      currentStep: firstStep,
      callCategory: category,
      intent,
      state: stateForStep(firstStep),
      greeted: true,
      isEmergency: workflow === "emergency",
      hospitalUnit: ctx.hospitalUnit ?? PILOT_UNIT,
    },
  };
}

function handleActiveWorkflow(ctx: ConversationContext, text: string): EngineResult {
  const workflow = ctx.currentWorkflow!;
  const lang = ctx.language;

  // Confirm fuzzy department match
  if (ctx.pendingConfirm && ctx.currentStep === "ask_department") {
    const yes = /^(yes|yeah|yep|correct|right|ok|okay|aam|aama|sari|seri)/i.test(text.trim());
    const no = /^(no|nope|wrong|illai|illa)/i.test(text.trim());
    if (yes) {
      const updated = { ...ctx, department: ctx.pendingConfirm, pendingConfirm: undefined };
      const nextStep = getNextStep(workflow, ctx.currentStep);
      if (!nextStep) return buildAppointmentComplete(updated, workflow);
      return {
        reply: questionForStep(nextStep, updated),
        context: { ...updated, currentStep: nextStep, state: stateForStep(nextStep) },
      };
    }
    if (no) {
      return {
        reply: L.askDepartment(lang),
        context: { ...ctx, pendingConfirm: undefined },
      };
    }
  }

  const updated = storeStepAnswer(ctx, text);

  if (updated.pendingConfirm && ctx.currentStep === "ask_department" && !ctx.pendingConfirm) {
    return {
      reply: L.confirmDepartment(lang, updated.pendingConfirm),
      context: updated,
    };
  }

  const nextStep = getNextStep(workflow, ctx.currentStep);

  if (!nextStep) {
    if (workflow === "appointment" || workflow === "specialist") {
      return buildAppointmentComplete(updated, workflow);
    }
    if (workflow === "diagnostic") {
      return buildDiagnosticComplete(updated);
    }
    if (workflow === "admission") {
      return buildAdmissionComplete(updated);
    }
    if (workflow === "emergency") {
      return buildEmergencyComplete(updated);
    }
  }

  return {
    reply: questionForStep(nextStep!, updated),
    context: {
      ...updated,
      currentStep: nextStep!,
      state: stateForStep(nextStep!),
    },
  };
}

function buildEscalation(ctx: ConversationContext): EngineResult {
  const lang = ctx.language;
  const gre = GRE_TEAM.find((g) => g.status === "available") ?? GRE_TEAM[0];
  return {
    reply: L.escalationMessage(lang, gre.name),
    context: {
      ...ctx,
      greAssigned: gre.name,
      state: "COMPLETED",
      workflowStatus: "completed",
      currentStep: "anything_else",
      awaitingAnythingElse: true,
    },
    shouldEscalate: true,
    leadData: {
      name: ctx.name ?? "Caller",
      phone: ctx.phone ?? "",
      category: "Escalation",
      conversationSummary: ctx.summary ?? "Human transfer requested",
    },
  };
}

function buildEmergencyComplete(ctx: ConversationContext): EngineResult {
  const lang = ctx.language;
  const ticketId = `EMG-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    reply: L.emergencyComplete(lang, ticketId, !!ctx.isTravelling, ctx.hospitalUnit ?? PILOT_UNIT),
    context: {
      ...ctx,
      state: "COMPLETED",
      workflowStatus: "completed",
      currentStep: "anything_else",
      awaitingAnythingElse: true,
      referenceId: ticketId,
      hospitalUnit: ctx.hospitalUnit ?? PILOT_UNIT,
      summary: `Emergency ${ctx.emergencyType}: ${ctx.name} at ${ctx.location}. Condition: ${ctx.patientCondition}`,
      greAssigned: GRE_TEAM.find((g) => g.line === "emergency" && g.status === "available")?.name,
    },
    shouldSaveEmergency: true,
    emergencyData: {
      name: ctx.name!,
      phone: ctx.phone!,
      location: ctx.location!,
      emergencyType: ctx.emergencyType ?? "General Emergency",
      patientCondition: ctx.patientCondition,
      isTravelling: ctx.isTravelling,
      referenceId: ticketId,
    },
  };
}

function buildAppointmentComplete(ctx: ConversationContext, workflow: WorkflowType): EngineResult {
  const lang = ctx.language;
  const refId = `APT-${Math.floor(100000 + Math.random() * 900000)}`;
  const inquiryType =
    workflow === "specialist" || ctx.specialistRequired
      ? "Specialist Consultation"
      : "Doctor Appointment";

  return {
    reply: L.appointmentComplete(lang, refId),
    context: {
      ...ctx,
      state: "COMPLETED",
      workflowStatus: "completed",
      currentStep: "anything_else",
      awaitingAnythingElse: true,
      appointmentSaved: true,
      referenceId: refId,
      appointmentId: refId,
      hospitalUnit: ctx.hospitalUnit ?? PILOT_UNIT,
      summary: `${inquiryType} for ${ctx.name} - ${ctx.department}, Dr. ${ctx.doctor} on ${ctx.preferredDate} at ${ctx.preferredTime}`,
    },
    shouldSaveAppointment: true,
    appointmentData: {
      name: ctx.name!,
      phone: ctx.phone!,
      department: ctx.department!,
      doctor: ctx.doctor ?? "General Consultation",
      preferredDate: ctx.preferredDate!,
      preferredTime: ctx.preferredTime!,
      inquiryType,
      referenceId: refId,
    },
  };
}

function buildDiagnosticComplete(ctx: ConversationContext): EngineResult {
  const lang = ctx.language;
  const refId = `DIAG-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    reply: L.diagnosticComplete(lang, refId, ctx.testType ?? "test", ctx.preferredDate ?? ""),
    context: {
      ...ctx,
      state: "COMPLETED",
      workflowStatus: "completed",
      currentStep: "anything_else",
      awaitingAnythingElse: true,
      referenceId: refId,
      summary: `Diagnostic ${ctx.testType} for ${ctx.name} on ${ctx.preferredDate} at ${ctx.hospitalUnit}`,
    },
    shouldSaveAppointment: true,
    appointmentData: {
      name: ctx.name!,
      phone: ctx.phone!,
      department: "Diagnostics",
      doctor: "N/A",
      preferredDate: ctx.preferredDate!,
      preferredTime: "As scheduled",
      inquiryType: ctx.testType?.match(/mri/i) ? "MRI" : ctx.testType?.match(/ct/i) ? "CT" : "Lab Investigation",
      referenceId: refId,
    },
  };
}

function buildAdmissionComplete(ctx: ConversationContext): EngineResult {
  const lang = ctx.language;
  const refId = `ADM-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    reply: L.admissionComplete(lang, refId),
    context: {
      ...ctx,
      state: "COMPLETED",
      workflowStatus: "completed",
      currentStep: "anything_else",
      awaitingAnythingElse: true,
      referenceId: refId,
      summary: `Admission enquiry: ${ctx.name} - ${ctx.department}. ${ctx.summary}`,
    },
    shouldSaveLead: true,
    leadData: {
      name: ctx.name!,
      phone: ctx.phone!,
      category: "Appointment",
      inquiryType: "Admission Enquiry",
      department: ctx.department,
      requestedService: "Admission",
      conversationSummary: ctx.summary,
    },
  };
}

function handleFaq(ctx: ConversationContext, text: string): EngineResult {
  const lang = ctx.language;
  const answer = searchKnowledgeBase(text);
  const hasAnswer = !answer.includes("No specific information");

  if (!hasAnswer) {
    const gre = GRE_TEAM.find((g) => g.status === "available") ?? GRE_TEAM[0];
    return {
      reply: L.unknownFallback(lang),
      context: {
        ...ctx,
        greAssigned: gre.name,
        callCategory: "General Information",
        intent: "general",
        state: "GENERAL",
        greeted: true,
      },
      shouldEscalate: true,
    };
  }

  return {
    reply: L.formatKnowledgeAnswer(answer, lang),
    context: {
      ...ctx,
      callCategory: "General Information",
      intent: "general",
      state: "GENERAL",
      greeted: true,
      awaitingAnythingElse: true,
      currentStep: "anything_else",
      workflowStatus: "completed",
    },
    shouldSaveLead: true,
    leadData: {
      name: ctx.name ?? "Visitor",
      phone: ctx.phone ?? "",
      category: "General Inquiry",
      conversationSummary: `FAQ: ${text.slice(0, 80)}`,
    },
  };
}

export function getWorkflowDebugInfo(ctx: ConversationContext): WorkflowDebugInfo {
  const collected: Record<string, string | boolean | undefined> = {};
  if (ctx.name) collected.name = ctx.name;
  if (ctx.phone) collected.phone = ctx.phone;
  if (ctx.department) collected.department = ctx.department;
  if (ctx.doctor) collected.doctor = ctx.doctor;
  if (ctx.specialistRequired !== undefined) collected.specialistRequired = ctx.specialistRequired;
  if (ctx.testType) collected.testType = ctx.testType;
  if (ctx.preferredDate) collected.preferredDate = ctx.preferredDate;
  if (ctx.preferredTime) collected.preferredTime = ctx.preferredTime;
  if (ctx.location) collected.location = ctx.location;
  if (ctx.emergencyType) collected.emergencyType = ctx.emergencyType;
  if (ctx.patientCondition) collected.patientCondition = ctx.patientCondition;
  if (ctx.isTravelling !== undefined) collected.isTravelling = ctx.isTravelling;
  if (ctx.hospitalUnit) collected.hospitalUnit = ctx.hospitalUnit;

  const steps = ctx.currentWorkflow ? workflowSteps(ctx.currentWorkflow) : [];
  const missing: string[] = [];
  for (const step of steps) {
    const field = step.replace("ask_", "");
    if (collected[field] === undefined && !["specialist", "required", "type", "reason"].includes(field)) {
      if (field === "specialist_required" && collected.specialistRequired !== undefined) continue;
      if (field === "test" && collected.testType) continue;
      if (field === "emergency" && collected.emergencyType) continue;
      if (field === "patient" && collected.patientCondition) continue;
      if (field === "hospital" && collected.hospitalUnit) continue;
      if (field === "admission" && ctx.summary) continue;
      missing.push(field);
    }
  }

  const nextStep =
    ctx.workflowStatus === "active" && ctx.currentWorkflow
      ? getNextStep(ctx.currentWorkflow, ctx.currentStep)
      : null;

  return {
    callCategory: ctx.callCategory,
    workflow: ctx.currentWorkflow,
    workflowStatus: ctx.workflowStatus,
    currentStep: ctx.currentStep,
    nextStep,
    nextQuestion: nextStep ? questionForStep(nextStep, ctx) : "",
    collected,
    missing,
    sessionState: ctx.state,
    leadPreview: {
      conversationId: ctx.conversationId,
      callCategory: ctx.callCategory,
      workflow: ctx.currentWorkflow,
      referenceId: ctx.referenceId,
      summary: ctx.summary,
      greAssigned: ctx.greAssigned,
    },
  };
}

export function getGreeting(language: Language): string {
  return L.greeting(language);
}

export function processConversationTurn(
  userMessage: string,
  ctx: ConversationContext
): EngineResult {
  const text = userMessage.trim();
  const lang = ctx.language;

  if (ctx.state === "SESSION_CLOSED" || ctx.workflowStatus === "closed") {
    return {
      reply: L.sessionEnded(lang),
      context: ctx,
    };
  }

  if (isEscalationRequest(text) && ctx.workflowStatus !== "active") {
    return buildEscalation({ ...ctx, name: ctx.name ?? "Caller" });
  }

  if (ctx.awaitingAnythingElse || ctx.currentStep === "anything_else") {
    if (declinesMoreHelp(text) || isGoodbye(text)) {
      return {
        reply: L.goodbye(lang),
        context: {
          ...ctx,
          state: "SESSION_CLOSED",
          workflowStatus: "closed",
          currentStep: "closed",
          currentWorkflow: null,
          awaitingAnythingElse: false,
        },
      };
    }
    return {
      reply: L.moreHelp(lang),
      context: {
        ...ctx,
        awaitingAnythingElse: false,
        workflowStatus: "idle",
        currentStep: "classify",
        currentWorkflow: null,
        intent: null,
        callCategory: undefined,
        state: "CLASSIFICATION",
      },
    };
  }

  // ACTIVE WORKFLOW — never re-classify
  if (ctx.workflowStatus === "active" && ctx.currentWorkflow) {
    return handleActiveWorkflow(ctx, text);
  }

  const category = classifyCall(normalizeForClassification(text));

  if (category === "General Information") {
    return handleFaq(ctx, text);
  }

  if (category === "Customer Care" || category === "Administrative Inquiry") {
    return buildEscalation(ctx);
  }

  if (category) {
    const workflow = categoryToWorkflow(category);
    if (workflow !== "faq") {
      return startWorkflow(
        ctx,
        workflow,
        category,
        categoryToIntent(category),
        startMessage(category, lang)
      );
    }
  }

  if (looksLikeQuestion(text)) {
    return handleFaq(ctx, text);
  }

  return {
    reply: L.clarifyIntent(lang),
    context: { ...ctx, greeted: true, state: "CLASSIFICATION" },
  };
}

export function buildContextPrompt(ctx: ConversationContext): string {
  const debug = getWorkflowDebugInfo(ctx);
  const known = Object.entries(debug.collected)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");

  return `
CONVERSATION ID: ${ctx.conversationId ?? "unknown"}
CALL CATEGORY: ${ctx.callCategory ?? "unclassified"}
CURRENT WORKFLOW: ${ctx.currentWorkflow ?? "none"} (${ctx.workflowStatus})
CURRENT STEP: ${ctx.currentStep}
NEXT STEP: ${debug.nextStep ?? "none"}
SESSION STATE: ${ctx.state}
COLLECTED: ${known || "none"}
MISSING: ${debug.missing.join(", ") || "none"}
NEXT QUESTION: ${debug.nextQuestion}
PILOT UNIT: ${PILOT_UNIT}

CRITICAL: Workflow engine controls steps. Do NOT re-classify or restart. One question at a time.
`.trim();
}

export function resetConversationContext(language: Language): ConversationContext {
  return createInitialContext(language);
}

export function isWorkflowActive(ctx: ConversationContext): boolean {
  return ctx.workflowStatus === "active" && ctx.currentWorkflow !== null;
}

export function contextToLeadJson(ctx: ConversationContext): Record<string, unknown> {
  return getWorkflowDebugInfo(ctx).leadPreview;
}
