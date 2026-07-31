import type { DashboardStats, Lead, Notification } from "@/types";

export function computeDashboardStats(leads: Lead[]): DashboardStats {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const emergencyLeads = leads.filter((l) => l.category === "Emergency");
  const resolvedEmergency = emergencyLeads.filter(
    (l) => l.status === "resolved" || l.status === "closed" || l.status === "completed"
  );

  const responseTimes = leads
    .filter((l) => l.responseTimeMs)
    .map((l) => l.responseTimeMs as number);
  const callDurations = leads
    .filter((l) => l.callDurationSeconds)
    .map((l) => l.callDurationSeconds as number);

  return {
    totalCalls: leads.length,
    emergency: emergencyLeads.length,
    appointments: leads.filter((l) => l.category === "Appointment").length,
    escalations: leads.filter((l) => l.category === "Escalation").length,
    general: leads.filter(
      (l) => l.category === "General Inquiry" || l.category === "Non-Emergency"
    ).length,
    completed: leads.filter(
      (l) => l.status === "completed" || l.status === "resolved" || l.status === "closed"
    ).length,
    avgResponseTimeMs:
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 850,
    avgCallDurationSeconds:
      callDurations.length > 0
        ? Math.round(callDurations.reduce((a, b) => a + b, 0) / callDurations.length)
        : 180,
    dailyCalls: leads.filter((l) => new Date(l.createdAt) >= dayAgo).length,
    weeklyCalls: leads.filter((l) => new Date(l.createdAt) >= weekAgo).length,
    monthlyCalls: leads.filter((l) => new Date(l.createdAt) >= monthAgo).length,
    emergencySuccessRate:
      emergencyLeads.length > 0
        ? Math.round((resolvedEmergency.length / emergencyLeads.length) * 100)
        : 100,
  };
}

export function getCategoryPieData(leads: Lead[]) {
  const stats = computeDashboardStats(leads);
  return [
    { name: "Emergency", value: stats.emergency },
    { name: "Appointments", value: stats.appointments },
    { name: "Escalations", value: stats.escalations },
    { name: "General", value: stats.general },
  ].filter((d) => d.value > 0);
}

export function getDailyChartData(leads: Lead[]) {
  const days: Record<string, number> = {};
  leads.forEach((l) => {
    const day = new Date(l.createdAt).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
    days[day] = (days[day] ?? 0) + 1;
  });
  return Object.entries(days)
    .map(([date, count]) => ({ date, count }))
    .slice(-14);
}

export function getWeeklyChartData(leads: Lead[]) {
  const weeks: Record<string, number> = {};
  leads.forEach((l) => {
    const d = new Date(l.createdAt);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    weeks[key] = (weeks[key] ?? 0) + 1;
  });
  return Object.entries(weeks).map(([week, count]) => ({ week, count }));
}

export function getUnitPerformance(leads: Lead[]) {
  const units: Record<string, { total: number; emergency: number }> = {};
  leads.forEach((l) => {
    const unit = l.hospitalUnit ?? "Thiruvannamalai Unit";
    if (!units[unit]) units[unit] = { total: 0, emergency: 0 };
    units[unit].total++;
    if (l.category === "Emergency") units[unit].emergency++;
  });
  return Object.entries(units).map(([unit, data]) => ({
    unit,
    total: data.total,
    emergency: data.emergency,
  }));
}

export function getCategoryBarData(leads: Lead[]) {
  const cats: Record<string, number> = {};
  leads.forEach((l) => {
    cats[l.category] = (cats[l.category] ?? 0) + 1;
  });
  return Object.entries(cats).map(([category, count]) => ({ category, count }));
}

export function getRecentEscalations(leads: Lead[]) {
  return leads
    .filter((l) => l.category === "Escalation" || l.escalationStatus === "escalated")
    .slice(0, 10);
}

export function getRecentNotifications(notifications: Notification[]) {
  const list = Array.isArray(notifications) ? notifications : [];
  return list.slice(0, 10);
}
