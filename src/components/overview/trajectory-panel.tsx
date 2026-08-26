"use client";

import { useState } from "react";
import { LineChart } from "lucide-react";
import { TrajectoryChart, type Series, type TrajectoryPoint } from "@/components/charts/trajectory-chart";
import { Segmented } from "@/components/ui/segmented";
import { Eyebrow, EmptyState, Panel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useLogPaper } from "@/components/layout/app-shell";

export function TrajectoryPanel({
  points,
  target,
  rollingWindow,
}: {
  points: TrajectoryPoint[];
  target: number;
  rollingWindow: number;
}) {
  const [series, setSeries] = useState<Series>("total");
  const { open } = useLogPaper();
  const hasScaled = points.some((p) => p.scaled !== null);

  const options = [
    { value: "total" as const, label: "Total" },
    { value: "p1" as const, label: "P1" },
    { value: "p2" as const, label: "P2" },
    ...(hasScaled ? [{ value: "scaled" as const, label: "Scaled" }] : []),
  ];

  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>Score trajectory</Eyebrow>
        {points.length > 0 && (
          <Segmented size="sm" options={options} value={series} onChange={setSeries} />
        )}
      </div>

      {points.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No sittings logged yet"
          description="Log your first diagnostic to establish a baseline. Your score trajectory builds from here."
          action={
            <Button variant="primary" size="sm" onClick={() => open()}>
              Log diagnostic
            </Button>
          }
          className="py-14"
        />
      ) : (
        <div className="mt-3">
          <TrajectoryChart points={points} series={series} target={target} rollingWindow={rollingWindow} />
          <p className="mt-1 text-[11px] text-faint">
            {points.length} full {points.length === 1 ? "sitting" : "sittings"} · dotted line = {rollingWindow}-paper rolling average
            {series === "total" ? " · green = target" : ""}
          </p>
        </div>
      )}
    </Panel>
  );
}
