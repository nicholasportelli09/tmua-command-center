"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Cloud, CloudOff, Download, Eye, EyeOff, Upload, RotateCcw } from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import { useToast } from "@/components/ui/toast";
import { SettingsCard } from "./settings-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/confirm";
import { getStoredKey, hashKey, storeKey } from "@/lib/store/workspace";
import { getSyncStatus, pullSnapshot, pushSnapshot } from "@/lib/store/sync";
import { exportCSV, exportJSON, parseImport } from "@/lib/store/backup";

export function WorkspaceSection() {
  const { data, exportData, importData } = useData();
  const { toast } = useToast();
  const [key, setKey] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [existingKey, setExistingKey] = useState("");
  const [pendingRestore, setPendingRestore] = useState<null | { source: "cloud"; key: string }>(null);

  useEffect(() => {
    setKey(getStoredKey());
    getSyncStatus().then((s) => setConfigured(s.configured));
  }, []);

  const masked = key ? key.slice(0, 9) + "••••••••••" : "—";

  async function copyKey() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      toast({ title: "Sync key copied", description: "Keep it private — it's the key to your data.", tone: "success" });
    } catch {
      toast({ title: "Couldn't copy", description: "Reveal the key and copy it manually.", tone: "warn" });
    }
  }

  async function backupNow() {
    if (!key || !data) return;
    setBusy(true);
    const hash = await hashKey(key);
    const res = await pushSnapshot(hash, exportData());
    setBusy(false);
    toast(res.ok ? { title: "Backed up to cloud", tone: "success" } : { title: "Backup failed", description: res.error, tone: "warn" });
  }

  async function restoreNow() {
    if (!key) return;
    setBusy(true);
    const hash = await hashKey(key);
    const res = await pullSnapshot(hash);
    setBusy(false);
    if (res.data) {
      await importData(res.data);
      toast({ title: "Restored from cloud", tone: "success" });
    } else {
      toast({ title: "Nothing to restore", description: res.error ?? "No snapshot found for this key.", tone: "warn" });
    }
  }

  async function useExisting() {
    const k = existingKey.trim();
    if (!k) return;
    if (!configured) {
      toast({
        title: "Cloud sync not configured",
        description: "Import a JSON backup below to move data between devices.",
        tone: "warn",
      });
      return;
    }
    setPendingRestore({ source: "cloud", key: k });
  }

  async function confirmUseExisting() {
    if (!pendingRestore) return;
    setBusy(true);
    const hash = await hashKey(pendingRestore.key);
    const res = await pullSnapshot(hash);
    setBusy(false);
    if (res.data) {
      storeKey(pendingRestore.key);
      await importData(res.data);
      setKey(pendingRestore.key);
      setExistingKey("");
      toast({ title: "Workspace loaded", description: "This device now uses that workspace.", tone: "success" });
    } else {
      toast({ title: "No workspace found", description: res.error ?? "Check the key and try again.", tone: "warn" });
    }
    setPendingRestore(null);
  }

  return (
    <SettingsCard
      title="Workspace & sync"
      description="Your data lives locally on this device. The private sync key lets you carry it to another device."
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[12px] font-medium text-muted">Your private sync key</p>
            {configured === null ? null : configured ? (
              <Badge tone="pos"><Cloud className="h-3 w-3" /> Cloud sync on</Badge>
            ) : (
              <Badge tone="faint"><CloudOff className="h-3 w-3" /> Local only</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="mono flex-1 truncate rounded-md border border-line bg-base-2 px-3 py-2 text-[12.5px] text-ink">
              {reveal ? key ?? "—" : masked}
            </code>
            <Button variant="subtle" size="icon" onClick={() => setReveal((v) => !v)} aria-label="Reveal">
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="default" size="icon" onClick={copyKey} aria-label="Copy">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {configured && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button variant="default" size="sm" onClick={backupNow} disabled={busy}>
              <Cloud className="h-3.5 w-3.5" /> Back up now
            </Button>
            <Button variant="subtle" size="sm" onClick={restoreNow} disabled={busy}>
              <Download className="h-3.5 w-3.5" /> Restore from cloud
            </Button>
          </div>
        )}

        <div className="border-t border-line pt-4">
          <Field
            label="Use an existing workspace"
            hint={
              configured
                ? "Enter a sync key from another device to load its workspace here (replaces local data)."
                : "Cloud sync isn't configured, so use Import below to move a backup between devices."
            }
          >
            <div className="flex gap-2">
              <Input
                value={existingKey}
                onChange={(e) => setExistingKey(e.target.value)}
                placeholder="TMUA-XXXX-XXXX-…"
                className="mono flex-1"
              />
              <Button variant="default" size="sm" onClick={useExisting} disabled={busy || !existingKey.trim()}>
                <Check className="h-3.5 w-3.5" /> Load
              </Button>
            </div>
          </Field>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingRestore}
        onClose={() => setPendingRestore(null)}
        onConfirm={confirmUseExisting}
        title="Replace this device's data?"
        description="Loading another workspace will overwrite the results currently on this device."
        confirmLabel="Load workspace"
        danger
      />
    </SettingsCard>
  );
}

export function DataSection() {
  const { data, exportData, importData, resetAll } = useData();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseImport> | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseImport(String(reader.result));
        setPendingImport(parsed);
      } catch (err) {
        toast({ title: "Import failed", description: (err as Error).message, tone: "warn" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <SettingsCard
      title="Data"
      description="Everything is stored locally and survives refreshes. Back it up or move it any time."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="default" size="sm" onClick={() => exportJSON(exportData())}>
            <Download className="h-3.5 w-3.5" /> Export JSON
          </Button>
          <Button variant="subtle" size="sm" onClick={() => data && exportCSV(data.sittings)}>
            <Download className="h-3.5 w-3.5" /> Export results CSV
          </Button>
          <Button variant="subtle" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Import backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border border-[#3a2226] bg-neg-soft/40 px-3 py-2.5">
          <div>
            <p className="text-[12.5px] font-medium text-ink">Reset workspace</p>
            <p className="text-[11.5px] text-muted">Wipes all local data and starts a new workspace.</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        onConfirm={async () => {
          if (pendingImport) {
            await importData(pendingImport);
            toast({ title: "Backup imported", tone: "success" });
          }
        }}
        title="Import this backup?"
        description="This replaces all data currently on this device."
        confirmLabel="Import & replace"
        danger
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={async () => {
          await resetAll();
          toast({ title: "Workspace reset", tone: "success" });
        }}
        title="Reset everything?"
        description="All results, tracker state and course progress on this device will be erased."
        confirmLabel="Reset workspace"
        danger
      />
    </SettingsCard>
  );
}
