import AsyncStorage from "@react-native-async-storage/async-storage";

const GATE_KEY = "pdca.gate.unlocked";
const GATE_CODE_KEY = "pdca.gate.code";
const GATE_NAME_KEY = "pdca.gate.customer_name";

export interface GateState {
  unlocked: boolean;
  code: string | null;
  customerName: string | null;
}

export async function readGate(): Promise<GateState> {
  try {
    const [unlocked, code, name] = await Promise.all([
      AsyncStorage.getItem(GATE_KEY),
      AsyncStorage.getItem(GATE_CODE_KEY),
      AsyncStorage.getItem(GATE_NAME_KEY),
    ]);
    return {
      unlocked: unlocked === "1",
      code,
      customerName: name,
    };
  } catch {
    return { unlocked: false, code: null, customerName: null };
  }
}

export async function saveGate(code: string, customerName: string): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(GATE_KEY, "1"),
    AsyncStorage.setItem(GATE_CODE_KEY, code),
    AsyncStorage.setItem(GATE_NAME_KEY, customerName),
  ]);
}

export async function clearGate(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(GATE_KEY),
    AsyncStorage.removeItem(GATE_CODE_KEY),
    AsyncStorage.removeItem(GATE_NAME_KEY),
  ]);
}

/** Call the validate-code Edge Function */
export async function validateAccessCode(code: string): Promise<{
  ok: boolean;
  reason?: string;
  customer_name?: string;
}> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) return { ok: false, reason: "missing_env" };

  try {
    const res = await fetch(`${url}/functions/v1/validate-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    return json;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: "network_error", ...( { message: msg } as object) };
  }
}
