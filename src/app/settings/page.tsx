"use client";

import { useData } from "@/lib/state/data-provider";
import { PageHeader } from "@/components/layout/page-header";
import { ExamSettingsSection, PreferencesSection } from "@/components/settings/exam-and-prefs";
import { ConversionProfilesSection } from "@/components/settings/conversion-profiles";
import { DataSection, WorkspaceSection } from "@/components/settings/workspace-and-data";

export default function SettingsPage() {
  const { data } = useData();
  if (!data) return null;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" subtitle="Exam, preferences, conversion tables, and your data." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <ExamSettingsSection />
          <PreferencesSection />
          <ConversionProfilesSection />
        </div>
        <div className="flex flex-col gap-5">
          <WorkspaceSection />
          <DataSection />
        </div>
      </div>
    </div>
  );
}
