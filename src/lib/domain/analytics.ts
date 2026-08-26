import type { ErrorType, QuestionAttempt, Sitting, Topic } from "./types";

/** Sittings that feed topic/error analytics (TMUA + MAT), newest last. */
function analyticsSittings(sittings: Sitting[]): Sitting[] {
  return sittings
    .filter((s) => s.category === "tmua" || s.category === "mat")
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt < b.createdAt ? -1 : 1));
}

/** Attempts belonging to the most recent `n` analytics sittings. */
export function recentAttempts(
  attempts: QuestionAttempt[],
  sittings: Sitting[],
  n: number,
): { attempts: QuestionAttempt[]; sittingsUsed: number } {
  const ordered = analyticsSittings(sittings);
  const recent = n > 0 ? ordered.slice(Math.max(0, ordered.length - n)) : ordered;
  const ids = new Set(recent.map((s) => s.id));
  return { attempts: attempts.filter((a) => ids.has(a.sittingId)), sittingsUsed: recent.length };
}

export interface ErrorComposition {
  total: number;
  items: { type: ErrorType; count: number; share: number }[];
  sittingsUsed: number;
}

export function errorComposition(
  attempts: QuestionAttempt[],
  sittings: Sitting[],
  recentN = 3,
): ErrorComposition {
  const { attempts: recent, sittingsUsed } = recentAttempts(attempts, sittings, recentN);
  const labelled = recent.filter((a) => a.errorType !== null);
  const counts = new Map<ErrorType, number>();
  for (const a of labelled) counts.set(a.errorType!, (counts.get(a.errorType!) ?? 0) + 1);
  const total = labelled.length;
  const items = [...counts.entries()]
    .map(([type, count]) => ({ type, count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);
  return { total, items, sittingsUsed };
}

export interface TopicWeakness {
  topic: Topic;
  errors: number;
  attempts: number;
}

export interface TopicWeaknessResult {
  ranked: TopicWeakness[];
  top: TopicWeakness | null;
  sittingsUsed: number;
}

/**
 * Rank topics by error count across recent sittings.
 * Only surfaces topics with at least `minErrors` — avoids over-reading noise.
 */
export function topicWeakness(
  attempts: QuestionAttempt[],
  sittings: Sitting[],
  recentN = 3,
  minErrors = 2,
): TopicWeaknessResult {
  const { attempts: recent, sittingsUsed } = recentAttempts(attempts, sittings, recentN);
  const errorMap = new Map<Topic, number>();
  const attemptMap = new Map<Topic, number>();
  for (const a of recent) {
    if (!a.topic) continue;
    attemptMap.set(a.topic, (attemptMap.get(a.topic) ?? 0) + 1);
    if (a.isCorrect === false) errorMap.set(a.topic, (errorMap.get(a.topic) ?? 0) + 1);
  }
  const ranked = [...errorMap.entries()]
    .map(([topic, errors]) => ({ topic, errors, attempts: attemptMap.get(topic) ?? errors }))
    .filter((t) => t.errors >= minErrors)
    .sort((a, b) => b.errors - a.errors);
  return { ranked, top: ranked[0] ?? null, sittingsUsed };
}

export interface PaceResult {
  hasData: boolean;
  avgCorrectSec: number | null;
  avgWrongSec: number | null;
  timingErrorCount: number;
  costsPoints: boolean;
}

/** Whether timing is plausibly costing points, only when enough timing data exists. */
export function paceAnalysis(
  attempts: QuestionAttempt[],
  sittings: Sitting[],
  recentN = 3,
): PaceResult {
  const { attempts: recent } = recentAttempts(attempts, sittings, recentN);
  const timed = recent.filter((a) => a.durationSec !== null);
  if (timed.length < 6) {
    return { hasData: false, avgCorrectSec: null, avgWrongSec: null, timingErrorCount: 0, costsPoints: false };
  }
  const correct = timed.filter((a) => a.isCorrect === true).map((a) => a.durationSec as number);
  const wrong = timed.filter((a) => a.isCorrect === false).map((a) => a.durationSec as number);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const avgCorrectSec = avg(correct);
  const avgWrongSec = avg(wrong);
  const timingErrorCount = recent.filter((a) => a.errorType === "timing").length;
  const costsPoints =
    timingErrorCount >= 2 ||
    (avgWrongSec !== null && avgCorrectSec !== null && avgWrongSec > avgCorrectSec * 1.4);
  return { hasData: true, avgCorrectSec, avgWrongSec, timingErrorCount, costsPoints };
}

export function unresolvedRedos(attempts: QuestionAttempt[]): QuestionAttempt[] {
  return attempts.filter((a) => a.needsRedo && !a.redoneSuccessfully);
}
