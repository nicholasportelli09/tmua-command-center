"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[12px] font-medium text-muted">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-[11.5px] leading-snug text-faint">{hint}</p>}
    </div>
  );
}

const inputClass =
  "h-9.5 w-full rounded-md border border-line-strong bg-base-2 px-3 text-[13.5px] text-ink placeholder:text-faint transition-colors focus:border-accent/70 focus:outline-none";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  },
);

export const NumberInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function NumberInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        className={cn(inputClass, "mono text-center text-[15px] tracking-tight", className)}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[76px] w-full resize-y rounded-md border border-line-strong bg-base-2 px-3 py-2 text-[13px] text-ink placeholder:text-faint transition-colors focus:border-accent/70 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          inputClass,
          "cursor-pointer appearance-none pr-9 [&>option]:bg-panel-2 [&>option]:text-ink",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
    </div>
  );
});
