"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import { useToast } from "@/components/ui/toast";
import type { Material, PaperType } from "@/lib/domain/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput, Select } from "@/components/ui/form";
import { PAPER_TYPES } from "@/lib/domain/taxonomy";
import { cn } from "@/lib/utils/cn";

export function UploadDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Material | null;
}) {
  const { addMaterial, updateMaterial } = useData();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<PaperType>("official_tmua");
  const [count, setCount] = useState("20");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset when opened
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setFile(null);
      setName(editing?.name ?? "");
      setType(editing?.type ?? "official_tmua");
      setCount(String(editing?.questionCount ?? 20));
      setError(null);
    }
  }

  function pick(f: File | undefined) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    setFile(f);
    setError(null);
    if (!name) setName(f.name.replace(/\.pdf$/i, ""));
  }

  async function save() {
    if (!name.trim()) return setError("Give this paper a name.");
    const qc = Math.max(1, Math.min(50, Number(count) || 20));
    setBusy(true);
    try {
      if (editing) {
        updateMaterial(editing.id, { name: name.trim(), type, questionCount: qc });
      } else {
        if (!file) {
          setBusy(false);
          return setError("Choose a PDF to upload.");
        }
        await addMaterial(
          {
            name: name.trim(),
            type,
            fileName: file.name,
            mimeType: file.type || "application/pdf",
            sizeBytes: file.size,
            questionCount: qc,
            answerKey: null,
          },
          file,
        );
      }
      toast({ title: editing ? "Material updated" : "PDF added", tone: "success" });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit material" : "Add a practice PDF"}
      description={editing ? undefined : "Upload a paper you legally have. It stays on this device."}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={busy}>
            {editing ? "Save" : "Add material"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {!editing && (
          <button
            onClick={() => fileRef.current?.click()}
            className={cn(
              "pressable flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-center transition-colors",
              file ? "border-accent/50 bg-accent-soft/30" : "border-line-strong bg-base-2/50 hover:border-line-strong hover:bg-raised/40",
            )}
          >
            <FileUp className={cn("h-5 w-5", file ? "text-accent" : "text-faint")} />
            <span className="text-[13px] text-ink">{file ? file.name : "Choose a PDF"}</span>
            <span className="text-[11.5px] text-faint">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "TMUA, MAT or your own practice paper"}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TMUA 2019 Paper 1" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as PaperType)}>
              {PAPER_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Questions">
            <NumberInput value={count} min={1} max={50} onChange={(e) => setCount(e.target.value)} />
          </Field>
        </div>
        {error && <p className="text-[12.5px] text-neg">{error}</p>}
      </div>
    </Dialog>
  );
}
