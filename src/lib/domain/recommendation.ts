import type {
  AppSettings,
  CourseModule,
  ExamSettings,
  PaperSource,
  PrepPhase,
  QuestionAttempt,
  Sitting,
} from "./types";
import {
  computeRolling,
  courseProgress,
  daysSinceLastSitting,
  fullTmuaSittings,
  officialCompletion,
  paperSplit,
  targetGap,
} from "./calculations";
import { topicWeakness, unresolvedRedos } from "./analytics";
import { TOPIC_LABEL } from "./taxonomy";
import { PHASE_BOUNDARIES } from "./constants";
import { daysBetweenDates } from "@/lib/utils/time";

export interface RecoInput {
  sittings: Sitting[];
  sources: PaperSource[];
  modules: CourseModule[];
  attempts: QuestionAttempt[];
  exam: ExamSettings;
  settings: AppSettings;
  todayISO: string;
}

export interface Recommendation {
  kind: string;
  title: string; // the action (WHAT)
  why: string; // the evidence (WHY)
  href: string;
  cta: string;
  priority: number;
}

export interface RecoResult {
  primary: Recommendation | null;
  secondary: Recommendation | null;
  phase: PrepPhase;
  daysToExam: number;
}

export function determinePhase(
  exam: ExamSettings,
  todayISO: string,
  override: AppSettings["prepPhase"],
): PrepPhase {
  if (override && override !== "auto") return override;
  const examDate = exam.localDate;
  const daysToExam = daysBetweenDates(todayISO, examDate);
  if (daysToExam <= PHASE_BOUNDARIES.finalMockWindowDays) return "final_mocks";
  if (todayISO <= PHASE_BOUNDARIES.satPriorityUntil) return "sat_priority";
  return "tmua_primary";
}

const phaseBoost = (phase: PrepPhase, map: Partial<Record<PrepPhase, number>>): number =>
  map[phase] ?? 0;

/** Wrong-or-flagged attempts for a sitting that haven't been triaged in review yet. */
function untriagedCount(attempts: QuestionAttempt[]): number {
  return attempts.filter(
    (a) =>
      (a.isCorrect === false || a.flagged) &&
      a.errorType === null &&
      !a.needsRedo &&
      !a.redoneSuccessfully,
  ).length;
}

/**
 * Build the Next Best Work recommendation(s) from real data.
 * Deterministic and transparent — the highest expected-value action wins,
 * and every recommendation states the evidence behind it.
 */
export function buildRecommendations(input: RecoInput): RecoResult {
  const { sittings, sources, modules, attempts, exam, settings, todayISO } = input;
  const phase = determinePhase(exam, todayISO, settings.prepPhase);
  const daysToExam = Math.max(0, daysBetweenDates(todayISO, exam.localDate));

  const fulls = fullTmuaSittings(sittings);
  const rolling = computeRolling(sittings, settings.rollingWindow);
  const split = paperSplit(sittings, settings.rollingWindow);
  const weakness = topicWeakness(attempts, sittings, 3, 3);
  const redos = unresolvedRedos(attempts);
  const official = officialCompletion(sources);
  const course = courseProgress(modules);
  const daysSince = daysSinceLastSitting(sittings, todayISO);
  const gap = targetGap(rolling.value, exam.rawTarget);

  const candidates: Recommendation[] = [];

  // 1 — No benchmark yet.
  if (fulls.length === 0) {
    candidates.push({
      kind: "first_diagnostic",
      title: "Complete your first diagnostic full sitting.",
      why: "The dashboard has no benchmark yet. One timed sitting establishes your baseline and shows where the points are actually being lost — everything else is guesswork until then.",
      href: "/papers",
      cta: "Log a diagnostic",
      priority: 100,
    });
  }

  // 2 — Review the most recent mock before anything new.
  if (fulls.length > 0) {
    const last = fulls[fulls.length - 1];
    const lastAttempts = attempts.filter((a) => a.sittingId === last.id);
    const untriaged = untriagedCount(lastAttempts);
    if (untriaged >= 3) {
      const dSince = daysSince ?? 0;
      candidates.push({
        kind: "review_last",
        title: `Review your ${shortLabel(last)} sitting before your next paper.`,
        why: `${untriaged} wrong or flagged questions from that sitting are still untriaged. Understanding those misses is the cheapest available points — do it before spending a fresh paper.`,
        href: `/review/${last.id}`,
        cta: "Open review",
        priority: 82 - Math.min(20, dSince * 2),
      });
    }
  }

  // 3 — Targeted topic drilling on the biggest concentrated weakness.
  if (weakness.top && weakness.top.errors >= 3) {
    const t = weakness.top;
    const gapClause =
      split.gap !== null && Math.abs(split.gap) >= 1.5
        ? ` Your ${split.gap >= 0 ? "Paper 2" : "Paper 1"} average is ${Math.abs(split.gap).toFixed(1)} points lower, and this is where those points are leaking.`
        : "";
    candidates.push({
      kind: "topic_drill",
      title: `Do 30–40 minutes of ${TOPIC_LABEL[t.topic].toLowerCase()} problems before your next mock.`,
      why: `You missed ${t.errors} ${TOPIC_LABEL[t.topic].toLowerCase()} questions across your last ${weakness.sittingsUsed} sittings.${gapClause} Focused drilling here converts directly into raw marks.`,
      href: "/practice",
      cta: "Start practice",
      priority: 46 + t.errors * 5 + phaseBoost(phase, { tmua_primary: 8, final_mocks: 6, sat_priority: 2 }),
    });
  }

  // 4 — Fresh benchmark when the last one is stale (scarcity-aware).
  if (fulls.length > 0 && daysSince !== null) {
    const scarce = official.untouchedFull;
    let base = 0;
    if (daysSince >= 7) base = 46 + (daysSince - 7) * 2.5;
    base += phaseBoost(phase, { final_mocks: 30, tmua_primary: 10, sat_priority: -28 });
    if (scarce === 0) base -= 18; // preserve; nothing fresh to spend
    if (gap.gap !== null && gap.gap > 4) base += 6; // far from target -> benchmark matters more
    if (base > 20) {
      const scarcityNote =
        scarce > 0
          ? `You have ${scarce} unseen official sitting${scarce === 1 ? "" : "s"} in reserve.`
          : `No unseen official papers remain — re-sit a reviewed one under timed conditions.`;
      candidates.push({
        kind: "fresh_benchmark",
        title:
          phase === "final_mocks"
            ? "Do a full timed sitting this week — you're in the mock-heavy window."
            : "Do your next full timed sitting this weekend.",
        why: `Your last full mock was ${daysSince} day${daysSince === 1 ? "" : "s"} ago. ${scarcityNote} A fresh timed benchmark is now worth more than more untimed drilling.`,
        href: "/practice",
        cta: "Start a sitting",
        priority: base,
      });
    }
  }

  // 5 — Finish course before burning scarce papers.
  if (course.total > 0 && course.completed < course.total && course.currentModule) {
    const errorsClause =
      weakness.ranked.length > 0
        ? ` Your recent sittings show repeated ${TOPIC_LABEL[weakness.ranked[0].topic].toLowerCase()} errors that the unfinished material covers.`
        : "";
    const scarcityClause =
      official.untouchedFull >= 3
        ? ` You still have ${official.untouchedFull} unseen official sittings to protect.`
        : "";
    candidates.push({
      kind: "course_module",
      title: `Finish ${course.currentModule.group} · ${course.currentModule.title} before your next official paper.`,
      why: `You're ${course.pct}% through the course.${scarcityClause}${errorsClause} Building the method first means the next paper measures real improvement, not gaps the course would have closed.`,
      href: "/course",
      cta: "Open course",
      priority:
        40 +
        (weakness.ranked.length > 0 ? 14 : 0) +
        (official.untouchedFull >= 3 ? 8 : 0) +
        phaseBoost(phase, { sat_priority: 12, tmua_primary: 14, final_mocks: -18 }),
    });
  }

  // 6 — Clear the redo backlog.
  if (redos.length >= 5) {
    candidates.push({
      kind: "redo_backlog",
      title: `Rework your ${redos.length} outstanding redo questions.`,
      why: `You flagged ${redos.length} questions for redo that you haven't reworked. These are known weak spots you've already identified — closing them is high-certainty improvement.`,
      href: "/analytics",
      cta: "See redo list",
      priority: 34 + Math.min(24, redos.length * 2) + phaseBoost(phase, { sat_priority: 6 }),
    });
  }

  candidates.sort((a, b) => b.priority - a.priority);
  const primary = candidates[0] ?? null;
  const secondary =
    candidates.find((c) => primary && c.kind !== primary.kind && c.priority >= 40) ?? null;

  return { primary, secondary, phase, daysToExam };
}

function shortLabel(s: Sitting): string {
  return s.sourceLabel || "last";
}
