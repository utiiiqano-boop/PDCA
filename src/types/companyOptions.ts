export interface CompanyOption {
  id: string;
  company_id: string;
  label: string;
  sort_order: number;
  active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type OptionKind = "lines" | "departments" | "pilots" | "defect_types";

export const OPTION_KIND_LABELS: Record<OptionKind, string> = {
  lines: "Lignes / Postes",
  departments: "Départements",
  pilots: "Pilotes",
  defect_types: "Types de défaut",
};

export const OPTION_KIND_TABLE: Record<OptionKind, string> = {
  lines: "company_lines",
  departments: "company_departments",
  pilots: "company_pilots",
  defect_types: "company_defect_types",
};
