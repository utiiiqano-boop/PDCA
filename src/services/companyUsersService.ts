import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/database";

/**
 * List all profiles in a company (active + inactive).
 */
export async function listCompanyUsers(companyId: string): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

/**
 * Promote / demote a user.
 */
export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);
  if (error) throw error;
}

/**
 * Soft-disable / re-enable a user.
 * A disabled user cannot log back into the app (see useAuth guard).
 */
export async function setUserActive(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ active })
    .eq("id", userId);
  if (error) throw error;
}

/**
 * Send a Supabase password-reset email to the user.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "pdca://reset-password",
  });
  if (error) throw error;
}
