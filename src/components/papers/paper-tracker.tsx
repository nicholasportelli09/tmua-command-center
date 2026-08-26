"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import type { PaperSource, PaperStatus, PaperType, Sitting } from "@/lib/domain/types";
import { PAPER_STATUS_META, PAPER_TYPES } from "@/lib/domain/taxonomy";
import { officialCompletion } from "@/lib/domain/calculations";
import { Eyebrow, Panel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Field, Input, Select } from "@/components/ui/form";
import { shortDate } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

const CYCLE: PaperStatus[] = ["untouched", "completed", "reviewed"];
const pillTone: Record<PaperStatus, string> = {
  untouched: "border-line bg-raised/40 text-faint hover:text-muted",
  completed: "border-[#22345a] bg-accent-soft text-accent",
  reviewed: "border-[#16402f] bg-pos-soft text-pos",
};

function StatusPill({ status, onClick }: { status: PaperStatus; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`${PAPER_STATUS_META[status].label} — click to cycle`}
      className={cn(
        "pressable w-full rounded-[6px] border px-2 py-1 text-[11.5px] font-medium transition-colors",
        pillTone[status],
      )}
    >
      {PAPER_STATUS_META[status].label}
    </button>
  );
}

export function PaperTracker() {
  const { data, setPaperStatus, addSource, updateSource, deleteSource } = useData();
  const [dialog, setDialog] = useState<{ mode: "add" | "edit"; source?: PaperSource } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PaperSource | null>(null);

  const sources = useMemo(
    () => [...(data?.sources ?? [])].sort((a, b) => a.order - b.order),
    [data?.sources],
  );
  const sittingById = useMemo(() => {
    const m = new Map<string, Sitting>();
    for (const s of data?.sittings ?? []) m.set(s.id, s);
    return m;
  }, [data?.sittings]);

  if (!data) return null;
  const comp = officialCompletion(data.sources);

  function cycle(source: PaperSource, paper: 1 | 2) {
    const cur = paper === 1 ? source.paper1Status : source.paper2Status;
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    setPaperStatus(source.id, paper, next);
  }

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div>
          <Eyebrow>Official past papers</Eyebrow>
          <p className="mt-1 text-[13px] text-muted">
            <span className="mono text-ink">{comp.completed}</span> / {comp.total} sittings completed
            <span className="text-faint"> · </span>
            <span className="mono text-ink">{comp.untouchedFull}</span> untouched full sittings in reserve
          </p>
        </div>
        <Button size="sm" variant="default" onClick={() => setDialog({ mode: "add" })}>
          <Plus className="h-3.5 w-3.5" /> Add paper set
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="text-left">
              {["Sitting", "Paper 1", "Paper 2", "Score", "Date", ""].map((h, i) => (
                <th
                  key={h + i}
                  className={cn(
                    "px-3 py-2 text-[10.5px] font-medium uppercase tracking-wide text-faint sm:px-4",
                    i >= 1 && i <= 2 && "w-[116px]",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => {
              const linked = s.linkedSittingId ? sittingById.get(s.linkedSittingId) : undefined;
              return (
                <tr key={s.id} className="group border-t border-line hover:bg-raised/25">
                  <td className="px-3 py-2.5 sm:px-4">
                    <span className="font-medium text-ink">{s.name}</span>
                    {!s.official && <span className="ml-1.5 text-[11px] text-faint">{typeShort(s.type)}</span>}
                  </td>
                  <td className="px-3 py-2.5 sm:px-4">
                    <StatusPill status={s.paper1Status} onClick={() => cycle(s, 1)} />
                  </td>
                  <td className="px-3 py-2.5 sm:px-4">
                    <StatusPill status={s.paper2Status} onClick={() => cycle(s, 2)} />
                  </td>
                  <td className="mono px-3 py-2.5 text-muted sm:px-4">
                    {linked?.total != null ? (
                      <span className="text-ink">{linked.total}<span className="text-faint">/40</span></span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-muted sm:px-4">
                    {linked ? shortDate(linked.date) : "—"}
                  </td>
                  <td className="px-3 py-2.5 sm:px-4">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setDialog({ mode: "edit", source: s })}
                        className="pressable rounded p-1.5 text-faint hover:bg-raised hover:text-ink"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(s)}
                        className="pressable rounded p-1.5 text-faint hover:bg-neg-soft hover:text-neg"
                        aria-label="Delete"
                      >
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

      <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-faint sm:px-5">
        {(["untouched", "completed", "reviewed"] as PaperStatus[]).map((st) => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", st === "untouched" ? "bg-faint" : st === "completed" ? "bg-accent" : "bg-pos")} />
            {PAPER_STATUS_META[st].label}
          </span>
        ))}
        <span className="ml-auto hidden sm:inline">Click a status to cycle</span>
      </div>

      {dialog && (
        <SourceDialog
          mode={dialog.mode}
          source={dialog.source}
          onClose={() => setDialog(null)}
          onSave={(vals) => {
            if (dialog.mode === "add") {
              addSource({
                name: vals.name,
                year: vals.year,
                type: vals.type,
                official: vals.type === "official_tmua",
                paper1Status: "untouched",
                paper2Status: "untouched",
                linkedSittingId: null,
                editable: true,
              });
            } else if (dialog.source) {
              updateSource(dialog.source.id, { name: vals.name, year: vals.year, type: vals.type, official: vals.type === "official_tmua" });
            }
            setDialog(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteSource(confirmDelete.id)}
        title={`Delete ${confirmDelete?.name ?? "paper set"}?`}
      />
    </Panel>
  );
}

function typeShort(t: PaperType): string {
  return t === "mat" ? "MAT" : t === "course" ? "Course" : t === "other" ? "Other" : "TMUA";
}

function SourceDialog({
  mode,
  source,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  source?: PaperSource;
  onClose: () => void;
  onSave: (v: { name: string; year: number | null; type: PaperType }) => void;
}) {
  const [name, setName] = useState(source?.name ?? "");
  const [year, setYear] = useState(source?.year ? String(source.year) : "");
  const [type, setType] = useState<PaperType>(source?.type ?? "official_tmua");

  return (
    <Dialog
      open
      onClose={onClose}
      title={mode === "add" ? "Add paper set" : "Edit paper set"}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => name.trim() && onSave({ name: name.trim(), year: year ? Number(year) : null, type })}
          >
            {mode === "add" ? "Add" : "Save"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2024 or Specimen B" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Year (optional)">
            <Input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="2024" />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as PaperType)}>
              {PAPER_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
