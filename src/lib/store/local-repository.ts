import { openDB, type IDBPDatabase } from "idb";
import type {
  AppData,
  AppSettings,
  ConversionProfile,
  CourseModule,
  ExamSettings,
  Material,
  PaperSource,
  QuestionAttempt,
  Sitting,
  Workspace,
} from "@/lib/domain/types";

const DB_NAME = "tmua-command-center";
const DB_VERSION = 1;

type StoreName =
  | "kv"
  | "sittings"
  | "sources"
  | "course"
  | "profiles"
  | "attempts"
  | "materials"
  | "blobs";

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore("kv");
        database.createObjectStore("sittings", { keyPath: "id" });
        database.createObjectStore("sources", { keyPath: "id" });
        database.createObjectStore("course", { keyPath: "id" });
        database.createObjectStore("profiles", { keyPath: "id" });
        database.createObjectStore("attempts", { keyPath: "id" });
        database.createObjectStore("materials", { keyPath: "id" });
        database.createObjectStore("blobs"); // key = string
      },
    });
  }
  return dbPromise;
}

async function putAll<T>(store: StoreName, rows: T[]): Promise<void> {
  const d = await db();
  const tx = d.transaction(store, "readwrite");
  await Promise.all(rows.map((r) => tx.store.put(r)));
  await tx.done;
}

async function clearStore(store: StoreName): Promise<void> {
  const d = await db();
  await d.clear(store);
}

export const localRepo = {
  async getWorkspace(): Promise<Workspace | null> {
    const d = await db();
    return (await d.get("kv", "workspace")) ?? null;
  },

  async loadAll(): Promise<AppData | null> {
    const d = await db();
    const workspace = (await d.get("kv", "workspace")) as Workspace | undefined;
    if (!workspace) return null;
    const exam = (await d.get("kv", "exam")) as ExamSettings;
    const settings = (await d.get("kv", "settings")) as AppSettings;
    const [sittings, sources, course, conversionProfiles, attempts, materials] = await Promise.all([
      d.getAll("sittings") as Promise<Sitting[]>,
      d.getAll("sources") as Promise<PaperSource[]>,
      d.getAll("course") as Promise<CourseModule[]>,
      d.getAll("profiles") as Promise<ConversionProfile[]>,
      d.getAll("attempts") as Promise<QuestionAttempt[]>,
      d.getAll("materials") as Promise<Material[]>,
    ]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      workspace,
      exam,
      settings,
      sittings,
      sources,
      course,
      conversionProfiles,
      attempts,
      materials,
    };
  },

  async initWorkspace(data: AppData): Promise<void> {
    const d = await db();
    await d.put("kv", data.workspace, "workspace");
    await d.put("kv", data.exam, "exam");
    await d.put("kv", data.settings, "settings");
    await putAll("sources", data.sources);
    await putAll("course", data.course);
    await putAll("profiles", data.conversionProfiles);
  },

  async saveKv(key: "exam" | "settings" | "workspace", value: unknown): Promise<void> {
    const d = await db();
    await d.put("kv", value, key);
  },

  putSitting: (s: Sitting) => db().then((d) => d.put("sittings", s)).then(() => undefined),
  deleteSitting: (id: string) => db().then((d) => d.delete("sittings", id)).then(() => undefined),
  putSource: (s: PaperSource) => db().then((d) => d.put("sources", s)).then(() => undefined),
  deleteSource: (id: string) => db().then((d) => d.delete("sources", id)).then(() => undefined),
  putModule: (m: CourseModule) => db().then((d) => d.put("course", m)).then(() => undefined),
  deleteModule: (id: string) => db().then((d) => d.delete("course", id)).then(() => undefined),
  putProfile: (p: ConversionProfile) => db().then((d) => d.put("profiles", p)).then(() => undefined),
  deleteProfile: (id: string) => db().then((d) => d.delete("profiles", id)).then(() => undefined),
  putMaterial: (m: Material) => db().then((d) => d.put("materials", m)).then(() => undefined),
  deleteMaterial: (id: string) => db().then((d) => d.delete("materials", id)).then(() => undefined),

  async putAttempts(rows: QuestionAttempt[]): Promise<void> {
    await putAll("attempts", rows);
  },
  async deleteAttemptsForSitting(sittingId: string): Promise<void> {
    const d = await db();
    const all = (await d.getAll("attempts")) as QuestionAttempt[];
    const tx = d.transaction("attempts", "readwrite");
    await Promise.all(all.filter((a) => a.sittingId === sittingId).map((a) => tx.store.delete(a.id)));
    await tx.done;
  },
  async putAttempt(a: QuestionAttempt): Promise<void> {
    const d = await db();
    await d.put("attempts", a);
  },

  // Blobs (uploaded PDFs live only on-device).
  async putBlob(key: string, blob: Blob): Promise<void> {
    const d = await db();
    await d.put("blobs", blob, key);
  },
  async getBlob(key: string): Promise<Blob | undefined> {
    const d = await db();
    return (await d.get("blobs", key)) as Blob | undefined;
  },
  async deleteBlob(key: string): Promise<void> {
    const d = await db();
    await d.delete("blobs", key);
  },

  /** Replace all structured data (used by import / sync pull). Blobs untouched. */
  async replaceAll(data: AppData): Promise<void> {
    const d = await db();
    await Promise.all([
      clearStore("sittings"),
      clearStore("sources"),
      clearStore("course"),
      clearStore("profiles"),
      clearStore("attempts"),
      clearStore("materials"),
    ]);
    await d.put("kv", data.workspace, "workspace");
    await d.put("kv", data.exam, "exam");
    await d.put("kv", data.settings, "settings");
    await putAll("sittings", data.sittings);
    await putAll("sources", data.sources);
    await putAll("course", data.course);
    await putAll("profiles", data.conversionProfiles);
    await putAll("attempts", data.attempts);
    await putAll("materials", data.materials);
  },

  async wipe(): Promise<void> {
    await Promise.all(
      (["kv", "sittings", "sources", "course", "profiles", "attempts", "materials", "blobs"] as StoreName[]).map(
        clearStore,
      ),
    );
  },
};

export type LocalRepo = typeof localRepo;
