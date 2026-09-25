import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { I18nManager, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { translations, Language } from "./translations";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "pdca.language";

interface I18nCtx {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => Promise<{ restartRequired: boolean }>;
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | undefined>(undefined);

function detectDefault(): Language {
  try {
    const locales = Localization.getLocales();
    const code = locales[0]?.languageCode?.toLowerCase();
    if (code === "en") return "en";
    if (code === "ar") return "ar";
    return "fr";
  } catch {
    return "fr";
  }
}

function resolve(obj: unknown, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v !== undefined ? String(v) : `{${key}}`;
  });
}

/**
 * Apply RTL direction:
 *  - Web: sets document.documentElement.dir = "rtl" (CSS flips everything)
 *  - Native: uses I18nManager, but a restart is required
 */
function applyRTL(isRTL: boolean): { restartRequired: boolean } {
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      document.documentElement.dir = isRTL ? "rtl" : "ltr";
      document.documentElement.lang = isRTL ? "ar" : "fr";
    }
    return { restartRequired: false };
  }

  // Native
  const currentlyRTL = I18nManager.isRTL;
  if (currentlyRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    return { restartRequired: true };
  }
  return { restartRequired: false };
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>("fr");

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const initial =
        stored === "fr" || stored === "en" || stored === "ar"
          ? stored
          : detectDefault();
      setLangState(initial);
      applyRTL(initial === "ar");
    })();
  }, []);

  // __SYNC_LANG_TO_DB__ : persist user's language to their profile
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
          .from("profiles")
          .update({ language })
          .eq("id", user.id);
      } catch (e) {
        console.warn("[i18n] sync language failed:", e);
      }
    })();
  }, [language]);

  const setLanguage = useCallback(
    async (lang: Language): Promise<{ restartRequired: boolean }> => {
      setLangState(lang);
      await AsyncStorage.setItem(STORAGE_KEY, lang);
      return applyRTL(lang === "ar");
    },
    [],
  );

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const raw = resolve(translations[language], path);
      return interpolate(raw, vars);
    },
    [language],
  );

  const isRTL = language === "ar";

  return (
    <Ctx.Provider value={{ language, isRTL, setLanguage, t }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTranslation must be used inside I18nProvider");
  return ctx;
}
