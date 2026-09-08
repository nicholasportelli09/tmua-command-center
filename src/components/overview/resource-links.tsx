import { ArrowUpRight, GraduationCap, Sigma } from "lucide-react";
import { Eyebrow, Panel } from "@/components/ui/primitives";

interface ResourceLink {
  href: string;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LINKS: ResourceLink[] = [
  {
    href: "/tmua-formula-sheet.pdf",
    label: "Formula sheet",
    sub: "Official reference · PDF",
    icon: Sigma,
  },
  {
    href: "https://www.clementinewade.co.uk/products/tmua-admission-course",
    label: "Clementine Wade course",
    sub: "clementinewade.co.uk",
    icon: GraduationCap,
  },
];

export function ResourceLinks() {
  return (
    <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
      <Eyebrow>Resources</Eyebrow>
      <div className="grid grid-cols-1 gap-2 sm:w-[560px] sm:grid-cols-2">
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="pressable group flex items-center gap-3 rounded-md border border-line-strong bg-panel-2 px-3 py-2.5 transition-colors hover:border-[#333c49] hover:bg-raised"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent ring-1 ring-[#22345a]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{l.label}</span>
                <span className="block truncate text-[11.5px] text-faint">{l.sub}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-accent" />
            </a>
          );
        })}
      </div>
    </Panel>
  );
}
