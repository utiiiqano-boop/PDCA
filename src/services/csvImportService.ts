import { supabase } from "@/lib/supabase";
import { OptionKind, OPTION_KIND_TABLE } from "@/types/companyOptions";

export interface ParsedRow {
  label: string;
  sort_order: number;
}

export interface ParseResult {
  rows: ParsedRow[];
  skipped: number;
  duplicates: string[];
}

/**
 * Parse CSV text.
 * Format supporté :
 *   - Une colonne  : libellé
 *   - Deux colonnes: libellé;ordre  (ou libellé,ordre)
 *   - La 1ère ligne peut être un en-tête (label/libellé/ligne) — elle est ignorée
 *   - Lignes vides ignorées
 */
export function parseCsv(text: string): ParseResult {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  let skipped = 0;

  lines.forEach((line, idx) => {
    // Split sur ; ou ,
    const parts = line.split(/[;,]/).map((p) => p.trim());
    const label = parts[0];
    if (!label) {
      skipped += 1;
      return;
    }

    // Sauter l'en-tête éventuelle
    const lower = label.toLowerCase();
    if (
      idx === 0 &&
      (lower === "label" ||
        lower === "libellé" ||
        lower === "libelle" ||
        lower === "ligne" ||
        lower === "option")
    ) {
      return;
    }

    // Détection doublon (case-insensitive)
    const key = label.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(label);
      skipped += 1;
      return;
    }
    seen.add(key);

    const sortRaw = parts[1];
    const sortOrder = sortRaw ? parseInt(sortRaw, 10) : NaN;

    rows.push({
      label,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : rows.length,
    });
  });

  return { rows, skipped, duplicates };
}

export interface ImportResult {
  inserted: number;
  updated: number;
  total: number;
}

/**
 * Import rows into the given option table for a company.
 * Uses upsert on (company_id, label) — existing labels are updated
 * (sort_order, reactivated), new ones are inserted.
 */
export async function importOptions(
  kind: OptionKind,
  companyId: string,
  rows: ParsedRow[],
): Promise<ImportResult> {
  if (rows.length === 0) return { inserted: 0, updated: 0, total: 0 };

  const table = OPTION_KIND_TABLE[kind];

  const payload = rows.map((r) => ({
    company_id: companyId,
    label: r.label,
    sort_order: r.sort_order,
    active: true,
    is_default: false,
  }));

  const { data, error } = await supabase
    .from(table)
    .upsert(payload, { onConflict: "company_id,label", ignoreDuplicates: false })
    .select("id");

  if (error) throw error;

  return {
    inserted: 0, // on ne distingue pas insert/update avec upsert
    updated: 0,
    total: (data ?? []).length,
  };
}
