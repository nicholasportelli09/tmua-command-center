"use client";

import { Flag } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const LETTERS = ["A", "B", "C", "D", "E"] as const;

export function AnswerGrid({
  count,
  values,
  onSelect,
  flags,
  onFlag,
  current,
  onFocusRow,
  mode = "answer",
}: {
  count: number;
  values: (string | null)[];
  onSelect: (index: number, letter: string) => void;
  flags?: boolean[];
  onFlag?: (index: number) => void;
  current?: number;
  onFocusRow?: (index: number) => void;
  mode?: "answer" | "key";
}) {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: count }).map((_, i) => {
        const active = current === i;
        return (
          <div
            key={i}
            onMouseDown={() => onFocusRow?.(i)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors",
              active ? "border-accent/50 bg-accent-soft/40" : "border-transparent hover:bg-raised/30",
            )}
          >
            <span className={cn("mono w-6 shrink-0 text-center text-[12px]", active ? "text-accent" : "text-faint")}>
              {i + 1}
            </span>
            <div className="flex flex-1 gap-1">
              {LETTERS.map((letter) => {
                const selected = values[i] === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => onSelect(i, letter)}
                    className={cn(
                      "pressable h-7 flex-1 rounded-[6px] border text-[12px] font-medium transition-colors",
                      selected
                        ? mode === "key"
                          ? "border-[#16402f] bg-pos-soft text-pos"
                          : "border-accent bg-accent text-[#04101f]"
                        : "border-line bg-base-2 text-muted hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            {onFlag && (
              <button
                onClick={() => onFlag(i)}
                className={cn(
                  "pressable shrink-0 rounded p-1.5 transition-colors",
                  flags?.[i] ? "text-warn" : "text-faint hover:text-muted",
                )}
                aria-label="Flag"
              >
                <Flag className="h-3.5 w-3.5" fill={flags?.[i] ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
