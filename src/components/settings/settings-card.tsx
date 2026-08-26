import { Panel } from "@/components/ui/primitives";

export function SettingsCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Panel>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
    </Panel>
  );
}
