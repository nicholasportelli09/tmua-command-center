"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Plus, Settings } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/state/data-provider";
import { countdown } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

export function Sidebar({ onLog }: { onLog: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[224px] flex-col border-r border-line bg-base-2/70 px-3.5 py-4 backdrop-blur md:flex">
      <Link href="/" className="mb-5 flex items-center gap-2.5 px-1.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft text-accent ring-1 ring-[#22345a]">
          <Activity className="h-4.5 w-4.5" />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-[13.5px] font-semibold tracking-tight text-ink">TMUA</span>
          <span className="mt-0.5 text-[10.5px] font-medium tracking-wide text-faint">
            COMMAND CENTER
          </span>
        </span>
      </Link>

      <Button variant="primary" onClick={onLog} className="mb-4 w-full justify-between">
        <span className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Log paper
        </span>
        <kbd className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[#0a1524]">
          ⌘K
        </kbd>
      </Button>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "pressable group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                active ? "bg-raised text-ink" : "text-muted hover:bg-raised/60 hover:text-ink",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
              )}
              <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-faint group-hover:text-muted")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <MiniCountdown />
        <Link
          href="/settings"
          className={cn(
            "pressable flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-raised/60 hover:text-ink",
            pathname.startsWith("/settings") && "bg-raised text-ink",
          )}
        >
          <Settings className="h-4 w-4 text-faint" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

function MiniCountdown() {
  const { data } = useData();
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!data) return null;
  const c = countdown(data.exam.examInstantUtc);
  return (
    <div className="rounded-md border border-line bg-base-2 px-2.5 py-2">
      <p className="text-[10.5px] font-medium tracking-wide text-faint">UNTIL {data.exam.examName}</p>
      <p className="mono mt-0.5 text-[15px] font-medium text-ink">
        {c.past ? "In progress" : `${c.days}d ${c.hours}h`}
      </p>
    </div>
  );
}
