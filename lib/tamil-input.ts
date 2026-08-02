/** Normalize Tamil script / mixed speech for intent classification */
export function normalizeForClassification(text: string): string {
  const t = text.trim();
  if (!t) return t;

  let hints = "";

  if (/[\u0B80-\u0BFF]/.test(t)) {
    if (/ஆக்சிடென்ட|ஆக்சி஡ென்ட|விபத்த|விபத்து|மோதல்|அடிபட்ட|இரத்த/.test(t)) {
      hints += " emergency accident";
    }
    if (/எமர்ஜென்சி|அவசர|அவசரம்|ஆபத்த|உயிர்/.test(t)) {
      hints += " emergency";
    }
    // All common Tamil spellings of "appointment"
    if (/அப்பாய|அபாய|அப்பாய|apointment|appointment/i.test(t)) {
      hints += " appointment book";
    }
    if (/புக்|book/i.test(t) && /பண்ண|pann|pannanum/i.test(t)) {
      hints += " appointment book";
    }
    if (/மருத்துவர்|doctor|டாக்டர்|paakanum|pakanum/i.test(t)) {
      hints += " appointment doctor";
    }
    if (/scan|ஸ்கேன்|MRI|எம்ஆர்ஐ|பரிசோதனை/.test(t)) {
      hints += " scan mri";
    }
    if (/ஹெல்ப்|help/i.test(t) && /அப்பாய|அபாய|appointment|doctor|டாக்டர்/i.test(t)) {
      hints += " appointment";
    }
  }

  if (/aayiduchu|aayitaru|aayiruchu|accident|emergency|avasharam/i.test(t)) {
    hints += " emergency accident";
  }
  if (/appointment book|book pann|pannanum|apointment/i.test(t)) {
    hints += " appointment book";
  }
  if (/want.*(?:mri|scan)|take.*(?:mri|scan)|need.*(?:mri|scan)|get.*(?:mri|scan)|mri\s*scan|scan\s*(?:booking|book|venum|edukanum|pannanum)/i.test(t)) {
    hints += " scan booking mri";
  }
  if (/scan.*(?:venum|edukanum|pannanum|edukka)|edukanum.*scan|ஸ்கேன்.*(?:எடு|வேணும்|பண்ண)/i.test(t)) {
    hints += " scan booking mri";
  }

  return `${t} ${hints}`.trim();
}

export function sanitizeForTts(text: string, language: "en" | "ta"): string {
  if (language === "ta") {
    return text.replace(/\s+/g, " ").trim();
  }
  return text.replace(/[\u0B80-\u0BFF]+/g, " ").replace(/\s+/g, " ").trim() || text;
}

export function preferTamilVoice(text: string, language: "en" | "ta"): boolean {
  if (language !== "ta") return false;
  const tamilChars = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  return tamilChars >= 3;
}

export function chunkForSpeech(text: string, maxLen = 120): string[] {
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let buf = "";
  for (const s of sentences) {
    if ((buf + s).length > maxLen && buf) {
      parts.push(buf.trim());
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.length ? parts : [text.slice(0, maxLen)];
}
