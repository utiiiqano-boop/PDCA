import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { translations, Language } from "./translations";

const STORAGE_KEY = "pdca.language";

interface I18nCtx {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  t: (path: string) => string;
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

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>("fr");

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === "fr" || stored === "en" || stored === "ar") {
        setLangState(stored);
      } else {
        setLangState(detectDefault());
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLangState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (path: string) => resolve(translations[language], path),
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
