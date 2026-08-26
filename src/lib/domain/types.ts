/**
 * Core domain types for TMUA Command Center.
 * Backend-agnostic. Pure data — no persistence concerns here.
 */

export type ID = string;

/** Where a result came from. MAT/course/other never pollute the TMUA /40 trajectory. */
export type SittingCategory = "tmua" | "mat" | "other";

/** Classification of an uploaded/tracked paper. */
export type PaperType = "official_tmua" | "mat" | "course" | "other";

/** Per-paper progress inside the official-paper tracker. */
export type PaperStatus = "untouched" | "completed" | "reviewed";

export type ModuleStatus = "not_started" | "in_progress" | "completed";

export type ErrorType = "knowledge" | "reasoning" | "careless" | "timing" | "misread";

export type Topic =
  | "algebra"
  | "functions_graphs"
  | "quadratics"
  | "sequences_series"
  | "geometry"
  | "coordinate_geometry"
  | "trigonometry"
  | "logs_exponentials"
  | "calculus"
  | "probability_statistics"
  | "number_divisibility"
  | "logic"
  | "necessary_sufficient"
  | "proof_counterexample"
  | "other";

export type ScaledSource = "manual" | "derived";

/** The one-time exam target configuration. */
export interface ExamSettings {
  examName: string;
  /** Exact moment of the exam as a UTC instant (ISO 8601, always ...Z). */
  examInstantUtc: string;
  /** Wall-clock components as displayed / edited. */
  localDate: string; // YYYY-MM-DD
  localTime: string; // HH:mm
  timezone: string; // IANA, e.g. "Europe/Zurich"
  rawTarget: number; // e.g. 34
  maxScore: number; // 40
}

/**
 * A logged result. A full TMUA sitting has both papers set.
 * A single-paper result leaves the other paper null.
 */
export interface Sitting {
  id: ID;
  date: string; // YYYY-MM-DD
  category: SittingCategory;
  /** Link to a PaperSource (official tracker row) when applicable. */
  sourceId: ID | null;
  sourceLabel: string;
  paper1: number | null; // /20
  paper2: number | null; // /20
  total: number | null; // computed /40 when both present (TMUA)
  maxScore: number; // 40 for a full TMUA sitting
  estimatedScaled: number | null;
  scaledSource: ScaledSource | null;
  conversionProfileId: ID | null;
  paper1DurationSec: number | null;
  paper2DurationSec: number | null;
  notes: string | null;
  isComplete: boolean; // both TMUA papers present
  createdAt: string;
}

/** A row in the official past-paper tracker (one year / sitting = two papers). */
export interface PaperSource {
  id: ID;
  name: string; // "2019", "Specimen"
  year: number | null;
  type: PaperType;
  official: boolean;
  order: number;
  paper1Status: PaperStatus;
  paper2Status: PaperStatus;
  /** The most recent sitting logged against this source, if any. */
  linkedSittingId: ID | null;
  editable: boolean;
}

export interface CourseModule {
  id: ID;
  group: string; // "Week 1"
  title: string;
  status: ModuleStatus;
  order: number;
}

/** A single point on a raw -> scaled conversion curve. */
export interface ConversionPoint {
  raw: number; // /40
  scaled: number;
}

export interface ConversionProfile {
  id: ID;
  name: string; // "2021"
  year: number | null;
  source: string; // provenance note
  note: string;
  points: ConversionPoint[]; // sorted ascending by raw
}

export interface QuestionAttempt {
  id: ID;
  sittingId: ID;
  paper: 1 | 2;
  questionNumber: number;
  selected: string | null; // "A".."E"
  correct: string | null;
  isCorrect: boolean | null;
  flagged: boolean;
  durationSec: number | null;
  errorType: ErrorType | null;
  topic: Topic | null;
  needsRedo: boolean;
  redoneSuccessfully: boolean;
}

/** Metadata for an uploaded practice PDF (the blob lives separately). */
export interface Material {
  id: ID;
  name: string;
  type: PaperType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Number of questions the paper has (for the answer grid). */
  questionCount: number;
  /** Answer key by question index (1-based) -> letter, if known. */
  answerKey: Record<number, string> | null;
  createdAt: string;
}

export interface AppSettings {
  /** Rolling window used for the headline current-level metric. */
  rollingWindow: number; // default 3
  /** Optional manual override of the preparation phase. */
  prepPhase: PrepPhase | "auto";
}

export type PrepPhase = "sat_priority" | "tmua_primary" | "final_mocks";

export interface Workspace {
  id: ID;
  createdAt: string;
  /** Non-reversible representation of the sync key (never the raw key). */
  keyHash?: string;
}

/** Full serialisable snapshot for export / import / sync. */
export interface AppData {
  version: number;
  exportedAt: string;
  /** ISO timestamp of the last local change — used to resolve sync conflicts (newest wins). */
  lastMutatedAt?: string;
  workspace: Workspace;
  exam: ExamSettings;
  settings: AppSettings;
  sittings: Sitting[];
  sources: PaperSource[];
  course: CourseModule[];
  conversionProfiles: ConversionProfile[];
  attempts: QuestionAttempt[];
  materials: Material[];
}
