/** Number formatting helpers, tuned for compact dashboard display. */

export function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

/** Signed delta, e.g. "+1.4", "−0.3", "0.0". Uses a real minus sign. */
export function signed(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const s = Math.abs(n).toFixed(digits);
  if (n > 0) return `+${s}`;
  if (n < 0) return `−${s}`;
  return `0${digits > 0 ? "." + "0".repeat(digits) : ""}`;
}

export function pct(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

/** Direction token for a delta, for coloring. */
export function deltaTone(n: number | null | undefined, epsilon = 0.05): "pos" | "neg" | "flat" {
  if (n === null || n === undefined || Number.isNaN(n)) return "flat";
  if (n > epsilon) return "pos";
  if (n < -epsilon) return "neg";
  return "flat";
}

export function clampScore(v: number, max: number): number {
  return Math.max(0, Math.min(max, v));
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
