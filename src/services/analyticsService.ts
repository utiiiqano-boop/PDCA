import type { PDCAWithActions } from "@/services/pdcaService";
import type { PDCAPhase, Priority } from "@/types/database";
import { PHASE_TO_PROGRESS } from "@/constants/options";

export interface Datum {
  label: string;
  value: number;
  color?: string;
}

/** Maps an option ID to its current label (may be undefined if not found). */
export type LabelResolver = (id: string | null | undefined, fallback: string) => string;

const identityResolver: LabelResolver = (_id, fallback) => fallback;

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "#16a34a",
  MEDIUM: "#f59e0b",
  HIGH: "#dc2626",
};

const PHASE_COLORS: Record<PDCAPhase, string> = {
  P: "#0f4c81",
  D: "#0284c7",
  C: "#f59e0b",
  A: "#16a34a",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
};

export function pdcaByDepartment(
  items: PDCAWithActions[],
  resolve: LabelResolver = identityResolver,
): Datum[] {
  const map = new Map<string, number>();
  for (const p of items) {
    const key = resolve(p.department_id, p.department ?? "—");
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function pdcaByPriority(items: PDCAWithActions[]): Datum[] {
  const map = new Map<Priority, number>();
  for (const p of items) {
    map.set(p.priority, (map.get(p.priority) ?? 0) + 1);
  }
  return (["HIGH", "MEDIUM", "LOW"] as Priority[]).map((pr) => ({
    label: PRIORITY_LABELS[pr],
    value: map.get(pr) ?? 0,
    color: PRIORITY_COLORS[pr],
  }));
}

export function pdcaByDefectType(
  items: PDCAWithActions[],
  resolve: LabelResolver = identityResolver,
): Datum[] {
  const map = new Map<string, number>();
  for (const p of items) {
    const key = resolve(
      p.defect_type_id,
      p.defect_type ?? "Non renseigné",
    );
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function actionsByPhase(items: PDCAWithActions[]): Datum[] {
  const map: Record<PDCAPhase, number> = { P: 0, D: 0, C: 0, A: 0 };
  for (const p of items) {
    for (const a of p.pdca_actions) {
      map[a.phase] += 1;
    }
  }
  return (["P", "D", "C", "A"] as PDCAPhase[]).map((ph) => ({
    label: `${ph} — ${PHASE_TO_PROGRESS[ph]}%`,
    value: map[ph],
    color: PHASE_COLORS[ph],
  }));
}

export function completedVsOverdue(items: PDCAWithActions[]): Datum[] {
  let completed = 0;
  let overdue = 0;
  let other = 0;
  for (const p of items) {
    for (const a of p.pdca_actions) {
      if (a.status === "COMPLETED") completed += 1;
      else if (a.status === "OVERDUE") overdue += 1;
      else if (a.status !== "CANCELLED") other += 1;
    }
  }
  return [
    { label: "Terminées", value: completed, color: "#16a34a" },
    { label: "En retard", value: overdue, color: "#dc2626" },
    { label: "En cours", value: other, color: "#0f4c81" },
  ];
}

export function monthlyCreations(items: PDCAWithActions[], months = 6): Datum[] {
  const now = new Date();
  const slots: { key: string; label: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    slots.push({ key, label, value: 0 });
  }
  const byKey = new Map(slots.map((s) => [s.key, s]));
  for (const p of items) {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const slot = byKey.get(key);
    if (slot) slot.value += 1;
  }
  return slots.map((s) => ({ label: s.label, value: s.value }));
}

export function avgCompletionDays(items: PDCAWithActions[]): number {
  const durations: number[] = [];
  for (const p of items) {
    for (const a of p.pdca_actions) {
      if (a.status === "COMPLETED" && a.completed_at) {
        const start = new Date(a.opening_date).getTime();
        const end = new Date(a.completed_at).getTime();
        const days = (end - start) / (1000 * 60 * 60 * 24);
        if (days >= 0 && days < 3650) durations.push(days);
      }
    }
  }
  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((s, n) => s + n, 0) / durations.length);
}
