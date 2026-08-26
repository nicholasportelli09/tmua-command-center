"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock, Flag, Keyboard } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import { useToast } from "@/components/ui/toast";
import type { Material, QuestionAttempt, SittingCategory } from "@/lib/domain/types";
import { AnswerGrid, LETTERS } from "./answer-grid";
import { Button } from "@/components/ui/button";
import { Field, NumberInput } from "@/components/ui/form";
import { Segmented } from "@/components/ui/segmented";
import { Badge, Panel } from "@/components/ui/primitives";
import { newId } from "@/lib/utils/id";
import { todayISO } from "@/lib/utils/time";
import { formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { TMUA } from "@/lib/domain/constants";

type Phase = "setup" | "running" | "grading";

function categoryOf(m: Material): SittingCategory {
  return m.type === "official_tmua" ? "tmua" : m.type === "mat" ? "mat" : "other";
}

export function PracticeRunner({ material }: { material: Material }) {
  const { getMaterialBlob, addSitting, saveAttempts, updateMaterial } = useData();
  const { toast } = useToast();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("setup");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const isTmua = material.type === "official_tmua";

  // Setup
  const [paper, setPaper] = useState<1 | 2>(1);
  const [count, setCount] = useState(material.questionCount || (isTmua ? TMUA.questionsPerPaper : 10));
  const [minutes, setMinutes] = useState(isTmua ? TMUA.paperMinutes : 60);

  // Running
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const perQ = useRef<number[]>([]);
  const lastSwitch = useRef<number>(0);

  // Grading
  const [keyValues, setKeyValues] = useState<(string | null)[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    getMaterialBlob(material.id).then((blob) => {
      if (blob) {
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      }
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [material.id, getMaterialBlob]);

  const flushTime = useCallback(() => {
    const now = Date.now();
    if (lastSwitch.current) {
      perQ.current[current] = (perQ.current[current] ?? 0) + (now - lastSwitch.current) / 1000;
    }
    lastSwitch.current = now;
  }, [current]);

  const goTo = useCallback(
    (i: number) => {
      flushTime();
      setCurrent((c) => Math.max(0, Math.min(count - 1, typeof i === "number" ? i : c)));
    },
    [count, flushTime],
  );

  function start() {
    const c = Math.max(1, Math.min(50, count));
    setAnswers(Array(c).fill(null));
    setFlags(Array(c).fill(false));
    setKeyValues(
      material.answerKey
        ? Array.from({ length: c }, (_, i) => material.answerKey?.[i + 1] ?? null)
        : Array(c).fill(null),
    );
    perQ.current = Array(c).fill(0);
    lastSwitch.current = Date.now();
    setCurrent(0);
    setCount(c);
    setTimeLeft(minutes * 60);
    setPhase("running");
  }

  const submit = useCallback(() => {
    flushTime();
    setPhase("grading");
  }, [flushTime]);

  // Timer
  useEffect(() => {
    if (phase !== "running") return;
    if (timeLeft <= 0) {
      submit();
      return;
    }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft, submit]);

  // Keyboard
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (["a", "b", "c", "d", "e"].includes(k)) {
        setAnswers((a) => a.map((v, i) => (i === current ? k.toUpperCase() : v)));
      } else if (k === "arrowdown" || k === "arrowright" || k === "n") {
        e.preventDefault();
        goTo(current + 1);
      } else if (k === "arrowup" || k === "arrowleft" || k === "p") {
        e.preventDefault();
        goTo(current - 1);
      } else if (k === "f") {
        setFlags((f) => f.map((v, i) => (i === current ? !v : v)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, current, goTo]);

  const answered = answers.filter(Boolean).length;
  const flaggedCount = flags.filter(Boolean).length;

  function finalize() {
    const cat = categoryOf(material);
    const score = keyValues.reduce((acc, key, i) => acc + (key && answers[i] === key ? 1 : 0), 0);

    const sitting = addSitting({
      date: todayISO(),
      category: cat,
      sourceId: null,
      sourceLabel: isTmua ? `${material.name} · P${paper}` : material.name,
      paper1: cat === "tmua" ? (paper === 1 ? score : null) : score,
      paper2: cat === "tmua" && paper === 2 ? score : null,
      maxScore: cat === "tmua" ? 40 : count,
      notes: `Practice · ${count}Q · ${minutes}m`,
    });

    const attempts: QuestionAttempt[] = Array.from({ length: count }, (_, i) => {
      const correct = keyValues[i];
      const selected = answers[i];
      const isCorrect = correct === null ? null : selected === correct;
      return {
        id: newId(),
        sittingId: sitting.id,
        paper,
        questionNumber: i + 1,
        selected,
        correct,
        isCorrect,
        flagged: flags[i],
        durationSec: perQ.current[i] ? Math.round(perQ.current[i]) : null,
        errorType: null,
        topic: null,
        needsRedo: false,
        redoneSuccessfully: false,
      };
    });
    saveAttempts(attempts);

    // Remember the key for next time.
    const keyMap: Record<number, string> = {};
    keyValues.forEach((v, i) => {
      if (v) keyMap[i + 1] = v;
    });
    if (Object.keys(keyMap).length > 0) updateMaterial(material.id, { answerKey: keyMap, questionCount: count });

    toast({ title: "Attempt scored", description: `${score}/${count} correct`, tone: "success" });
    router.push(`/review/${sitting.id}`);
  }

  // ---------- SETUP ----------
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-md">
        <Panel className="p-6">
          <button onClick={() => router.push("/practice")} className="pressable mb-4 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
            <ChevronLeft className="h-3.5 w-3.5" /> Practice
          </button>
          <h1 className="text-[17px] font-semibold text-ink">{material.name}</h1>
          <p className="mt-0.5 text-[12.5px] text-muted">Configure this attempt, then start the timer.</p>

          <div className="mt-5 flex flex-col gap-4">
            {isTmua && (
              <Field label="Paper">
                <Segmented
                  value={String(paper)}
                  onChange={(v) => setPaper(Number(v) as 1 | 2)}
                  options={[
                    { value: "1", label: "Paper 1" },
                    { value: "2", label: "Paper 2" },
                  ]}
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Questions">
                <NumberInput value={String(count)} min={1} max={50} onChange={(e) => setCount(Number(e.target.value))} />
              </Field>
              <Field label="Minutes">
                <NumberInput value={String(minutes)} min={1} max={240} onChange={(e) => setMinutes(Number(e.target.value))} />
              </Field>
            </div>
            {!pdfUrl && <p className="text-[12px] text-warn">Loading PDF…</p>}
            <Button variant="primary" onClick={start} disabled={!pdfUrl}>
              Start · {count} questions · {minutes} min
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  // ---------- GRADING ----------
  if (phase === "grading") {
    const hasKey = keyValues.some(Boolean);
    const missing = keyValues.filter((v) => !v).length;
    return (
      <div className="mx-auto max-w-md">
        <Panel className="p-6">
          <h1 className="text-[17px] font-semibold text-ink">Enter the answer key</h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {material.answerKey ? "Loaded from this material — adjust if needed." : "Paste in the correct answers to score your attempt."}
          </p>
          <div className="mt-4 max-h-[52vh] overflow-y-auto pr-1">
            <AnswerGrid
              count={count}
              values={keyValues}
              mode="key"
              onSelect={(i, letter) => setKeyValues((k) => k.map((v, idx) => (idx === i ? letter : v)))}
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-faint">{missing > 0 ? `${missing} unfilled → counted unknown` : "All questions keyed"}</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPhase("running")}>
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={finalize} disabled={!hasKey}>
                Score attempt
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  // ---------- RUNNING ----------
  const lowTime = timeLeft < 300;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-semibold text-ink">{material.name}</span>
          {isTmua && <Badge tone="accent">Paper {paper}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("mono inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[14px] font-medium", lowTime ? "border-[#4a2226] bg-neg-soft text-neg" : "border-line bg-panel-2 text-ink")}>
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(timeLeft)}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowShortcuts((v) => !v)} aria-label="Shortcuts">
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button variant="primary" size="sm" onClick={submit}>
            Submit
          </Button>
        </div>
      </div>

      {showShortcuts && (
        <div className="fadein flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-line bg-base-2/60 px-3 py-2 text-[11.5px] text-muted">
          <span><kbd className="mono text-ink">A–E</kbd> answer</span>
          <span><kbd className="mono text-ink">← →</kbd> prev / next</span>
          <span><kbd className="mono text-ink">F</kbd> flag</span>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <Panel className="overflow-hidden p-0">
          {pdfUrl ? (
            <iframe src={`${pdfUrl}#toolbar=1&view=FitH`} title="Paper" className="h-[64vh] w-full bg-white lg:h-[76vh]" />
          ) : (
            <div className="flex h-[64vh] items-center justify-center text-faint lg:h-[76vh]">Loading PDF…</div>
          )}
        </Panel>

        <Panel className="flex flex-col p-3">
          <div className="mb-2 flex items-center justify-between px-1 text-[11.5px] text-muted">
            <span>{answered}/{count} answered</span>
            <span className="inline-flex items-center gap-1 text-warn">
              <Flag className="h-3 w-3" /> {flaggedCount}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 lg:max-h-[70vh]">
            <AnswerGrid
              count={count}
              values={answers}
              flags={flags}
              current={current}
              onFocusRow={goTo}
              onSelect={(i, letter) => {
                setAnswers((a) => a.map((v, idx) => (idx === i ? letter : v)));
              }}
              onFlag={(i) => setFlags((f) => f.map((v, idx) => (idx === i ? !v : v)))}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
