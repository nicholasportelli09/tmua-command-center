const KEY_STORAGE = "tmua.workspaceKey";

export function getStoredKey(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(KEY_STORAGE);
}

export function storeKey(key: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY_STORAGE, key);
}

export function clearStoredKey(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY_STORAGE);
}

/** SHA-256 hex of the sync key. Only this representation is ever sent server-side. */
export async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key.trim().toUpperCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
