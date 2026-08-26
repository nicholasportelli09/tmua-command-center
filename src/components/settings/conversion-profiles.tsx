"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import { useToast } from "@/components/ui/toast";
import type { ConversionProfile } from "@/lib/domain/types";
import { SettingsCard } from "./settings-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Field, Input, NumberInput } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/primitives";
import { SlidersHorizontal } from "lucide-react";

export function ConversionProfilesSection() {
  const { data, addProfile, updateProfile, deleteProfile } = useData();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ profile?: ConversionProfile } | null>(null);
  const [confirm, setConfirm] = useState<ConversionProfile | null>(null);
  const profiles = data!.conversionProfiles;

  return (
    <SettingsCard
      title="Scaled-score conversion tables"
      description="Estimated scaled scores are interpolated from these tables and always labelled Estimated — never presented as official. No conversion data is bundled; add tables from sources you trust, per year/sitting."
      footer={
        <Button variant="default" size="sm" onClick={() => setDialog({})}>
          <Plus className="h-3.5 w-3.5" /> Add table
        </Button>
      }
    >
      {profiles.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="No conversion tables yet"
          description="Until you add one, enter scaled estimates manually per sitting. Both are always marked Estimated."
          className="py-6"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {profiles.map((p) => (
            <div key={p.id} className="group flex items-center justify-between gap-3 rounded-md border border-line bg-base-2/40 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">{p.name}</p>
                <p className="text-[11.5px] text-faint">
                  {p.points.length} points{p.source ? ` · ${p.source}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => setDialog({ profile: p })} className="pressable rounded p-1.5 text-faint hover:bg-raised hover:text-ink" aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setConfirm(p)} className="pressable rounded p-1.5 text-faint hover:bg-neg-soft hover:text-neg" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <ProfileDialog
          profile={dialog.profile}
          onClose={() => setDialog(null)}
          onSave={(vals) => {
            if (dialog.profile) updateProfile(dialog.profile.id, vals);
            else addProfile(vals);
            toast({ title: "Conversion table saved", tone: "success" });
            setDialog(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteProfile(confirm.id)}
        title={`Delete "${confirm?.name ?? "table"}"?`}
      />
    </SettingsCard>
  );
}

type Row = { raw: string; scaled: string };

function ProfileDialog({
  profile,
  onClose,
  onSave,
}: {
  profile?: ConversionProfile;
  onClose: () => void;
  onSave: (v: Omit<ConversionProfile, "id">) => void;
}) {
  const [name, setName] = useState(profile?.name ?? "");
  const [year, setYear] = useState(profile?.year ? String(profile.year) : "");
  const [source, setSource] = useState(profile?.source ?? "");
  const [rows, setRows] = useState<Row[]>(
    profile?.points.length
      ? profile.points.map((p) => ({ raw: String(p.raw), scaled: String(p.scaled) }))
      : [
          { raw: "", scaled: "" },
          { raw: "", scaled: "" },
        ],
  );

  function setRow(i: number, key: keyof Row, val: string) {
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, [key]: val } : r)));
  }

  function save() {
    const points = rows
      .map((r) => ({ raw: Number(r.raw), scaled: Number(r.scaled) }))
      .filter((p) => Number.isFinite(p.raw) && Number.isFinite(p.scaled))
      .sort((a, b) => a.raw - b.raw);
    onSave({
      name: name.trim() || "Untitled",
      year: year ? Number(year) : null,
      source: source.trim(),
      note: "",
      points,
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={profile ? "Edit conversion table" : "Add conversion table"}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            Save table
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2021" autoFocus />
          </Field>
          <Field label="Year (optional)">
            <Input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="2021" />
          </Field>
        </div>
        <Field label="Source / provenance" hint="Where this mapping comes from — kept for your reference.">
          <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Official grade boundaries" />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[12px] font-medium text-muted">Raw /40 → scaled</p>
            <button onClick={() => setRows((r) => [...r, { raw: "", scaled: "" }])} className="pressable inline-flex items-center gap-1 text-[12px] text-accent hover:text-[#7fb4ff]">
              <Plus className="h-3.5 w-3.5" /> Add point
            </button>
          </div>
          <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <NumberInput value={r.raw} onChange={(e) => setRow(i, "raw", e.target.value)} placeholder="raw" className="h-8 text-[13px]" />
                <span className="text-faint">→</span>
                <NumberInput value={r.scaled} onChange={(e) => setRow(i, "scaled", e.target.value)} placeholder="scaled" className="h-8 text-[13px]" />
                <button onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))} className="pressable rounded p-1 text-faint hover:text-neg" aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
