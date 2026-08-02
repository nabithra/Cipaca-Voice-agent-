import type { Language } from "@/types";

/** Pick response by selected language; Tamil UI uses natural Tamil script (TTS transliteration is separate). */
export function say(en: string, ta: string, lang: Language): string {
  const raw = lang === "ta" ? ta.trim() : en.trim();
  return formatReply(raw, lang);
}

/** English = Latin only. Tamil = Tamil script for on-screen display. */
export function formatReply(text: string, lang: Language): string {
  let s = text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (lang === "en") {
    s = s.replace(/[\u0B80-\u0BFF]+/g, "").replace(/\s+/g, " ").trim();
  }
  return s;
}

/** Respectful name address in Tamil */
export function tamilName(name: string): string {
  const n = name.trim();
  if (!n) return "";
  return `${n} அவர்களே`;
}

export function prepareForSpeech(text: string): string {
  return text
    .replace(/\n+/g, ". ")
    .replace(/([.!?])\s*(?=[\u0B80-\u0BFFA-Z])/g, "$1 ")
    .replace(/,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export function unknownFallback(lang: Language): string {
  return say(
    "I'm sorry. I don't have that information right now. Let me connect you with our hospital team.",
    "மன்னிக்கவும். இந்த தகவல் என்னிடம் இல்லை. மருத்துவமனை குழுவை இணைக்கிறேன்.",
    lang
  );
}

export function anythingElse(lang: Language): string {
  return say(
    "Is there anything else I can help you with?",
    "வேறு ஏதாவது உதவி வேண்டுமா?",
    lang
  );
}

export function goodbye(lang: Language): string {
  return say(
    "Thank you for calling CIPACA Thiruvannamalai. Take care. Goodbye!",
    "CIPACA Thiruvannamalai-ஐ தொடர்பு கொண்டதற்கு நன்றி. நல்லா இருங்கள்.",
    lang
  );
}

export function sessionEnded(lang: Language): string {
  return say(
    "This session has ended. Please press Restart if you need more help.",
    "செயல்பாடு முடிந்துவிட்டது. மீண்டும் உதவி வேண்டுமென்றால் மறுதொடக்கம் அழுத்துங்கள்.",
    lang
  );
}

export function clarifyIntent(lang: Language): string {
  return say(
    "I can help with appointments, emergencies, scans, or hospital information. What do you need?",
    "மருத்துஆலோசனை, அவசரச்சிகிச்சை, பரிசோதனை, மருத்துவமனை தகவல் — எதற்கு உதவி வேண்டும்?",
    lang
  );
}

export function moreHelp(lang: Language): string {
  return say(
    "Of course. What else can I help you with?",
    "சரி. வேறு எதற்கு உதவி வேண்டும்?",
    lang
  );
}

export function askName(lang: Language): string {
  return say(
    "May I know your name, please?",
    "தயவு செய்து உங்கள் பெயர் சொல்லுங்கள்.",
    lang
  );
}

export function askPhone(lang: Language, name?: string): string {
  return say(
    name ? `Thank you, ${name}. May I have your mobile number?` : "May I have your mobile number?",
    name
      ? `நன்றி, ${tamilName(name)}. உங்கள் மொபைல் எண் சொல்லுங்கள்.`
      : "உங்கள் மொபைல் எண் சொல்லுங்கள்.",
    lang
  );
}

export function askDepartment(lang: Language): string {
  return say(
    "Which department would you like to visit?",
    "எந்த துறைக்கு வர வேண்டும்?",
    lang
  );
}

export function askDoctor(lang: Language): string {
  return say(
    "Do you have a preferred doctor?",
    "எந்த மருத்துவரை பார்க்க வேண்டும்?",
    lang
  );
}

export function askDate(lang: Language): string {
  return say(
    "What date would you prefer?",
    "எந்த தேதி வசதியாக இருக்கும்?",
    lang
  );
}

export function askTime(lang: Language): string {
  return say(
    "What time would you prefer?",
    "எந்த நேரம் வசதியாக இருக்கும்?",
    lang
  );
}

export function askLocation(lang: Language): string {
  return say(
    "Where is the patient right now?",
    "நோயாளி இப்போது எங்கே இருக்கிறார்?",
    lang
  );
}

export function askEmergencyType(lang: Language): string {
  return say(
    "What kind of emergency is it?",
    "என்ன அவசரம்? விபத்து, மார்பு வலி, பக்கவாதம் — ஏதாவது சொல்லுங்கள்.",
    lang
  );
}

export function askPatientCondition(lang: Language): string {
  return say(
    "How is the patient doing right now?",
    "நோயாளியின் நிலை எப்படி இருக்கிறது?",
    lang
  );
}

export function askTravelling(lang: Language): string {
  return say(
    "Are you on the way to the hospital?",
    "நீங்கள் மருத்துவமனைக்கு வந்துகொண்டிருக்கிறீர்களா?",
    lang
  );
}

export function askTestType(lang: Language): string {
  return say(
    "Which test do you need?",
    "எந்த பரிசோதனை வேண்டும்? MRI, CT, அல்ட்ராசவுண்ட், எக்ஸ்-ரே, இரத்த பரிசோதனை, ECG?",
    lang
  );
}

export function askHospitalUnit(lang: Language, unit: string): string {
  return say(
    `Which hospital unit? Our pilot unit is ${unit}.`,
    `எந்த மருத்துவமனை பிரிவு? எங்கள் முயற்சி பிரிவு: ${unit}.`,
    lang
  );
}

export function askAdmissionReason(lang: Language): string {
  return say(
    "What is the reason for admission?",
    "அனுமதிக்கான காரணம் என்ன?",
    lang
  );
}

export function confirmDepartment(lang: Language, dept: string): string {
  return say(
    `Did you mean ${dept}?`,
    `${dept}-aa? சரியா?`,
    lang
  );
}

export function startAppointment(lang: Language): string {
  return say(
    "Certainly. I'll help you book an appointment. May I know your name?",
    "சரி. மருத்துஆலோசனை பதிவு செய்ய உதவுகிறேன். தயவு செய்து உங்கள் பெயர் சொல்லுங்கள்.",
    lang
  );
}

export function startEmergency(lang: Language): string {
  return say(
    "I understand this is urgent. Please stay calm — I'm here to help. May I know your name?",
    "அவசரமா? கவலைப்பட வேண்டாம். நான் உதவி செய்கிறேன். தயவு செய்து உங்கள் பெயர் சொல்லுங்கள்.",
    lang
  );
}

export function startDiagnostic(lang: Language): string {
  return say(
    "Certainly. I'll help with your scan booking. May I know the patient name?",
    "சரி. பரிசோதனை பதிவுக்கு உதவுகிறேன். நோயாளியின் பெயர் சொல்லுங்கள்.",
    lang
  );
}

export function startAdmission(lang: Language): string {
  return say(
    "I'll help with your admission enquiry. May I know your name?",
    "அனுமதி விசாரணைக்கு உதவுகிறேன். தயவு செய்து உங்கள் பெயர் சொல்லுங்கள்.",
    lang
  );
}

export function startSpecialist(lang: Language): string {
  return say(
    "Certainly. I'll arrange a specialist consultation. May I know your name?",
    "சரி. சிறப்பு மருத்துவ ஆலோசனை ஏற்பாடு செய்கிறேன். உங்கள் பெயர் சொல்லுங்கள்.",
    lang
  );
}

export function greeting(lang: Language): string {
  return say(
    "Welcome to CIPACA Hospital, Thiruvannamalai Unit. I'm your AI receptionist. How may I help you?",
    "வணக்கம். CIPACA மருத்துவமனை, \u0ba4\u0bbf\u0bb0\u0bc1\u0bb5\u0ba9\u0bcd\u0ba9\u0bae\u0bb2\u0bc8 \u0baa\u0bbf\u0bb0\u0bbf\u0bb5\u0bc1. \u0ba8\u0bbe\u0ba9\u0bcd \u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd AI \u0bb5\u0bb0\u0bb5\u0bc7\u0bb1\u0bcd\u0baa\u0bbe\u0bb3\u0bb0\u0bcd. \u0b8e\u0ba9\u0bcd\u0ba9 \u0b89\u0ba4\u0bb5\u0bbf \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd?",
    lang
  );
}

/** Short follow-up when caller says hello after the welcome. */
export function greetingFollowUp(lang: Language): string {
  return say(
    "Hello! How may I help you? I can help with appointments, emergencies, scans, or hospital information.",
    "வணக்கம்! என்ன உதவி வேண்டும்? மருத்துஆலோசனை, அவசரம், பரிசோதனை, மருத்துவமனை தகவல் — எதற்கும் உதவுகிறேன்.",
    lang
  );
}

export function appointmentComplete(lang: Language, refId: string): string {
  return say(
    `Your appointment is recorded. Reference ID: ${refId}. Our team will call you shortly to confirm. ${anythingElse(lang)}`,
    `மருத்துஆலோசனை பதிவு செய்யப்பட்டது. குறிப்பு எண்: ${refId}. எங்கள் குழு விரைவில் உறுதிப்படுத்த அழைப்பார்கள். ${anythingElse(lang)}`,
    lang
  );
}

export function emergencyComplete(
  lang: Language,
  ticketId: string,
  travelling: boolean,
  unit: string
): string {
  const travelNote = travelling
    ? say(
        "Hospital, medical team, and admission have been notified.",
        "மருத்துவமனை, மருத்துவக் குழு, அனுமதி பிரிவுக்கு தெரிவித்துவிட்டேன்.",
        lang
      )
    : "";
  return say(
    `Emergency ticket ${ticketId} created. Priority HIGH. GRE and ${unit} have been notified. ${travelNote} ${anythingElse(lang)}`.replace(
      /\s+/g,
      " "
    ),
    `அவசர டிக்கெட் ${ticketId} உருவாக்கப்பட்டது. முன்னுரிமை உயர்ந்தது. GRE மற்றும் ${unit}-க்கு தெரிவித்துவிட்டேன். ${travelNote} ${anythingElse(lang)}`.replace(
      /\s+/g,
      " "
    ),
    lang
  );
}

export function diagnosticComplete(lang: Language, refId: string, test: string, date: string): string {
  return say(
    `Booking recorded. Reference ID ${refId}. Our team will confirm your ${test} on ${date}. ${anythingElse(lang)}`,
    `பதிவு செய்யப்பட்டது. குறிப்பு எண் ${refId}. ${date}-க்கு ${test} உறுதிப்படுத்த எங்கள் குழு அழைப்பார்கள். ${anythingElse(lang)}`,
    lang
  );
}

export function admissionComplete(lang: Language, refId: string): string {
  return say(
    `Admission enquiry recorded. Reference ID ${refId}. Our team will contact you shortly. ${anythingElse(lang)}`,
    `அனுமதி விசாரணை பதிவு செய்யப்பட்டது. குறிப்பு எண் ${refId}. குழு விரைவில் தொடர்பு கொள்வார்கள். ${anythingElse(lang)}`,
    lang
  );
}

export function escalationMessage(lang: Language, greName: string): string {
  return say(
    `Connecting you to our GRE executive ${greName}. Please hold.`,
    `GRE அதிகாரி ${greName}-ஐ இணைக்கிறேன். தயவு செய்து காத்திருங்கள்.`,
    lang
  );
}

export function formatKnowledgeAnswer(raw: string, lang: Language): string {
  const cleaned = raw
    .replace(/\[([^\]]+)\]:\s*/g, "")
    .split("\n\n")[0]
    .trim();
  const firstTwo = cleaned
    .split(/(?<=[.!])\s+/)
    .slice(0, 2)
    .join(" ")
    .trim();
  const answer = firstTwo || cleaned;
  if (lang === "ta") {
    return `இந்த தகவல்: ${answer}. ${anythingElse("ta")}`;
  }
  return `${answer} ${anythingElse(lang)}`;
}

/** Short knowledge snippet without closing the conversation. */
export function formatKnowledgeSnippet(raw: string, lang: Language): string {
  const cleaned = raw
    .replace(/\[([^\]]+)\]:\s*/g, "")
    .split("\n\n")
    .slice(0, 2)
    .join(". ")
    .trim();
  if (lang === "ta") {
    return cleaned;
  }
  return cleaned;
}

export function resumeWorkflowPrompt(snippet: string, nextQuestion: string, lang: Language): string {
  return say(
    `${snippet} Now, ${nextQuestion}`,
    `${snippet} இப்போ, ${nextQuestion}`,
    lang
  );
}

export function containsTamilScript(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}
