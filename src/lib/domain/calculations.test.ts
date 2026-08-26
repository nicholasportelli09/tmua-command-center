import { describe, it, expect } from "vitest";
import {
  bestScore,
  computeRolling,
  computeTotal,
  consistency,
  courseProgress,
  daysSinceLastSitting,
  fullTmuaSittings,
  improvementTrend,
  officialCompletion,
  paperSplit,
  targetGap,
} from "./calculations";
import { moduleItem, sit, source } from "./_testkit";

describe("computeTotal", () => {
  it("sums both papers", () => {
    expect(computeTotal(16, 15)).toBe(31);
  });
  it("returns null when a paper is missing", () => {
    expect(computeTotal(16, null)).toBeNull();
    expect(computeTotal(null, 15)).toBeNull();
  });
});

describe("fullTmuaSittings", () => {
  it("excludes MAT and incomplete sittings and sorts chronologically", () => {
    const list = [
      sit({ date: "2026-09-10", paper1: 15, paper2: 15 }),
      sit({ category: "mat", paper1: 50, paper2: null, isComplete: false }),
      sit({ date: "2026-09-01", paper1: 14, paper2: 14 }),
      sit({ paper1: 12, paper2: null, isComplete: false }),
    ];
    const fulls = fullTmuaSittings(list);
    expect(fulls).toHaveLength(2);
    expect(fulls[0].date).toBe("2026-09-01");
    expect(fulls[1].date).toBe("2026-09-10");
  });
});

describe("computeRolling", () => {
  it("returns null with no data", () => {
    const r = computeRolling([], 3);
    expect(r.value).toBeNull();
    expect(r.basedOn).toBe(0);
    expect(r.change).toBeNull();
  });

  it("averages the latest window", () => {
    const list = [
      sit({ date: "2026-09-01", paper1: 15, paper2: 15 }), // 30
      sit({ date: "2026-09-05", paper1: 16, paper2: 15 }), // 31
      sit({ date: "2026-09-10", paper1: 17, paper2: 16 }), // 33
    ];
    const r = computeRolling(list, 3);
    expect(r.value).toBeCloseTo((30 + 31 + 33) / 3, 5);
    expect(r.basedOn).toBe(3);
    expect(r.change).toBeNull(); // no prior window of size 3
  });

  it("compares equal, non-overlapping windows for change", () => {
    const totals = [28, 30, 29, 31, 33, 34]; // 6 sittings
    const list = totals.map((t, i) =>
      sit({ date: `2026-09-0${i + 1}`, paper1: 10, paper2: t - 10 }),
    );
    const r = computeRolling(list, 3);
    const current = (31 + 33 + 34) / 3;
    const prior = (28 + 30 + 29) / 3;
    expect(r.value).toBeCloseTo(current, 5);
    expect(r.previous).toBeCloseTo(prior, 5);
    expect(r.change).toBeCloseTo(current - prior, 5);
  });

  it("averages everything in all-mode", () => {
    const list = [sit({ paper1: 10, paper2: 10 }), sit({ paper1: 20, paper2: 20 })];
    const r = computeRolling(list, 0);
    expect(r.value).toBeCloseTo(30, 5);
    expect(r.change).toBeNull();
  });
});

describe("targetGap", () => {
  it("reports points below target", () => {
    const g = targetGap(31.5, 34);
    expect(g.gap).toBeCloseTo(2.5, 5);
    expect(g.exceeded).toBe(false);
  });
  it("flags target exceeded and never shows a negative gap as a shortfall", () => {
    const g = targetGap(36, 34);
    expect(g.exceeded).toBe(true);
    expect(g.gap).toBeLessThanOrEqual(0);
  });
  it("handles no data", () => {
    expect(targetGap(null, 34).gap).toBeNull();
  });
});

describe("bestScore", () => {
  it("returns the max full-sitting total", () => {
    const list = [sit({ paper1: 15, paper2: 15 }), sit({ paper1: 17, paper2: 16 })];
    expect(bestScore(list)).toBe(33);
  });
  it("returns null with no full sittings", () => {
    expect(bestScore([sit({ paper1: 12, paper2: null, isComplete: false })])).toBeNull();
  });
});

describe("paperSplit", () => {
  it("averages each paper only over sittings where it was completed", () => {
    const list = [
      sit({ paper1: 18, paper2: 12 }),
      sit({ paper1: 16, paper2: 14 }),
      sit({ paper1: 20, paper2: null, isComplete: false }), // P1 only
    ];
    const s = paperSplit(list, 3);
    expect(s.p1).toBeCloseTo((18 + 16 + 20) / 3, 5);
    expect(s.p2).toBeCloseTo((12 + 14) / 2, 5);
    expect(s.gap).toBeCloseTo(s.p1! - s.p2!, 5);
    expect(s.p1Count).toBe(3);
    expect(s.p2Count).toBe(2);
  });
});

describe("daysSinceLastSitting", () => {
  it("counts days from the most recent full sitting", () => {
    const list = [sit({ date: "2026-09-01" }), sit({ date: "2026-09-10" })];
    expect(daysSinceLastSitting(list, "2026-09-18")).toBe(8);
  });
  it("is null with no sittings", () => {
    expect(daysSinceLastSitting([], "2026-09-18")).toBeNull();
  });
});

describe("improvementTrend", () => {
  it("detects an improving trend", () => {
    const list = [26, 28, 30, 32, 34].map((t, i) =>
      sit({ date: `2026-09-0${i + 1}`, paper1: 10, paper2: t - 10 }),
    );
    expect(improvementTrend(list).label).toBe("improving");
  });
  it("reports insufficient with under three sittings", () => {
    expect(improvementTrend([sit(), sit()]).label).toBe("insufficient");
  });
});

describe("consistency", () => {
  it("computes spread for enough data", () => {
    const list = [30, 31, 29, 32, 30].map((t, i) =>
      sit({ date: `2026-09-0${i + 1}`, paper1: 10, paper2: t - 10 }),
    );
    const c = consistency(list, 5);
    expect(c.count).toBe(5);
    expect(c.stdev).not.toBeNull();
    expect(c.range).toBe(3);
  });
  it("is null-ish with too little data", () => {
    expect(consistency([sit(), sit()], 5).stdev).toBeNull();
  });
});

describe("officialCompletion", () => {
  it("counts completed, reviewed and untouched full sittings", () => {
    const sources = [
      source({ paper1Status: "reviewed", paper2Status: "reviewed" }),
      source({ paper1Status: "completed", paper2Status: "untouched" }),
      source({ paper1Status: "untouched", paper2Status: "untouched" }),
      source({ paper1Status: "untouched", paper2Status: "untouched" }),
    ];
    const c = officialCompletion(sources);
    expect(c.total).toBe(4);
    expect(c.completed).toBe(1);
    expect(c.reviewed).toBe(1);
    expect(c.untouchedFull).toBe(2);
    expect(c.papersDone).toBe(3);
  });
});

describe("courseProgress", () => {
  it("computes percentage and the current module", () => {
    const mods = [
      moduleItem({ group: "Week 1", status: "completed", order: 0 }),
      moduleItem({ group: "Week 1", status: "in_progress", order: 1 }),
      moduleItem({ group: "Week 2", status: "not_started", order: 2 }),
      moduleItem({ group: "Week 2", status: "not_started", order: 3 }),
    ];
    const p = courseProgress(mods);
    expect(p.total).toBe(4);
    expect(p.completed).toBe(1);
    expect(p.pct).toBe(25);
    expect(p.currentModule?.status).toBe("in_progress");
    expect(p.groups).toHaveLength(2);
  });
  it("is empty-safe", () => {
    const p = courseProgress([]);
    expect(p.pct).toBe(0);
    expect(p.currentModule).toBeNull();
  });
});
