import { useAuth } from "@/hooks/useAuth";

export function useIsAdmin(): boolean {
  const { profile } = useAuth();
  return (profile as { is_admin?: boolean } | null)?.is_admin === true;
}
