import type { AppData, Sitting } from "@/lib/domain/types";
import { DATA_VERSION } from "@/lib/domain/constants";

export function downloadText(filename: string, text: string, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJSON(data: AppData) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(`tmua-backup-${stamp}.json`, JSON.stringify(data, null, 2));
}

const CSV_COLS: (keyof Sitting)[] = [
  "date", "category", "sourceLabel", "paper1", "paper2", "total", "maxScore", "estimatedScaled", "notes",
];

export function exportCSV(sittings: Sitting[]) {
  const header = CSV_COLS.join(",");
  const rows = sittings
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((s) =>
      CSV_COLS.map((c) => {
        const v = s[c];
        if (v === null || v === undefined) return "";
        const str = String(v);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(","),
    );
  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(`tmua-results-${stamp}.csv`, [header, ...rows].join("\n"), "text/csv");
}

/** Parse + lightly validate an imported backup. Throws with a readable message. */
export function parseImport(text: string): AppData {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const d = obj as Partial<AppData>;
  if (!d || typeof d !== "object" || !d.workspace || !Array.isArray(d.sittings) || !d.exam) {
    throw new Error("This doesn't look like a TMUA Command Center backup.");
  }
  return {
    version: d.version ?? DATA_VERSION,
    exportedAt: d.exportedAt ?? new Date().toISOString(),
    workspace: d.workspace,
    exam: d.exam,
    settings: d.settings ?? { rollingWindow: 3, prepPhase: "auto" },
    sittings: d.sittings ?? [],
    sources: d.sources ?? [],
    course: d.course ?? [],
    conversionProfiles: d.conversionProfiles ?? [],
    attempts: d.attempts ?? [],
    materials: d.materials ?? [],
  };
}
