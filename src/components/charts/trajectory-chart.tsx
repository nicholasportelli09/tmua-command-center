"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { shortDate } from "@/lib/utils/time";
import { fmt } from "@/lib/utils/format";

export interface TrajectoryPoint {
  date: string;
  label: string;
  total: number | null;
  p1: number | null;
  p2: number | null;
  scaled: number | null;
}

export type Series = "total" | "p1" | "p2" | "scaled";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const SERIES_META: Record<Series, { label: string; max: number; accessor: (p: TrajectoryPoint) => number | null }> = {
  total: { label: "Total /40", max: 40, accessor: (p) => p.total },
  p1: { label: "Paper 1 /20", max: 20, accessor: (p) => p.p1 },
  p2: { label: "Paper 2 /20", max: 20, accessor: (p) => p.p2 },
  scaled: { label: "Est. scaled", max: 9, accessor: (p) => p.scaled },
};

export function TrajectoryChart({
  points,
  series,
  target,
  rollingWindow = 3,
  height = 264,
}: {
  points: TrajectoryPoint[];
  series: Series;
  target: number;
  rollingWindow?: number;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const meta = SERIES_META[series];
  const pad = { l: 30, r: 16, t: 18, b: 26 };
  const w = Math.max(width, 320);
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const values = useMemo(
    () => points.map((p) => meta.accessor(p)),
    [points, meta],
  );

  // Y domain — anchored per series, padded a little around the data.
  const domain = useMemo(() => {
    const nums = values.filter((v): v is number => v !== null);
    if (series === "scaled") {
      const lo = Math.min(1, ...(nums.length ? nums : [1]));
      const hi = Math.max(9, ...(nums.length ? nums : [9]));
      return { lo: Math.floor(lo), hi: Math.ceil(hi) };
    }
    return { lo: 0, hi: meta.max };
  }, [values, series, meta.max]);

  const x = (i: number) =>
    points.length <= 1 ? pad.l + innerW / 2 : pad.l + (i / (points.length - 1)) * innerW;
  const y = (v: number) =>
    pad.t + innerH - ((v - domain.lo) / (domain.hi - domain.lo)) * innerH;

  // Rolling average per index (total only).
  const rolling = useMemo(() => {
    if (series !== "total") return [];
    return values.map((_, i) => {
      const slice = values.slice(Math.max(0, i - rollingWindow + 1), i + 1).filter((v): v is number => v !== null);
      return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
    });
  }, [values, series, rollingWindow]);

  const defined = values
    .map((v, i) => ({ v, i }))
    .filter((d): d is { v: number; i: number } => d.v !== null);

  const linePath = defined.map((d, k) => `${k === 0 ? "M" : "L"} ${x(d.i)} ${y(d.v)}`).join(" ");
  const areaPath =
    defined.length > 1
      ? `${linePath} L ${x(defined[defined.length - 1].i)} ${pad.t + innerH} L ${x(defined[0].i)} ${pad.t + innerH} Z`
      : "";
  const rollingPath = rolling
    .map((v, i) => ({ v, i }))
    .filter((d): d is { v: number; i: number } => d.v !== null)
    .map((d, k) => `${k === 0 ? "M" : "L"} ${x(d.i)} ${y(d.v)}`)
    .join(" ");

  const showTarget = series === "total" && target >= domain.lo && target <= domain.hi;
  const gridVals =
    series === "scaled"
      ? [domain.lo, (domain.lo + domain.hi) / 2, domain.hi]
      : series === "total"
        ? [0, 10, 20, 30, 40]
        : [0, 5, 10, 15, 20];

  function onMove(e: React.MouseEvent) {
    if (points.length === 0) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(x(i) - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    setHover(nearest);
  }

  const hoverPoint = hover !== null ? points[hover] : null;
  const hoverVal = hover !== null ? values[hover] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={w} height={height} className="overflow-visible" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`area-${series}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridVals.map((gv) => (
            <g key={gv}>
              <line x1={pad.l} x2={w - pad.r} y1={y(gv)} y2={y(gv)} stroke="var(--color-line)" strokeWidth="1" />
              <text x={pad.l - 7} y={y(gv) + 3} textAnchor="end" className="fill-faint" style={{ fontSize: 10 }}>
                {gv}
              </text>
            </g>
          ))}

          {showTarget && (
            <g>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={y(target)}
                y2={y(target)}
                stroke="var(--color-pos)"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.7"
              />
              <text x={w - pad.r} y={y(target) - 5} textAnchor="end" className="fill-pos" style={{ fontSize: 10, fontWeight: 500 }}>
                Target {target}
              </text>
            </g>
          )}

          {areaPath && <path d={areaPath} fill={`url(#area-${series})`} />}
          {rollingPath && (
            <path d={rollingPath} fill="none" stroke="var(--color-muted)" strokeWidth="1.25" strokeDasharray="1 3" opacity="0.65" />
          )}
          {linePath && <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

          {defined.map((d) => (
            <circle
              key={d.i}
              cx={x(d.i)}
              cy={y(d.v)}
              r={hover === d.i ? 4.5 : 3}
              fill="var(--color-base)"
              stroke="var(--color-accent)"
              strokeWidth="2"
            />
          ))}

          {hover !== null && hoverVal !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} stroke="var(--color-line-strong)" strokeWidth="1" />
          )}

          {points.map((p, i) =>
            i % Math.ceil(points.length / 6 || 1) === 0 || i === points.length - 1 ? (
              <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-faint" style={{ fontSize: 9.5 }}>
                {shortDate(p.date).replace(/ \d{4}$/, "")}
              </text>
            ) : null,
          )}
        </svg>
      )}

      {hoverPoint && hoverVal !== null && (
        <div
          className="pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-md border border-line-strong bg-panel-2/95 px-2.5 py-2 text-[11.5px] shadow-lg backdrop-blur"
          style={{ left: Math.min(Math.max(x(hover!), 70), w - 70), top: 6 }}
        >
          <p className="font-medium text-ink">{hoverPoint.label}</p>
          <p className="text-faint">{shortDate(hoverPoint.date)}</p>
          <div className="mono mt-1 flex gap-2.5 text-[11px] tabular-nums text-muted">
            <span>P1 {fmt(hoverPoint.p1, 0)}</span>
            <span>P2 {fmt(hoverPoint.p2, 0)}</span>
            <span className="text-ink">Tot {fmt(hoverPoint.total, 0)}</span>
            {hoverPoint.scaled !== null && <span className="text-accent">≈{fmt(hoverPoint.scaled, 1)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
