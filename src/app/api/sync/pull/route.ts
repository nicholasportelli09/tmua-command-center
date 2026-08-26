import { NextResponse } from "next/server";
import { getServiceClient, SYNC_TABLE } from "@/lib/supabase/server";

export const runtime = "nodejs";

const HASH_RE = /^[0-9a-f]{64}$/;

export async function POST(req: Request) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Cloud sync is not configured." }, { status: 501 });

  let body: { keyHash?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { keyHash } = body;
  if (!keyHash || !HASH_RE.test(keyHash)) {
    return NextResponse.json({ error: "Invalid workspace key." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from(SYNC_TABLE)
    .select("data")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data?.data ?? null });
}
