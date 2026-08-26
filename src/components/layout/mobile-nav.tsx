"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Plus, Settings } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils/cn";

export function MobileTopBar({ onLog }: { onLog: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-base/85 px-4 py-2.5 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-accent ring-1 ring-[#22345a]">
          <Activity className="h-4 w-4" />
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-ink">TMUA</span>
      </Link>
      <div className="flex items-center gap-1.5">
        <Link
          href="/settings"
          className="pressable rounded-md p-2 text-muted hover:bg-raised hover:text-ink"
          aria-label="Settings"
        >
          <Settings className="h-4.5 w-4.5" />
        </Link>
        <button
          onClick={onLog}
          className="pressable inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-[#04101f]"
        >
          <Plus className="h-4 w-4" /> Log
        </button>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-base/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10.5px] font-medium transition-colors",
              active ? "text-accent" : "text-faint",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
