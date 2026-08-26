"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "default" | "success" | "warn";
interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: Tone;
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string; tone?: Tone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, tone: "default", ...t }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "warn" ? AlertTriangle : Info;
  const tone =
    toast.tone === "success" ? "text-pos" : toast.tone === "warn" ? "text-warn" : "text-accent";

  return (
    <div
      className="dialog-in pointer-events-auto flex items-start gap-3 rounded-md border border-line-strong bg-panel-2/95 p-3 pr-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur"
      role="status"
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-tight text-ink">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[12px] leading-snug text-muted">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="pressable rounded-xs p-1 text-faint hover:text-ink"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
