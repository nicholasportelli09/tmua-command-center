import { cn } from "@/lib/utils/cn";
import { Eyebrow, Panel } from "./primitives";

export function StatTile({
  label,
  value,
  unit,
  sub,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  accent?: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel className={cn("flex flex-col justify-between p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>{label}</Eyebrow>
        {accent}
      </div>
      <div className="mt-2.5 flex items-baseline gap-1">
        <span className="mono text-[26px] font-medium leading-none tracking-tight text-ink">{value}</span>
        {unit && <span className="mono text-[13px] text-faint">{unit}</span>}
      </div>
      {sub && <div className="mt-2 text-[12.5px] leading-tight">{sub}</div>}
    </Panel>
  );
}
