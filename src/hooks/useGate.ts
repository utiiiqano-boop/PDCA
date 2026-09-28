import { useCallback, useEffect, useState } from "react";
import {
  GateState,
  clearGate,
  readGate,
  saveGate,
  validateAccessCode,
} from "@/lib/gate";

export function useGate() {
  const [state, setState] = useState<GateState>({
    unlocked: false,
    code: null,
    customerName: null,
  });
  const [loading, setLoading] = useState(true);

  // Load on mount
  useEffect(() => {
    (async () => {
      const s = await readGate();
      setState(s);
      setLoading(false);
    })();
  }, []);

  const unlock = useCallback(async (code: string) => {
    const res = await validateAccessCode(code);
    if (!res.ok) return res;
    await saveGate(code.trim().toUpperCase(), res.customer_name ?? "");
    setState({
      unlocked: true,
      code: code.trim().toUpperCase(),
      customerName: res.customer_name ?? null,
    });
    return res;
  }, []);

  const reset = useCallback(async () => {
    await clearGate();
    setState({ unlocked: false, code: null, customerName: null });
  }, []);

  return { ...state, loading, unlock, reset };
}
