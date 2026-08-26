import type { CourseModule, PaperSource, QuestionAttempt, Sitting } from "./types";
import { computeTotal } from "./calculations";

let seq = 0;
function nextCreated(): string {
  seq += 1;
  return new Date(1_700_000_000_000 + seq * 1000).toISOString();
}

/** Build a full TMUA sitting with sensible defaults. */
export function sit(overrides: Partial<Sitting> = {}): Sitting {
  // Respect explicit null (a missing paper) — only default when undefined.
  const p1 = overrides.paper1 !== undefined ? overrides.paper1 : 16;
  const p2 = overrides.paper2 !== undefined ? overrides.paper2 : 14;
  const total = overrides.total !== undefined ? overrides.total : computeTotal(p1, p2);
  return {
    id: overrides.id ?? `s-${++seq}`,
    date: overrides.date ?? "2026-09-01",
    category: overrides.category ?? "tmua",
    sourceId: overrides.sourceId ?? null,
    sourceLabel: overrides.sourceLabel ?? "Mock",
    paper1: p1,
    paper2: p2,
    total,
    maxScore: overrides.maxScore ?? 40,
    estimatedScaled: overrides.estimatedScaled ?? null,
    scaledSource: overrides.scaledSource ?? null,
    conversionProfileId: overrides.conversionProfileId ?? null,
    paper1DurationSec: overrides.paper1DurationSec ?? null,
    paper2DurationSec: overrides.paper2DurationSec ?? null,
    notes: overrides.notes ?? null,
    isComplete: overrides.isComplete ?? (p1 !== null && p2 !== null),
    createdAt: overrides.createdAt ?? nextCreated(),
  };
}

export function source(overrides: Partial<PaperSource> = {}): PaperSource {
  return {
    id: overrides.id ?? `src-${++seq}`,
    name: overrides.name ?? "2019",
    year: overrides.year ?? 2019,
    type: overrides.type ?? "official_tmua",
    official: overrides.official ?? true,
    order: overrides.order ?? 0,
    paper1Status: overrides.paper1Status ?? "untouched",
    paper2Status: overrides.paper2Status ?? "untouched",
    linkedSittingId: overrides.linkedSittingId ?? null,
    editable: overrides.editable ?? true,
  };
}

export function moduleItem(overrides: Partial<CourseModule> = {}): CourseModule {
  return {
    id: overrides.id ?? `m-${++seq}`,
    group: overrides.group ?? "Week 1",
    title: overrides.title ?? "Module 1",
    status: overrides.status ?? "not_started",
    order: overrides.order ?? 0,
  };
}

export function attempt(overrides: Partial<QuestionAttempt> = {}): QuestionAttempt {
  return {
    id: overrides.id ?? `a-${++seq}`,
    sittingId: overrides.sittingId ?? "s-1",
    paper: overrides.paper ?? 2,
    questionNumber: overrides.questionNumber ?? 1,
    selected: overrides.selected ?? "A",
    correct: overrides.correct ?? "B",
    isCorrect: overrides.isCorrect ?? false,
    flagged: overrides.flagged ?? false,
    durationSec: overrides.durationSec ?? null,
    errorType: overrides.errorType ?? null,
    topic: overrides.topic ?? null,
    needsRedo: overrides.needsRedo ?? false,
    redoneSuccessfully: overrides.redoneSuccessfully ?? false,
  };
}
