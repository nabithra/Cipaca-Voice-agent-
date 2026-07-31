import { NextResponse } from "next/server";
import { getAllNotifications } from "@/lib/notification-storage";

export const maxDuration = 10;

export async function GET() {
  try {
    const notifications = await getAllNotifications();
    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
