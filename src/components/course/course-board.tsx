"use client";

import { useMemo, useState } from "react";
import { Check, CircleDashed, CircleDot, Plus, Trash2 } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import type { CourseModule, ModuleStatus } from "@/lib/domain/types";
import { courseProgress } from "@/lib/domain/calculations";
import { Eyebrow, EmptyState, Panel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/confirm";
import { cn } from "@/lib/utils/cn";

const NEXT: Record<ModuleStatus, ModuleStatus> = {
  not_started: "in_progress",
  in_progress: "completed",
  completed: "not_started",
};

function StatusToggle({ status, onClick }: { status: ModuleStatus; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`${status.replace("_", " ")} — click to advance`}
      className="pressable shrink-0"
      aria-label="Toggle status"
    >
      {status === "completed" ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pos text-[#04150e]">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      ) : status === "in_progress" ? (
        <CircleDot className="h-5 w-5 text-warn" />
      ) : (
        <CircleDashed className="h-5 w-5 text-faint" />
      )}
    </button>
  );
}

export function CourseBoard() {
  const { data, updateModule, addModule, deleteModule, addWeek } = useData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState<CourseModule | null>(null);

  const groups = useMemo(() => {
    const modules = [...(data?.course ?? [])].sort((a, b) => a.order - b.order);
    const map = new Map<string, CourseModule[]>();
    for (const m of modules) {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    }
    return [...map.entries()];
  }, [data?.course]);

  if (!data) return null;
  const progress = courseProgress(data.course);

  function startEdit(m: CourseModule) {
    setEditingId(m.id);
    setDraft(m.title);
  }
  function commitEdit() {
    if (editingId && draft.trim()) updateModule(editingId, { title: draft.trim() });
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <Panel className="flex items-center gap-5 p-5">
        <ProgressRing value={progress.pct} max={100} size={72} stroke={6} tone={progress.pct >= 100 ? "pos" : "accent"}>
          <span className="mono text-[15px] font-medium text-ink">{progress.pct}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <Eyebrow>Clementine Wade course</Eyebrow>
          <p className="mt-1 text-[14px] text-ink">
            <span className="mono">{progress.completed}</span> of{" "}
            <span className="mono">{progress.total}</span> modules complete
            {progress.inProgress > 0 && (
              <span className="text-muted"> · {progress.inProgress} in progress</span>
            )}
          </p>
          {progress.currentModule ? (
            <p className="mt-0.5 text-[12.5px] text-muted">
              Current focus:{" "}
              <span className="text-ink">
                {progress.currentModule.group} · {progress.currentModule.title}
              </span>
            </p>
          ) : progress.total > 0 ? (
            <p className="mt-0.5 text-[12.5px] text-pos">All modules complete</p>
          ) : null}
        </div>
      </Panel>

      {groups.length === 0 ? (
        <Panel>
          <EmptyState
            icon={CircleDashed}
            title="No modules yet"
            description="Add your Clementine Wade modules to track how much of the course you've completed."
            action={<Button size="sm" variant="primary" onClick={addWeek}>Add first week</Button>}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map(([group, modules]) => {
            const done = modules.filter((m) => m.status === "completed").length;
            return (
              <Panel key={group} className="flex flex-col p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13.5px] font-semibold text-ink">{group}</span>
                    <span className="mono text-[11.5px] text-faint">{done}/{modules.length}</span>
                  </div>
                  <div className="w-24">
                    <ProgressBar value={done} max={modules.length} tone={done === modules.length ? "pos" : "accent"} />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  {modules.map((m) => (
                    <div key={m.id} className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-raised/30">
                      <StatusToggle status={m.status} onClick={() => updateModule(m.id, { status: NEXT[m.status] })} />
                      {editingId === m.id ? (
                        <Input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-7 py-0 text-[13px]"
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(m)}
                          className={cn(
                            "flex-1 truncate text-left text-[13px]",
                            m.status === "completed" ? "text-muted line-through decoration-line" : "text-ink",
                          )}
                        >
                          {m.title}
                        </button>
                      )}
                      <button
                        onClick={() => setConfirm(m)}
                        className="pressable rounded p-1 text-faint opacity-0 transition-opacity hover:bg-neg-soft hover:text-neg group-hover:opacity-100"
                        aria-label="Delete module"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addModule(group, `Module ${modules.length + 1}`)}
                  className="pressable mt-2 inline-flex w-fit items-center gap-1 px-1.5 text-[12px] font-medium text-muted hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" /> Add module
                </button>
              </Panel>
            );
          })}
        </div>
      )}

      {groups.length > 0 && (
        <div>
          <Button variant="subtle" size="sm" onClick={addWeek}>
            <Plus className="h-3.5 w-3.5" /> Add week
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteModule(confirm.id)}
        title={`Delete "${confirm?.title ?? "module"}"?`}
      />
    </div>
  );
}
