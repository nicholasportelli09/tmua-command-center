import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { signed, deltaTone } from "@/lib/utils/format";

export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("panel", className)} {...props}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

export function SectionHeader({
  title,
  right,
  className,
}: {
  title: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <Eyebrow>{title}</Eyebrow>
      {right}
    </div>
  );
}

const badgeTones: Record<string, string> = {
  faint: "bg-raised/60 text-faint border-line",
  accent: "bg-accent-soft text-accent border-[#22345a]",
  pos: "bg-pos-soft text-pos border-[#16402f]",
  neg: "bg-neg-soft text-neg border-[#4a2226]",
  warn: "bg-warn-soft text-warn border-[#463913]",
};

export function Badge({
  tone = "faint",
  children,
  className,
}: {
  tone?: keyof typeof badgeTones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Signed delta with tone + directional arrow. `invert` when lower is better. */
export function Delta({
  value,
  suffix = "",
  digits = 1,
  invert = false,
  className,
  showArrow = true,
}: {
  value: number | null | undefined;
  suffix?: string;
  digits?: number;
  invert?: boolean;
  className?: string;
  showArrow?: boolean;
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={cn("text-faint", className)}>—</span>;
  }
  const rawTone = deltaTone(value);
  const tone = invert
    ? rawTone === "pos"
      ? "neg"
      : rawTone === "neg"
        ? "pos"
        : "flat"
    : rawTone;
  const color = tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-faint";
  const Arrow = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("mono inline-flex items-center gap-0.5 text-[12.5px] font-medium", color, className)}>
      {showArrow && tone !== "flat" && <Arrow className="h-3.5 w-3.5" />}
      {signed(value, digits)}
      {suffix}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-raised/50 text-faint">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-[13.5px] font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}
