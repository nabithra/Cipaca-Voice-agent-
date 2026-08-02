"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Clock,
  Download,
  Phone,
  PhoneCall,
  PhoneOff,
  Search,
  Timer,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeadStore, useNotificationStore, ensureNotificationArray } from "@/lib/store";
import {
  computeDashboardStats,
  getCategoryBarData,
  getCategoryPieData,
  getDailyChartData,
  getRecentEscalations,
  getUnitPerformance,
  getWeeklyChartData,
} from "@/lib/dashboard-stats";
import {
  buildDailyReport,
  downloadCsv,
  filterLeadsByCategory,
  filterLeadsToday,
  leadsToCsv,
} from "@/lib/reports";
import { getNotificationColor, notificationColorClasses, priorityLabel } from "@/lib/notification-colors";
import type { Lead, LeadCategory, Notification } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_COLORS = ["#0d9488", "#06b6d4", "#0284c7", "#dc2626", "#8b5cf6"];

export function DashboardView() {
  const { leads, hydrate, setLeads } = useLeadStore();
  const { notifications, setNotifications, hydrate: hydrateNotifications } = useNotificationStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LeadCategory | "all">("all");

  useEffect(() => {
    hydrate();
    hydrateNotifications();
    Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/notifications").then((r) => r.json()),
    ])
      .then(([serverLeads, serverNotifications]) => {
        if (Array.isArray(serverLeads) && serverLeads.length > 0) {
          const currentLeads = useLeadStore.getState().leads;
          const merged = [...serverLeads];
          currentLeads.forEach((l) => {
            if (!merged.find((m: Lead) => m.id === l.id)) merged.push(l);
          });
          setLeads(
            merged.sort(
              (a: Lead, b: Lead) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          );
        }
        const notificationList = Array.isArray(serverNotifications)
          ? serverNotifications
          : Array.isArray((serverNotifications as { notifications?: Notification[] })?.notifications)
            ? (serverNotifications as { notifications: Notification[] }).notifications
            : [];
        if (notificationList.length > 0) {
          setNotifications(notificationList);
        }
      })
      .catch(() => {});
  }, [hydrate, hydrateNotifications, setLeads, setNotifications]);

  const safeNotifications = ensureNotificationArray(notifications);
  const stats = computeDashboardStats(leads);
  const categoryData = getCategoryPieData(leads);
  const dailyData = getDailyChartData(leads);
  const weeklyData = getWeeklyChartData(leads);
  const barData = getCategoryBarData(leads);
  const unitData = getUnitPerformance(leads);
  const recentEscalations = getRecentEscalations(leads);

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.referenceId?.includes(search) ||
      l.conversationSummary?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || l.category === filter;
    return matchesSearch && matchesFilter;
  });

  const exportJSON = () => {
    const blob = new Blob(
      [JSON.stringify({ leads: filteredLeads, notifications }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cipaca-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = (filename: string, data: Lead[]) => {
    downloadCsv(filename, leadsToCsv(data));
  };

  const exportDailyReport = () => {
    const report = buildDailyReport(leads, safeNotifications);
    downloadCsv(
      `cipaca-daily-report-${report.date}.csv`,
      leadsToCsv(filterLeadsToday(leads))
    );
  };

  const statCards = [
    { title: "Today's Calls", value: stats.dailyCalls, icon: PhoneCall, color: "text-teal-500" },
    { title: "Emergency", value: stats.emergency, icon: Phone, color: "text-red-500" },
    { title: "Appointments", value: stats.appointments, icon: PhoneCall, color: "text-blue-500" },
    { title: "Diagnostics", value: stats.diagnostics, icon: Phone, color: "text-cyan-500" },
    { title: "General Inquiries", value: stats.general, icon: Phone, color: "text-green-500" },
    { title: "Escalations", value: stats.escalations, icon: PhoneOff, color: "text-purple-500" },
    { title: "Completed", value: stats.completed, icon: TrendingUp, color: "text-green-600" },
    { title: "Pending", value: stats.pendingCalls, icon: Clock, color: "text-orange-500" },
    { title: "Total Calls", value: stats.totalCalls, icon: PhoneCall, color: "text-teal-600" },
    { title: "Weekly Calls", value: stats.weeklyCalls, icon: Clock, color: "text-indigo-500" },
    { title: "Avg Response", value: `${stats.avgResponseTimeMs}ms`, icon: Timer, color: "text-teal-500" },
    { title: "Emergency Success", value: `${stats.emergencySuccessRate}%`, icon: TrendingUp, color: "text-red-500" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] hospital-bg">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">CIPACA AI Voice Assistant Analytics</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportJSON} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> Export JSON
            </Button>
            <Button onClick={() => exportCsv("cipaca-leads.csv", filteredLeads)} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> Export Leads CSV
            </Button>
            <Button onClick={exportDailyReport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> Daily Report CSV
            </Button>
            <Button
              onClick={() => exportCsv("cipaca-emergency.csv", filterLeadsByCategory(leads, "Emergency"))}
              variant="outline"
              size="sm"
            >
              Emergency CSV
            </Button>
            <Button
              onClick={() => exportCsv("cipaca-appointments.csv", filterLeadsByCategory(leads, "Appointment"))}
              variant="outline"
              size="sm"
            >
              Appointments CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {statCards.map((card) => (
            <Card key={card.title} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    <p className="text-xl font-bold mt-0.5">{card.value}</p>
                  </div>
                  <card.icon className={`h-6 w-6 ${card.color} opacity-70 shrink-0`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Calls by Category</CardTitle></CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="category" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Daily Calls</CardTitle></CardHeader>
            <CardContent>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Weekly Calls</CardTitle></CardHeader>
            <CardContent>
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">No data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {unitData.length > 0 && (
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Hospital Unit Performance</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={unitData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="unit" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#0d9488" name="Total Calls" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="emergency" fill="#dc2626" name="Emergency" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PhoneOff className="h-4 w-4" /> Recent Escalations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEscalations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No escalations yet</p>
              ) : (
                <div className="space-y-2">
                  {recentEscalations.map((l) => (
                    <div key={l.id} className="rounded-lg border border-border/50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{l.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{l.escalationId ?? l.referenceId}</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">{l.escalationReason ?? l.category} · {formatDate(l.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" /> Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {safeNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notifications yet</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {safeNotifications.slice(0, 10).map((n) => {
                    const color = getNotificationColor(n);
                    return (
                    <div key={n.id} className={`rounded-lg border p-3 text-sm ${notificationColorClasses(color)}`}>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-medium">{n.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0 bg-background/60">
                          {priorityLabel(n.type)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.targetTeam} · {formatDate(n.createdAt)}</p>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Recent Leads & Calls</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-[200px]" />
                </div>
                <Select value={filter} onValueChange={(v) => setFilter(v as LeadCategory | "all")}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="Appointment">Appointment</SelectItem>
                    <SelectItem value="Escalation">Escalation</SelectItem>
                    <SelectItem value="General Inquiry">General</SelectItem>
                    <SelectItem value="Non-Emergency">Non-Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="table">
              <TabsList>
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="logs">Conversation Logs</TabsTrigger>
              </TabsList>
              <TabsContent value="table">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-3 px-2">Name</th>
                        <th className="text-left py-3 px-2">Phone</th>
                        <th className="text-left py-3 px-2">Category</th>
                        <th className="text-left py-3 px-2">Inquiry</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Reference</th>
                        <th className="text-left py-3 px-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground">
                            No calls recorded yet. Start a voice session to generate data.
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((lead) => (
                          <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-3 px-2 font-medium">{lead.name}</td>
                            <td className="py-3 px-2">{lead.phone || "—"}</td>
                            <td className="py-3 px-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                lead.category === "Emergency" ? "bg-red-500/10 text-red-600"
                                  : lead.category === "Appointment" ? "bg-teal-500/10 text-teal-600"
                                  : "bg-blue-500/10 text-blue-600"
                              }`}>{lead.category}</span>
                            </td>
                            <td className="py-3 px-2 text-xs">{lead.inquiryType ?? "—"}</td>
                            <td className="py-3 px-2 capitalize">{lead.status}</td>
                            <td className="py-3 px-2 font-mono text-xs">{lead.referenceId ?? lead.ticketId ?? "—"}</td>
                            <td className="py-3 px-2 text-muted-foreground">{formatDate(lead.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="logs">
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {filteredLeads.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No conversation logs yet</p>
                  ) : (
                    filteredLeads.map((lead) => (
                      <div key={lead.id} className="rounded-xl border border-border/50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.category} · {formatDate(lead.createdAt)}</p>
                            {lead.conversationSummary && (
                              <p className="text-xs text-muted-foreground mt-1 italic">Summary: {lead.conversationSummary}</p>
                            )}
                          </div>
                          {lead.referenceId && (
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{lead.referenceId}</span>
                          )}
                        </div>
                        {lead.conversation.length > 0 ? (
                          <div className="space-y-2">
                            {lead.conversation.map((msg, i) => (
                              <div key={i} className={`text-sm rounded-lg px-3 py-2 ${msg.role === "user" ? "bg-primary/10 ml-4" : "bg-muted mr-4"}`}>
                                <span className="text-xs font-medium text-muted-foreground capitalize">{msg.role}:</span> {msg.content}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No transcript recorded</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
