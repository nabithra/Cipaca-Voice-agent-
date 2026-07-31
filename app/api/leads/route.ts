import { NextResponse } from "next/server";
import { getAllLeads } from "@/lib/storage";

export const maxDuration = 10;

export async function GET() {
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
