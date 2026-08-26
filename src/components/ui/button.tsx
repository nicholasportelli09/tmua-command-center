"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "default" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "icon";

const base =
  "pressable inline-flex items-center justify-center gap-1.5 font-medium select-none disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-[#04101f] hover:bg-[#6fa9ff] shadow-[0_0_0_1px_rgba(91,157,255,0.35),0_6px_20px_-6px_rgba(91,157,255,0.5)]",
  default: "bg-panel-2 text-ink border border-line-strong hover:bg-raised hover:border-[#333c49]",
  subtle: "bg-raised/60 text-muted border border-line hover:text-ink hover:bg-raised",
  ghost: "text-muted hover:text-ink hover:bg-raised/70",
  danger: "bg-neg-soft text-neg border border-[#4a2226] hover:bg-[#3a1c1f]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md",
  md: "h-9.5 px-4 text-[13.5px] rounded-md",
  icon: "h-8 w-8 rounded-md",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "md", ...props },
  ref,
) {
  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
});
