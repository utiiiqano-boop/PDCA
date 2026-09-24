import { supabase } from "@/lib/supabase";
import {
  CompanyOption,
  OptionKind,
  OPTION_KIND_TABLE,
} from "@/types/companyOptions";

function tableFor(kind: OptionKind): string {
  return OPTION_KIND_TABLE[kind];
}

/**
 * List options for a company.
 * @param includeInactive - if true, returns disabled options too (used in Admin UI)
 */
export async function listOptions(
  kind: OptionKind,
  companyId: string,
  includeInactive = false,
): Promise<CompanyOption[]> {
  let query = supabase
    .from(tableFor(kind))
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CompanyOption[];
}

/**
 * Create a new option with the next sort_order (max + 1).
 */
export async function createOption(
  kind: OptionKind,
  companyId: string,
  label: string,
): Promise<CompanyOption> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Le libellé ne peut pas être vide.");

  // Get the current max sort_order
  const { data: existing, error: listErr } = await supabase
    .from(tableFor(kind))
    .select("sort_order")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (listErr) throw listErr;

  const first = existing?.[0];
  const nextOrder = first && typeof first.sort_order === "number"
    ? first.sort_order + 1
    : 0;

  const { data, error } = await supabase
    .from(tableFor(kind))
    .insert({
      company_id: companyId,
      label: trimmed,
      sort_order: nextOrder,
      active: true,
      is_default: false,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("Ce libellé existe déjà dans votre entreprise.");
    }
    throw error;
  }
  return data as CompanyOption;
}

/**
 * Update an option (rename, toggle active, change order).
 */
export async function updateOption(
  kind: OptionKind,
  id: string,
  patch: Partial<Pick<CompanyOption, "label" | "active" | "sort_order">>,
): Promise<void> {
  const clean: Record<string, unknown> = {};
  if (patch.label !== undefined) {
    const trimmed = patch.label.trim();
    if (!trimmed) throw new Error("Le libellé ne peut pas être vide.");
    clean.label = trimmed;
  }
  if (patch.active !== undefined) clean.active = patch.active;
  if (patch.sort_order !== undefined) clean.sort_order = patch.sort_order;
  clean.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from(tableFor(kind))
    .update(clean)
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      throw new Error("Ce libellé existe déjà dans votre entreprise.");
    }
    throw error;
  }
}

/**
 * Soft-disable an option. The option stays in DB (referenced by historic PDCA)
 * but disappears from dropdowns.
 */
export async function disableOption(kind: OptionKind, id: string): Promise<void> {
  await updateOption(kind, id, { active: false });
}

/**
 * Re-enable a previously disabled option.
 */
export async function enableOption(kind: OptionKind, id: string): Promise<void> {
  await updateOption(kind, id, { active: true });
}

/**
 * Hard-delete an option.
 * ⚠️ Returns an error if the option is still referenced by any PDCA / action.
 * Caller should prefer `disableOption` in most cases.
 */
export async function deleteOption(kind: OptionKind, id: string): Promise<void> {
  const { error } = await supabase.from(tableFor(kind)).delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Cette entrée est utilisée par des PDCA existants. Désactivez-la au lieu de la supprimer.",
      );
    }
    throw error;
  }
}

/**
 * Reorder options by passing the new order of IDs.
 * Updates sort_order on each option sequentially.
 */
export async function reorderOptions(
  kind: OptionKind,
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i += 1) {
    await updateOption(kind, orderedIds[i]!, { sort_order: i });
  }
}
