"use client";

import { AlertTriangle, Check, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ConsistencyResult, PaperSplit, TrendResult } from "@/lib/domain/calculations";
import type { ErrorComposition, PaceResult, TopicWeaknessResult } from "@/lib/domain/analytics";
import type { QuestionAttempt, Sitting } from "@/lib/domain/types";
import { ERROR_LABEL, TOPIC_LABEL } from "@/lib/domain/taxonomy";
import { Badge, Eyebrow, EmptyState, Panel } from "@/components/ui/primitives";
import { ProgressBar } from "@/components/ui/progress";
import { fmt, signed } from "@/lib/utils/format";
import { formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function PanelShell({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Panel className="flex flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <Eyebrow>{title}</Eyebrow>
        {hint && <span className="text-[11px] text-faint">{hint}</span>}
      </div>
      <div className="mt-3 flex-1">{children}</div>
    </Panel>
  );
}

export function PaperSplitPanel({ split }: { split: PaperSplit }) {
  const enough = split.p1 !== null && split.p2 !== null;
  return (
    <PanelShell title="Paper split" hint={enough ? `P1×${split.p1Count} · P2×${split.p2Count}` : undefined}>
      {!enough ? (
        <p className="text-[12.5px] text-muted">Log a full sitting to compare Paper 1 and Paper 2.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {([["Paper 1", split.p1!, split.p1Count], ["Paper 2", split.p2!, split.p2Count]] as const).map(
            ([label, val]) => (
              <div key={label}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[12.5px] text-muted">{label}</span>
                  <span className="mono text-[15px] text-ink">
                    {fmt(val, 1)}<span className="text-[11px] text-faint">/20</span>
                  </span>
                </div>
                <ProgressBar value={val} max={20} tone={label === "Paper 2" && split.gap! > 0 ? "warn" : "accent"} />
              </div>
            ),
          )}
          <div className="mt-1 rounded-md border border-line bg-base-2/50 px-3 py-2 text-[12.5px]">
            {Math.abs(split.gap!) < 0.5 ? (
              <span className="text-muted">Papers are balanced — no clear bottleneck.</span>
            ) : (
              <span className="text-muted">
                <span className="text-ink">{split.gap! > 0 ? "Paper 2" : "Paper 1"}</span> is your bottleneck by{" "}
                <span className="mono text-ink">{fmt(Math.abs(split.gap!), 1)}</span> pts.
              </span>
            )}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

export function TrendPanel({ trend, change }: { trend: TrendResult; change: number | null }) {
  const map = {
    improving: { icon: TrendingUp, tone: "text-pos", label: "Improving" },
    declining: { icon: TrendingDown, tone: "text-neg", label: "Declining" },
    flat: { icon: Minus, tone: "text-muted", label: "Flat" },
    insufficient: { icon: Minus, tone: "text-faint", label: "Not enough data" },
  } as const;
  const m = map[trend.label];
  const Icon = m.icon;
  return (
    <PanelShell title="Improvement trend" hint={trend.sampled > 0 ? `last ${trend.sampled}` : undefined}>
      {trend.label === "insufficient" ? (
        <p className="text-[12.5px] text-muted">Log at least three full sittings to see a trend.</p>
      ) : (
        <div>
          <div className={cn("flex items-center gap-2", m.tone)}>
            <Icon className="h-5 w-5" />
            <span className="text-[17px] font-semibold">{m.label}</span>
          </div>
          <p className="mt-2 text-[12.5px] text-muted">
            {trend.slopePerSitting !== null && (
              <>
                <span className="mono text-ink">{signed(trend.slopePerSitting, 2)}</span> pts per sitting
              </>
            )}
            {change !== null && (
              <>
                {" · "}rolling <span className="mono text-ink">{signed(change, 1)}</span> vs prior
              </>
            )}
          </p>
        </div>
      )}
    </PanelShell>
  );
}

export function ConsistencyPanel({ consistency }: { consistency: ConsistencyResult }) {
  return (
    <PanelShell title="Consistency" hint={consistency.count > 0 ? `last ${consistency.count}` : undefined}>
      {consistency.stdev === null ? (
        <p className="text-[12.5px] text-muted">Needs at least three recent sittings.</p>
      ) : (
        <div>
          <div className="flex items-baseline gap-1">
            <span className="mono text-[24px] font-medium text-ink">±{fmt(consistency.stdev, 1)}</span>
            <span className="text-[12px] text-faint">pts std. dev</span>
          </div>
          <p className="mt-2 text-[12.5px] text-muted">
            Range of <span className="mono text-ink">{fmt(consistency.range, 0)}</span> pts across recent sittings.
            {consistency.stdev < 1.5
              ? " Very steady."
              : consistency.stdev > 3
                ? " Swingy — variance is costing predictability."
                : " Reasonably steady."}
          </p>
        </div>
      )}
    </PanelShell>
  );
}

export function TopicWeaknessPanel({ weakness }: { weakness: TopicWeaknessResult }) {
  const maxErr = weakness.ranked.length ? Math.max(...weakness.ranked.map((r) => r.errors)) : 1;
  return (
    <PanelShell title="Topic weakness" hint={weakness.sittingsUsed > 0 ? `last ${weakness.sittingsUsed} sittings` : undefined}>
      {weakness.ranked.length === 0 ? (
        <p className="text-[12.5px] text-muted">
          Not enough tagged errors yet. Review your sittings and tag topics to surface weaknesses.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {weakness.top && (
            <div className="rounded-md border border-[#463913] bg-warn-soft px-3 py-2">
              <p className="text-[10.5px] font-medium uppercase tracking-wide text-warn">Highest-value weakness</p>
              <p className="mt-0.5 text-[13.5px] font-medium text-ink">{TOPIC_LABEL[weakness.top.topic]}</p>
              <p className="text-[11.5px] text-muted">
                {weakness.top.errors} errors across last {weakness.sittingsUsed} sittings
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {weakness.ranked.slice(0, 6).map((r) => (
              <div key={r.topic} className="flex items-center gap-2.5">
                <span className="w-28 shrink-0 truncate text-[12px] text-muted">{TOPIC_LABEL[r.topic]}</span>
                <div className="flex-1">
                  <ProgressBar value={r.errors} max={maxErr} tone="warn" />
                </div>
                <span className="mono w-6 text-right text-[12px] text-ink">{r.errors}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

const ERROR_COLORS: Record<string, string> = {
  reasoning: "bg-accent",
  careless: "bg-warn",
  knowledge: "bg-neg",
  timing: "bg-[#a970ff]",
  misread: "bg-[#40c4c4]",
};

export function ErrorCompositionPanel({ comp }: { comp: ErrorComposition }) {
  return (
    <PanelShell title="Error composition" hint={comp.total > 0 ? `${comp.total} tagged · last ${comp.sittingsUsed}` : undefined}>
      {comp.total === 0 ? (
        <p className="text-[12.5px] text-muted">
          Tag error types during review to see whether you lose points to reasoning, carelessness, timing or misreads.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-raised">
            {comp.items.map((it) => (
              <div
                key={it.type}
                className={cn("h-full", ERROR_COLORS[it.type])}
                style={{ width: `${it.share * 100}%` }}
                title={`${ERROR_LABEL[it.type]}: ${it.count}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {comp.items.map((it) => (
              <div key={it.type} className="flex items-center justify-between text-[12px]">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <span className={cn("h-2 w-2 rounded-full", ERROR_COLORS[it.type])} />
                  {ERROR_LABEL[it.type]}
                </span>
                <span className="mono text-ink">{it.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

export function PacePanel({ pace }: { pace: PaceResult }) {
  if (!pace.hasData) {
    return (
      <PanelShell title="Pace">
        <p className="text-[12.5px] text-muted">
          No per-question timing yet. Practice with the timer on to see whether pace is costing points.
        </p>
      </PanelShell>
    );
  }
  return (
    <PanelShell title="Pace">
      <div className="flex items-center gap-6">
        <div>
          <p className="text-[11.5px] text-faint">Correct</p>
          <p className="mono text-[18px] text-ink">{formatDuration(pace.avgCorrectSec)}</p>
        </div>
        <div>
          <p className="text-[11.5px] text-faint">Wrong</p>
          <p className="mono text-[18px] text-ink">{formatDuration(pace.avgWrongSec)}</p>
        </div>
      </div>
      <div className={cn("mt-3 inline-flex items-center gap-1.5 text-[12.5px]", pace.costsPoints ? "text-warn" : "text-pos")}>
        {pace.costsPoints ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        {pace.costsPoints ? "Timing is plausibly costing points." : "Pace looks controlled."}
      </div>
    </PanelShell>
  );
}

export function RedoBacklogPanel({
  redos,
  sittings,
  onResolve,
}: {
  redos: QuestionAttempt[];
  sittings: Sitting[];
  onResolve: (id: string) => void;
}) {
  const labelFor = (id: string) => sittings.find((s) => s.id === id)?.sourceLabel ?? "Sitting";
  return (
    <PanelShell title="Redo backlog" hint={redos.length > 0 ? `${redos.length} open` : undefined}>
      {redos.length === 0 ? (
        <EmptyState
          icon={Check}
          title="No outstanding redos"
          description="Questions you flag for redo during review appear here until you rework them."
          className="py-6"
        />
      ) : (
        <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {redos.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-line bg-base-2/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-ink">
                  {labelFor(a.sittingId)} · P{a.paper} Q{a.questionNumber}
                </p>
                <p className="text-[11px] text-faint">
                  {a.topic ? TOPIC_LABEL[a.topic] : "Untagged"}
                  {a.errorType ? ` · ${ERROR_LABEL[a.errorType]}` : ""}
                </p>
              </div>
              <button
                onClick={() => onResolve(a.id)}
                className="pressable inline-flex shrink-0 items-center gap-1 rounded-md border border-[#16402f] bg-pos-soft px-2 py-1 text-[11.5px] font-medium text-pos"
              >
                <Check className="h-3.5 w-3.5" /> Redone
              </button>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
