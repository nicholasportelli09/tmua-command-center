"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Cloud,
  CloudOff,
  Copy,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useData } from "@/lib/state/data-provider";
import { useToast } from "@/components/ui/toast";
import { SettingsCard } from "./settings-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/confirm";
import { getStoredKey } from "@/lib/store/workspace";
import { exportCSV, exportJSON, parseImport } from "@/lib/store/backup";
import { cn } from "@/lib/utils/cn";

const STATUS: Record<string, { label: string; tone: string }> = {
  idle: { label: "Synced", tone: "text-pos" },
  syncing: { label: "Syncing…", tone: "text-accent" },
  error: { label: "Sync error", tone: "text-neg" },
  disabled: { label: "Local only", tone: "text-faint" },
};

export function WorkspaceSection() {
  const { syncState, syncNow, adoptWorkspaceKey } = useData();
  const { toast } = useToast();
  const [key, setKey] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [existingKey, setExistingKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    setKey(getStoredKey());
  }, [syncState]);

  const masked = key ? key.slice(0, 9) + "••••••••••" : "—";
  const on = syncState !== "disabled";
  const status = STATUS[syncState] ?? STATUS.disabled;

  async function copyKey() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      toast({ title: "Sync key copied", description: "Keep it private — it's the key to your data.", tone: "success" });
    } catch {
      toast({ title: "Couldn't copy", description: "Reveal the key and copy it manually.", tone: "warn" });
    }
  }

  async function confirmAdopt() {
    if (!pendingKey) return;
    setBusy(true);
    const res = await adoptWorkspaceKey(pendingKey);
    setBusy(false);
    if (res.ok) {
      setKey(getStoredKey());
      setExistingKey("");
      toast({ title: "Workspace loaded", description: "This device now shares that workspace.", tone: "success" });
    } else {
      toast({ title: "Couldn't load workspace", description: res.error, tone: "warn" });
    }
    setPendingKey(null);
  }

  return (
    <SettingsCard
      title="Workspace & sync"
      description={
        on
          ? "Automatic cloud sync: your data is pulled when you open the app and saved after every change. Use the same sync key on another device to share this workspace."
          : "Your data is stored locally on this device. Cloud sync is off — move data with Export/Import below, or configure Supabase to sync."
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[12px] font-medium text-muted">Your private sync key</p>
            {on ? (
              <Badge tone="pos"><Cloud className="h-3 w-3" /> Auto-sync on</Badge>
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

        {on && (
          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className={cn("inline-flex items-center gap-1.5 text-[12.5px]", status.tone)}>
              <RefreshCw className={cn("h-3.5 w-3.5", syncState === "syncing" && "animate-spin")} />
              {status.label}
            </span>
            <Button variant="subtle" size="sm" onClick={syncNow} disabled={syncState === "syncing"}>
              Sync now
            </Button>
          </div>
        )}

        <div className="border-t border-line pt-4">
          <Field
            label="Use an existing workspace"
            hint={
              on
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
              <Button
                variant="default"
                size="sm"
                onClick={() => setPendingKey(existingKey.trim())}
                disabled={busy || !existingKey.trim() || !on}
              >
                <Check className="h-3.5 w-3.5" /> Load
              </Button>
            </div>
          </Field>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingKey}
        onClose={() => setPendingKey(null)}
        onConfirm={confirmAdopt}
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
        setPendingImport(parseImport(String(reader.result)));
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
