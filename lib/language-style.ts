import type { Language } from "@/types";
import { transliterateForTamilTts } from "@/lib/tamil-phonetics";

/** Pick response by selected language; Tamil uses phonetic script for loanwords. */
export function say(en: string, ta: string, lang: Language): string {
  const raw =
    lang === "ta"
      ? transliterateForTamilTts(ta.trim())
      : en.trim();
  return formatReply(raw, lang);
}

/** English = Latin only. Tamil = Tamil script with phonetic loanwords. */
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
    "மன்னிக்கவும். இந்த தகவல் என்னிடம் இல்லை. ஹாஸ்பிடல் டீம்-ஐ கனெக்ட் செய்கிறேன்.",
    lang
  );
}

export function anythingElse(lang: Language): string {
  return say(
    "Is there anything else I can help you with?",
    "வேறு ஏதாவது ஹெல்ப் வேண்டுமா?",
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
    "செஷன் முடிந்துவிட்டது. மீண்டும் ஹெல்ப் வேண்டுமென்றால் ரீஸ்டார்ட் அழுத்துங்கள்.",
    lang
  );
}

export function clarifyIntent(lang: Language): string {
  return say(
    "I can help with appointments, emergencies, scans, or hospital information. What do you need?",
    "அப்பாயின்ட்மெண்ட், எமர்ஜென்சி, ஸ்கேன், ஹாஸ்பிடல் தகவல் — எதற்கு ஹெல்ப் வேண்டும்?",
    lang
  );
}

export function moreHelp(lang: Language): string {
  return say(
    "Of course. What else can I help you with?",
    "சரி. வேறு எதற்கு ஹெல்ப் வேண்டும்?",
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
      ? `நன்றி, ${tamilName(name)}. உங்கள் மொபைல் நம்பர் சொல்லுங்கள்.`
      : "உங்கள் மொபைல் நம்பர் சொல்லுங்கள்.",
    lang
  );
}

export function askDepartment(lang: Language): string {
  return say(
    "Which department would you like to visit?",
    "எந்த டிப்பார்ட்மெண்ட்-க்கு வர வேண்டும்?",
    lang
  );
}

export function askDoctor(lang: Language): string {
  return say(
    "Do you have a preferred doctor?",
    "எந்த டாக்டர்-ஐ பார்க்க வேண்டும்?",
    lang
  );
}

export function askDate(lang: Language): string {
  return say(
    "What date would you prefer?",
    "எந்த டேட் வசதியாக இருக்கும்?",
    lang
  );
}

export function askTime(lang: Language): string {
  return say(
    "What time would you prefer?",
    "எந்த டைம் வசதியாக இருக்கும்?",
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
    "என்ன எமர்ஜென்சி? ஆக்சிடென்ட், செஸ்ட் பேன், ஸ்ட்ரோக் — ஏதாவது சொல்லுங்கள்.",
    lang
  );
}

export function askPatientCondition(lang: Language): string {
  return say(
    "How is the patient doing right now?",
    "நோயாளியின் கண்டிஷன் எப்படி இருக்கிறது?",
    lang
  );
}

export function askTravelling(lang: Language): string {
  return say(
    "Are you on the way to the hospital?",
    "நீங்கள் ஹாஸ்பிடல்-க்கு வந்துகொண்டிருக்கிறீர்களா?",
    lang
  );
}

export function askTestType(lang: Language): string {
  return say(
    "Which test do you need?",
    "எந்த ஸ்கேன் அல்லது டெஸ்ட்? MRI, CT, அல்ட்ராசவுண்ட், எக்ஸ்-ரே, ப்ளட் டெஸ்ட், ECG?",
    lang
  );
}

export function askHospitalUnit(lang: Language, unit: string): string {
  return say(
    `Which hospital unit? Our pilot unit is ${unit}.`,
    `எந்த ஹாஸ்பிடல் யூனிட்? எங்கள் பைலட் யூனிட்: ${unit}.`,
    lang
  );
}

export function askAdmissionReason(lang: Language): string {
  return say(
    "What is the reason for admission?",
    "அட்மிஷன்-க்கான ரீசன் என்ன?",
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
    "சரி. அப்பாயின்ட்மெண்ட் புக் செய்ய உதவுகிறேன். தயவு செய்து உங்கள் பெயர் சொல்லுங்கள்.",
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
    "சரி. ஸ்கேன் புக்கிங்-க்கு உதவுகிறேன். நோயாளியின் பெயர் சொல்லுங்கள்.",
    lang
  );
}

export function startAdmission(lang: Language): string {
  return say(
    "I'll help with your admission enquiry. May I know your name?",
    "அட்மிஷன் என்குயிரி-க்கு உதவுகிறேன். தயவு செய்து உங்கள் பெயர் சொல்லுங்கள்.",
    lang
  );
}

export function startSpecialist(lang: Language): string {
  return say(
    "Certainly. I'll arrange a specialist consultation. May I know your name?",
    "சரி. ஸ்பெஷலிஸ்ட் கன்சுல்டேஷன் அரேஞ்ச் செய்கிறேன். உங்கள் பெயர் சொல்லுங்கள்.",
    lang
  );
}

export function greeting(lang: Language): string {
  return say(
    "Welcome to CIPACA Hospital, Thiruvannamalai Pilot Unit. I'm your AI receptionist. How may I help you today?",
    "வணக்கம். CIPACA Hospital, Thiruvannamalai. நான் உங்களுக்கு உதவும் AI ரிசப்ஷனிஸ்ட். என்ன ஹெல்ப் வேண்டும்?",
    lang
  );
}

export function appointmentComplete(lang: Language, refId: string): string {
  return say(
    `Your appointment is recorded. Reference ID: ${refId}. Our team will call you shortly to confirm. ${anythingElse(lang)}`,
    `அப்பாயின்ட்மெண்ட் பதிவு செய்யப்பட்டது. ரெஃபரன்ஸ் ஐடி: ${refId}. எங்கள் டீம் விரைவில் கன்ஃபர்ம செய்ய கால் செய்வார்கள். ${anythingElse(lang)}`,
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
        "ஹாஸ்பிடல், மெடிக்கல் டீம், அட்மிஷன்-க்கு தெரிவித்துவிட்டேன்.",
        lang
      )
    : "";
  return say(
    `Emergency ticket ${ticketId} created. Priority HIGH. GRE and ${unit} have been notified. ${travelNote} ${anythingElse(lang)}`.replace(
      /\s+/g,
      " "
    ),
    `எமர்ஜென்சி டிக்கெட் ${ticketId} கிரியேட் ஆகியுள்ளது. பிரயாரிட்டி ஹை. GRE மற்றும் ${unit}-க்கு தெரிவித்துவிட்டேன். ${travelNote} ${anythingElse(lang)}`.replace(
      /\s+/g,
      " "
    ),
    lang
  );
}

export function diagnosticComplete(lang: Language, refId: string, test: string, date: string): string {
  return say(
    `Booking recorded. Reference ID ${refId}. Our team will confirm your ${test} on ${date}. ${anythingElse(lang)}`,
    `புக்கிங் பதிவு செய்யப்பட்டது. ரெஃபரன்ஸ் ஐடி ${refId}. ${date}-க்கு ${test} கன்ஃபர்ம செய்ய டீம் கால் செய்வார்கள். ${anythingElse(lang)}`,
    lang
  );
}

export function admissionComplete(lang: Language, refId: string): string {
  return say(
    `Admission enquiry recorded. Reference ID ${refId}. Our team will contact you shortly. ${anythingElse(lang)}`,
    `அட்மிஷன் என்குயிரி பதிவு செய்யப்பட்டது. ரெஃபரன்ஸ் ஐடி ${refId}. டீம் விரைவில் தொடர்பு கொள்வார்கள். ${anythingElse(lang)}`,
    lang
  );
}

export function escalationMessage(lang: Language, greName: string): string {
  return say(
    `Connecting you to our GRE executive ${greName}. Please hold.`,
    `GRE எக்ஸிக்யூட்டிவ் ${greName}-ஐ கனெக்ட் செய்கிறேன். தயவு செய்து ஹோல்ட்-ல் இருங்கள்.`,
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
    return transliterateForTamilTts(`இந்த தகவல்: ${answer}. ${anythingElse("ta")}`);
  }
  return `${answer} ${anythingElse(lang)}`;
}

export function containsTamilScript(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}
