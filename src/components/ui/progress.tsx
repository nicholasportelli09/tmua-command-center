import { cn } from "@/lib/utils/cn";

export function ProgressBar({
  value,
  max = 100,
  tone = "accent",
  className,
  trackClassName,
}: {
  value: number;
  max?: number;
  tone?: "accent" | "pos" | "warn" | "neg";
  className?: string;
  trackClassName?: string;
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const fill =
    tone === "pos" ? "bg-pos" : tone === "warn" ? "bg-warn" : tone === "neg" ? "bg-neg" : "bg-accent";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-raised", trackClassName)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fill, className)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  max = 100,
  size = 44,
  stroke = 4,
  tone = "accent",
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: "accent" | "pos" | "warn";
  children?: React.ReactNode;
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = tone === "pos" ? "var(--color-pos)" : tone === "warn" ? "var(--color-warn)" : "var(--color-accent)";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-raised)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.6s var(--ease-out)" }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
