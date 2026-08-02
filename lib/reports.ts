import type { Lead, Notification } from "@/types";

function escapeCsv(value: string | undefined): string {
  if (!value) return "";
  const v = String(value).replace(/"/g, '""');
  return v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v}"` : v;
}

export function leadsToCsv(leads: Lead[]): string {
  const headers = [
    "ID",
    "Reference",
    "Name",
    "Phone",
    "Category",
    "Inquiry Type",
    "Department",
    "Doctor",
    "Date",
    "Time",
    "Language",
    "Status",
    "Emergency",
    "Location",
    "Summary",
    "Created",
  ];
  const rows = leads.map((l) =>
    [
      l.id,
      l.referenceId ?? l.ticketId ?? "",
      l.name,
      l.phone,
      l.category,
      l.inquiryType ?? "",
      l.department ?? "",
      l.doctor ?? "",
      l.preferredDate ?? "",
      l.preferredTime ?? "",
      l.language,
      l.status,
      l.emergency ? "Yes" : "No",
      l.location ?? "",
      l.conversationSummary ?? "",
      l.createdAt,
    ]
      .map(escapeCsv)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function filterLeadsByCategory(leads: Lead[], category: Lead["category"]): Lead[] {
  return leads.filter((l) => l.category === category);
}

export function filterLeadsToday(leads: Lead[]): Lead[] {
  const today = new Date().toISOString().slice(0, 10);
  return leads.filter((l) => l.createdAt.startsWith(today));
}

export function buildDailyReport(leads: Lead[], notifications: Notification[]) {
  const today = filterLeadsToday(leads);
  return {
    date: new Date().toISOString().slice(0, 10),
    totalCalls: today.length,
    emergency: today.filter((l) => l.category === "Emergency").length,
    appointments: today.filter((l) => l.category === "Appointment").length,
    general: today.filter((l) => l.category === "General Inquiry").length,
    escalations: today.filter((l) => l.category === "Escalation").length,
    notifications: notifications.length,
  };
}
