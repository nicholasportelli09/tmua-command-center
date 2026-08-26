import { NextResponse } from "next/server";
import { getServiceClient, SYNC_TABLE } from "@/lib/supabase/server";

export const runtime = "nodejs";

const HASH_RE = /^[0-9a-f]{64}$/;

export async function POST(req: Request) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Cloud sync is not configured." }, { status: 501 });

  let body: { keyHash?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { keyHash, data } = body;
  if (!keyHash || !HASH_RE.test(keyHash)) {
    return NextResponse.json({ error: "Invalid workspace key." }, { status: 400 });
  }
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Missing snapshot." }, { status: 400 });
  }

  const { error } = await supabase
    .from(SYNC_TABLE)
    .upsert({ key_hash: keyHash, data, updated_at: new Date().toISOString() }, { onConflict: "key_hash" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
