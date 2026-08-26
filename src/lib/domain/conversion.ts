import type { ConversionProfile, Sitting } from "./types";
import { fullTmuaSittings } from "./calculations";

/**
 * Interpolate a scaled score from a raw /40 total using a conversion profile.
 * Clamps to the profile's endpoints — never extrapolates beyond provided data.
 * Returns null when the profile has no points.
 */
export function interpolateScaled(raw: number, profile: ConversionProfile): number | null {
  const pts = [...profile.points].sort((a, b) => a.raw - b.raw);
  if (pts.length === 0) return null;
  if (raw <= pts[0].raw) return pts[0].scaled;
  if (raw >= pts[pts.length - 1].raw) return pts[pts.length - 1].scaled;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (raw >= a.raw && raw <= b.raw) {
      if (b.raw === a.raw) return a.scaled;
      const t = (raw - a.raw) / (b.raw - a.raw);
      return a.scaled + t * (b.scaled - a.scaled);
    }
  }
  return null;
}

/**
 * Choose the conversion profile that legitimately applies to a sitting.
 * Only matches by explicit profile id or by the source year — never guesses.
 */
export function profileForSitting(
  sitting: Sitting,
  profiles: ConversionProfile[],
): ConversionProfile | null {
  if (sitting.conversionProfileId) {
    const byId = profiles.find((p) => p.id === sitting.conversionProfileId);
    if (byId) return byId;
  }
  return null;
}

export interface ResolvedScaled {
  value: number | null;
  source: "manual" | "derived" | null;
  profileName: string | null;
}

/**
 * The scaled score to display for a sitting.
 * Prefers a manually entered value; otherwise derives from a linked profile.
 * The result always carries its provenance so the UI can label it "Estimated".
 */
export function resolveScaled(
  sitting: Sitting,
  profiles: ConversionProfile[],
): ResolvedScaled {
  if (sitting.scaledSource === "manual" && sitting.estimatedScaled !== null) {
    return { value: sitting.estimatedScaled, source: "manual", profileName: null };
  }
  const profile = profileForSitting(sitting, profiles);
  if (profile && sitting.total !== null) {
    const v = interpolateScaled(sitting.total, profile);
    if (v !== null) return { value: v, source: "derived", profileName: profile.name };
  }
  if (sitting.estimatedScaled !== null) {
    return { value: sitting.estimatedScaled, source: sitting.scaledSource ?? "manual", profileName: null };
  }
  return { value: null, source: null, profileName: null };
}

export interface ScaledTrend {
  latest: number | null;
  previous: number | null;
  change: number | null;
  source: "manual" | "derived" | null;
}

/** Latest resolvable scaled score across full sittings, and its change vs the prior one. */
export function scaledTrend(sittings: Sitting[], profiles: ConversionProfile[]): ScaledTrend {
  const fulls = fullTmuaSittings(sittings);
  const resolved = fulls
    .map((s) => resolveScaled(s, profiles))
    .filter((r) => r.value !== null);
  if (resolved.length === 0) return { latest: null, previous: null, change: null, source: null };
  const latest = resolved[resolved.length - 1];
  const previous = resolved.length >= 2 ? resolved[resolved.length - 2] : null;
  const change = previous && previous.value !== null && latest.value !== null
    ? latest.value - previous.value
    : null;
  return {
    latest: latest.value,
    previous: previous?.value ?? null,
    change,
    source: latest.source,
  };
}
