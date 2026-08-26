"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Pencil, Play, Plus, Trash2, Upload } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import { PageHeader } from "@/components/layout/page-header";
import { UploadDialog } from "@/components/practice/upload-dialog";
import { Badge, Eyebrow, EmptyState, Panel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import type { Material } from "@/lib/domain/types";
import { PAPER_TYPE_LABEL } from "@/lib/domain/taxonomy";
import { shortDate } from "@/lib/utils/time";

export default function PracticePage() {
  const { data, deleteMaterial } = useData();
  const [dialog, setDialog] = useState<{ editing?: Material } | null>(null);
  const [confirm, setConfirm] = useState<Material | null>(null);

  const recent = useMemo(() => {
    if (!data) return [];
    const withAttempts = new Set(data.attempts.map((a) => a.sittingId));
    return data.sittings
      .filter((s) => withAttempts.has(s.id))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 6);
  }, [data]);

  if (!data) return null;
  const materials = data.materials;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Practice"
        subtitle="Self-contained test environment for PDFs you provide. Optional — nothing here affects your log unless you complete an attempt."
        right={
          <Button variant="primary" size="sm" onClick={() => setDialog({})}>
            <Plus className="h-4 w-4" /> Add PDF
          </Button>
        }
      />

      {materials.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Upload}
            title="No practice materials yet"
            description="Upload a TMUA, MAT or practice PDF you legally have. It's stored privately on this device — answer with A–E buttons, use the timer, then score against a key."
            action={
              <Button variant="primary" size="sm" onClick={() => setDialog({})}>
                Add your first PDF
              </Button>
            }
          />
        </Panel>
      ) : (
        <div>
          <Eyebrow className="mb-2.5">Library</Eyebrow>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((m) => (
              <Panel key={m.id} className="group flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-raised text-faint">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => setDialog({ editing: m })} className="pressable rounded p-1.5 text-faint hover:bg-raised hover:text-ink" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setConfirm(m)} className="pressable rounded p-1.5 text-faint hover:bg-neg-soft hover:text-neg" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-3 truncate text-[14px] font-medium text-ink" title={m.name}>{m.name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={m.type === "official_tmua" ? "accent" : m.type === "mat" ? "warn" : "faint"}>
                    {PAPER_TYPE_LABEL[m.type]}
                  </Badge>
                  <span className="text-[11.5px] text-faint">{m.questionCount} Q</span>
                  {m.answerKey && <span className="text-[11.5px] text-pos">key saved</span>}
                </div>
                <Link
                  href={`/practice/run/${m.id}`}
                  className="pressable mt-4 inline-flex items-center justify-center gap-1.5 rounded-md bg-panel-2 border border-line-strong px-3 py-2 text-[13px] font-medium text-ink hover:bg-raised"
                >
                  <Play className="h-3.5 w-3.5 text-accent" /> Practice
                </Link>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <Eyebrow className="mb-2.5">Recent attempts</Eyebrow>
          <Panel className="divide-y divide-line">
            {recent.map((s) => {
              const atts = data.attempts.filter((a) => a.sittingId === s.id);
              const scored = atts.filter((a) => a.isCorrect !== null).length;
              const correct = atts.filter((a) => a.isCorrect === true).length;
              return (
                <Link key={s.id} href={`/review/${s.id}`} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-raised/25">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{s.sourceLabel}</p>
                    <p className="text-[11.5px] text-faint">{shortDate(s.date)} · {atts.length} questions</p>
                  </div>
                  <div className="text-right">
                    <p className="mono text-[14px] text-ink">{correct}<span className="text-faint">/{scored || atts.length}</span></p>
                    <p className="text-[11px] text-accent">Review →</p>
                  </div>
                </Link>
              );
            })}
          </Panel>
        </div>
      )}

      <UploadDialog open={!!dialog} onClose={() => setDialog(null)} editing={dialog?.editing} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMaterial(confirm.id)}
        title={`Delete "${confirm?.name ?? "material"}"?`}
        description="The PDF and its stored answer key are removed. Logged results stay."
      />
    </div>
  );
}
