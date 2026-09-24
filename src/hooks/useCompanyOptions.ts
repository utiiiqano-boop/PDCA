import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  CompanyOption,
  OptionKind,
} from "@/types/companyOptions";
import { listOptions } from "@/services/companyOptionsService";

export interface UseCompanyOptionsResult {
  lines: CompanyOption[];
  departments: CompanyOption[];
  pilots: CompanyOption[];
  defectTypes: CompanyOption[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Helper: list of labels for a given kind (active only) */
  labelsOf: (kind: OptionKind) => string[];
  /** Helper: find an option by its id */
  findById: (kind: OptionKind, id: string | null | undefined) => CompanyOption | undefined;
  /** Helper: find an option by its label */
  findByLabel: (kind: OptionKind, label: string | null | undefined) => CompanyOption | undefined;
}

/**
 * Loads the current company's configurable lists (lines, departments,
 * pilots, defect types) once and keeps them in memory.
 *
 * @param includeInactive - if true, includes disabled options (Admin UI)
 */
export function useCompanyOptions(includeInactive = false): UseCompanyOptionsResult {
  const { profile } = useAuth();
  const companyId =
    (profile as { company_id?: string } | null)?.company_id ?? null;

  const [lines, setLines] = useState<CompanyOption[]>([]);
  const [departments, setDepartments] = useState<CompanyOption[]>([]);
  const [pilots, setPilots] = useState<CompanyOption[]>([]);
  const [defectTypes, setDefectTypes] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!companyId) {
      setLines([]);
      setDepartments([]);
      setPilots([]);
      setDefectTypes([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [l, d, p, dt] = await Promise.all([
        listOptions("lines", companyId, includeInactive),
        listOptions("departments", companyId, includeInactive),
        listOptions("pilots", companyId, includeInactive),
        listOptions("defect_types", companyId, includeInactive),
      ]);
      setLines(l);
      setDepartments(d);
      setPilots(p);
      setDefectTypes(dt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [companyId, includeInactive]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  const listOf = (kind: OptionKind): CompanyOption[] => {
    switch (kind) {
      case "lines":
        return lines;
      case "departments":
        return departments;
      case "pilots":
        return pilots;
      case "defect_types":
        return defectTypes;
    }
  };

  const labelsOf = (kind: OptionKind): string[] =>
    listOf(kind).map((o) => o.label);

  const findById = (kind: OptionKind, id: string | null | undefined) => {
    if (!id) return undefined;
    return listOf(kind).find((o) => o.id === id);
  };

  const findByLabel = (kind: OptionKind, label: string | null | undefined) => {
    if (!label) return undefined;
    return listOf(kind).find((o) => o.label === label);
  };

  return {
    lines,
    departments,
    pilots,
    defectTypes,
    loading,
    error,
    reload,
    labelsOf,
    findById,
    findByLabel,
  };
}
