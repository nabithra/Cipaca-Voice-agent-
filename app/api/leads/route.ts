import { NextRequest, NextResponse } from "next/server";
import { getAllLeads } from "@/lib/storage";
import { isApiAuthorized } from "@/lib/auth/api-auth";

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  if (!isApiAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = await getAllLeads();
    return NextResponse.json(leads);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
