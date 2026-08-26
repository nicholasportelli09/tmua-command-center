"use client";

import { useState } from "react";
import { useData } from "@/lib/state/data-provider";
import { useToast } from "@/components/ui/toast";
import { SettingsCard } from "./settings-card";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput, Select } from "@/components/ui/form";
import { Segmented } from "@/components/ui/segmented";
import { formatExamDate, zonedWallTimeToUtc } from "@/lib/utils/time";
import type { PrepPhase } from "@/lib/domain/types";

const ZONES = [
  "Europe/Zurich",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Asia/Dubai",
];

export function ExamSettingsSection() {
  const { data, updateExam } = useData();
  const { toast } = useToast();
  const exam = data!.exam;

  const [name, setName] = useState(exam.examName);
  const [date, setDate] = useState(exam.localDate);
  const [time, setTime] = useState(exam.localTime);
  const [tz, setTz] = useState(exam.timezone);
  const [target, setTarget] = useState(String(exam.rawTarget));

  const zones = ZONES.includes(tz) ? ZONES : [tz, ...ZONES];
  const previewInstant = safeInstant(date, time, tz);

  function save() {
    const instant = zonedWallTimeToUtc(date, time, tz);
    const t = Math.max(0, Math.min(40, Number(target) || 0));
    updateExam({
      examName: name.trim() || "TMUA",
      localDate: date,
      localTime: time,
      timezone: tz,
      examInstantUtc: instant,
      rawTarget: t,
    });
    toast({ title: "Exam settings saved", tone: "success" });
  }

  return (
    <SettingsCard
      title="Exam"
      description="The countdown and phase logic anchor to this moment."
      footer={
        <Button variant="primary" size="sm" onClick={save}>
          Save exam
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Exam name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Raw target  /40">
            <NumberInput value={target} min={0} max={40} onChange={(e) => setTarget(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Local time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Timezone">
            <Select value={tz} onChange={(e) => setTz(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {previewInstant && (
          <p className="text-[12px] text-faint">
            Resolves to <span className="text-muted">{formatExamDate(previewInstant, tz)}</span> ({tz.replace("_", " ")})
          </p>
        )}
      </div>
    </SettingsCard>
  );
}

function safeInstant(date: string, time: string, tz: string): string | null {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
    return zonedWallTimeToUtc(date, time, tz);
  } catch {
    return null;
  }
}

export function PreferencesSection() {
  const { data, updateSettings } = useData();
  const { toast } = useToast();
  const settings = data!.settings;

  const winValue = settings.rollingWindow === 0 ? "all" : String(settings.rollingWindow);

  return (
    <SettingsCard
      title="Preferences"
      description="How the headline metric and recommendation phase behave."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-ink">Rolling window</p>
            <p className="text-[12px] text-muted">Sittings used for the current-level metric.</p>
          </div>
          <Segmented
            value={winValue}
            onChange={(v) => {
              updateSettings({ rollingWindow: v === "all" ? 0 : Number(v) });
              toast({ title: "Preference saved", tone: "success" });
            }}
            options={[
              { value: "3", label: "Last 3" },
              { value: "5", label: "Last 5" },
              { value: "all", label: "All" },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="text-[13px] font-medium text-ink">Preparation phase</p>
            <p className="text-[12px] text-muted">Auto follows your plan&apos;s dates. Override if needed.</p>
          </div>
          <div className="w-48">
            <Select
              value={settings.prepPhase}
              onChange={(e) => {
                updateSettings({ prepPhase: e.target.value as PrepPhase | "auto" });
                toast({ title: "Preference saved", tone: "success" });
              }}
            >
              <option value="auto">Auto (from dates)</option>
              <option value="sat_priority">SAT priority</option>
              <option value="tmua_primary">TMUA primary</option>
              <option value="final_mocks">Final mocks</option>
            </Select>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
