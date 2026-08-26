"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CourseProgress, OfficialCompletion } from "@/lib/domain/calculations";
import { Eyebrow, Panel } from "@/components/ui/primitives";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="pressable inline-flex items-center gap-0.5 text-[11.5px] font-medium text-muted hover:text-ink"
    >
      {children}
      <ArrowUpRight className="h-3 w-3" />
    </Link>
  );
}

export function PapersMini({ official }: { official: OfficialCompletion }) {
  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <Eyebrow>Official papers</Eyebrow>
        <PanelLink href="/papers">Tracker</PanelLink>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="mono text-[24px] font-medium leading-none text-ink">{official.completed}</span>
        <span className="mono text-[13px] text-faint">/ {official.total} sittings completed</span>
      </div>
      <ProgressBar className="mt-3" value={official.completed} max={official.total} tone="accent" />
      <div className="mt-3 flex items-center justify-between text-[12px]">
        <span className="text-muted">
          <span className="mono text-ink">{official.untouchedFull}</span> untouched in reserve
        </span>
        <span className="text-faint">
          <span className="mono text-pos">{official.reviewed}</span> reviewed
        </span>
      </div>
    </Panel>
  );
}

export function CourseMini({ course }: { course: CourseProgress }) {
  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <Eyebrow>Clementine Wade course</Eyebrow>
        <PanelLink href="/course">Course</PanelLink>
      </div>
      {course.total === 0 ? (
        <div className="mt-3 flex items-center justify-between">
          <p className="max-w-[65%] text-[12.5px] leading-relaxed text-muted">
            Add your course modules to track how much you&apos;ve completed.
          </p>
          <ProgressRing value={0} size={52} stroke={5}>
            <span className="mono text-[12px] text-faint">0%</span>
          </ProgressRing>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <ProgressRing value={course.pct} size={56} stroke={5} tone={course.pct >= 100 ? "pos" : "accent"}>
            <span className="mono text-[13px] font-medium text-ink">{course.pct}%</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[12px] text-faint">
              {course.completed} / {course.total} modules complete
            </p>
            {course.currentModule ? (
              <p className="mt-1 truncate text-[13.5px] font-medium text-ink">
                {course.currentModule.group} · {course.currentModule.title}
              </p>
            ) : (
              <p className="mt-1 text-[13.5px] font-medium text-pos">Course complete</p>
            )}
            {course.currentModule && <p className="mt-0.5 text-[11.5px] text-muted">Current focus</p>}
          </div>
        </div>
      )}
    </Panel>
  );
}
