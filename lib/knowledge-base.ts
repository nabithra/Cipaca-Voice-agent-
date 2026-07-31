import type { KnowledgeBase, PilotUnit, TrainingDataset } from "@/types";

export const DEFAULT_KNOWLEDGE_BASE: KnowledgeBase = {
  visitingHours: "9:00 AM to 8:00 PM daily. Emergency services available 24/7.",
  billing: "Billing counter open 9 AM - 6 PM. Online payment available via CIPACA portal. Accepts cash, card, UPI, and insurance.",
  insurance: "Cashless treatment available for major insurance providers. Submit policy details at admission. TPA desk available 9 AM - 5 PM.",
  departments: [
    { id: "dept-emergency", category: "departments", title: "Emergency & Trauma", content: "24/7 emergency care. Accident, trauma, critical illness, unconscious patients. Direct line: GRE Emergency Line.", tags: ["emergency", "trauma", "24/7"], updatedAt: "2026-01-15" },
    { id: "dept-cardiology", category: "departments", title: "Cardiology", content: "Heart care, ECG, echocardiography, angiography. Dr. Rajesh Kumar (Mon-Fri 10 AM-4 PM).", tags: ["heart", "cardiology"], updatedAt: "2026-01-15" },
    { id: "dept-ortho", category: "departments", title: "Orthopedics", content: "Bone, joint, fracture care. Dr. Priya Menon (Mon-Sat 9 AM-1 PM).", tags: ["orthopedics", "fracture"], updatedAt: "2026-01-15" },
    { id: "dept-pedia", category: "departments", title: "Pediatrics", content: "Child healthcare. Dr. Anitha Ravi (Mon-Sat 10 AM-5 PM).", tags: ["pediatrics", "children"], updatedAt: "2026-01-15" },
    { id: "dept-gyn", category: "departments", title: "Gynecology", content: "Women's health, maternity. Dr. Lakshmi Devi (Mon-Fri 11 AM-3 PM).", tags: ["gynecology", "maternity"], updatedAt: "2026-01-15" },
    { id: "dept-gen", category: "departments", title: "General Medicine", content: "General consultations, fever, diabetes, hypertension. Dr. Suresh Babu (Daily 9 AM-6 PM).", tags: ["general", "medicine"], updatedAt: "2026-01-15" },
    { id: "dept-diag", category: "departments", title: "Diagnostics", content: "Lab tests, blood work, pathology. Open 7 AM - 8 PM daily.", tags: ["diagnostics", "lab"], updatedAt: "2026-01-15" },
    { id: "dept-rad", category: "departments", title: "Radiology", content: "X-Ray, CT Scan, MRI, ultrasound. Appointment required for MRI and CT.", tags: ["radiology", "scan", "mri", "ct"], updatedAt: "2026-01-15" },
  ],
  doctors: [
    { id: "doc-rajesh", category: "doctors", title: "Dr. Rajesh Kumar", content: "Cardiologist. Mon-Fri 10 AM-4 PM. Cardiology department.", tags: ["cardiology"], updatedAt: "2026-01-15" },
    { id: "doc-priya", category: "doctors", title: "Dr. Priya Menon", content: "Orthopedic Surgeon. Mon-Sat 9 AM-1 PM. Orthopedics department.", tags: ["orthopedics"], updatedAt: "2026-01-15" },
    { id: "doc-anitha", category: "doctors", title: "Dr. Anitha Ravi", content: "Pediatrician. Mon-Sat 10 AM-5 PM. Pediatrics department.", tags: ["pediatrics"], updatedAt: "2026-01-15" },
    { id: "doc-lakshmi", category: "doctors", title: "Dr. Lakshmi Devi", content: "Gynecologist. Mon-Fri 11 AM-3 PM. Gynecology department.", tags: ["gynecology"], updatedAt: "2026-01-15" },
    { id: "doc-suresh", category: "doctors", title: "Dr. Suresh Babu", content: "General Physician. Daily 9 AM-6 PM. General Medicine.", tags: ["general"], updatedAt: "2026-01-15" },
  ],
  specialties: [
    { id: "spec-cardio", category: "specialties", title: "Cardiology", content: "Heart disease, hypertension, cardiac emergencies.", tags: ["heart"], updatedAt: "2026-01-15" },
    { id: "spec-neuro", category: "specialties", title: "Neurology", content: "Stroke, seizures, neurological disorders. Referral required.", tags: ["neurology", "stroke"], updatedAt: "2026-01-15" },
    { id: "spec-onco", category: "specialties", title: "Oncology", content: "Cancer care and chemotherapy. Specialist consultation by appointment.", tags: ["cancer", "oncology"], updatedAt: "2026-01-15" },
  ],
  diagnostics: [
    { id: "diag-mri", category: "diagnostics", title: "MRI Scan", content: "Magnetic Resonance Imaging. Appointment required. Fasting may be required. Report in 24-48 hours.", tags: ["mri", "scan"], updatedAt: "2026-01-15" },
    { id: "diag-ct", category: "diagnostics", title: "CT Scan", content: "Computed Tomography. Walk-in or appointment. Report same day for emergency cases.", tags: ["ct", "scan"], updatedAt: "2026-01-15" },
    { id: "diag-xray", category: "diagnostics", title: "X-Ray", content: "Available walk-in 7 AM - 8 PM. Report within 2 hours.", tags: ["xray", "scan"], updatedAt: "2026-01-15" },
    { id: "diag-lab", category: "diagnostics", title: "Lab Investigation", content: "Blood tests, urine analysis, pathology. Fasting samples 7-10 AM. Reports in 4-24 hours.", tags: ["lab", "blood"], updatedAt: "2026-01-15" },
  ],
  services: [
    { id: "svc-emergency", category: "services", title: "Emergency Services", content: "24/7 emergency care for accidents, trauma, critical illness, unconscious patients.", tags: ["emergency"], updatedAt: "2026-01-15" },
    { id: "svc-ambulance", category: "services", title: "Ambulance Service", content: "Hospital ambulance coordination available. Call emergency line.", tags: ["ambulance"], updatedAt: "2026-01-15" },
    { id: "svc-pharmacy", category: "services", title: "Pharmacy", content: "In-house pharmacy open 24/7 for inpatients. Outpatient 8 AM - 9 PM.", tags: ["pharmacy"], updatedAt: "2026-01-15" },
    { id: "svc-cafeteria", category: "services", title: "Cafeteria", content: "Open 7 AM - 9 PM for visitors and attenders.", tags: ["cafeteria"], updatedAt: "2026-01-15" },
  ],
  processes: [
    { id: "proc-admission", category: "processes", title: "Admission Process", content: "1. Visit reception or call helpline. 2. Provide ID and doctor referral. 3. Complete registration form. 4. Deposit advance. 5. Ward allocation.", tags: ["admission"], updatedAt: "2026-01-15" },
    { id: "proc-appointment", category: "processes", title: "Appointment Process", content: "1. Call helpline or walk-in. 2. Provide name, phone, department, preferred date/time. 3. Receive reference ID. 4. Confirmation SMS within 2 hours.", tags: ["appointment"], updatedAt: "2026-01-15" },
    { id: "proc-emergency", category: "processes", title: "Emergency Process", content: "1. Call emergency line immediately. 2. Provide location and nature of emergency. 3. GRE team alerts hospital unit. 4. Admission prepared. 5. Human executive connects.", tags: ["emergency"], updatedAt: "2026-01-15" },
  ],
  faqs: [
    { id: "faq-hours", category: "faqs", title: "Visiting Hours", content: "General visiting hours: 9:00 AM to 8:00 PM daily. ICU visiting: 11 AM-12 PM and 5 PM-6 PM.", tags: ["visiting", "hours"], updatedAt: "2026-01-15" },
    { id: "faq-parking", category: "faqs", title: "Parking", content: "Free parking available for patients and visitors. Valet service at main entrance.", tags: ["parking"], updatedAt: "2026-01-15" },
    { id: "faq-records", category: "faqs", title: "Medical Records", content: "Request copies at medical records desk. Processing time 24-48 hours. ID proof required.", tags: ["records"], updatedAt: "2026-01-15" },
    { id: "faq-billing", category: "faqs", title: "Billing Queries", content: "Contact customer care 9 AM - 6 PM. Detailed bill provided at discharge.", tags: ["billing"], updatedAt: "2026-01-15" },
  ],
};

export function searchKnowledgeBase(query: string, kb: KnowledgeBase = DEFAULT_KNOWLEDGE_BASE): string {
  const q = query.toLowerCase();
  const allEntries = [
    ...kb.departments,
    ...kb.doctors,
    ...kb.specialties,
    ...kb.diagnostics,
    ...kb.services,
    ...kb.processes,
    ...kb.faqs,
  ];

  const matches = allEntries.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags.some((t) => t.includes(q) || q.includes(t))
  );

  const top = matches.slice(0, 5);
  if (top.length === 0) {
    return `No specific information found for "${query}". Please escalate to customer care for confirmation.`;
  }

  return top.map((e) => `[${e.title}]: ${e.content}`).join("\n\n");
}

export function buildKnowledgeContext(): string {
  const kb = DEFAULT_KNOWLEDGE_BASE;
  return `
VERIFIED HOSPITAL KNOWLEDGE (use ONLY this information, never invent details):
Visiting Hours: ${kb.visitingHours}
Billing: ${kb.billing}
Insurance: ${kb.insurance}

Departments: ${kb.departments.map((d) => d.title).join(", ")}
Doctors: ${kb.doctors.map((d) => d.title + " - " + d.content).join("; ")}
Diagnostics: ${kb.diagnostics.map((d) => d.title + ": " + d.content).join("; ")}
Services: ${kb.services.map((s) => s.title).join(", ")}

For any question not covered above, use search_knowledge tool or say you will have staff confirm.
`.trim();
}

export const TRAINING_DATASETS: TrainingDataset[] = [
  { id: "td-recordings", name: "Existing Call Recordings", description: "Historical hospital helpline recordings", recordCount: 1240, lastUpdated: "2026-01-20", progress: 85 },
  { id: "td-faq", name: "Frequently Asked Questions", description: "Common patient queries and verified answers", recordCount: 156, lastUpdated: "2026-01-25", progress: 100 },
  { id: "td-services", name: "Hospital Services", description: "All CIPACA service descriptions", recordCount: 48, lastUpdated: "2026-01-22", progress: 100 },
  { id: "td-emergency", name: "Emergency Conversations", description: "Emergency call patterns and protocols", recordCount: 320, lastUpdated: "2026-01-18", progress: 72 },
  { id: "td-appointment", name: "Appointment Conversations", description: "Appointment booking dialogues", recordCount: 890, lastUpdated: "2026-01-24", progress: 90 },
  { id: "td-departments", name: "Departments", description: "Department info and routing", recordCount: 32, lastUpdated: "2026-01-15", progress: 100 },
  { id: "td-diagnostics", name: "Diagnostics", description: "Scan and lab booking knowledge", recordCount: 64, lastUpdated: "2026-01-20", progress: 95 },
  { id: "td-kb", name: "Knowledge Base", description: "Structured hospital knowledge entries", recordCount: 28, lastUpdated: "2026-01-26", progress: 100 },
];

export const PILOT_UNITS: PilotUnit[] = [
  { id: "unit-tvm", name: "Thiruvannamalai Unit", location: "Thiruvannamalai, Tamil Nadu", phase: 1, status: "pilot", launchDate: "2026-01-01" },
  { id: "unit-chennai", name: "Chennai Central", location: "Chennai, Tamil Nadu", phase: 2, status: "planned", launchDate: "2026-Q3" },
  { id: "unit-coimbatore", name: "Coimbatore Unit", location: "Coimbatore, Tamil Nadu", phase: 2, status: "planned" },
  { id: "unit-madurai", name: "Madurai Unit", location: "Madurai, Tamil Nadu", phase: 3, status: "planned" },
  { id: "unit-trichy", name: "Trichy Unit", location: "Tiruchirappalli, Tamil Nadu", phase: 3, status: "planned" },
];

export const GRE_TEAM: import("@/types").GREMember[] = [
  { id: "gre-1", name: "GRE-1", shift: "morning", status: "available", line: "emergency", callsHandled: 24 },
  { id: "gre-2", name: "GRE-2", shift: "afternoon", status: "available", line: "support", callsHandled: 18 },
  { id: "gre-3", name: "GRE-3", shift: "night", status: "offline", line: "support", callsHandled: 12 },
];

export const GRE_EMERGENCY_LINE = "CIPACA Emergency Line (GRE Dedicated)";
export const GRE_SUPPORT_LINE = "CIPACA Support Line (GRE Dedicated)";
