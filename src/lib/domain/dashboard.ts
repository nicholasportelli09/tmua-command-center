import type { AppData, ConversionProfile, Sitting } from "./types";
import {
  bestScore,
  computeRolling,
  consistency,
  courseProgress,
  daysSinceLastSitting,
  fullTmuaSittings,
  improvementTrend,
  officialCompletion,
  paperSplit,
  targetGap,
} from "./calculations";
import { resolveScaled, scaledTrend } from "./conversion";
import { buildRecommendations } from "./recommendation";
import type { TrajectoryPoint } from "@/components/charts/trajectory-chart";

export function toTrajectoryPoints(
  sittings: Sitting[],
  profiles: ConversionProfile[],
): TrajectoryPoint[] {
  return fullTmuaSittings(sittings).map((s) => ({
    date: s.date,
    label: s.sourceLabel,
    total: s.total,
    p1: s.paper1,
    p2: s.paper2,
    scaled: resolveScaled(s, profiles).value,
  }));
}

export function buildDashboard(data: AppData, todayISO: string) {
  const { sittings, sources, course, conversionProfiles, attempts, exam, settings } = data;
  const fulls = fullTmuaSittings(sittings);
  const rolling = computeRolling(sittings, settings.rollingWindow);
  return {
    fullsCount: fulls.length,
    rolling,
    best: bestScore(sittings),
    gap: targetGap(rolling.value, exam.rawTarget),
    split: paperSplit(sittings, settings.rollingWindow),
    scaled: scaledTrend(sittings, conversionProfiles),
    trend: improvementTrend(sittings),
    consistency: consistency(sittings),
    official: officialCompletion(sources),
    course: courseProgress(course),
    daysSince: daysSinceLastSitting(sittings, todayISO),
    reco: buildRecommendations({ sittings, sources, modules: course, attempts, exam, settings, todayISO }),
    trajectory: toTrajectoryPoints(sittings, conversionProfiles),
  };
}

export type Dashboard = ReturnType<typeof buildDashboard>;
