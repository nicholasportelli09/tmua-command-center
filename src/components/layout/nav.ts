import { Gauge, FileStack, Play, LineChart, GraduationCap } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: Gauge },
  { label: "Papers", href: "/papers", icon: FileStack },
  { label: "Practice", href: "/practice", icon: Play },
  { label: "Analytics", href: "/analytics", icon: LineChart },
  { label: "Course", href: "/course", icon: GraduationCap },
];
