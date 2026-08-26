"use client";

import { useEffect, useState } from "react";
import type { ExamSettings } from "@/lib/domain/types";
import { countdown, formatExamDate } from "@/lib/utils/time";
import { Eyebrow, Panel } from "@/components/ui/primitives";

export function CountdownCard({ exam }: { exam: ExamSettings }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const c = countdown(exam.examInstantUtc);
    // Tick every second only inside the final 48h; otherwise every minute.
    const interval = !c.past && c.totalMs < 48 * 3600_000 ? 1000 : 60_000;
    const t = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(t);
  }, [exam.examInstantUtc]);

  const c = now ? countdown(exam.examInstantUtc, now) : countdown(exam.examInstantUtc);
  const fine = !c.past && c.totalMs < 48 * 3600_000;

  return (
    <Panel className="flex flex-col justify-between p-4">
      <Eyebrow>Until {exam.examName}</Eyebrow>
      <div className="mt-2.5">
        {c.past ? (
          <span className="mono text-[22px] font-medium text-accent">In progress</span>
        ) : fine ? (
          <div className="mono flex items-baseline gap-1 text-ink">
            <span className="text-[26px] font-medium leading-none tracking-tight">{c.hours + c.days * 24}</span>
            <span className="text-[13px] text-faint">h</span>
            <span className="ml-1 text-[26px] font-medium leading-none tracking-tight">{c.minutes}</span>
            <span className="text-[13px] text-faint">m</span>
            <span className="ml-1 text-[18px] font-medium leading-none text-muted">{c.seconds}</span>
            <span className="text-[12px] text-faint">s</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="mono text-[26px] font-medium leading-none tracking-tight text-ink">{c.days}</span>
            <span className="mono text-[13px] text-faint">days</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11.5px] leading-tight text-muted">
        {formatExamDate(exam.examInstantUtc, exam.timezone)}
        <span className="text-faint"> · {exam.timezone.replace("_", " ")}</span>
      </p>
    </Panel>
  );
}
