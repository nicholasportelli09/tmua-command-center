import { describe, it, expect } from "vitest";
import { buildRecommendations, determinePhase } from "./recommendation";
import { DEFAULT_EXAM, DEFAULT_SETTINGS } from "./constants";
import { attempt, moduleItem, sit, source } from "./_testkit";
import type { RecoInput } from "./recommendation";

function base(overrides: Partial<RecoInput> = {}): RecoInput {
  return {
    sittings: [],
    sources: [source(), source(), source(), source(), source()],
    modules: [],
    attempts: [],
    exam: DEFAULT_EXAM,
    settings: DEFAULT_SETTINGS,
    todayISO: "2026-09-20",
    ...overrides,
  };
}

describe("determinePhase", () => {
  it("is SAT priority before 12 Sep", () => {
    expect(determinePhase(DEFAULT_EXAM, "2026-08-25", "auto")).toBe("sat_priority");
  });
  it("is TMUA primary in the middle window", () => {
    expect(determinePhase(DEFAULT_EXAM, "2026-09-20", "auto")).toBe("tmua_primary");
  });
  it("is final mocks inside the last two weeks", () => {
    expect(determinePhase(DEFAULT_EXAM, "2026-10-10", "auto")).toBe("final_mocks");
  });
  it("respects a manual override", () => {
    expect(determinePhase(DEFAULT_EXAM, "2026-08-25", "final_mocks")).toBe("final_mocks");
  });
});

describe("buildRecommendations", () => {
  it("asks for a first diagnostic when there is no benchmark", () => {
    const r = buildRecommendations(base({ modules: [moduleItem({ status: "in_progress" })] }));
    expect(r.primary?.kind).toBe("first_diagnostic");
  });

  it("recommends targeted drilling for a concentrated weakness", () => {
    const s = sit({ id: "s1", date: "2026-09-19", paper1: 17, paper2: 10 });
    const attempts = [
      attempt({ sittingId: "s1", questionNumber: 1, topic: "necessary_sufficient", isCorrect: false, errorType: "reasoning" }),
      attempt({ sittingId: "s1", questionNumber: 2, topic: "necessary_sufficient", isCorrect: false, errorType: "reasoning" }),
      attempt({ sittingId: "s1", questionNumber: 3, topic: "necessary_sufficient", isCorrect: false, errorType: "reasoning" }),
      attempt({ sittingId: "s1", questionNumber: 4, topic: "algebra", isCorrect: true }),
    ];
    const r = buildRecommendations(base({ sittings: [s], attempts, todayISO: "2026-09-20" }));
    expect(r.primary?.kind).toBe("topic_drill");
    expect(r.primary?.why).toContain("3");
    expect(r.primary?.title.toLowerCase()).toContain("necessary");
  });

  it("recommends a fresh benchmark when the last mock is stale", () => {
    const s = sit({ id: "s1", date: "2026-09-10", paper1: 15, paper2: 15 });
    const r = buildRecommendations(base({ sittings: [s], todayISO: "2026-09-25" }));
    expect(r.primary?.kind).toBe("fresh_benchmark");
    expect(r.primary?.why).toContain("15 days");
  });

  it("prefers course work over burning papers in the SAT-priority phase", () => {
    const s = sit({ id: "s1", date: "2026-08-20", paper1: 15, paper2: 15 });
    const modules = [
      moduleItem({ status: "completed", order: 0 }),
      moduleItem({ status: "in_progress", order: 1 }),
      moduleItem({ status: "not_started", order: 2 }),
    ];
    const r = buildRecommendations(
      base({ sittings: [s], modules, todayISO: "2026-09-05" }),
    );
    expect(r.primary?.kind).toBe("course_module");
    expect(r.secondary?.kind).toBe("fresh_benchmark");
  });

  it("never returns more than one primary and one secondary", () => {
    const s = sit({ id: "s1", date: "2026-08-20" });
    const r = buildRecommendations(base({ sittings: [s], todayISO: "2026-09-05" }));
    expect(r.primary === null || typeof r.primary.kind === "string").toBe(true);
    expect(r.secondary === null || r.secondary.kind !== r.primary?.kind).toBe(true);
  });
});
