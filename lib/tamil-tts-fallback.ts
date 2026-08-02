/**
 * When a device has no Tamil speechSynthesis voice (common on phones / fresh Windows),
 * speak Tamil content using an English/Indian-English voice + romanized text.
 */

/** Tamil letters → rough roman (TTS-oriented, not linguistically perfect). */
const CHAR_ROMAN: Record<string, string> = {
  "\u0b85": "a",
  "\u0b86": "aa",
  "\u0b87": "i",
  "\u0b88": "ee",
  "\u0b89": "u",
  "\u0b8a": "oo",
  "\u0b8e": "e",
  "\u0b8f": "ae",
  "\u0b90": "ai",
  "\u0b92": "o",
  "\u0b93": "oa",
  "\u0b94": "au",
  "\u0b95": "ka",
  "\u0b99": "nga",
  "\u0b9a": "sa",
  "\u0b9e": "nya",
  "\u0b9f": "ta",
  "\u0ba3": "na",
  "\u0ba4": "tha",
  "\u0ba8": "na",
  "\u0baa": "pa",
  "\u0bae": "ma",
  "\u0baf": "ya",
  "\u0bb0": "ra",
  "\u0bb2": "la",
  "\u0bb5": "va",
  "\u0bb4": "zha",
  "\u0bb3": "la",
  "\u0bb1": "ra",
  "\u0ba9": "na",
  "\u0b83": "",
  "\u0bcd": "",
};

const PHRASE_ROMAN: [string, string][] = [
  ["\u0bb5\u0ba3\u0b95\u0bcd\u0b95\u0bae\u0bcd", "vanakkam"],
  ["\u0bae\u0ba9\u0bcd\u0ba9\u0bbf\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd", "mannikkavum"],
  ["\u0ba8\u0ba9\u0bcd\u0bb1\u0bbf", "nandri"],
  ["\u0ba8\u0bbe\u0ba9\u0bcd", "naan"],
  ["\u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd", "ungal"],
  ["\u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bbf\u0ba9\u0bcd", "ungalin"],
  ["\u0b8e\u0ba9\u0bcd\u0ba9", "enna"],
  ["\u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd", "venum"],
  ["\u0bb5\u0bc7\u0ba3\u0bc1\u0bae\u0bcd", "venum"],
  ["\u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd", "sollunga"],
  ["\u0baa\u0bc6\u0baf\u0bb0\u0bcd", "peyar"],
  ["\u0ba4\u0bbf\u0bb0\u0bc1\u0bb5\u0ba3\u0bcd\u0ba3\u0bbe\u0bae\u0bb2\u0bc8", "thiruvannamalai"],
  ["\u0b9a\u0bb0\u0bbf", "sari"],
  ["\u0b87\u0bb2\u0bcd\u0bb2\u0bc8", "illai"],
];

export function hasTamilSpeechVoice(
  voices: SpeechSynthesisVoice[] = typeof window !== "undefined"
    ? window.speechSynthesis?.getVoices() ?? []
    : []
): boolean {
  return voices.some((v) => v.lang.toLowerCase().startsWith("ta"));
}

/** Convert Tamil-script hospital replies to speakable roman for en-IN TTS. */
export function tamilToSpokenRoman(text: string): string {
  let result = text;

  for (const [tamil, roman] of PHRASE_ROMAN) {
    result = result.replace(new RegExp(tamil, "g"), roman);
  }

  result = result.replace(/[\u0B80-\u0BFF]+/g, (block) => {
    const parts: string[] = [];
    for (const char of block) {
      const r = CHAR_ROMAN[char];
      if (r !== undefined) parts.push(r);
    }
    return parts.join(" ");
  });

  return result
    .replace(/\s+/g, " ")
    .replace(/\s+([,.?!])/g, "$1")
    .trim();
}
