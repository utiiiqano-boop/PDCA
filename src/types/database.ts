export type Json =
  | string
  | number
  | boolean
  | null
  | { [k: string]: Json }
  | Json[];

export type PDCAPhase = "P" | "D" | "C" | "A";
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type ActionStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "OVERDUE";
export type PDCAStatus = ActionStatus;

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string | null;
  company_id: string | null;
  expo_push_token: string | null;
  active: boolean;
  is_admin: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

export type PDCARow = {
  id: string;
  reference: string;
  subject: string;
  description: string | null;
  line: string;
  line_other: string | null;
  defect_type: string | null;
  defect_type_other: string | null;
  priority: Priority;
  department: string | null;
  status: PDCAStatus;
  line_id: string | null;
  department_id: string | null;
  defect_type_id: string | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PDCAActionRow = {
  id: string;
  pdca_id: string;
  action: string;
  pilot_id: string | null;
  pilot_name: string;
  opening_date: string;
  due_date: string | null;
  phase: PDCAPhase;
  progress: number;
  status: ActionStatus;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type PDCAHistoryRow = {
  id: string;
  pdca_id: string | null;
  action_id: string | null;
  user_id: string | null;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  company_id: string | null;
  created_at: string;
};

export type LessonLearnedRow = {
  id: string;
  pdca_id: string | null;
  title: string;
  description: string | null;
  problem: string | null;
  cause: string | null;
  solution: string | null;
  result: string | null;
  standardization: string | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type FactoryTourRow = {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  responsible_id: string | null;
  tour_date: string | null;
  status: string;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
};


export type SignaturePoint = { x: number; y: number };

export type ActionSignatureRow = {
  id: string;
  action_id: string;
  company_id: string | null;
  signed_by: string | null;
  signer_name: string;
  signature_paths: SignaturePoint[][];
  signed_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow>;
        Update: Partial<ProfileRow>;
      };
      pdca: {
        Row: PDCARow;
        Insert: Partial<PDCARow>;
        Update: Partial<PDCARow>;
      };
      pdca_actions: {
        Row: PDCAActionRow;
        Insert: Partial<PDCAActionRow>;
        Update: Partial<PDCAActionRow>;
      };
      pdca_history: {
        Row: PDCAHistoryRow;
        Insert: Partial<PDCAHistoryRow>;
        Update: Partial<PDCAHistoryRow>;
      };
      lessons_learned: {
        Row: LessonLearnedRow;
        Insert: Partial<LessonLearnedRow>;
        Update: Partial<LessonLearnedRow>;
      };
      factory_tours: {
        Row: FactoryTourRow;
        Insert: Partial<FactoryTourRow>;
        Update: Partial<FactoryTourRow>;
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
