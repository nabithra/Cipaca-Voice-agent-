/**
 * Tamil-script phonetic spellings for English hospital loanwords.
 * Used for display + TTS so ta-IN voices pronounce terms naturally.
 */

/** Longest phrases first — applied in order during transliteration */
const LOANWORD_ENTRIES: [string, string][] = [
  ["mobile number", "மொபைல் நம்பர்"],
  ["reference id", "ரெஃபரன்ஸ் ஐடி"],
  ["specialist consultation", "ஸ்பெஷலிஸ்ட் கன்சுல்டேஷன்"],
  ["hospital information", "ஹாஸ்பிடல் இன்ஃபர்மேஷன்"],
  ["hospital unit", "ஹாஸ்பிடல் யூனிட்"],
  ["hospital team", "ஹாஸ்பிடல் டீம்"],
  ["medical team", "மெடிக்கல் டீம்"],
  ["blood test", "ப்ளட் டெஸ்ட்"],
  ["x-ray", "எக்ஸ்-ரே"],
  ["chest pain", "செஸ்ட் பேன்"],
  ["arrange", "அரேஞ்ச்"],
  ["create", "கிரியேட்"],
  ["appointment", "அப்பாயின்ட்மெண்ட்"],
  ["department", "டிப்பார்ட்மெண்ட்"],
  ["emergency", "எமர்ஜென்சி"],
  ["admission", "அட்மிஷன்"],
  ["specialist", "ஸ்பெஷலிஸ்ட்"],
  ["consultation", "கன்சுல்டேஷன்"],
  ["information", "இன்ஃபர்மேஷன்"],
  ["ultrasound", "அல்ட்ராசவுண்ட்"],
  ["condition", "கண்டிஷன்"],
  ["reference", "ரெஃபரன்ஸ்"],
  ["priority", "பிரயாரிட்டி"],
  ["executive", "எக்ஸிக்யூட்டிவ்"],
  ["hospital", "ஹாஸ்பிடல்"],
  ["accident", "ஆக்சிடென்ட்"],
  ["connect", "கனெக்ட்"],
  ["confirm", "கன்ஃபர்ம்"],
  ["confirm", "கன்ஃபர்ம"],
  ["booking", "புக்கிங்"],
  ["session", "செஷன்"],
  ["restart", "ரீஸ்டார்ட்"],
  ["receptionist", "ரிசப்ஷனிஸ்ட்"],
  ["enquiry", "என்குயிரி"],
  ["pilot", "பைலட்"],
  ["mobile", "மொபைல்"],
  ["number", "நம்பர்"],
  ["doctor", "டாக்டர்"],
  ["ticket", "டிக்கெட்"],
  ["stroke", "ஸ்ட்ரோக்"],
  ["reason", "ரீசன்"],
  ["hold", "ஹோல்ட்"],
  ["scan", "ஸ்கேன்"],
  ["test", "டெஸ்ட்"],
  ["help", "ஹெல்ப்"],
  ["team", "டீம்"],
  ["unit", "யூனிட்"],
  ["call", "கால்"],
  ["book", "புக்"],
  ["date", "டேட்"],
  ["time", "டைம்"],
  ["high", "ஹை"],
  ["cipaca", "சிபாகா"],
  ["thiruvannamalai", "\u0ba4\u0bbf\u0bb0\u0bc1\u0bb5\u0ba9\u0bcd\u0ba9\u0bae\u0bb2\u0bc8"],
  ["thiruvannamalai", "\u0ba4\u0bbf\u0bb0\u0bc1\u0bb5\u0ba3\u0bcd\u0ba3\u0bbe\u0bae\u0bb2\u0bc8"],
  ["ai", "ஏஐ"],
  ["mri", "எம்ஆர்ஐ"],
  ["ct scan", "சிடி ஸ்கேன்"],
  ["ecg", "ஈசிஜி"],
  ["gre", "ஜி ஆர் ஈ"],
  ["now", "நவ்"],
];

/** Bare Latin loanwords that should not appear in Tamil-mode replies */
const BARE_LOANWORD_PATTERN =
  /\b(department|doctor|mobile|appointment|help|hospital|emergency|scan|booking|session|restart|connect|confirm|specialist|admission|information|condition|reference|priority|executive|number|accident|reason|hold|team|unit|call|book|date|time)\b/i;

export function transliterateForTamilTts(text: string): string {
  let result = text;
  for (const [latin, tamil] of LOANWORD_ENTRIES) {
    const escaped = latin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re =
      latin.length <= 3
        ? new RegExp(`\\b${escaped}\\b`, "gi")
        : new RegExp(escaped, "gi");
    result = result.replace(re, tamil);
  }
  return result.replace(/\s+/g, " ").trim();
}

export function hasLatinLoanwords(text: string): boolean {
  return BARE_LOANWORD_PATTERN.test(text);
}

export function phoneticTamil(text: string): string {
  return transliterateForTamilTts(text);
}

/** Tamil-script loanwords → Latin (for English-voice TTS fallback). */
export function tamilLoanwordsToLatin(text: string): string {
  let result = text;
  const reversed = [...LOANWORD_ENTRIES].sort((a, b) => b[1].length - a[1].length);
  for (const [latin, tamil] of reversed) {
    result = result.replace(new RegExp(tamil, "g"), latin);
  }
  return result;
}
