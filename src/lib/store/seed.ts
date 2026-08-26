import type { AppData, CourseModule, PaperSource } from "@/lib/domain/types";
import {
  DATA_VERSION,
  DEFAULT_EXAM,
  DEFAULT_SETTINGS,
  SEED_COURSE,
  SEED_PAPER_SOURCES,
} from "@/lib/domain/constants";
import { generateWorkspaceKey, newId } from "@/lib/utils/id";
import { hashKey, storeKey } from "./workspace";

export function seedSources(): PaperSource[] {
  return SEED_PAPER_SOURCES.map((def, i) => ({
    id: newId(),
    name: def.name,
    year: def.year,
    type: def.type,
    official: def.official,
    order: i,
    paper1Status: "untouched",
    paper2Status: "untouched",
    linkedSittingId: null,
    editable: true,
  }));
}

export function seedCourse(): CourseModule[] {
  const mods: CourseModule[] = [];
  let order = 0;
  for (const week of SEED_COURSE) {
    for (const title of week.titles) {
      mods.push({ id: newId(), group: week.group, title, status: "not_started", order: order++ });
    }
  }
  return mods;
}

/** Build a fresh workspace on first use, storing the raw key on-device. */
export async function createInitialData(): Promise<AppData> {
  const key = generateWorkspaceKey();
  storeKey(key);
  const keyHash = await hashKey(key);
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    lastMutatedAt: new Date().toISOString(),
    workspace: { id: newId(), createdAt: new Date().toISOString(), keyHash },
    exam: { ...DEFAULT_EXAM },
    settings: { ...DEFAULT_SETTINGS },
    sittings: [],
    sources: seedSources(),
    course: seedCourse(),
    conversionProfiles: [],
    attempts: [],
    materials: [],
  };
}
