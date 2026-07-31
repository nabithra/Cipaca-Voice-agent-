import type {
  ConversationContext,
  ConversationIntent,
  Language,
  WorkflowStep,
  WorkflowType,
} from "@/types";
import { createInitialContext } from "@/types";

export type { ConversationContext };
export { createInitialContext };

export interface EngineResult {
  reply: string;
  context: ConversationContext;
  shouldSaveAppointment?: boolean;
  shouldSaveEmergency?: boolean;
  appointmentData?: {
    name: string;
    phone: string;
    department: string;
    doctor?: string;
    preferredDate: string;
    preferredTime: string;
    referenceId?: string;
  };
  emergencyData?: {
    name: string;
    phone: string;
    location: string;
    emergencyType?: string;
    isTravelling?: boolean;
    referenceId?: string;
  };
}

export interface WorkflowDebugInfo {
  workflow: WorkflowType;
  workflowStatus: ConversationContext["workflowStatus"];
  currentStep: WorkflowStep;
  nextQuestion: string;
  collected: Record<string, string | boolean | undefined>;
  missing: string[];
  sessionState: ConversationContext["state"];
}

const GOODBYE_PATTERNS =
  /^(no|nothing|nope|that'?s all|that is all|thank you|thanks|thank|bye|goodbye|good bye|see you|ok bye|okay bye|namaste|நன்றி|போதும்|இல்லை)[\s!.]*$/i;

const ANYTHING_ELSE_NO =
  /^(no|nothing|nope|that'?s all|that is all|no thanks|i'?m good|all good|none)[\s!.]*$/i;

const APPOINTMENT_PATTERNS =
  /appointment|book(?:ing)?|consultation|need doctor|want doctor|want an appointment|i want an appointment|need an appointment/i;

const EMERGENCY_PATTERNS =
  /emergency|accident|ambulance|unconscious|critical|stroke|chest pain|severe|urgent|help fast|trauma/i;

const ESCALATION_PATTERNS =
  /human|operator|executive|person|agent|speak to someone|real person/i;

const FAQ_PATTERNS =
  /visiting hours|hours|billing|insurance|parking|address|faq|information|hospital services/i;

const TRAVELLING_YES = /^(yes|yeah|yep|y|traveling|travelling|on the way|coming)[\s!.]*$/i;
const TRAVELLING_NO = /^(no|nope|n|not|already here|at hospital)[\s!.]*$/i;

function t(en: string, ta: string, lang: Language): string {
  return lang === "ta" ? ta : en;
}

function detectIntent(text: string): ConversationIntent {
  if (EMERGENCY_PATTERNS.test(text)) return "emergency";
  if (ESCALATION_PATTERNS.test(text)) return "escalation";
  if (APPOINTMENT_PATTERNS.test(text)) return "appointment";
  if (FAQ_PATTERNS.test(text)) return "general";
  return null;
}

function isGoodbye(text: string): boolean {
  return GOODBYE_PATTERNS.test(text.trim());
}

function declinesMoreHelp(text: string): boolean {
  return ANYTHING_ELSE_NO.test(text.trim()) || isGoodbye(text);
}

function stateForStep(step: WorkflowStep): ConversationContext["state"] {
  const map: Partial<Record<WorkflowStep, ConversationContext["state"]>> = {
    ask_name: "COLLECTING_NAME",
    ask_phone: "COLLECTING_PHONE",
    ask_location: "COLLECTING_LOCATION",
    ask_emergency_type: "EMERGENCY",
    ask_travelling: "COLLECTING_TIME",
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
      return t("What is your name?", "உங்கள் பெயர் என்ன?", lang);
    case "ask_phone":
      return t(
        ctx.name
          ? `Thank you, ${ctx.name}. What is your mobile number?`
          : "What is your mobile number?",
        ctx.name
          ? `நன்றி ${ctx.name}. உங்கள் mobile எண் என்ன?`
          : "உங்கள் mobile எண் என்ன?",
        lang
      );
    case "ask_location":
      return t("What is the patient location or address?", "நோயாளியின் இருப்பிடம் எங்கே?", lang);
    case "ask_emergency_type":
      return t(
        "What is the nature of the emergency?",
        "Emergency-ன் வகை என்ன?",
        lang
      );
    case "ask_travelling":
      return t(
        "Is the patient already travelling to the hospital? Please say Yes or No.",
        "நோயாளி hospital-க்கு வந்து கொண்டிருக்கிறாரா? ஆம் அல்லது இல்லை?",
        lang
      );
    case "ask_department":
      return t("Which department would you like to visit?", "எந்த department?", lang);
    case "ask_doctor":
      return t("Do you have a preferred doctor?", "விருப்பமான doctor யார்?", lang);
    case "ask_date":
      return t("What is your preferred date?", "விருப்பமான தேதி என்ன?", lang);
    case "ask_time":
      return t("What is your preferred time?", "விருப்பமான நேரம் என்ன?", lang);
    default:
      return t("How may I help you?", "நான் எப்படி உதவ முடியும்?", lang);
  }
}

function appointmentSteps(): WorkflowStep[] {
  return ["ask_name", "ask_phone", "ask_department", "ask_doctor", "ask_date", "ask_time"];
}

function emergencySteps(): WorkflowStep[] {
  return [
    "ask_name",
    "ask_phone",
    "ask_location",
    "ask_emergency_type",
    "ask_travelling",
  ];
}

function getNextStep(workflow: WorkflowType, current: WorkflowStep): WorkflowStep | null {
  if (!workflow) return null;
  const steps = workflow === "appointment" ? appointmentSteps() : emergencySteps();
  const idx = steps.indexOf(current);
  if (idx === -1) return steps[0] ?? null;
  return steps[idx + 1] ?? null;
}

function stepFieldKey(step: WorkflowStep): string {
  const raw = step.replace("ask_", "");
  if (raw === "emergency_type") return "emergencyType";
  if (raw === "travelling") return "isTravelling";
  return raw;
}

function fieldFilled(ctx: ConversationContext, step: WorkflowStep): boolean {
  switch (step) {
    case "ask_name":
      return !!ctx.name;
    case "ask_phone":
      return !!ctx.phone;
    case "ask_location":
      return !!ctx.location;
    case "ask_emergency_type":
      return !!ctx.emergencyType;
    case "ask_travelling":
      return ctx.isTravelling !== undefined;
    case "ask_department":
      return !!ctx.department;
    case "ask_doctor":
      return !!ctx.doctor;
    case "ask_date":
      return !!ctx.preferredDate;
    case "ask_time":
      return !!ctx.preferredTime;
    default:
      return false;
  }
}

function getNextUnfilledStep(
  workflow: WorkflowType,
  ctx: ConversationContext
): WorkflowStep | null {
  const steps = workflow === "appointment" ? appointmentSteps() : emergencySteps();
  for (const step of steps) {
    if (!fieldFilled(ctx, step)) return step;
  }
  return null;
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
    case "ask_travelling":
      if (TRAVELLING_YES.test(trimmed) || /on the way|coming to|heading to/i.test(trimmed)) {
        return { ...ctx, isTravelling: true };
      }
      if (TRAVELLING_NO.test(trimmed) || /already here|at the hospital|at hospital/i.test(trimmed)) {
        return { ...ctx, isTravelling: false };
      }
      return ctx;
    case "ask_department":
      return { ...ctx, department: trimmed };
    case "ask_doctor":
      return {
        ...ctx,
        doctor: /general|any|no|don't know|not sure/i.test(trimmed)
          ? "General Consultation"
          : trimmed,
      };
    case "ask_date":
      return { ...ctx, preferredDate: trimmed };
    case "ask_time":
      return { ...ctx, preferredTime: trimmed };
    default:
      return ctx;
  }
}

export function getWorkflowDebugInfo(ctx: ConversationContext): WorkflowDebugInfo {
  const collected: Record<string, string | boolean | undefined> = {};
  if (ctx.name) collected.name = ctx.name;
  if (ctx.phone) collected.phone = ctx.phone;
  if (ctx.department) collected.department = ctx.department;
  if (ctx.doctor) collected.doctor = ctx.doctor;
  if (ctx.preferredDate) collected.preferredDate = ctx.preferredDate;
  if (ctx.preferredTime) collected.preferredTime = ctx.preferredTime;
  if (ctx.location) collected.location = ctx.location;
  if (ctx.emergencyType) collected.emergencyType = ctx.emergencyType;
  if (ctx.isTravelling !== undefined) collected.isTravelling = ctx.isTravelling;

  const missing: string[] = [];
  if (ctx.currentWorkflow === "appointment") {
    for (const step of appointmentSteps()) {
      const field = step.replace("ask_", "");
      if (!collected[field] && field !== "travelling") missing.push(field);
    }
  } else if (ctx.currentWorkflow === "emergency") {
    for (const step of emergencySteps()) {
      const key = stepFieldKey(step);
      if (collected[key] === undefined) missing.push(key);
    }
  }

  const nextStep =
    ctx.workflowStatus === "active"
      ? getNextStep(ctx.currentWorkflow, ctx.currentStep) ?? ctx.currentStep
      : ctx.currentStep;

  return {
    workflow: ctx.currentWorkflow,
    workflowStatus: ctx.workflowStatus,
    currentStep: ctx.currentStep,
    nextQuestion: questionForStep(nextStep, ctx),
    collected,
    missing,
    sessionState: ctx.state,
  };
}

export function getGreeting(language: Language): string {
  return t(
    "Hello! I'm the CIPACA Hospital AI assistant. How may I help you today?",
    "வணக்கம்! CIPACA மருத்துவமனை AI உதவியாளர். நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    language
  );
}

function startWorkflow(
  ctx: ConversationContext,
  workflow: WorkflowType,
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
      intent,
      state: stateForStep(firstStep),
      greeted: true,
      isEmergency: workflow === "emergency",
    },
  };
}

function handleActiveWorkflow(
  ctx: ConversationContext,
  text: string,
  isDemoMode = false
): EngineResult {
  const workflow = ctx.currentWorkflow!;

  const updated = storeStepAnswer(ctx, text);

  if (!fieldFilled(updated, ctx.currentStep)) {
    return {
      reply: questionForStep(ctx.currentStep, updated),
      context: { ...updated, currentStep: ctx.currentStep, state: stateForStep(ctx.currentStep) },
    };
  }

  const nextStep = getNextUnfilledStep(workflow, updated);

  if (!nextStep) {
    if (workflow === "appointment" && !updated.appointmentSaved) {
      return buildAppointmentComplete(updated);
    }
    if (workflow === "emergency") {
      return buildEmergencyComplete(updated, isDemoMode);
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

export function processConversationTurn(
  userMessage: string,
  ctx: ConversationContext,
  options?: { isDemoMode?: boolean }
): EngineResult {
  const text = userMessage.trim();
  const lang = ctx.language;
  const isDemoMode = options?.isDemoMode ?? false;

  if (ctx.state === "SESSION_CLOSED" || ctx.workflowStatus === "closed") {
    return {
      reply: t(
        "This session has ended. Please press Restart if you need further assistance.",
        "இந்த session மuடிந்துவிட்டது. Restart அழுத்தவும்.",
        lang
      ),
      context: ctx,
    };
  }

  if (ctx.awaitingAnythingElse || ctx.currentStep === "anything_else") {
    if (declinesMoreHelp(text) || isGoodbye(text)) {
      return {
        reply: t(
          "Thank you for contacting CIPACA. Have a nice day. Goodbye!",
          "CIPACA-வை தொடர்பு கொண்டதற்கு நன்றி. நல்ல நாள்!",
          lang
        ),
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
      reply: t("Of course. What else can I help you with?", "வேறு எதில் உதவ வேண்டும்?", lang),
      context: {
        ...ctx,
        awaitingAnythingElse: false,
        workflowStatus: "idle",
        currentStep: "classify",
        currentWorkflow: null,
        intent: null,
        state: "CLASSIFICATION",
      },
    };
  }

  // ACTIVE WORKFLOW — never re-classify intent
  if (ctx.workflowStatus === "active" && ctx.currentWorkflow) {
    return handleActiveWorkflow(ctx, text, isDemoMode);
  }

  // No active workflow — classify intent once
  const intent = detectIntent(text);

  if (intent === "appointment") {
    return startWorkflow(
      ctx,
      "appointment",
      "appointment",
      t(
        "Sure. What is your name?",
        "நிச்சயமாக. உங்கள் பெயர் என்ன?",
        lang
      )
    );
  }

  if (intent === "emergency") {
    return startWorkflow(
      ctx,
      "emergency",
      "emergency",
      t(
        "I understand this may be an emergency. Please stay calm. May I know your name?",
        "இது emergency ஆக இருக்கலாம். அமைதியாக இருங்கள். உங்கள் பெயர் என்ன?",
        lang
      )
    );
  }

  if (intent === "escalation") {
    return startWorkflow(
      ctx,
      "emergency",
      "escalation",
      t(
        "I'm connecting you to a GRE executive. What is your name?",
        "GRE executive-ஐ connect செய்கிறேன். உங்கள் பெயர் என்ன?",
        lang
      )
    );
  }

  return {
    reply: t(
      "I can help with appointments, emergencies, and hospital information. Visiting hours are 9 AM to 8 PM, and emergency services are available 24/7. How may I assist you?",
      "appointments, emergency, hospital தகவல்களில் உதவ முடியும். Visiting hours 9 AM - 8 PM. Emergency 24/7.",
      lang
    ),
    context: {
      ...ctx,
      currentWorkflow: "faq",
      workflowStatus: "idle",
      currentStep: "classify",
      intent: "general",
      state: "GENERAL",
      greeted: true,
    },
  };
}

function buildEmergencyComplete(ctx: ConversationContext, isDemoMode = false): EngineResult {
  const lang = ctx.language;
  const ticketId = `EMG-${Math.floor(100000 + Math.random() * 900000)}`;

  const handoffEn = `Emergency ticket ${ticketId} has been created. Our emergency team has been notified. Please stay on the line while we connect you to a GRE executive.${
    isDemoMode
      ? " Demo Mode: Human transfer is simulated. GRE Executive would receive this emergency call."
      : ""
  }`;
  const handoffTa = `Emergency ticket ${ticketId} பதிவு செய்யப்பட்டது. Emergency team-க்கு தெரிவிக்கப்பட்டது. GRE executive-ஐ connect செய்கிறோம்.${
    isDemoMode ? " Demo Mode: Human transfer simulated." : ""
  }`;

  return {
    reply: t(handoffEn, handoffTa, lang),
    context: {
      ...ctx,
      state: "COMPLETED",
      workflowStatus: "completed",
      currentStep: "anything_else",
      awaitingAnythingElse: false,
      referenceId: ticketId,
      summary: `Emergency: ${ctx.name} at ${ctx.location}`,
    },
    shouldSaveEmergency: true,
    emergencyData: {
      name: ctx.name!,
      phone: ctx.phone!,
      location: ctx.location!,
      emergencyType: ctx.emergencyType ?? "General Emergency",
      isTravelling: ctx.isTravelling,
      referenceId: ticketId,
    },
  };
}

function buildAppointmentComplete(ctx: ConversationContext): EngineResult {
  const lang = ctx.language;
  const refId = `APT-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    reply: t(
      `Appointment booked successfully. Reference ID: ${refId}. Our team will contact you shortly. Is there anything else I can help you with?`,
      `Appointment பதிவு செய்யப்பட்டது. Reference ID: ${refId}. எங்கள் team தொடர்பு கொள்ளும். வேறு உதவி வேண்டுமா?`,
      lang
    ),
    context: {
      ...ctx,
      state: "COMPLETED",
      workflowStatus: "completed",
      currentStep: "anything_else",
      awaitingAnythingElse: true,
      appointmentSaved: true,
      referenceId: refId,
      appointmentId: refId,
      summary: `Appointment for ${ctx.name} - ${ctx.department} on ${ctx.preferredDate} at ${ctx.preferredTime}`,
    },
    shouldSaveAppointment: true,
    appointmentData: {
      name: ctx.name!,
      phone: ctx.phone!,
      department: ctx.department!,
      doctor: ctx.doctor ?? "General Consultation",
      preferredDate: ctx.preferredDate!,
      preferredTime: ctx.preferredTime!,
      referenceId: refId,
    },
  };
}

export function buildContextPrompt(ctx: ConversationContext): string {
  const debug = getWorkflowDebugInfo(ctx);
  const known = Object.entries(debug.collected)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");

  return `
CONVERSATION ID: ${ctx.conversationId ?? "unknown"}
CURRENT WORKFLOW: ${ctx.currentWorkflow ?? "none"} (${ctx.workflowStatus})
CURRENT STEP: ${ctx.currentStep}
SESSION STATE: ${ctx.state}
COLLECTED: ${known || "none"}
MISSING: ${debug.missing.join(", ") || "none"}
NEXT QUESTION TOPIC: ${debug.nextQuestion}

CRITICAL RULES:
- Workflow engine controls progression. Do NOT restart or re-classify intent.
- If workflow is ACTIVE, continue the current step only.
- Do NOT ask for information already collected.
- Ask ONE question at a time matching the current step.
`.trim();
}

export function resetConversationContext(language: Language): ConversationContext {
  return createInitialContext(language);
}

export function isWorkflowActive(ctx: ConversationContext): boolean {
  return ctx.workflowStatus === "active" && ctx.currentWorkflow !== null;
}
