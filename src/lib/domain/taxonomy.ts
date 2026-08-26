import type { ErrorType, ModuleStatus, PaperStatus, PaperType, Topic } from "./types";

export const TOPICS: { value: Topic; label: string; short: string }[] = [
  { value: "algebra", label: "Algebra", short: "Algebra" },
  { value: "functions_graphs", label: "Functions & graphs", short: "Functions" },
  { value: "quadratics", label: "Quadratics", short: "Quadratics" },
  { value: "sequences_series", label: "Sequences & series", short: "Sequences" },
  { value: "geometry", label: "Geometry", short: "Geometry" },
  { value: "coordinate_geometry", label: "Coordinate geometry", short: "Coord geo" },
  { value: "trigonometry", label: "Trigonometry", short: "Trig" },
  { value: "logs_exponentials", label: "Logs & exponentials", short: "Logs/exp" },
  { value: "calculus", label: "Calculus", short: "Calculus" },
  { value: "probability_statistics", label: "Probability / statistics", short: "Prob/stats" },
  { value: "number_divisibility", label: "Number / divisibility", short: "Number" },
  { value: "logic", label: "Logic", short: "Logic" },
  { value: "necessary_sufficient", label: "Necessary & sufficient", short: "Nec/suff" },
  { value: "proof_counterexample", label: "Proof / counterexample", short: "Proof" },
  { value: "other", label: "Other", short: "Other" },
];

export const TOPIC_LABEL: Record<Topic, string> = Object.fromEntries(
  TOPICS.map((t) => [t.value, t.label]),
) as Record<Topic, string>;

export const TOPIC_SHORT: Record<Topic, string> = Object.fromEntries(
  TOPICS.map((t) => [t.value, t.short]),
) as Record<Topic, string>;

export const ERROR_TYPES: { value: ErrorType; label: string; hint: string }[] = [
  { value: "knowledge", label: "Knowledge", hint: "Didn't know the method or fact" },
  { value: "reasoning", label: "Reasoning", hint: "Logical / deductive slip" },
  { value: "careless", label: "Careless", hint: "Knew it, executed wrong" },
  { value: "timing", label: "Timing", hint: "Ran out of time / rushed" },
  { value: "misread", label: "Misread", hint: "Misread the question" },
];

export const ERROR_LABEL: Record<ErrorType, string> = Object.fromEntries(
  ERROR_TYPES.map((e) => [e.value, e.label]),
) as Record<ErrorType, string>;

export const PAPER_TYPES: { value: PaperType; label: string }[] = [
  { value: "official_tmua", label: "Official TMUA" },
  { value: "mat", label: "MAT" },
  { value: "course", label: "Course material" },
  { value: "other", label: "Other" },
];

export const PAPER_TYPE_LABEL: Record<PaperType, string> = Object.fromEntries(
  PAPER_TYPES.map((p) => [p.value, p.label]),
) as Record<PaperType, string>;

export const PAPER_STATUS_META: Record<
  PaperStatus,
  { label: string; token: string }
> = {
  untouched: { label: "Untouched", token: "faint" },
  completed: { label: "Completed", token: "accent" },
  reviewed: { label: "Reviewed", token: "pos" },
};

export const MODULE_STATUS_META: Record<
  ModuleStatus,
  { label: string; token: string }
> = {
  not_started: { label: "Not started", token: "faint" },
  in_progress: { label: "In progress", token: "warn" },
  completed: { label: "Completed", token: "pos" },
};
