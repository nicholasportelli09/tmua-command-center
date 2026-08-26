"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Flag, RotateCcw, Timer } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import type { ErrorType, QuestionAttempt, Sitting, Topic } from "@/lib/domain/types";
import { ERROR_TYPES, TOPICS } from "@/lib/domain/taxonomy";
import { Badge, Eyebrow, EmptyState, Panel } from "@/components/ui/primitives";
import { Select } from "@/components/ui/form";
import { Segmented } from "@/components/ui/segmented";
import { formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Filter = "focus" | "wrong" | "flagged" | "all";

export function ReviewScreen({ sitting }: { sitting: Sitting }) {
  const { data, updateAttempt } = useData();
  const [filter, setFilter] = useState<Filter>("focus");

  const attempts = useMemo(
    () => (data?.attempts ?? []).filter((a) => a.sittingId === sitting.id).sort((a, b) => a.questionNumber - b.questionNumber),
    [data?.attempts, sitting.id],
  );

  const slowSet = useMemo(() => {
    const durs = attempts.map((a) => a.durationSec).filter((d): d is number => d !== null).sort((a, b) => a - b);
    if (durs.length < 4) return new Set<string>();
    const median = durs[Math.floor(durs.length / 2)];
    return new Set(attempts.filter((a) => a.durationSec !== null && a.durationSec > median * 1.5).map((a) => a.id));
  }, [attempts]);

  const correct = attempts.filter((a) => a.isCorrect === true).length;
  const scored = attempts.filter((a) => a.isCorrect !== null).length;

  const isFocus = (a: QuestionAttempt) => a.isCorrect === false || a.flagged || slowSet.has(a.id);
  const filtered = attempts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "wrong") return a.isCorrect === false;
    if (filter === "flagged") return a.flagged;
    return isFocus(a);
  });

  if (attempts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Panel>
          <EmptyState
            icon={Check}
            title="Nothing to review here"
            description="This result was logged manually, so there are no per-question details. Run a paper in Practice to capture question-level data."
          />
        </Panel>
      </div>
    );
  }

  const focusCount = attempts.filter(isFocus).length;

  return (
    <div className="flex flex-col gap-4">
      <BackLink />

      <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <Eyebrow>Review</Eyebrow>
          <h1 className="mt-1 text-[17px] font-semibold text-ink">{sitting.sourceLabel}</h1>
          <p className="text-[12.5px] text-muted">
            <span className="mono text-ink">{correct}</span> / {scored || attempts.length} correct
            {scored > 0 && <span className="text-faint"> · {Math.round((correct / scored) * 100)}%</span>}
            <span className="text-faint"> · {focusCount} to review</span>
          </p>
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "focus", label: `Focus ${focusCount}` },
            { value: "wrong", label: "Wrong" },
            { value: "flagged", label: "Flagged" },
            { value: "all", label: "All" },
          ]}
        />
      </Panel>

      {filtered.length === 0 ? (
        <Panel>
          <EmptyState icon={Check} title="All clear" description="No questions match this filter." className="py-8" />
        </Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((a) => (
            <ReviewRow
              key={a.id}
              attempt={a}
              slow={slowSet.has(a.id)}
              onChange={(patch) => updateAttempt(a.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/analytics" className="pressable inline-flex w-fit items-center gap-1 text-[12.5px] text-muted hover:text-ink">
      <ChevronLeft className="h-3.5 w-3.5" /> Back
    </Link>
  );
}

function ReviewRow({
  attempt,
  slow,
  onChange,
}: {
  attempt: QuestionAttempt;
  slow: boolean;
  onChange: (patch: Partial<QuestionAttempt>) => void;
}) {
  const wrong = attempt.isCorrect === false;
  return (
    <Panel className="p-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="mono flex h-7 w-7 items-center justify-center rounded-md bg-raised text-[12px] text-muted">
          {attempt.questionNumber}
        </span>
        <span className="text-[11px] text-faint">P{attempt.paper}</span>

        <div className="mono flex items-center gap-1.5 text-[12.5px]">
          <span className={cn(attempt.isCorrect === true ? "text-pos" : attempt.isCorrect === false ? "text-neg" : "text-muted")}>
            {attempt.selected ?? "—"}
          </span>
          {attempt.correct && attempt.isCorrect === false && (
            <>
              <span className="text-faint">→</span>
              <span className="text-pos">{attempt.correct}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {attempt.isCorrect === true && <Badge tone="pos">Correct</Badge>}
          {wrong && <Badge tone="neg">Wrong</Badge>}
          {attempt.flagged && <Badge tone="warn"><Flag className="h-3 w-3" /> Flagged</Badge>}
          {slow && (
            <Badge tone="faint"><Timer className="h-3 w-3" /> Slow</Badge>
          )}
          {attempt.durationSec !== null && (
            <span className="mono text-[11px] text-faint">{formatDuration(attempt.durationSec)}</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {attempt.redoneSuccessfully ? (
            <Badge tone="pos"><Check className="h-3 w-3" /> Redone</Badge>
          ) : attempt.needsRedo ? (
            <button
              onClick={() => onChange({ redoneSuccessfully: true })}
              className="pressable inline-flex items-center gap-1 rounded-md border border-[#16402f] bg-pos-soft px-2 py-1 text-[11.5px] font-medium text-pos"
            >
              <Check className="h-3.5 w-3.5" /> Mark redone
            </button>
          ) : (
            <button
              onClick={() => onChange({ needsRedo: true })}
              className="pressable inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11.5px] font-medium text-muted hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Needs redo
            </button>
          )}
        </div>
      </div>

      {(wrong || attempt.flagged || attempt.errorType || attempt.topic) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <div className="flex flex-wrap gap-1">
            {ERROR_TYPES.map((et) => {
              const active = attempt.errorType === et.value;
              return (
                <button
                  key={et.value}
                  title={et.hint}
                  onClick={() => onChange({ errorType: active ? null : (et.value as ErrorType) })}
                  className={cn(
                    "pressable rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                    active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink",
                  )}
                >
                  {et.label}
                </button>
              );
            })}
          </div>
          <div className="ml-auto w-40">
            <Select
              value={attempt.topic ?? ""}
              onChange={(e) => onChange({ topic: (e.target.value || null) as Topic | null })}
              className="h-8 text-[12.5px]"
            >
              <option value="">Topic…</option>
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}
    </Panel>
  );
}
