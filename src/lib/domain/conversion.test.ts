import { describe, it, expect } from "vitest";
import { interpolateScaled, resolveScaled, scaledTrend } from "./conversion";
import type { ConversionProfile } from "./types";
import { sit } from "./_testkit";

const profile: ConversionProfile = {
  id: "p1",
  name: "2021",
  year: 2021,
  source: "test",
  note: "",
  points: [
    { raw: 20, scaled: 4.0 },
    { raw: 30, scaled: 6.0 },
    { raw: 40, scaled: 9.0 },
  ],
};

describe("interpolateScaled", () => {
  it("interpolates linearly between points", () => {
    expect(interpolateScaled(25, profile)).toBeCloseTo(5.0, 5);
    expect(interpolateScaled(35, profile)).toBeCloseTo(7.5, 5);
  });
  it("clamps to endpoints, never extrapolating", () => {
    expect(interpolateScaled(10, profile)).toBe(4.0);
    expect(interpolateScaled(50, profile)).toBe(9.0);
  });
  it("returns null with no points", () => {
    expect(interpolateScaled(30, { ...profile, points: [] })).toBeNull();
  });
});

describe("resolveScaled", () => {
  it("prefers a manual value and labels it manual", () => {
    const s = sit({ estimatedScaled: 7.4, scaledSource: "manual", paper1: 17, paper2: 16 });
    const r = resolveScaled(s, []);
    expect(r.value).toBe(7.4);
    expect(r.source).toBe("manual");
  });
  it("derives from a linked profile", () => {
    const s = sit({ paper1: 15, paper2: 15, conversionProfileId: "p1" }); // total 30
    const r = resolveScaled(s, [profile]);
    expect(r.value).toBeCloseTo(6.0, 5);
    expect(r.source).toBe("derived");
    expect(r.profileName).toBe("2021");
  });
  it("returns null when nothing applies (never invents a score)", () => {
    const s = sit({ paper1: 15, paper2: 15 });
    expect(resolveScaled(s, []).value).toBeNull();
  });
});

describe("scaledTrend", () => {
  it("computes the change between the two latest resolvable sittings", () => {
    const list = [
      sit({ date: "2026-09-01", estimatedScaled: 7.1, scaledSource: "manual" }),
      sit({ date: "2026-09-08", estimatedScaled: 7.4, scaledSource: "manual" }),
    ];
    const t = scaledTrend(list, []);
    expect(t.latest).toBe(7.4);
    expect(t.previous).toBe(7.1);
    expect(t.change).toBeCloseTo(0.3, 5);
  });
  it("is null with no scaled data", () => {
    expect(scaledTrend([sit()], []).latest).toBeNull();
  });
});
