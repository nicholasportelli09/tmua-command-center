import { describe, it, expect } from "vitest";
import { errorComposition, paceAnalysis, topicWeakness, unresolvedRedos } from "./analytics";
import { attempt, sit } from "./_testkit";

describe("errorComposition", () => {
  it("counts labelled error types across recent sittings", () => {
    const s = sit({ id: "s1" });
    const attempts = [
      attempt({ sittingId: "s1", errorType: "careless" }),
      attempt({ sittingId: "s1", errorType: "careless" }),
      attempt({ sittingId: "s1", errorType: "reasoning" }),
      attempt({ sittingId: "s1", errorType: null }),
    ];
    const c = errorComposition(attempts, [s], 3);
    expect(c.total).toBe(3);
    expect(c.items[0]).toMatchObject({ type: "careless", count: 2 });
  });
});

describe("topicWeakness", () => {
  it("only ranks topics meeting the minimum-error threshold", () => {
    const s = sit({ id: "s1" });
    const attempts = [
      attempt({ sittingId: "s1", topic: "logic", isCorrect: false }),
      attempt({ sittingId: "s1", topic: "logic", isCorrect: false }),
      attempt({ sittingId: "s1", topic: "algebra", isCorrect: false }),
    ];
    const w = topicWeakness(attempts, [s], 3, 2);
    expect(w.ranked).toHaveLength(1);
    expect(w.top?.topic).toBe("logic");
    expect(w.top?.errors).toBe(2);
  });
});

describe("paceAnalysis", () => {
  it("reports no data below the timing sample threshold", () => {
    const s = sit({ id: "s1" });
    const attempts = [attempt({ sittingId: "s1", durationSec: 120 })];
    expect(paceAnalysis(attempts, [s], 3).hasData).toBe(false);
  });

  it("flags pace when wrong answers take much longer", () => {
    const s = sit({ id: "s1" });
    const attempts = [
      ...Array.from({ length: 4 }, (_, i) =>
        attempt({ id: `c${i}`, sittingId: "s1", isCorrect: true, durationSec: 100 }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        attempt({ id: `w${i}`, sittingId: "s1", isCorrect: false, durationSec: 220 }),
      ),
    ];
    const p = paceAnalysis(attempts, [s], 3);
    expect(p.hasData).toBe(true);
    expect(p.costsPoints).toBe(true);
  });
});

describe("unresolvedRedos", () => {
  it("returns only outstanding redo questions", () => {
    const attempts = [
      attempt({ needsRedo: true, redoneSuccessfully: false }),
      attempt({ needsRedo: true, redoneSuccessfully: true }),
      attempt({ needsRedo: false }),
    ];
    expect(unresolvedRedos(attempts)).toHaveLength(1);
  });
});
