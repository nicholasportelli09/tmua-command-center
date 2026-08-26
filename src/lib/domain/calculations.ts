import type { CourseModule, PaperSource, Sitting } from "./types";
import { daysBetweenDates } from "@/lib/utils/time";

/** Full TMUA sittings (both papers present), oldest -> newest. */
export function fullTmuaSittings(sittings: Sitting[]): Sitting[] {
  return sittings
    .filter((s) => s.category === "tmua" && s.isComplete && s.total !== null)
    .sort(byChrono);
}

function byChrono(a: Sitting, b: Sitting): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : 1;
}

export function computeTotal(p1: number | null, p2: number | null): number | null {
  if (p1 === null || p2 === null) return null;
  return p1 + p2;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export interface RollingResult {
  /** Mean of the most recent `basedOn` full sittings. */
  value: number | null;
  basedOn: number;
  window: number;
  /** Mean of the equal-size, non-overlapping prior window. */
  previous: number | null;
  /** value - previous (only when a consistent prior window exists). */
  change: number | null;
}

/**
 * Rolling average of the latest `window` full TMUA sittings.
 * `change` compares against the equal-size, non-overlapping previous window,
 * so the two periods are always the same length (mathematically consistent).
 * When `window` <= 0 the whole history is averaged and no change is produced.
 */
export function computeRolling(sittings: Sitting[], window: number): RollingResult {
  const fulls = fullTmuaSittings(sittings);
  const totals = fulls.map((s) => s.total as number);
  const n = totals.length;

  if (n === 0) {
    return { value: null, basedOn: 0, window, previous: null, change: null };
  }

  // "All" mode.
  if (window <= 0) {
    return { value: mean(totals), basedOn: n, window: n, previous: null, change: null };
  }

  const k = Math.min(window, n);
  const current = totals.slice(n - k);
  const value = mean(current);

  let previous: number | null = null;
  let change: number | null = null;
  if (n >= 2 * k) {
    const prior = totals.slice(n - 2 * k, n - k);
    previous = mean(prior);
    change = value - previous;
  }

  return { value, basedOn: k, window, previous, change };
}

export interface TargetGap {
  current: number | null;
  target: number;
  gap: number | null; // positive => points below target
  exceeded: boolean;
}

export function targetGap(current: number | null, target: number): TargetGap {
  if (current === null) return { current: null, target, gap: null, exceeded: false };
  const gap = target - current;
  return { current, target, gap, exceeded: gap <= 0 };
}

export function bestScore(sittings: Sitting[]): number | null {
  const fulls = fullTmuaSittings(sittings);
  if (fulls.length === 0) return null;
  return Math.max(...fulls.map((s) => s.total as number));
}

export interface PaperSplit {
  p1: number | null;
  p2: number | null;
  gap: number | null; // p1 - p2
  p1Count: number;
  p2Count: number;
}

/** Rolling P1 and P2 averages, each over sittings where THAT paper was completed. */
export function paperSplit(sittings: Sitting[], window: number): PaperSplit {
  const tmua = sittings.filter((s) => s.category === "tmua").sort(byChrono);
  const p1s = tmua.filter((s) => s.paper1 !== null).map((s) => s.paper1 as number);
  const p2s = tmua.filter((s) => s.paper2 !== null).map((s) => s.paper2 as number);

  const take = (xs: number[]) => (window > 0 ? xs.slice(Math.max(0, xs.length - window)) : xs);
  const cur1 = take(p1s);
  const cur2 = take(p2s);
  const p1 = cur1.length ? mean(cur1) : null;
  const p2 = cur2.length ? mean(cur2) : null;
  const gap = p1 !== null && p2 !== null ? p1 - p2 : null;
  return { p1, p2, gap, p1Count: cur1.length, p2Count: cur2.length };
}

export function daysSinceLastSitting(sittings: Sitting[], todayISO: string): number | null {
  const fulls = fullTmuaSittings(sittings);
  if (fulls.length === 0) return null;
  const last = fulls[fulls.length - 1];
  return Math.max(0, daysBetweenDates(last.date, todayISO));
}

export function lastSitting(sittings: Sitting[]): Sitting | null {
  const fulls = fullTmuaSittings(sittings);
  return fulls.length ? fulls[fulls.length - 1] : null;
}

export interface TrendResult {
  label: "improving" | "flat" | "declining" | "insufficient";
  /** Points/paper slope across the sampled window. */
  slopePerSitting: number | null;
  sampled: number;
}

/** Least-squares slope of total vs sitting index over the last `maxPoints`. */
export function improvementTrend(sittings: Sitting[], maxPoints = 6): TrendResult {
  const fulls = fullTmuaSittings(sittings);
  const totals = fulls.slice(Math.max(0, fulls.length - maxPoints)).map((s) => s.total as number);
  const n = totals.length;
  if (n < 3) return { label: "insufficient", slopePerSitting: null, sampled: n };
  const xs = totals.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(totals);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (totals[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const label = slope > 0.25 ? "improving" : slope < -0.25 ? "declining" : "flat";
  return { label, slopePerSitting: slope, sampled: n };
}

export interface ConsistencyResult {
  stdev: number | null;
  count: number;
  range: number | null;
}

/** Sample standard deviation of the last `window` full-sitting totals. */
export function consistency(sittings: Sitting[], window = 5): ConsistencyResult {
  const totals = fullTmuaSittings(sittings).map((s) => s.total as number);
  const take = totals.slice(Math.max(0, totals.length - window));
  const n = take.length;
  if (n < 3) return { stdev: null, count: n, range: n >= 2 ? Math.max(...take) - Math.min(...take) : null };
  const m = mean(take);
  const variance = take.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
  return { stdev: Math.sqrt(variance), count: n, range: Math.max(...take) - Math.min(...take) };
}

export interface OfficialCompletion {
  total: number;
  completed: number; // both papers completed or reviewed
  reviewed: number; // both papers reviewed
  untouchedFull: number; // both papers untouched
  papersDone: number;
  papersTotal: number;
}

export function officialCompletion(sources: PaperSource[]): OfficialCompletion {
  const official = sources.filter((s) => s.official);
  let completed = 0;
  let reviewed = 0;
  let untouchedFull = 0;
  let papersDone = 0;
  for (const s of official) {
    const done1 = s.paper1Status !== "untouched";
    const done2 = s.paper2Status !== "untouched";
    if (done1) papersDone++;
    if (done2) papersDone++;
    if (done1 && done2) completed++;
    if (s.paper1Status === "reviewed" && s.paper2Status === "reviewed") reviewed++;
    if (!done1 && !done2) untouchedFull++;
  }
  return {
    total: official.length,
    completed,
    reviewed,
    untouchedFull,
    papersDone,
    papersTotal: official.length * 2,
  };
}

export interface CourseProgress {
  total: number;
  completed: number;
  inProgress: number;
  pct: number;
  currentGroup: string | null;
  currentModule: CourseModule | null;
  groups: { group: string; total: number; completed: number; pct: number }[];
}

export function courseProgress(modules: CourseModule[]): CourseProgress {
  const total = modules.length;
  const completed = modules.filter((m) => m.status === "completed").length;
  const inProgress = modules.filter((m) => m.status === "in_progress").length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  const ordered = [...modules].sort((a, b) => a.order - b.order);
  const current =
    ordered.find((m) => m.status === "in_progress") ??
    ordered.find((m) => m.status === "not_started") ??
    null;

  const groupMap = new Map<string, CourseModule[]>();
  for (const m of ordered) {
    if (!groupMap.has(m.group)) groupMap.set(m.group, []);
    groupMap.get(m.group)!.push(m);
  }
  const groups = [...groupMap.entries()].map(([group, mods]) => {
    const c = mods.filter((m) => m.status === "completed").length;
    return { group, total: mods.length, completed: c, pct: mods.length ? Math.round((c / mods.length) * 100) : 0 };
  });

  return {
    total,
    completed,
    inProgress,
    pct,
    currentGroup: current?.group ?? null,
    currentModule: current,
    groups,
  };
}
