import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "@/theme";

// ---------- Types ----------
interface AlertOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ToastOptions {
  message: string;
  variant?: "success" | "error" | "info";
  duration?: number;
}

interface UIContext {
  alert: (opts: AlertOptions) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const Ctx = createContext<UIContext | undefined>(undefined);

// ---------- Provider ----------
export function UIProvider({ children }: { children: React.ReactNode }) {
  // Alert state
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);
  // Confirm state (with resolver)
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);
  // Toast state
  const [toastState, setToastState] = useState<ToastOptions | null>(null);

  const alert = useCallback((opts: AlertOptions) => {
    setAlertState(opts);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const showToast = useCallback((opts: ToastOptions) => {
    setToastState(opts);
  }, []);

  const toast = {
    success: (message: string) => showToast({ message, variant: "success" }),
    error: (message: string) => showToast({ message, variant: "error" }),
    info: (message: string) => showToast({ message, variant: "info" }),
  };

  const closeAlert = () => {
    const cb = alertState?.onConfirm;
    setAlertState(null);
    cb?.();
  };

  const resolveConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <Ctx.Provider value={{ alert, confirm, toast }}>
      {children}

      {/* ---------- Alert modal ---------- */}
      <Modal
        visible={!!alertState}
        transparent
        animationType="fade"
        onRequestClose={closeAlert}
      >
        <Pressable style={styles.backdrop} onPress={closeAlert}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text style={styles.title}>{alertState?.title}</Text>
            {alertState?.message ? (
              <Text style={styles.message}>{alertState.message}</Text>
            ) : null}
            <Pressable
              onPress={closeAlert}
              style={[styles.btn, styles.btnPrimary]}
              accessibilityRole="button"
            >
              <Text style={styles.btnPrimaryTxt}>
                {alertState?.confirmLabel ?? "OK"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---------- Confirm modal ---------- */}
      <Modal
        visible={!!confirmState}
        transparent
        animationType="fade"
        onRequestClose={() => resolveConfirm(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => resolveConfirm(false)}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text style={styles.title}>{confirmState?.title}</Text>
            {confirmState?.message ? (
              <Text style={styles.message}>{confirmState.message}</Text>
            ) : null}
            <View style={styles.btnRow}>
              <Pressable
                onPress={() => resolveConfirm(false)}
                style={[styles.btn, styles.btnGhost]}
                accessibilityRole="button"
              >
                <Text style={styles.btnGhostTxt}>
                  {confirmState?.cancelLabel ?? "Annuler"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => resolveConfirm(true)}
                style={[
                  styles.btn,
                  confirmState?.destructive
                    ? styles.btnDanger
                    : styles.btnPrimary,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.btnPrimaryTxt}>
                  {confirmState?.confirmLabel ?? "Confirmer"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---------- Toast ---------- */}
      {toastState ? (
        <ToastView
          key={toastState.message + Math.random()}
          state={toastState}
          onDone={() => setToastState(null)}
        />
      ) : null}
    </Ctx.Provider>
  );
}

function ToastView({
  state,
  onDone,
}: {
  state: ToastOptions;
  onDone: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const duration = state.duration ?? 2600;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 180, useNativeDriver: true }),
      ]).start(() => onDone());
    }, duration);
    return () => clearTimeout(t);
  }, [duration, opacity, translateY, onDone]);

  const bg =
    state.variant === "success"
      ? theme.colors.success
      : state.variant === "error"
        ? theme.colors.danger
        : theme.colors.primary;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { backgroundColor: bg, opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.toastTxt}>{state.message}</Text>
    </Animated.View>
  );
}

// ---------- Hook ----------
export function useUI(): UIContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUI must be used inside UIProvider");
  return v;
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { fontSize: 17, fontWeight: "800", color: theme.colors.text },
  message: { fontSize: 14, color: theme.colors.text, marginTop: 8, lineHeight: 20 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 16,
  },
  btnPrimary: { backgroundColor: theme.colors.primary },
  btnDanger: { backgroundColor: theme.colors.danger },
  btnGhost: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnPrimaryTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnGhostTxt: { color: theme.colors.text, fontWeight: "700", fontSize: 15 },
  toast: {
    position: "absolute",
    bottom: 32,
    left: 16,
    right: 16,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  toastTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
