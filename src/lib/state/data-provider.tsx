"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppData,
  AppSettings,
  ConversionProfile,
  CourseModule,
  ExamSettings,
  Material,
  PaperSource,
  PaperStatus,
  QuestionAttempt,
  ScaledSource,
  Sitting,
  SittingCategory,
} from "@/lib/domain/types";
import { computeTotal } from "@/lib/domain/calculations";
import { localRepo } from "@/lib/store/local-repository";
import { createInitialData } from "@/lib/store/seed";
import { getStoredKey, hashKey, storeKey } from "@/lib/store/workspace";
import { getSyncStatus, pullSnapshot, pushSnapshot } from "@/lib/store/sync";
import { newId } from "@/lib/utils/id";
import { todayISO } from "@/lib/utils/time";
import { DATA_VERSION } from "@/lib/domain/constants";

export interface LogSittingInput {
  date: string;
  category: SittingCategory;
  sourceId: string | null;
  sourceLabel: string;
  paper1: number | null;
  paper2: number | null;
  maxScore?: number;
  estimatedScaled?: number | null;
  scaledSource?: ScaledSource | null;
  conversionProfileId?: string | null;
  paper1DurationSec?: number | null;
  paper2DurationSec?: number | null;
  notes?: string | null;
}

type Status = "loading" | "ready" | "error";
export type SyncState = "disabled" | "idle" | "syncing" | "error";

interface DataContextValue {
  status: Status;
  data: AppData | null;
  todayISO: string;
  syncState: SyncState;
  syncNow: () => void;
  adoptWorkspaceKey: (key: string) => Promise<{ ok: boolean; error?: string }>;
  // sittings
  addSitting: (input: LogSittingInput) => Sitting;
  updateSitting: (id: string, patch: Partial<Sitting>) => void;
  deleteSitting: (id: string) => void;
  // sources
  addSource: (input: Omit<PaperSource, "id" | "order">) => void;
  updateSource: (id: string, patch: Partial<PaperSource>) => void;
  setPaperStatus: (id: string, paper: 1 | 2, status: PaperStatus) => void;
  deleteSource: (id: string) => void;
  // course
  addModule: (group: string, title: string) => void;
  updateModule: (id: string, patch: Partial<CourseModule>) => void;
  deleteModule: (id: string) => void;
  addWeek: () => void;
  // conversion
  addProfile: (p: Omit<ConversionProfile, "id">) => void;
  updateProfile: (id: string, patch: Partial<ConversionProfile>) => void;
  deleteProfile: (id: string) => void;
  // exam + settings
  updateExam: (patch: Partial<ExamSettings>) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  // attempts
  saveAttempts: (rows: QuestionAttempt[]) => void;
  updateAttempt: (id: string, patch: Partial<QuestionAttempt>) => void;
  // materials
  addMaterial: (meta: Omit<Material, "id" | "createdAt">, blob: Blob) => Promise<Material>;
  updateMaterial: (id: string, patch: Partial<Material>) => void;
  deleteMaterial: (id: string) => Promise<void>;
  getMaterialBlob: (id: string) => Promise<Blob | undefined>;
  // data management
  exportData: () => AppData;
  importData: (data: AppData) => Promise<void>;
  resetAll: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

// Shared boot promise so React Strict Mode's double-invoked effect (dev only)
// can't seed the workspace twice.
let bootPromise: Promise<AppData> | null = null;
async function bootWorkspace(): Promise<AppData> {
  const existing = await localRepo.loadAll();
  if (existing) return existing;
  const fresh = await createInitialData();
  await localRepo.initWorkspace(fresh);
  return fresh;
}
function getBoot(): Promise<AppData> {
  if (!bootPromise) bootPromise = bootWorkspace();
  return bootPromise;
}

function normalize(s: Sitting): Sitting {
  const total = s.category === "tmua" ? computeTotal(s.paper1, s.paper2) : s.total;
  const isComplete = s.category === "tmua" && s.paper1 !== null && s.paper2 !== null;
  return { ...s, total, isComplete };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<AppData | null>(null);
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;

  const [syncState, setSyncState] = useState<SyncState>("disabled");
  const configuredRef = useRef(false);
  const keyHashRef = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doPushRef = useRef<(() => void) | null>(null);

  const scheduleSync = useCallback(() => {
    if (!configuredRef.current || !keyHashRef.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => doPushRef.current?.(), 2500);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getBoot()
      .then((loaded) => {
        if (!cancelled) {
          setData(loaded);
          setStatus("ready");
        }
      })
      .catch((e) => {
        console.error("Failed to load workspace", e);
        bootPromise = null; // allow a retry on next mount
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback(
    (updater: (d: AppData) => AppData) => {
      const ts = new Date().toISOString();
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...updater(prev), lastMutatedAt: ts };
        dataRef.current = next;
        return next;
      });
      localRepo.saveKv("lastMutatedAt", ts);
      scheduleSync();
    },
    [scheduleSync],
  );

  // ---- Sittings ----
  const addSitting = useCallback(
    (input: LogSittingInput): Sitting => {
      const sitting = normalize({
        id: newId(),
        date: input.date,
        category: input.category,
        sourceId: input.sourceId,
        sourceLabel: input.sourceLabel,
        paper1: input.paper1,
        paper2: input.paper2,
        total: null,
        maxScore: input.maxScore ?? 40,
        estimatedScaled: input.estimatedScaled ?? null,
        scaledSource: input.scaledSource ?? null,
        conversionProfileId: input.conversionProfileId ?? null,
        paper1DurationSec: input.paper1DurationSec ?? null,
        paper2DurationSec: input.paper2DurationSec ?? null,
        notes: input.notes ?? null,
        isComplete: false,
        createdAt: new Date().toISOString(),
      });
      localRepo.putSitting(sitting);

      patch((d) => {
        let sources = d.sources;
        if (input.sourceId && input.category === "tmua") {
          sources = d.sources.map((src) => {
            if (src.id !== input.sourceId) return src;
            const updated: PaperSource = {
              ...src,
              paper1Status:
                input.paper1 !== null && src.paper1Status === "untouched"
                  ? "completed"
                  : src.paper1Status,
              paper2Status:
                input.paper2 !== null && src.paper2Status === "untouched"
                  ? "completed"
                  : src.paper2Status,
              linkedSittingId: sitting.id,
            };
            localRepo.putSource(updated);
            return updated;
          });
        }
        return { ...d, sittings: [...d.sittings, sitting], sources };
      });
      return sitting;
    },
    [patch],
  );

  const updateSitting = useCallback(
    (id: string, p: Partial<Sitting>) => {
      patch((d) => {
        const sittings = d.sittings.map((s) => {
          if (s.id !== id) return s;
          const merged = normalize({ ...s, ...p });
          localRepo.putSitting(merged);
          return merged;
        });
        return { ...d, sittings };
      });
    },
    [patch],
  );

  const deleteSitting = useCallback(
    (id: string) => {
      localRepo.deleteSitting(id);
      localRepo.deleteAttemptsForSitting(id);
      patch((d) => ({
        ...d,
        sittings: d.sittings.filter((s) => s.id !== id),
        attempts: d.attempts.filter((a) => a.sittingId !== id),
        sources: d.sources.map((src) =>
          src.linkedSittingId === id ? { ...src, linkedSittingId: null } : src,
        ),
      }));
    },
    [patch],
  );

  // ---- Sources ----
  const addSource = useCallback(
    (input: Omit<PaperSource, "id" | "order">) => {
      patch((d) => {
        const src: PaperSource = { ...input, id: newId(), order: d.sources.length };
        localRepo.putSource(src);
        return { ...d, sources: [...d.sources, src] };
      });
    },
    [patch],
  );

  const updateSource = useCallback(
    (id: string, p: Partial<PaperSource>) => {
      patch((d) => ({
        ...d,
        sources: d.sources.map((s) => {
          if (s.id !== id) return s;
          const merged = { ...s, ...p };
          localRepo.putSource(merged);
          return merged;
        }),
      }));
    },
    [patch],
  );

  const setPaperStatus = useCallback(
    (id: string, paper: 1 | 2, status: PaperStatus) => {
      updateSource(id, paper === 1 ? { paper1Status: status } : { paper2Status: status });
    },
    [updateSource],
  );

  const deleteSource = useCallback(
    (id: string) => {
      localRepo.deleteSource(id);
      patch((d) => ({ ...d, sources: d.sources.filter((s) => s.id !== id) }));
    },
    [patch],
  );

  // ---- Course ----
  const addModule = useCallback(
    (group: string, title: string) => {
      patch((d) => {
        const mod: CourseModule = {
          id: newId(),
          group,
          title,
          status: "not_started",
          order: d.course.length ? Math.max(...d.course.map((m) => m.order)) + 1 : 0,
        };
        localRepo.putModule(mod);
        return { ...d, course: [...d.course, mod] };
      });
    },
    [patch],
  );

  const updateModule = useCallback(
    (id: string, p: Partial<CourseModule>) => {
      patch((d) => ({
        ...d,
        course: d.course.map((m) => {
          if (m.id !== id) return m;
          const merged = { ...m, ...p };
          localRepo.putModule(merged);
          return merged;
        }),
      }));
    },
    [patch],
  );

  const deleteModule = useCallback(
    (id: string) => {
      localRepo.deleteModule(id);
      patch((d) => ({ ...d, course: d.course.filter((m) => m.id !== id) }));
    },
    [patch],
  );

  const addWeek = useCallback(() => {
    patch((d) => {
      const weeks = d.course
        .map((m) => m.group)
        .filter((g) => /^Week \d+$/.test(g))
        .map((g) => Number(g.replace("Week ", "")));
      const next = weeks.length ? Math.max(...weeks) + 1 : 1;
      const mod: CourseModule = {
        id: newId(),
        group: `Week ${next}`,
        title: "Module 1",
        status: "not_started",
        order: d.course.length ? Math.max(...d.course.map((m) => m.order)) + 1 : 0,
      };
      localRepo.putModule(mod);
      return { ...d, course: [...d.course, mod] };
    });
  }, [patch]);

  // ---- Conversion profiles ----
  const addProfile = useCallback(
    (p: Omit<ConversionProfile, "id">) => {
      patch((d) => {
        const profile: ConversionProfile = { ...p, id: newId() };
        localRepo.putProfile(profile);
        return { ...d, conversionProfiles: [...d.conversionProfiles, profile] };
      });
    },
    [patch],
  );

  const updateProfile = useCallback(
    (id: string, p: Partial<ConversionProfile>) => {
      patch((d) => ({
        ...d,
        conversionProfiles: d.conversionProfiles.map((cp) => {
          if (cp.id !== id) return cp;
          const merged = { ...cp, ...p };
          localRepo.putProfile(merged);
          return merged;
        }),
      }));
    },
    [patch],
  );

  const deleteProfile = useCallback(
    (id: string) => {
      localRepo.deleteProfile(id);
      patch((d) => ({ ...d, conversionProfiles: d.conversionProfiles.filter((p) => p.id !== id) }));
    },
    [patch],
  );

  // ---- Exam + settings ----
  const updateExam = useCallback(
    (p: Partial<ExamSettings>) => {
      patch((d) => {
        const exam = { ...d.exam, ...p };
        localRepo.saveKv("exam", exam);
        return { ...d, exam };
      });
    },
    [patch],
  );

  const updateSettings = useCallback(
    (p: Partial<AppSettings>) => {
      patch((d) => {
        const settings = { ...d.settings, ...p };
        localRepo.saveKv("settings", settings);
        return { ...d, settings };
      });
    },
    [patch],
  );

  // ---- Attempts ----
  const saveAttempts = useCallback(
    (rows: QuestionAttempt[]) => {
      if (rows.length === 0) return;
      localRepo.putAttempts(rows);
      patch((d) => {
        const ids = new Set(rows.map((r) => r.id));
        const kept = d.attempts.filter((a) => !ids.has(a.id));
        return { ...d, attempts: [...kept, ...rows] };
      });
    },
    [patch],
  );

  const updateAttempt = useCallback(
    (id: string, p: Partial<QuestionAttempt>) => {
      patch((d) => ({
        ...d,
        attempts: d.attempts.map((a) => {
          if (a.id !== id) return a;
          const merged = { ...a, ...p };
          localRepo.putAttempt(merged);
          return merged;
        }),
      }));
    },
    [patch],
  );

  // ---- Materials ----
  const addMaterial = useCallback(
    async (meta: Omit<Material, "id" | "createdAt">, blob: Blob): Promise<Material> => {
      const material: Material = { ...meta, id: newId(), createdAt: new Date().toISOString() };
      await localRepo.putBlob(material.id, blob);
      await localRepo.putMaterial(material);
      patch((d) => ({ ...d, materials: [...d.materials, material] }));
      return material;
    },
    [patch],
  );

  const updateMaterial = useCallback(
    (id: string, p: Partial<Material>) => {
      patch((d) => ({
        ...d,
        materials: d.materials.map((m) => {
          if (m.id !== id) return m;
          const merged = { ...m, ...p };
          localRepo.putMaterial(merged);
          return merged;
        }),
      }));
    },
    [patch],
  );

  const deleteMaterial = useCallback(
    async (id: string) => {
      await localRepo.deleteMaterial(id);
      await localRepo.deleteBlob(id);
      patch((d) => ({ ...d, materials: d.materials.filter((m) => m.id !== id) }));
    },
    [patch],
  );

  const getMaterialBlob = useCallback((id: string) => localRepo.getBlob(id), []);

  // ---- Data management ----
  const exportData = useCallback((): AppData => {
    const d = dataRef.current!;
    return { ...d, version: DATA_VERSION, exportedAt: new Date().toISOString() };
  }, []);

  const importData = useCallback(async (incoming: AppData) => {
    await localRepo.replaceAll(incoming);
    setData({ ...incoming });
  }, []);

  const resetAll = useCallback(async () => {
    await localRepo.wipe();
    const fresh = await createInitialData();
    await localRepo.initWorkspace(fresh);
    setData(fresh);
    if (configuredRef.current) {
      const k = getStoredKey();
      keyHashRef.current = k ? await hashKey(k) : null;
    }
  }, []);

  // ---- Cloud sync (automatic, newest-wins) ----
  const doPush = useCallback(async () => {
    if (!configuredRef.current || !keyHashRef.current) return;
    setSyncState("syncing");
    const res = await pushSnapshot(keyHashRef.current, exportData());
    setSyncState(res.ok ? "idle" : "error");
  }, [exportData]);
  doPushRef.current = () => void doPush();

  const runSync = useCallback(async () => {
    if (!configuredRef.current || !keyHashRef.current) return;
    setSyncState("syncing");
    const pull = await pullSnapshot(keyHashRef.current);
    if (pull.data) {
      const cloud = pull.data;
      const localTs = dataRef.current?.lastMutatedAt ?? "";
      const cloudTs = cloud.lastMutatedAt ?? "";
      // Newest wins: adopt the cloud copy only when it is strictly newer.
      if (!localTs || cloudTs > localTs) {
        await importData(cloud);
        setSyncState("idle");
        return;
      }
    }
    const push = await pushSnapshot(keyHashRef.current, exportData());
    setSyncState(push.ok ? "idle" : "error");
  }, [exportData, importData]);

  const adoptWorkspaceKey = useCallback(
    async (key: string): Promise<{ ok: boolean; error?: string }> => {
      const st = await getSyncStatus();
      if (!st.configured) return { ok: false, error: "Cloud sync isn't configured on the server." };
      const kh = await hashKey(key.trim());
      setSyncState("syncing");
      const pull = await pullSnapshot(kh);
      if (!pull.data) {
        setSyncState("idle");
        return { ok: false, error: pull.error ?? "No workspace found for that key." };
      }
      storeKey(key.trim());
      keyHashRef.current = kh;
      configuredRef.current = true;
      await importData(pull.data);
      setSyncState("idle");
      return { ok: true };
    },
    [importData],
  );

  // On load: detect config, then do one two-way sync (pull-merge or push).
  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    (async () => {
      const st = await getSyncStatus();
      if (cancelled) return;
      configuredRef.current = st.configured;
      if (!st.configured) return setSyncState("disabled");
      const key = getStoredKey();
      if (!key) return setSyncState("disabled");
      keyHashRef.current = await hashKey(key);
      if (cancelled) return;
      await runSync();
    })();
    return () => {
      cancelled = true;
    };
  }, [status, runSync]);

  const value = useMemo<DataContextValue>(
    () => ({
      status,
      data,
      todayISO: todayISO(),
      syncState,
      syncNow: () => void runSync(),
      adoptWorkspaceKey,
      addSitting,
      updateSitting,
      deleteSitting,
      addSource,
      updateSource,
      setPaperStatus,
      deleteSource,
      addModule,
      updateModule,
      deleteModule,
      addWeek,
      addProfile,
      updateProfile,
      deleteProfile,
      updateExam,
      updateSettings,
      saveAttempts,
      updateAttempt,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      getMaterialBlob,
      exportData,
      importData,
      resetAll,
    }),
    [
      status, data, syncState, runSync, adoptWorkspaceKey,
      addSitting, updateSitting, deleteSitting, addSource, updateSource,
      setPaperStatus, deleteSource, addModule, updateModule, deleteModule, addWeek, addProfile,
      updateProfile, deleteProfile, updateExam, updateSettings, saveAttempts, updateAttempt,
      addMaterial, updateMaterial, deleteMaterial, getMaterialBlob, exportData, importData, resetAll,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
