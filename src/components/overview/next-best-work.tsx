"use client";

import Link from "next/link";
import { ArrowRight, Crosshair } from "lucide-react";
import type { RecoResult } from "@/lib/domain/recommendation";
import { Eyebrow, Panel, Badge } from "@/components/ui/primitives";

const PHASE_LABEL: Record<string, string> = {
  sat_priority: "SAT-priority phase",
  tmua_primary: "TMUA-primary phase",
  final_mocks: "Final mocks phase",
};

export function NextBestWork({ reco }: { reco: RecoResult }) {
  const { primary, secondary, phase } = reco;

  return (
    <Panel className="relative overflow-hidden p-5">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-accent to-accent-dim" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Crosshair className="h-3.5 w-3.5 text-accent" />
          <Eyebrow>Next best work</Eyebrow>
        </div>
        <Badge tone="faint">{PHASE_LABEL[phase]}</Badge>
      </div>

      {primary ? (
        <div className="mt-3">
          <p className="text-[16.5px] font-semibold leading-snug tracking-tight text-ink">
            {primary.title}
          </p>
          <div className="mt-3 rounded-md border border-line bg-base-2/60 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Why</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{primary.why}</p>
          </div>
          <div className="mt-3.5 flex items-center gap-3">
            <Link
              href={primary.href}
              className="pressable inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-[13px] font-medium text-[#04101f] hover:bg-[#6fa9ff]"
            >
              {primary.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {secondary && (
            <div className="mt-4 border-t border-line pt-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Then</p>
                  <p className="mt-1 text-[13.5px] font-medium leading-snug text-ink">{secondary.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{secondary.why}</p>
                </div>
                <Link
                  href={secondary.href}
                  className="pressable mt-4 inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-accent hover:text-[#7fb4ff]"
                >
                  {secondary.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          Nothing pressing right now — you&apos;re on track. Log your next result when you complete
          one and a recommendation will appear here.
        </p>
      )}
    </Panel>
  );
}
