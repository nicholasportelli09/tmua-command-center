"use client";

import { useMemo, useState } from "react";
import { FileClock, Pencil, Trash2 } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import { useLogPaper } from "@/components/layout/app-shell";
import type { Sitting, SittingCategory } from "@/lib/domain/types";
import { resolveScaled } from "@/lib/domain/conversion";
import { Badge, EmptyState, Eyebrow, Panel } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { shortDate } from "@/lib/utils/time";
import { fmt } from "@/lib/utils/format";

const CAT_TONE: Record<SittingCategory, "accent" | "warn" | "faint"> = {
  tmua: "accent",
  mat: "warn",
  other: "faint",
};

export function SittingsTable() {
  const { data, deleteSitting } = useData();
  const { open } = useLogPaper();
  const [filter, setFilter] = useState<"all" | SittingCategory>("all");
  const [confirm, setConfirm] = useState<Sitting | null>(null);

  const rows = useMemo(() => {
    const all = [...(data?.sittings ?? [])].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1,
    );
    return filter === "all" ? all : all.filter((s) => s.category === filter);
  }, [data?.sittings, filter]);

  if (!data) return null;
  const profiles = data.conversionProfiles;

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <Eyebrow>Logged results</Eyebrow>
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "tmua", label: "TMUA" },
            { value: "mat", label: "MAT" },
            { value: "other", label: "Other" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileClock}
          title={filter === "all" ? "No results logged yet" : "Nothing here yet"}
          description={
            filter === "all"
              ? "Log your first diagnostic to establish a baseline."
              : "No results in this category."
          }
          action={
            filter === "all" ? (
              <Button size="sm" variant="primary" onClick={() => open()}>
                Log a result
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-[13px]">
            <thead>
              <tr>
                {["Date", "Source", "", "P1", "P2", "Total", "Scaled", ""].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wide text-faint sm:px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const scaled = resolveScaled(s, profiles);
                const isTmua = s.category === "tmua";
                return (
                  <tr key={s.id} className="group border-t border-line hover:bg-raised/25">
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted sm:px-4">{shortDate(s.date)}</td>
                    <td className="px-3 py-2.5 font-medium text-ink sm:px-4">{s.sourceLabel}</td>
                    <td className="px-3 py-2.5 sm:px-4">
                      <Badge tone={CAT_TONE[s.category]}>{s.category.toUpperCase()}</Badge>
                    </td>
                    <td className="mono px-3 py-2.5 text-muted sm:px-4">{isTmua ? fmt(s.paper1, 0) : "—"}</td>
                    <td className="mono px-3 py-2.5 text-muted sm:px-4">{isTmua ? fmt(s.paper2, 0) : "—"}</td>
                    <td className="mono px-3 py-2.5 sm:px-4">
                      {isTmua ? (
                        s.total != null ? (
                          <span className="text-ink">{s.total}<span className="text-faint">/40</span></span>
                        ) : (
                          <span className="text-faint">partial</span>
                        )
                      ) : (
                        <span className="text-ink">{fmt(s.paper1, 0)}<span className="text-faint">/{s.maxScore}</span></span>
                      )}
                    </td>
                    <td className="mono px-3 py-2.5 text-muted sm:px-4">
                      {scaled.value !== null ? (
                        <span title={scaled.source === "derived" ? `Derived · ${scaled.profileName}` : "Manual estimate"} className="text-accent">
                          ≈{fmt(scaled.value, 1)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => open(s)} className="pressable rounded p-1.5 text-faint hover:bg-raised hover:text-ink" aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setConfirm(s)} className="pressable rounded p-1.5 text-faint hover:bg-neg-soft hover:text-neg" aria-label="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteSitting(confirm.id)}
        title={`Delete ${confirm?.sourceLabel ?? "result"}?`}
        description="This removes the result and any linked question review data."
      />
    </Panel>
  );
}
