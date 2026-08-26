/** Timezone-correct time helpers. No external dependency. */

export interface Countdown {
  totalMs: number;
  past: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdown(instantIso: string, now: Date = new Date()): Countdown {
  const target = new Date(instantIso).getTime();
  const diff = target - now.getTime();
  const past = diff <= 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);
  return { totalMs: diff, past, days, hours, minutes, seconds };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/** "Friday 16 October 2026 · 13:15" formatted in the exam timezone. */
export function formatExamDate(instantIso: string, timeZone: string): string {
  const d = new Date(instantIso);
  const parts = zonedParts(d, timeZone);
  const weekday = WEEKDAYS[parts.weekday];
  return `${weekday} ${parts.day} ${MONTHS[parts.month - 1]} ${parts.year} · ${pad(
    parts.hour,
  )}:${pad(parts.minute)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

interface ZParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0=Sun
}

function zonedParts(date: Date, timeZone: string): ZParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: map.hour === "24" ? 0 : Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: weekdayMap[map.weekday] ?? 0,
  };
}

/** ms to add to a UTC instant to get local wall time in the zone. */
function zoneOffsetMs(timeZone: string, date: Date): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

/**
 * Convert a wall-clock time (as displayed in `timeZone`) to a UTC instant.
 * DST-safe via a two-pass offset correction.
 */
export function zonedWallTimeToUtc(
  localDate: string, // YYYY-MM-DD
  localTime: string, // HH:mm
  timeZone: string,
): string {
  const [y, mo, d] = localDate.split("-").map(Number);
  const [h, mi] = localTime.split(":").map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset1 = zoneOffsetMs(timeZone, new Date(utcGuess));
  let instant = utcGuess - offset1;
  const offset2 = zoneOffsetMs(timeZone, new Date(instant));
  if (offset2 !== offset1) instant = utcGuess - offset2;
  return new Date(instant).toISOString();
}

/** Local (device) date as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole days between two YYYY-MM-DD dates (b - a). */
export function daysBetweenDates(aISO: string, bISO: string): number {
  const a = Date.parse(aISO + "T00:00:00Z");
  const b = Date.parse(bISO + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

/** Human "12 Aug 2026" style label. */
export function shortDate(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}
