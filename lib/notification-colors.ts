import type { Notification, NotificationType } from "@/types";

/** CIPACA demo notification colors: RED=emergency, BLUE=appointment, GREEN=general */
export type NotificationColor = "red" | "blue" | "green" | "amber";

export function getNotificationColor(n: Notification): NotificationColor {
  if (n.type === "emergency" || n.priority === "high") return "red";
  if (n.type === "appointment" || n.type === "arrival") return "blue";
  if (n.type === "escalation") return "amber";
  return "green";
}

export function notificationColorClasses(color: NotificationColor): string {
  switch (color) {
    case "red":
      return "border-red-500/40 bg-red-500/10";
    case "blue":
      return "border-blue-500/40 bg-blue-500/10";
    case "amber":
      return "border-amber-500/40 bg-amber-500/10";
    default:
      return "border-green-500/40 bg-green-500/10";
  }
}

export function priorityLabel(type: NotificationType): string {
  if (type === "emergency") return "RED — High Priority";
  if (type === "appointment") return "BLUE — Appointment";
  return "GREEN — General";
}
