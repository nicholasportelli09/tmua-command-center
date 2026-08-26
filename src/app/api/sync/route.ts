import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: getServiceClient() !== null });
}
