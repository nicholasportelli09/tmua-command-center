"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/form";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/lib/state/data-provider";
import type { Sitting, SittingCategory } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function LogPaperDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Sitting | null;
}) {
  const { data, addSitting, updateSitting, todayISO } = useData();
  const { toast } = useToast();
  const p1Ref = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<SittingCategory>("tmua");
  const [date, setDate] = useState(todayISO);
  const [sourceId, setSourceId] = useState<string>("");
  const [customLabel, setCustomLabel] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [showMore, setShowMore] = useState(false);
  const [scaled, setScaled] = useState("");
  const [profileId, setProfileId] = useState("");
  const [t1, setT1] = useState("");
  const [t2, setT2] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sources = data?.sources ?? [];
  const profiles = data?.conversionProfiles ?? [];

  // Reset / prefill on open.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCategory(editing.category);
      setDate(editing.date);
      setSourceId(editing.sourceId ?? "");
      setCustomLabel(editing.sourceId ? "" : editing.sourceLabel);
      setP1(editing.paper1 !== null && editing.category === "tmua" ? String(editing.paper1) : "");
      setP2(editing.paper2 !== null ? String(editing.paper2) : "");
      setScore(editing.category !== "tmua" && editing.paper1 !== null ? String(editing.paper1) : "");
      setMaxScore(String(editing.maxScore ?? 100));
      setScaled(editing.estimatedScaled !== null ? String(editing.estimatedScaled) : "");
      setProfileId(editing.conversionProfileId ?? "");
      setT1(editing.paper1DurationSec ? String(Math.round(editing.paper1DurationSec / 60)) : "");
      setT2(editing.paper2DurationSec ? String(Math.round(editing.paper2DurationSec / 60)) : "");
      setNotes(editing.notes ?? "");
      setShowMore(
        editing.estimatedScaled !== null || !!editing.notes || !!editing.paper1DurationSec,
      );
    } else {
      setCategory("tmua");
      setDate(todayISO);
      setSourceId("");
      setCustomLabel("");
      setP1("");
      setP2("");
      setScore("");
      setMaxScore("100");
      setScaled("");
      setProfileId("");
      setT1("");
      setT2("");
      setNotes("");
      setShowMore(false);
    }
    setError(null);
    setTimeout(() => p1Ref.current?.focus(), 60);
  }, [open, editing, todayISO]);

  const total = useMemo(() => {
    const a = toNum(p1);
    const b = toNum(p2);
    return a !== null && b !== null ? a + b : null;
  }, [p1, p2]);

  function validate(): string | null {
    if (!date) return "Pick a date.";
    if (category === "tmua") {
      const a = toNum(p1);
      const b = toNum(p2);
      if (a === null && b === null) return "Enter at least one paper score.";
      for (const [v, name] of [[a, "Paper 1"], [b, "Paper 2"]] as const) {
        if (v !== null && (v < 0 || v > 20)) return `${name} must be between 0 and 20.`;
        if (v !== null && !Number.isInteger(v)) return `${name} must be a whole number.`;
      }
    } else {
      const s = toNum(score);
      const m = toNum(maxScore);
      if (s === null) return "Enter a score.";
      if (m === null || m <= 0) return "Enter a valid maximum.";
      if (s < 0 || s > m) return `Score must be between 0 and ${m}.`;
      if (!sourceLabelResolved()) return "Name this session.";
    }
    return null;
  }

  function sourceLabelResolved(): string {
    if (category === "tmua") {
      if (sourceId) return sources.find((s) => s.id === sourceId)?.name ?? "Sitting";
      return customLabel.trim() || "Custom mock";
    }
    return customLabel.trim();
  }

  function submit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    const scaledNum = toNum(scaled);
    const common = {
      date,
      category,
      estimatedScaled: scaledNum,
      scaledSource: scaledNum !== null ? ("manual" as const) : null,
      conversionProfileId: profileId || null,
      paper1DurationSec: toNum(t1) !== null ? toNum(t1)! * 60 : null,
      paper2DurationSec: toNum(t2) !== null ? toNum(t2)! * 60 : null,
      notes: notes.trim() || null,
    };

    if (category === "tmua") {
      const payload = {
        ...common,
        sourceId: sourceId || null,
        sourceLabel: sourceLabelResolved(),
        paper1: toNum(p1),
        paper2: toNum(p2),
        maxScore: 40,
      };
      if (editing) updateSitting(editing.id, payload);
      else addSitting(payload);
    } else {
      const payload = {
        ...common,
        sourceId: null,
        sourceLabel: sourceLabelResolved(),
        paper1: toNum(score),
        paper2: null,
        maxScore: toNum(maxScore) ?? 100,
      };
      if (editing) updateSitting(editing.id, payload);
      else addSitting(payload);
    }

    toast({
      title: editing ? "Result updated" : "Result logged",
      description:
        category === "tmua" && total !== null
          ? `${sourceLabelResolved()} · ${total}/40`
          : sourceLabelResolved(),
      tone: "success",
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit result" : "Log a result"}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit}>
            {editing ? "Save changes" : "Log result"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Segmented
            value={category}
            onChange={(v) => setCategory(v)}
            options={[
              { value: "tmua", label: "TMUA" },
              { value: "mat", label: "MAT" },
              { value: "other", label: "Other" },
            ]}
          />
          {category !== "tmua" && (
            <span className="text-[11px] text-faint">Kept out of TMUA trajectory</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" htmlFor="log-date">
            <Input id="log-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {category === "tmua" ? (
            <Field label="Source">
              <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value="">Custom / unlisted</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.official ? s.name : `${s.name}`}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Name">
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder={category === "mat" ? "MAT 2018" : "Session name"}
              />
            </Field>
          )}
        </div>

        {category === "tmua" && !sourceId && (
          <Field label="Label" hint="Name this custom mock so you recognise it later.">
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Timed mock A"
            />
          </Field>
        )}

        {category === "tmua" ? (
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <Field label="Paper 1  /20">
              <NumberInput ref={p1Ref} value={p1} min={0} max={20} onChange={(e) => setP1(e.target.value)} placeholder="—"
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
            </Field>
            <Field label="Paper 2  /20">
              <NumberInput value={p2} min={0} max={20} onChange={(e) => setP2(e.target.value)} placeholder="—"
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
            </Field>
            <div className="flex flex-col items-center pb-0.5">
              <span className="eyebrow mb-1.5">Total</span>
              <div className="mono flex h-9.5 min-w-[64px] items-center justify-center rounded-md border border-line bg-base-2 px-2 text-[17px] font-medium tabular-nums text-ink">
                {total !== null ? total : "—"}
                <span className="ml-0.5 text-[11px] text-faint">/40</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <Field label="Score">
              <NumberInput ref={p1Ref} value={score} onChange={(e) => setScore(e.target.value)} placeholder="—" />
            </Field>
            <div className="pb-2.5 text-center text-faint">/</div>
            <Field label="Out of">
              <NumberInput value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </Field>
          </div>
        )}

        <button
          onClick={() => setShowMore((v) => !v)}
          className="pressable flex w-fit items-center gap-1 text-[12px] font-medium text-muted hover:text-ink"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showMore && "rotate-180")} />
          {showMore ? "Hide details" : "Add details (optional)"}
        </button>

        {showMore && (
          <div className="fadein flex flex-col gap-3 rounded-md border border-line bg-base-2/50 p-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Est. scaled score" hint="Marked as estimated — never official.">
                <Input value={scaled} onChange={(e) => setScaled(e.target.value)} placeholder="e.g. 7.4" inputMode="decimal" />
              </Field>
              <Field label="Conversion profile">
                <Select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                  <option value="">None</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {category === "tmua" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="P1 time (min)">
                  <Input value={t1} onChange={(e) => setT1(e.target.value)} inputMode="numeric" placeholder="75" />
                </Field>
                <Field label="P2 time (min)">
                  <Input value={t2} onChange={(e) => setT2(e.target.value)} inputMode="numeric" placeholder="75" />
                </Field>
              </div>
            )}
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What went wrong, what to review…" />
            </Field>
          </div>
        )}

        {error && <p className="text-[12.5px] text-neg">{error}</p>}
      </div>
    </Dialog>
  );
}
