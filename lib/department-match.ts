const DEPARTMENTS: { key: string; label: string; aliases: string[] }[] = [
  { key: "cardiology", label: "Cardiology", aliases: ["heart", "cardio", "cardiac"] },
  { key: "neurology", label: "Neurology", aliases: ["neuro", "brain", "stroke"] },
  { key: "orthopedics", label: "Orthopedics", aliases: ["ortho", "bone", "fracture", "joint"] },
  { key: "emergency", label: "Emergency", aliases: ["trauma", "casualty", "er"] },
  { key: "pediatrics", label: "Pediatrics", aliases: ["pedia", "child", "kids", "baby"] },
  { key: "radiology", label: "Radiology", aliases: ["scan", "xray", "x-ray", "mri", "ct"] },
  { key: "general", label: "General Medicine", aliases: ["general", "gp", "fever", "medicine"] },
  { key: "gynecology", label: "Gynecology", aliases: ["gyno", "maternity", "women"] },
  { key: "diagnostics", label: "Diagnostics", aliases: ["lab", "pathology", "blood test"] },
];

export function matchDepartment(input: string): { department: string; needsConfirm: boolean } {
  const raw = input.trim();
  const lower = raw.toLowerCase();

  for (const d of DEPARTMENTS) {
    if (lower === d.key || lower === d.label.toLowerCase()) {
      return { department: d.label, needsConfirm: false };
    }
    if (d.aliases.some((a) => lower.includes(a) || a.includes(lower))) {
      return { department: d.label, needsConfirm: lower.length < 5 };
    }
    if (d.label.toLowerCase().includes(lower) && lower.length >= 4) {
      return { department: d.label, needsConfirm: true };
    }
  }

  // Tamil / Thanglish hints
  if (/heart|manasu|cardio/i.test(lower)) return { department: "Cardiology", needsConfirm: false };
  if (/bone|mootu|ortho/i.test(lower)) return { department: "Orthopedics", needsConfirm: false };
  if (/child|kuzhanthai|pedia/i.test(lower)) return { department: "Pediatrics", needsConfirm: false };

  return { department: raw, needsConfirm: false };
}
