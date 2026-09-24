import { supabase } from "@/lib/supabase";
import type {
  PDCARow,
  PDCAActionRow,
  PDCAPhase,
  Priority,
  ActionStatus,
  PDCAHistoryRow,
} from "@/types/database";
import { PHASE_TO_PROGRESS } from "@/constants/options";

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return "Erreur inconnue";
  }
}

export interface ActionDraft {
  action: string;
  pilot_name: string;
  opening_date: string; // YYYY-MM-DD
  due_date: string | null;
  phase: PDCAPhase;
  status: ActionStatus;
}

export interface PDCADraft {
  subject: string;
  description: string | null;
  line: string;
  line_other: string | null;
  defect_type: string | null;
  defect_type_other: string | null;
  priority: Priority;
  department: string | null;
  actions: ActionDraft[];
}

export type PDCAWithActions = PDCARow & { pdca_actions: PDCAActionRow[] };

function makeReference(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  // Timestamp en base 36 (7 chars) + suffixe aléatoire (3 chars) — collision quasi impossible
  const ts = Date.now().toString(36).slice(-7).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `PDCA-${y}${m}-${ts}${rnd}`;
}

function groupActions(
  actions: PDCAActionRow[],
): Map<string, PDCAActionRow[]> {
  const byPdca = new Map<string, PDCAActionRow[]>();
  for (const a of actions) {
    const arr = byPdca.get(a.pdca_id) ?? [];
    arr.push(a);
    byPdca.set(a.pdca_id, arr);
  }
  return byPdca;
}

export async function listPDCA(): Promise<PDCAWithActions[]> {
  const { data: pdcas, error: e1 } = await supabase
    .from("pdca")
    .select("*")
    .order("created_at", { ascending: false });
  if (e1) throw e1;
  const parentRows = (pdcas ?? []) as PDCARow[];
  if (parentRows.length === 0) return [];

  const ids = parentRows.map((p) => p.id);
  const { data: actions, error: e2 } = await supabase
    .from("pdca_actions")
    .select("*")
    .in("pdca_id", ids);
  if (e2) throw e2;

  const byPdca = groupActions((actions ?? []) as PDCAActionRow[]);
  return parentRows.map((p) => ({
    ...p,
    pdca_actions: byPdca.get(p.id) ?? [],
  }));
}

export async function getPDCA(id: string): Promise<PDCAWithActions | null> {
  const { data: parent, error: e1 } = await supabase
    .from("pdca")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) throw e1;
  if (!parent) return null;

  const { data: actions, error: e2 } = await supabase
    .from("pdca_actions")
    .select("*")
    .eq("pdca_id", id)
    .order("created_at", { ascending: true });
  if (e2) throw e2;

  return {
    ...(parent as PDCARow),
    pdca_actions: (actions ?? []) as PDCAActionRow[],
  };
}


// Insert PDCA avec retry sur collision de référence (409)
async function insertPDCAWithRetry(payload: Record<string, unknown>, attempts = 3) {
  for (let i = 0; i < attempts; i += 1) {
    const ref = i === 0 ? (payload.reference as string) : makeReference();
    const { data, error } = await supabase
      .from("pdca")
      .insert({ ...payload, reference: ref })
      .select("*")
      .single();
    if (!error) return data;
    const isConflict = (error as { code?: string }).code === "23505" || /duplicate key/i.test(error.message ?? "");
    if (!isConflict || i === attempts - 1) throw error;
  }
  throw new Error("Impossible de générer une référence unique");
}

export async function createPDCA(
  draft: PDCADraft,
  userId: string,
): Promise<PDCAWithActions> {
  const pdca = await insertPDCAWithRetry({
      reference: makeReference(),
      subject: draft.subject,
      description: draft.description,
      line: draft.line,
      line_other: draft.line_other,
      defect_type: draft.defect_type,
      defect_type_other: draft.defect_type_other,
      priority: draft.priority,
      department: draft.department,
      status: "OPEN",
      created_by: userId,
    });
    const parentRow = pdca as PDCARow;

  const rows = draft.actions.map((a) => ({
    pdca_id: parentRow.id,
    action: a.action,
    pilot_name: a.pilot_name,
    opening_date: a.opening_date,
    due_date: a.due_date,
    phase: a.phase,
    progress: PHASE_TO_PROGRESS[a.phase],
    status: a.status,
  }));

  const { data: actions, error: aerr } = await supabase
    .from("pdca_actions")
    .insert(rows)
    .select("*");
  if (aerr) throw aerr;

  await supabase.from("pdca_history").insert({
    pdca_id: parentRow.id,
    user_id: userId,
    event_type: "PDCA_CREATED",
    new_value: parentRow.reference,
  });

  return {
    ...parentRow,
    pdca_actions: (actions ?? []) as PDCAActionRow[],
  };
}

export async function updateActionPhase(
  actionId: string,
  phase: PDCAPhase,
  userId: string,
  previousPhase: PDCAPhase,
): Promise<void> {
  const progress = PHASE_TO_PROGRESS[phase];
  const status: ActionStatus = phase === "A" ? "COMPLETED" : "IN_PROGRESS";
  const completed_at = phase === "A" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("pdca_actions")
    .update({ phase, progress, status, completed_at })
    .eq("id", actionId);
  if (error) throw error;

  await supabase.from("pdca_history").insert({
    action_id: actionId,
    user_id: userId,
    event_type: "PHASE_CHANGED",
    old_value: previousPhase,
    new_value: phase,
  });
}

export async function cancelPDCA(pdcaId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("pdca")
    .update({ status: "CANCELLED" })
    .eq("id", pdcaId);
  if (error) throw error;
  await supabase.from("pdca_history").insert({
    pdca_id: pdcaId,
    user_id: userId,
    event_type: "PDCA_CANCELLED",
  });
}

// ============================================================
// Phase 2 — department, pilot, history, cancelled actions
// ============================================================

export async function listPDCAByDepartment(
  department: string,
): Promise<PDCAWithActions[]> {
  const { data: pdcas, error: e1 } = await supabase
    .from("pdca")
    .select("*")
    .eq("department", department)
    .order("created_at", { ascending: false });
  if (e1) throw e1;
  const parentRows = (pdcas ?? []) as PDCARow[];
  if (parentRows.length === 0) return [];

  const ids = parentRows.map((p) => p.id);
  const { data: actions, error: e2 } = await supabase
    .from("pdca_actions")
    .select("*")
    .in("pdca_id", ids);
  if (e2) throw e2;

  const byPdca = groupActions((actions ?? []) as PDCAActionRow[]);
  return parentRows.map((p) => ({
    ...p,
    pdca_actions: byPdca.get(p.id) ?? [],
  }));
}

export interface PilotSummary {
  pilot_name: string;
  pdca_ids: string[];
  total_actions: number;
  open_actions: number;
  in_progress_actions: number;
  overdue_actions: number;
  completed_actions: number;
  cancelled_actions: number;
  completion_rate: number; // 0-100 (excludes cancelled)
}

export async function listPilotSummaries(): Promise<PilotSummary[]> {
  const { data, error } = await supabase.from("pdca_actions").select("*");
  if (error) throw error;

  const map = new Map<string, PilotSummary>();
  for (const row of (data ?? []) as PDCAActionRow[]) {
    const key = row.pilot_name?.trim() || "—";
    if (!map.has(key)) {
      map.set(key, {
        pilot_name: key,
        pdca_ids: [],
        total_actions: 0,
        open_actions: 0,
        in_progress_actions: 0,
        overdue_actions: 0,
        completed_actions: 0,
        cancelled_actions: 0,
        completion_rate: 0,
      });
    }
    const s = map.get(key)!;
    s.total_actions += 1;
    if (row.status === "OPEN") s.open_actions += 1;
    if (row.status === "IN_PROGRESS") s.in_progress_actions += 1;
    if (row.status === "OVERDUE") s.overdue_actions += 1;
    if (row.status === "COMPLETED") s.completed_actions += 1;
    if (row.status === "CANCELLED") s.cancelled_actions += 1;
    if (!s.pdca_ids.includes(row.pdca_id)) s.pdca_ids.push(row.pdca_id);
  }

  const list = Array.from(map.values());
  for (const s of list) {
    const active = s.total_actions - s.cancelled_actions;
    s.completion_rate = active > 0 ? Math.round((s.completed_actions / active) * 100) : 0;
  }

  return list.sort((a, b) => b.total_actions - a.total_actions);
}

export interface HistoryEntry extends PDCAHistoryRow {
  pdca_reference: string | null;
}

export async function listHistory(limit = 200): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from("pdca_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as PDCAHistoryRow[];
  const pdcaIds = Array.from(
    new Set(rows.map((r) => r.pdca_id).filter((x): x is string => !!x)),
  );
  let refs = new Map<string, string>();
  if (pdcaIds.length > 0) {
    const { data: pdcas, error: e2 } = await supabase
      .from("pdca")
      .select("id, reference")
      .in("id", pdcaIds);
    if (e2) throw e2;
    refs = new Map(
      ((pdcas ?? []) as { id: string; reference: string }[]).map((p) => [
        p.id,
        p.reference,
      ]),
    );
  }

  return rows.map((r) => ({
    ...r,
    pdca_reference: r.pdca_id ? refs.get(r.pdca_id) ?? null : null,
  }));
}

export interface CancelledAction extends PDCAActionRow {
  pdca_reference: string | null;
  pdca_subject: string | null;
}

export async function listCancelledActions(): Promise<CancelledAction[]> {
  const { data, error } = await supabase
    .from("pdca_actions")
    .select("*")
    .eq("status", "CANCELLED")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as PDCAActionRow[];
  const pdcaIds = Array.from(new Set(rows.map((r) => r.pdca_id)));
  let map = new Map<string, { reference: string; subject: string }>();
  if (pdcaIds.length > 0) {
    const { data: pdcas, error: e2 } = await supabase
      .from("pdca")
      .select("id, reference, subject")
      .in("id", pdcaIds);
    if (e2) throw e2;
    map = new Map(
      ((pdcas ?? []) as { id: string; reference: string; subject: string }[]).map(
        (p) => [p.id, { reference: p.reference, subject: p.subject }],
      ),
    );
  }

  return rows.map((r) => {
    const p = map.get(r.pdca_id);
    return {
      ...r,
      pdca_reference: p?.reference ?? null,
      pdca_subject: p?.subject ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Phase 5.2 — Edit action (pilot / due date) with mandatory comment
// ---------------------------------------------------------------------------

export interface ActionEditInput {
  pilot_name: string;
  due_date: string | null;
}

export async function updateActionWithComment(
  actionId: string,
  next: ActionEditInput,
  previous: ActionEditInput,
  comment: string,
  userId: string,
): Promise<void> {
  const trimmed = comment.trim();
  if (!trimmed) throw new Error("Un commentaire est requis pour justifier la modification.");

  const pilotChanged = next.pilot_name !== previous.pilot_name;
  const dateChanged = next.due_date !== previous.due_date;
  if (!pilotChanged && !dateChanged) throw new Error("Aucune modification à enregistrer.");

  // Récupère le pdca_id
  const { data: action, error: fetchErr } = await supabase
    .from("pdca_actions")
    .select("pdca_id")
    .eq("id", actionId)
    .single();
  if (fetchErr) throw fetchErr;
  const pdcaId = action?.pdca_id ?? null;

  // UPDATE
  const { error } = await supabase
    .from("pdca_actions")
    .update({
      pilot_name: next.pilot_name,
      due_date: next.due_date,
    })
    .eq("id", actionId);
  if (error) throw error;

  // INSERT history entries
  const events: Array<Record<string, unknown>> = [];
  if (pilotChanged) {
    events.push({
      pdca_id: pdcaId,
      action_id: actionId,
      user_id: userId,
      event_type: "PILOT_CHANGED",
      old_value: previous.pilot_name,
      new_value: next.pilot_name,
      comment: trimmed,
    });
  }
  if (dateChanged) {
    events.push({
      pdca_id: pdcaId,
      action_id: actionId,
      user_id: userId,
      event_type: "DUE_DATE_CHANGED",
      old_value: previous.due_date,
      new_value: next.due_date,
      comment: trimmed,
    });
  }

  const { error: e2 } = await supabase.from("pdca_history").insert(events);
  if (e2) throw e2;
}

// ---------------------------------------------------------------------------
// Phase 6 — Cancel action + Complete with lesson learned
// ---------------------------------------------------------------------------

export async function cancelActionWithComment(
  actionId: string,
  comment: string,
  userId: string,
): Promise<void> {
  const trimmed = comment.trim();
  if (!trimmed) throw new Error("Une raison d'annulation est requise.");

  // 1) Récupère l'action pour connaître son pdca_id
  const { data: action, error: fetchErr } = await supabase
    .from("pdca_actions")
    .select("id, pdca_id, action, status")
    .eq("id", actionId)
    .single();
  if (fetchErr) throw fetchErr;
  if (!action) throw new Error("Action introuvable.");
  if (action.status === "CANCELLED") return;

  // 2) UPDATE action status
  const { error: updErr } = await supabase
    .from("pdca_actions")
    .update({ status: "CANCELLED" })
    .eq("id", actionId);
  if (updErr) throw updErr;

  // 3) INSERT history avec pdca_id
  const { error: histErr } = await supabase.from("pdca_history").insert({
    pdca_id: action.pdca_id,
    action_id: actionId,
    user_id: userId,
    event_type: "ACTION_CANCELLED",
    old_value: action.status,
    new_value: "CANCELLED",
    comment: trimmed,
  });
  if (histErr) throw histErr;
}

export interface PhaseChangeOptions {
  actionId: string;
  phase: PDCAPhase;
  previousPhase: PDCAPhase;
  userId: string;
  comment?: string;
  completeStatus?: ActionStatus;
}

export async function applyPhaseChange(opts: PhaseChangeOptions): Promise<void> {
  const progress = PHASE_TO_PROGRESS[opts.phase];
  const isComplete = opts.phase === "A";
  const status: ActionStatus = isComplete ? (opts.completeStatus ?? "COMPLETED") : "IN_PROGRESS";
  const completed_at = isComplete ? new Date().toISOString() : null;

  // Récupère pdca_id
  const { data: action, error: fetchErr } = await supabase
    .from("pdca_actions")
    .select("pdca_id")
    .eq("id", opts.actionId)
    .single();
  if (fetchErr) throw fetchErr;
  const pdcaId = action?.pdca_id ?? null;

  const { error } = await supabase
    .from("pdca_actions")
    .update({ phase: opts.phase, progress, status, completed_at })
    .eq("id", opts.actionId);
  if (error) throw error;

  await supabase.from("pdca_history").insert({
    pdca_id: pdcaId,
    action_id: opts.actionId,
    user_id: opts.userId,
    event_type: isComplete ? "ACTION_COMPLETED" : "PHASE_CHANGED",
    old_value: opts.previousPhase,
    new_value: opts.phase,
    comment: opts.comment ?? null,
  });
}
