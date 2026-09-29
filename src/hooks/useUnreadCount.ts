import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const POLL_INTERVAL_MS = 30000; // 30s

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("rpc_unread_notification_count");
      if (error) return;
      setCount(typeof data === "number" ? data : 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);

  return { count, refresh };
}
