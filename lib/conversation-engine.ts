import type {
  ConversationContext,
  ConversationIntent,
  Language,
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
    referenceId?: string;
  };
}

const GOODBYE_PATTERNS =
  /^(no|nothing|nope|that'?s all|that is all|thank you|thanks|thank|bye|goodbye|good bye|see you|ok bye|okay bye|namaste|நன்றி|போதும்|இல்லை)[\s!.]*$/i;

const ANYTHING_ELSE_NO =
  /^(no|nothing|nope|that'?s all|that is all|no thanks|i'?m good|all good|none)[\s!.]*$/i;

const APPOINTMENT_PATTERNS =
  /appointment|book(?:ing)?|consultation|doctor|need doctor|want doctor|scan|mri|ct|x-?ray|lab|schedule|visit|want an appointment|i want an appointment/i;

const EMERGENCY_PATTERNS =
  /emergency|accident|ambulance|unconscious|critical|stroke|chest pain|severe|urgent|help fast|trauma/i;

const ESCALATION_PATTERNS =
  /human|operator|executive|person|agent|speak to someone|real person/i;

const FAQ_PATTERNS =
  /visiting hours|hours|billing|insurance|parking|location|address|department|service|faq|information|help with|hospital services|scan booking/i;

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

function wantsTopicChange(text: string, current: ConversationIntent): boolean {
  const detected = detectIntent(text);
  if (!detected || !current) return false;
  return detected !== current && detected !== "general";
}

function nextCollectField(ctx: ConversationContext): keyof ConversationContext | null {
  if (!ctx.name) return "name";
  if (!ctx.phone) return "phone";
  if (ctx.intent === "emergency") {
    if (!ctx.location) return "location";
    return null;
  }
  if (!ctx.department) return "department";
  if (ctx.intent === "appointment" && !ctx.doctor) return "doctor";
  if (!ctx.preferredDate) return "preferredDate";
  if (!ctx.preferredTime) return "preferredTime";
  return null;
}

function stateForField(field: keyof ConversationContext): ConversationContext["state"] {
  const map: Partial<Record<keyof ConversationContext, ConversationContext["state"]>> = {
    name: "COLLECTING_NAME",
    phone: "COLLECTING_PHONE",
    location: "COLLECTING_LOCATION",
    department: "COLLECTING_DEPARTMENT",
    doctor: "COLLECTING_DOCTOR",
    preferredDate: "COLLECTING_DATE",
    preferredTime: "COLLECTING_TIME",
  };
  return map[field] ?? "CLASSIFICATION";
}

function questionForField(
  field: keyof ConversationContext,
  ctx: ConversationContext
): string {
  const lang = ctx.language;
  switch (field) {
    case "name":
      return t("May I know your name, please?", "உங்கள் பெயர் என்ன?", lang);
    case "phone":
      return t(
        ctx.name
          ? `Thank you, ${ctx.name}. Could you share your mobile number?`
          : "Could you share your mobile number?",
        "உங்கள் mobile எண் என்ன?",
        lang
      );
    case "location":
      return t("What is your location or address?", "உங்கள் இருப்பிடம் எங்கே?", lang);
    case "department":
      return t("Which department would you like to visit?", "எந்த department?", lang);
    case "doctor":
      return t(
        "Do you have a preferred doctor, or shall I note general consultation?",
        "எந்த doctor-ஐ prefer செய்கிறீர்கள்?",
        lang
      );
    case "preferredDate":
      return t(
        "What is your preferred date for the appointment?",
        "விருப்பமான தேதி என்ன?",
        lang
      );
    case "preferredTime":
      return t("And what time would work best for you?", "விருப்பமான நேரம் என்ன?", lang);
    default:
      return t("How may I help you?", "நான் எப்படி உதவ முடியும்?", lang);
  }
}

function assignField(ctx: ConversationContext, text: string): ConversationContext {
  const field = nextCollectField(ctx);
  if (!field) return ctx;
  const trimmed = text.trim();
  if (field === "doctor" && /general|any|no|don't know|not sure/i.test(trimmed)) {
    return { ...ctx, doctor: "General Consultation" };
  }
  return { ...ctx, [field]: trimmed };
}

export function getGreeting(language: Language): string {
  return t(
    "Hello! I'm the CIPACA Hospital AI assistant. How may I help you today?",
    "வணக்கம்! CIPACA மருத்துவமனை AI உதவியாளர். நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    language
  );
}

export function processConversationTurn(
  userMessage: string,
  ctx: ConversationContext
): EngineResult {
  const text = userMessage.trim();
  const lang = ctx.language;

  if (ctx.state === "SESSION_CLOSED") {
    return {
      reply: t(
        "This session has ended. Please press Restart if you need further assistance.",
        "இந்த session முடிந்துவிட்டது. மீண்டும் உதவி வேண்டுமானால் Restart அழுத்தவும்.",
        lang
      ),
      context: ctx,
    };
  }

  if (ctx.awaitingAnythingElse) {
    if (declinesMoreHelp(text) || isGoodbye(text)) {
      return {
        reply: t(
          "You're welcome. Thank you for contacting CIPACA Hospital. Take care. Goodbye!",
          "நன்றி! CIPACA Hospital-ஐ தொடர்பு கொண்டதற்கு நன்றி. நலமாக இருங்கள். போய் வருகிறேன்!",
          lang
        ),
        context: { ...ctx, state: "SESSION_CLOSED", awaitingAnythingElse: false },
      };
    }
    return {
      reply: t(
        "Of course. What else can I help you with?",
        "நிச்சயமாக. வேறு எதில் உதவ வேண்டும்?",
        lang
      ),
      context: { ...ctx, state: "CLASSIFICATION", awaitingAnythingElse: false, intent: null },
    };
  }

  if (isGoodbye(text) && ctx.state === "COMPLETED") {
    return {
      reply: t(
        "You're welcome. Thank you for contacting CIPACA. Take care. Goodbye!",
        "நன்றி! CIPACA-வை தொடர்பு கொண்டதற்கு நன்றி. நலமாக இருங்கள்!",
        lang
      ),
      context: { ...ctx, state: "SESSION_CLOSED", awaitingAnythingElse: false },
    };
  }

  if (
    ctx.intent &&
    ctx.state.startsWith("COLLECTING_") &&
    !wantsTopicChange(text, ctx.intent)
  ) {
    const updated = assignField(ctx, text);
    if (ctx.intent === "emergency") updated.isEmergency = true;

    const nextField = nextCollectField(updated);
    if (!nextField) {
      if (ctx.intent === "appointment" && !updated.appointmentSaved) {
        return buildAppointmentComplete(updated);
      }
      if (ctx.intent === "emergency" && updated.isEmergency) {
        return buildEmergencyComplete(updated);
      }
      return {
        reply: t(
          "Thank you. I've recorded your details. Is there anything else I can help you with?",
          "நன்றி. உங்கள் விவரங்கள் பதிவு செய்யப்பட்டன. வேறு உதவி வேண்டுமா?",
          lang
        ),
        context: { ...updated, state: "COMPLETED", awaitingAnythingElse: true },
      };
    }

    updated.state = stateForField(nextField);
    return { reply: questionForField(nextField, updated), context: updated };
  }

  let intent = ctx.intent;
  if (!intent || ctx.state === "CLASSIFICATION" || ctx.state === "IDLE") {
    intent = detectIntent(text) ?? intent ?? "general";
  }

  const next: ConversationContext = { ...ctx, intent, greeted: true };

  switch (intent) {
    case "appointment": {
      if (APPOINTMENT_PATTERNS.test(text) && !next.name) {
        next.state = "COLLECTING_NAME";
        next.intent = "appointment";
        return {
          reply: t(
            "Certainly. I'd be happy to help you book an appointment. May I know your name?",
            "நிச்சயமாக. appointment book செய்ய உதவுகிறேன். உங்கள் பெயர் என்ன?",
            lang
          ),
          context: next,
        };
      }
      if (next.state === "COLLECTING_NAME" || !next.name) {
        next.state = "COLLECTING_NAME";
        if (text && !APPOINTMENT_PATTERNS.test(text)) {
          const withName = assignField(next, text);
          const nf = nextCollectField(withName);
          if (nf) {
            withName.state = stateForField(nf);
            return { reply: questionForField(nf, withName), context: withName };
          }
        }
        return {
          reply: t("May I know your name, please?", "உங்கள் பெயர் என்ன?", lang),
          context: next,
        };
      }
      break;
    }
    case "emergency":
      next.state = "EMERGENCY";
      next.isEmergency = true;
      if (!next.name) {
        next.state = "COLLECTING_NAME";
        return {
          reply: t(
            "I understand this may be an emergency. Please stay calm. May I have your name?",
            "இது emergency ஆக இருக்கலாம். அமைதியாக இருங்கள். உங்கள் பெயர் என்ன?",
            lang
          ),
          context: next,
        };
      }
      break;
    case "escalation":
      return {
        reply: t(
          "I'm connecting you to a GRE executive. May I have your name please?",
          "GRE executive-ஐ connect செய்கிறேன். உங்கள் பெயர் என்ன?",
          lang
        ),
        context: { ...next, state: "COLLECTING_NAME", intent: "escalation" },
      };
    default:
      next.state = "GENERAL";
      return {
        reply: t(
          "I can help with appointments, emergencies, and hospital information. Visiting hours are 9 AM to 8 PM, and emergency services are available 24/7. How may I assist you?",
          "appointments, emergency, hospital தகவல்களில் உதவ முடியும். Visiting hours 9 AM - 8 PM. Emergency 24/7. எப்படி உதவலாம்?",
          lang
        ),
        context: next,
      };
  }

  return {
    reply: t("How may I help you further?", "வேறு எதில் உதவ வேண்டும்?", lang),
    context: next,
  };
}

function buildEmergencyComplete(ctx: ConversationContext): EngineResult {
  const lang = ctx.language;
  const ticketId = `EMG-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    reply: t(
      `Emergency details recorded. Ticket ID: ${ticketId}. Our emergency team has been notified and will contact you immediately. Is there anything else I can help you with?`,
      `Emergency விவரங்கள் பதிவு செய்யப்பட்டன. Ticket ID: ${ticketId}. Emergency team-க்கு தெரிவிக்கப்பட்டது. வேறு உதவி வேண்டுமா?`,
      lang
    ),
    context: {
      ...ctx,
      state: "COMPLETED",
      awaitingAnythingElse: true,
      referenceId: ticketId,
      summary: `Emergency: ${ctx.name} at ${ctx.location}`,
    },
    shouldSaveEmergency: true,
    emergencyData: {
      name: ctx.name!,
      phone: ctx.phone!,
      location: ctx.location!,
      emergencyType: ctx.emergencyType ?? "General Emergency",
      referenceId: ticketId,
    },
  };
}

function buildAppointmentComplete(ctx: ConversationContext): EngineResult {
  const lang = ctx.language;
  const refId = `APT-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    reply: t(
      `Your appointment request has been recorded successfully. Reference ID: ${refId}. Our team will contact you shortly. Is there anything else I can help you with?`,
      `உங்கள் appointment request பதிவு செய்யப்பட்டது. Reference ID: ${refId}. எங்கள் team விரைவில் தொடர்பு கொள்ளும். வேறு உதவி வேண்டுமா?`,
      lang
    ),
    context: {
      ...ctx,
      state: "COMPLETED",
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
  const known: string[] = [];
  if (ctx.intent) known.push(`intent=${ctx.intent}`);
  if (ctx.name) known.push(`name=${ctx.name}`);
  if (ctx.phone) known.push(`phone=${ctx.phone}`);
  if (ctx.department) known.push(`department=${ctx.department}`);
  if (ctx.doctor) known.push(`doctor=${ctx.doctor}`);
  if (ctx.preferredDate) known.push(`date=${ctx.preferredDate}`);
  if (ctx.preferredTime) known.push(`time=${ctx.preferredTime}`);
  if (ctx.location) known.push(`location=${ctx.location}`);

  return `
CURRENT SESSION STATE: ${ctx.state}
KNOWN INFORMATION: ${known.length ? known.join(", ") : "none yet"}
AWAITING ANYTHING ELSE: ${ctx.awaitingAnythingElse}
SESSION CLOSED: ${ctx.state === "SESSION_CLOSED"}

CRITICAL RULES:
- NEVER restart with a greeting unless state is IDLE or GREETING.
- Continue from current state. Do NOT ask for information already collected.
- Ask ONE question at a time.
- If appointment flow is active, stay in appointment flow.
- If user says thank you/bye after completion, say goodbye politely and end session.
`.trim();
}

export function resetConversationContext(language: Language): ConversationContext {
  return createInitialContext(language);
}
