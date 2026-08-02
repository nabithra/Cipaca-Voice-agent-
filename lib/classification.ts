/** Smart call classification — English, Tamil script, Thanglish */
export type CallCategory =
  | "Emergency"
  | "Appointment"
  | "Specialist Consultation"
  | "Scan Booking"
  | "Admission"
  | "Diagnostics"
  | "General Information"
  | "Customer Care"
  | "Administrative Inquiry";

const EMERGENCY =
  /emergency|accident|ambulance|unconscious|critical|stroke|chest pain|severe|urgent|help fast|trauma|bleeding|not breathing|icu|faint|aayiduchu|aayitaru|aayiruchu|safety illai|danger|avasharam|எமர்ஜென்சி|அவசர|அவசரம்|ஆக்சிடென்ட|ஆக்சி஡ென்ட|விபத்த|விபத்து|உயிர்|ஆபத்த/i;

const SCAN =
  /mri|ct scan|ct\b|x-?ray|ultrasound|scan booking|scan appointment|scan venum|scan book|pet scan|want to (?:take|get|have|do)|need (?:a |an )?(?:mri|ct|scan)|take (?:a |an )?(?:mri|ct|scan)|get (?:a |an )?(?:mri|ct|scan)|ஸ்கேன்|எம்ஆர்ஐ/i;

const DIAGNOSTICS =
  /blood test|lab test|ecg|ekg|diagnostic|pathology|lab investigation|laboratory|report ready|test venum|பlood test|லேப்/i;

const SPECIALIST =
  /specialist|specialist consultation|cardiologist|neurologist|orthopedic|heart doctor|heart doctor venum|specialist doctor/i;

const ADMISSION =
  /admission|admit|hospitalization|inpatient|bed availability|admission venum|admit pannanum|அட்மிஷன்/i;

/** Flexible Tamil appointment — STT uses many spellings: அப்பாயின்மென்ட், அப்பாயின்ட்மெண்ட், etc. */
const APPOINTMENT =
  /appointment|apointment|apointmen|book(?:ing)?|consultation|need doctor|want doctor|doctor appointment|schedule visit|doctor paakanum|doctor pakkanum|doctor venum|paakanum|pannanum|pannanum|book pann|appointment book|token venum|checkup|மருத்துவர்|டாக்டர்|அப்பாய|அபாய|அப்பாய|apoint|புக்\s*பண்ண|appointment/i;

const CUSTOMER_CARE =
  /complaint|feedback|billing issue|insurance claim|customer care|unhappy|dissatisfied/i;

const ADMIN =
  /administrative|records|certificate|discharge summary|form|documentation|nabh|compliance|medical records|discharge|follow.?up/i;

/** Narrow FAQ — avoid matching appointment/help phrases */
const FAQ =
  /visiting hours|visiting hour|what are the hours|billing|insurance|parking|hospital address|contact number|phone number|where is the hospital|blood bank|pharmacy|vaccination|health package|payment method|open timing|enna time|eppo open|enga irukku/i;

const ESCALATION =
  /human|operator|executive|person|agent|speak to someone|real person|transfer|connect me|manager|supervisor|human venum|aala venum/i;

export function classifyCall(text: string): CallCategory | null {
  const t = text.trim();
  if (!t) return null;

  if (ESCALATION.test(t)) return "Customer Care";
  if (EMERGENCY.test(t)) return "Emergency";
  if (SCAN.test(t)) return "Scan Booking";
  if (DIAGNOSTICS.test(t)) return "Diagnostics";
  if (SPECIALIST.test(t)) return "Specialist Consultation";
  if (ADMISSION.test(t)) return "Admission";

  // Appointment before FAQ — "help" + appointment must not fall through
  if (APPOINTMENT.test(t)) return "Appointment";
  if (isAppointmentHelpRequest(t)) return "Appointment";

  if (CUSTOMER_CARE.test(t)) return "Customer Care";
  if (ADMIN.test(t)) return "Administrative Inquiry";
  if (FAQ.test(t)) return "General Information";
  return null;
}

/** "அப்பாயின்மெண்ட்டுக்கு ஹெல்ப் வேணும்" and similar */
function isAppointmentHelpRequest(text: string): boolean {
  const hasHelp = /help|ஹெல்ப்|வேணும்|வேண்டும்|venum|venum/i.test(text);
  const hasAppt = /அப்பாய|அபாய|appointment|apointment|doctor|டாக்டர்|மருத்துவ/i.test(text);
  return hasHelp && hasAppt;
}

export function isEscalationRequest(text: string): boolean {
  return ESCALATION.test(text.trim());
}

/** Informational question during an active booking — answer without advancing the workflow. */
export function isWorkflowSideQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  // Step answers — not side questions
  if (/^(my\s+name\s+is|i\s+am|i'?m|im|this\s+is|call\s+me|en\s+peyar|naan|nan|என்\s*பெயர்|நான்)\s+/i.test(t)) {
    return false;
  }
  if (/\d{10}/.test(t.replace(/\D/g, "")) && t.replace(/\D/g, "").length >= 10) {
    return false;
  }

  if (
    /list.*doctors?|doctors?\s*(?:name|names)|names?\s*(?:of\s*)?(?:the\s*)?doctors?|list\s*(?:of\s*)?doctors?|doctors?\s+(?:in|at|for|available)|which\s+doctors?|doctor\s+list|available\s+doctors?|who\s+(?:are|is)\s+(?:the\s+)?doctors?|doctor.*(?:timing|schedule|hours)|visiting\s+hours|what\s+(?:are|is)\s+(?:the\s+)?(?:timing|hours|schedule)/i.test(
      t
    )
  ) {
    return true;
  }

  if (
    looksLikeQuestion(t) &&
    /doctor|department|dept|neurology|cardiology|orthopedic|pediatric|gynecology|timing|hours|schedule|available|list|who|tell\s+me/i.test(
      t
    )
  ) {
    return true;
  }

  return false;
}

export function looksLikeQuestion(text: string): boolean {
  const t = text.trim();
  // Don't treat appointment statements as FAQ questions
  if (APPOINTMENT.test(t) || isAppointmentHelpRequest(t)) return false;
  return /\?|^(what|when|where|how|which|tell me|is there|do you|can i|could i|may i)\b|^(enna|epdi|enga|eppo|yaru|irukka)/i.test(
    t
  );
}
