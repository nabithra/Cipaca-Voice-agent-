import { NextRequest, NextResponse } from "next/server";
import { getAllNotifications } from "@/lib/notification-storage";
import { isApiAuthorized } from "@/lib/auth/api-auth";

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  if (!isApiAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications = await getAllNotifications();
    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
