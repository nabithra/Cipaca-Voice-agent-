import {
  greeting,
  greetingFollowUp,
  unknownFallback,
  anythingElse,
  goodbye,
  sessionEnded,
  clarifyIntent,
  moreHelp,
  askName,
  askPhone,
  askDepartment,
  askDoctor,
  askDate,
  askTime,
  askLocation,
  askEmergencyType,
  askPatientCondition,
  askTravelling,
  askTestType,
  askHospitalUnit,
  askAdmissionReason,
  confirmDepartment,
  startAppointment,
  startEmergency,
  startDiagnostic,
  startAdmission,
  startSpecialist,
  appointmentComplete,
  emergencyComplete,
  diagnosticComplete,
  admissionComplete,
  escalationMessage,
} from "../lib/language-style.ts";
import { tamilToSpokenRoman } from "../lib/tamil-tts-fallback.ts";

const tamilRe = /[\u0b80-\u0bff]/;

const cases = [
  ["greeting", () => greeting("ta")],
  ["greetingFollowUp", () => greetingFollowUp("ta")],
  ["unknownFallback", () => unknownFallback("ta")],
  ["anythingElse", () => anythingElse("ta")],
  ["goodbye", () => goodbye("ta")],
  ["sessionEnded", () => sessionEnded("ta")],
  ["clarifyIntent", () => clarifyIntent("ta")],
  ["moreHelp", () => moreHelp("ta")],
  ["askName", () => askName("ta")],
  ["askPhone", () => askPhone("ta")],
  ["askPhone+name", () => askPhone("ta", "Ravi")],
  ["askDepartment", () => askDepartment("ta")],
  ["askDoctor", () => askDoctor("ta")],
  ["askDate", () => askDate("ta")],
  ["askTime", () => askTime("ta")],
  ["askLocation", () => askLocation("ta")],
  ["askEmergencyType", () => askEmergencyType("ta")],
  ["askPatientCondition", () => askPatientCondition("ta")],
  ["askTravelling", () => askTravelling("ta")],
  ["askTestType", () => askTestType("ta")],
  ["askHospitalUnit", () => askHospitalUnit("ta", "Thiruvannamalai")],
  ["askAdmissionReason", () => askAdmissionReason("ta")],
  ["confirmDepartment", () => confirmDepartment("ta", "Cardiology")],
  ["startAppointment", () => startAppointment("ta")],
  ["startEmergency", () => startEmergency("ta")],
  ["startDiagnostic", () => startDiagnostic("ta")],
  ["startAdmission", () => startAdmission("ta")],
  ["startSpecialist", () => startSpecialist("ta")],
  ["appointmentComplete", () => appointmentComplete("ta", "APT-123456")],
  ["emergencyComplete", () => emergencyComplete("ta", "EMG-99", true, "Thiruvannamalai")],
  ["diagnosticComplete", () => diagnosticComplete("ta", "DIAG-1", "MRI", "Monday")],
  ["admissionComplete", () => admissionComplete("ta", "ADM-1")],
  ["escalationMessage", () => escalationMessage("ta", "Priya")],
];

let issues = 0;
for (const [name, fn] of cases) {
  const inText = fn();
  const out = tamilToSpokenRoman(inText);
  const hasTamil = tamilRe.test(out);
  if (hasTamil) issues++;
  console.log(`${name}${hasTamil ? " [TAMIL LEFT]" : ""}`);
  console.log(`  OUT: ${out}`);
  console.log("");
}
console.log(`Done. ${issues} phrases still contain Tamil script.`);
