"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import { useLogPaper } from "@/components/layout/app-shell";
import { buildDashboard } from "@/lib/domain/dashboard";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge, Delta } from "@/components/ui/primitives";
import { CountdownCard } from "@/components/overview/countdown-card";
import { NextBestWork } from "@/components/overview/next-best-work";
import { TrajectoryPanel } from "@/components/overview/trajectory-panel";
import { CourseMini, PapersMini } from "@/components/overview/mini-panels";
import { ResourceLinks } from "@/components/overview/resource-links";
import { fmt } from "@/lib/utils/format";
import { shortDate } from "@/lib/utils/time";

const PHASE: Record<string, { label: string; tone: "warn" | "accent" | "pos" }> = {
  sat_priority: { label: "SAT priority", tone: "warn" },
  tmua_primary: { label: "TMUA primary", tone: "accent" },
  final_mocks: { label: "Final mocks", tone: "pos" },
};

export default function OverviewPage() {
  const { data, todayISO } = useData();
  const { open } = useLogPaper();
  const dash = useMemo(() => (data ? buildDashboard(data, todayISO) : null), [data, todayISO]);

  if (!data || !dash) return null;
  const { exam, settings } = data;
  const phase = PHASE[dash.reco.phase];

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Context strip */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-muted">{shortDate(todayISO)}</span>
          <span className="text-faint">·</span>
          <Badge tone={phase.tone}>{phase.label}</Badge>
        </div>
        <button
          onClick={() => open()}
          className="pressable hidden items-center gap-1.5 rounded-md border border-line-strong bg-panel-2 px-3 py-1.5 text-[12.5px] font-medium text-muted hover:text-ink sm:inline-flex"
        >
          <Plus className="h-3.5 w-3.5" /> Log paper
        </button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CountdownCard exam={exam} />

        <StatTile
          label="Current level"
          value={dash.rolling.value !== null ? fmt(dash.rolling.value, 1) : "—"}
          unit={dash.rolling.value !== null ? "/40" : undefined}
          accent={
            dash.rolling.value !== null ? (
              <Badge tone="faint">last {dash.rolling.basedOn}</Badge>
            ) : undefined
          }
          sub={
            dash.rolling.value === null ? (
              <span className="text-faint">No sittings yet</span>
            ) : dash.rolling.change !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <Delta value={dash.rolling.change} />
                <span className="text-faint">vs prev {dash.rolling.basedOn}</span>
              </span>
            ) : (
              <span className="text-faint">Rolling average</span>
            )
          }
        />

        <StatTile
          label="Target"
          value={exam.rawTarget}
          unit="/40"
          accent={dash.best !== null ? <Badge tone="pos">Best {dash.best}</Badge> : undefined}
          sub={
            dash.gap.current === null ? (
              <span className="text-faint">Set your baseline</span>
            ) : dash.gap.exceeded ? (
              <Badge tone="pos">Target exceeded</Badge>
            ) : (
              <span className="text-muted">
                <span className="mono text-ink">{fmt(dash.gap.gap, 1)}</span> to target
              </span>
            )
          }
        />

        <StatTile
          label="Est. scaled"
          value={dash.scaled.latest !== null ? fmt(dash.scaled.latest, 1) : "—"}
          accent={<Badge tone="accent">Estimated</Badge>}
          sub={
            dash.scaled.latest === null ? (
              <span className="text-faint">Add estimate or table</span>
            ) : dash.scaled.change !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <Delta value={dash.scaled.change} />
                <span className="text-faint">vs last</span>
              </span>
            ) : (
              <span className="text-faint capitalize">{dash.scaled.source ?? ""}</span>
            )
          }
        />
      </div>

      <NextBestWork reco={dash.reco} />

      <TrajectoryPanel points={dash.trajectory} target={exam.rawTarget} rollingWindow={settings.rollingWindow} />

      <div className="grid gap-4 md:grid-cols-2">
        <PapersMini official={dash.official} />
        <CourseMini course={dash.course} />
      </div>

      <ResourceLinks />
    </div>
  );
}
