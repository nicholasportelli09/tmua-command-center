"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { MobileBottomNav, MobileTopBar } from "./mobile-nav";
import { LogPaperDialog } from "@/components/papers/log-paper-dialog";
import { useData } from "@/lib/state/data-provider";
import type { Sitting } from "@/lib/domain/types";

interface LogPaperCtx {
  open: (editing?: Sitting) => void;
}
const LogPaperContext = createContext<LogPaperCtx | null>(null);

export function useLogPaper(): LogPaperCtx {
  const ctx = useContext(LogPaperContext);
  if (!ctx) throw new Error("useLogPaper must be used within AppShell");
  return ctx;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useData();
  const [logOpen, setLogOpen] = useState(false);
  const [editing, setEditing] = useState<Sitting | null>(null);

  const open = useCallback((s?: Sitting) => {
    setEditing(s ?? null);
    setLogOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setEditing(null);
        setLogOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <LogPaperContext.Provider value={{ open }}>
      <Sidebar onLog={() => open()} />
      <div className="md:pl-[224px]">
        <MobileTopBar onLog={() => open()} />
        <main className="mx-auto min-h-screen w-full max-w-[1200px] px-4 pb-24 pt-4 sm:px-6 md:px-8 md:pb-10 md:pt-7">
          {status === "error" ? (
            <ErrorState />
          ) : status === "loading" ? (
            <LoadingState />
          ) : (
            children
          )}
        </main>
        <MobileBottomNav />
      </div>
      {status === "ready" && (
        <LogPaperDialog open={logOpen} onClose={() => setLogOpen(false)} editing={editing} />
      )}
    </LogPaperContext.Provider>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel h-28 animate-pulse opacity-40" />
        ))}
      </div>
      <div className="panel h-72 animate-pulse opacity-30" />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="panel mt-10 p-8 text-center">
      <p className="text-[14px] font-medium text-ink">Could not open your workspace</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted">
        Your browser may be blocking local storage (IndexedDB). Check that you are not in a private
        window with storage disabled, then reload.
      </p>
    </div>
  );
}
