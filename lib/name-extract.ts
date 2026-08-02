/** Extract a person's name from natural speech like "my name is Priya". */
export function extractPersonName(text: string): string {
  const raw = text.trim();
  if (!raw) return raw;

  const prefixPatterns = [
    /^(?:my\s+name\s+is|i\s+am|i'?m|im|this\s+is|call\s+me|name\s+is|it'?s|its)\s+(?:dr\.?\s*)?(.+)$/i,
    /^(?:naan|nan|en\s+peyar|en\s+per|peyar\s+enaku|peru\s+enaku|peru)\s+(?:dr\.?\s*)?(.+)$/i,
    /^(?:en|in|un)\s+(?:peyar|per|pair|pear)\s+(?:is\s+)?(?:dr\.?\s*)?(.+)$/i,
    /^(?:என்\s*பெயர்|நான்)\s+(?:dr\.?\s*)?(.+)$/,
  ];

  for (const re of prefixPatterns) {
    const match = raw.match(re);
    if (match?.[1]) {
      const cleaned = cleanName(match[1]);
      if (isPlausibleName(cleaned)) return formatName(cleaned);
    }
  }

  // STT often mishears "en peyar Sheela" as "In pair, Sheila"
  const commaParts = raw.split(/\s*,\s*/);
  if (commaParts.length === 2) {
    const lead = commaParts[0].trim();
    if (/^(?:in|en|un)\s+pair$/i.test(lead)) {
      const cleaned = cleanName(commaParts[1]);
      if (isPlausibleName(cleaned)) return formatName(cleaned);
    }
  }

  const misheardPair = raw.match(/^(?:in|en|un)\s+pair\s*,?\s*(.+)$/i);
  if (misheardPair?.[1]) {
    const cleaned = cleanName(misheardPair[1]);
    if (isPlausibleName(cleaned)) return formatName(cleaned);
  }

  // Direct short answer — "Priya", "Dr Kumar"
  const words = raw.split(/\s+/);
  if (words.length <= 4 && isPlausibleName(raw)) {
    return formatName(cleanName(raw));
  }

  // Last resort: if phrase contains a name after comma, use trailing segment
  if (commaParts.length >= 2) {
    const trailing = cleanName(commaParts[commaParts.length - 1]);
    if (isPlausibleName(trailing) && trailing.split(/\s+/).length <= 3) {
      return formatName(trailing);
    }
  }

  const cleaned = cleanName(raw);
  if (isPlausibleName(cleaned)) return formatName(cleaned);
  return cleaned;
}

/** Pull a 10-digit mobile number from phrases like "my number is 9876543210". */
export function extractPhoneNumber(text: string): string {
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return text.trim();
}

function cleanName(name: string): string {
  return name
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+(only|here|sir|madam|akka|anna|brother|sister)$/i, "")
    .trim();
}

function isPlausibleName(name: string): boolean {
  if (name.length < 2 || name.length > 50) return false;
  if (/^(yes|no|ok|okay|none|nothing|general|any|in|en|un|pair|peyar|per)$/i.test(name))
    return false;
  if (/^(in|en|un)\s+pair$/i.test(name)) return false;
  if (/^\d+$/.test(name)) return false;
  return true;
}

function formatName(name: string): string {
  if (/[\u0B80-\u0BFF]/.test(name)) return name;
  return name
    .split(/\s+/)
    .map((word) => {
      if (/^dr\.?$/i.test(word)) return "Dr.";
      if (/^[A-Z]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
