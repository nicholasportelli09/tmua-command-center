"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/state/data-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Segmented } from "@/components/ui/segmented";
import {
  ConsistencyPanel,
  ErrorCompositionPanel,
  PacePanel,
  PaperSplitPanel,
  RedoBacklogPanel,
  TopicWeaknessPanel,
  TrendPanel,
} from "@/components/analytics/panels";
import {
  computeRolling,
  consistency,
  improvementTrend,
  paperSplit,
} from "@/lib/domain/calculations";
import {
  errorComposition,
  paceAnalysis,
  topicWeakness,
  unresolvedRedos,
} from "@/lib/domain/analytics";

type Win = "3" | "5" | "all";

export default function AnalyticsPage() {
  const { data, updateAttempt } = useData();
  const [win, setWin] = useState<Win>("3");

  const window = win === "all" ? 0 : Number(win);
  const recentN = win === "all" ? 999 : Number(win);

  const a = useMemo(() => {
    if (!data) return null;
    const { sittings, attempts } = data;
    return {
      split: paperSplit(sittings, window),
      rolling: computeRolling(sittings, window),
      trend: improvementTrend(sittings),
      consistency: consistency(sittings, window > 0 ? window : 999),
      errorComp: errorComposition(attempts, sittings, recentN),
      weakness: topicWeakness(attempts, sittings, recentN, 2),
      pace: paceAnalysis(attempts, sittings, recentN),
      redos: unresolvedRedos(attempts),
    };
  }, [data, window, recentN]);

  if (!data || !a) return null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Analytics"
        subtitle="Only the metrics that change a study decision."
        right={
          <Segmented
            value={win}
            onChange={setWin}
            options={[
              { value: "3", label: "Last 3" },
              { value: "5", label: "Last 5" },
              { value: "all", label: "All" },
            ]}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PaperSplitPanel split={a.split} />
        <TrendPanel trend={a.trend} change={a.rolling.change} />
        <ConsistencyPanel consistency={a.consistency} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopicWeaknessPanel weakness={a.weakness} />
        <ErrorCompositionPanel comp={a.errorComp} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PacePanel pace={a.pace} />
        <RedoBacklogPanel
          redos={a.redos}
          sittings={data.sittings}
          onResolve={(id) => updateAttempt(id, { redoneSuccessfully: true })}
        />
      </div>
    </div>
  );
}
