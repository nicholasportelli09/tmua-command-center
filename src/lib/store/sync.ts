import type { AppData } from "@/lib/domain/types";

export interface SyncStatus {
  configured: boolean;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const res = await fetch("/api/sync", { cache: "no-store" });
    if (!res.ok) return { configured: false };
    return (await res.json()) as SyncStatus;
  } catch {
    return { configured: false };
  }
}

export async function pushSnapshot(keyHash: string, data: AppData): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyHash, data }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error ?? `Sync failed (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function pullSnapshot(keyHash: string): Promise<{ data: AppData | null; error?: string }> {
  try {
    const res = await fetch("/api/sync/pull", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyHash }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error ?? `Pull failed (${res.status})` };
    }
    const body = await res.json();
    return { data: body.data ?? null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}
