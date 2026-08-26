import type { AppSettings, ExamSettings, PaperType } from "./types";

/**
 * The exam: Friday 16 October 2026, 13:15 Europe/Zurich (CEST = UTC+2).
 * DST in Europe ends 25 Oct 2026, so 16 Oct is still CEST.
 * 13:15 CEST -> 11:15 UTC.
 */
export const DEFAULT_EXAM: ExamSettings = {
  examName: "TMUA",
  examInstantUtc: "2026-10-16T11:15:00.000Z",
  localDate: "2026-10-16",
  localTime: "13:15",
  timezone: "Europe/Zurich",
  rawTarget: 34,
  maxScore: 40,
};

export const DEFAULT_SETTINGS: AppSettings = {
  rollingWindow: 3,
  prepPhase: "auto",
};

/** Preparation-phase boundaries (from the user's plan). */
export const PHASE_BOUNDARIES = {
  /** SAT remains priority up to and including this date. */
  satPriorityUntil: "2026-09-12",
  /** TMUA becomes the primary external priority from here. */
  tmuaPrimaryFrom: "2026-09-13",
  /** Final mock-heavy window = this many days before the exam. */
  finalMockWindowDays: 14,
};

/** Definitions for the seeded official-paper tracker (no ids yet). */
export interface PaperSourceDef {
  name: string;
  year: number | null;
  type: PaperType;
  official: boolean;
}

export const SEED_PAPER_SOURCES: PaperSourceDef[] = [
  { name: "2016", year: 2016, type: "official_tmua", official: true },
  { name: "2017", year: 2017, type: "official_tmua", official: true },
  { name: "2018", year: 2018, type: "official_tmua", official: true },
  { name: "2019", year: 2019, type: "official_tmua", official: true },
  { name: "2020", year: 2020, type: "official_tmua", official: true },
  { name: "2021", year: 2021, type: "official_tmua", official: true },
  { name: "2022", year: 2022, type: "official_tmua", official: true },
  { name: "2023", year: 2023, type: "official_tmua", official: true },
  { name: "Specimen", year: null, type: "official_tmua", official: true },
];

/** Seeded Clementine Wade course structure — 4 weeks, editable placeholder modules. */
export const SEED_COURSE: { group: string; titles: string[] }[] = [
  { group: "Week 1", titles: ["Module 1", "Module 2", "Module 3"] },
  { group: "Week 2", titles: ["Module 1", "Module 2", "Module 3"] },
  { group: "Week 3", titles: ["Module 1", "Module 2", "Module 3"] },
  { group: "Week 4", titles: ["Module 1", "Module 2", "Module 3"] },
];

export const DATA_VERSION = 1;

/** TMUA paper format constants. */
export const TMUA = {
  questionsPerPaper: 20,
  paperMinutes: 75,
  maxPerPaper: 20,
  maxTotal: 40,
};
