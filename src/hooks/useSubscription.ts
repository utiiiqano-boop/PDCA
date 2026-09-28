import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface SubscriptionStatus {
  ok: boolean;
  status: "trial" | "active" | "expired" | "cancelled" | "suspended" | "unknown";
  days_left?: number;
  plan?: string;
  currency?: string;
  ends_at?: string;
  warning?: boolean;
  reason?: string;
}

export function useSubscription() {
  const { session } = useAuth();
  const [data, setData] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const { data: res, error } = await supabase.rpc("rpc_my_subscription");
      if (error) {
        setData({ ok: false, status: "unknown", reason: error.message });
      } else {
        setData(res as SubscriptionStatus);
      }
    } catch (e) {
      setData({
        ok: false,
        status: "unknown",
        reason: e instanceof Error ? e.message : "unknown_error",
      });
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
