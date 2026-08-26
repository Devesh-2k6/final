"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  LanguageCode,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  LanguageMeta,
} from "@/lib/translations";
import { getPublicApiBaseUrl } from "@/config/env";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translateDynamic: (text: string) => Promise<string>;
  supportedLanguages: LanguageMeta[];
  currentLanguageMeta: LanguageMeta;
  isTranslating: boolean;
}

const STORAGE_KEY = "expirygo_user_language";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const [dynamicCache, setDynamicCache] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
      if (saved && ["en", "hi", "ta", "te", "kn"].includes(saved)) {
        setLanguageState(saved);
      }
    } catch {
      // Ignore local storage errors
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore
    }
  };

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const langDict = TRANSLATIONS[language] || TRANSLATIONS.en;
      let text = langDict[key] || TRANSLATIONS.en[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
        });
      }
      return text;
    },
    [language]
  );

  const translateDynamic = useCallback(
    async (text: string): Promise<string> => {
      if (!text || language === "en") return text;

      const cacheKey = `${language}:${text}`;
      if (dynamicCache[cacheKey]) {
        return dynamicCache[cacheKey];
      }

      setIsTranslating(true);
      try {
        const baseUrl = getPublicApiBaseUrl();
        const res = await fetch(`${baseUrl}/translate/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            target_language: language,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const translated = data.translated_text || text;
          setDynamicCache((prev) => ({ ...prev, [cacheKey]: translated }));
          return translated;
        }
      } catch (err) {
        console.warn("Dynamic translation failed:", err);
      } finally {
        setIsTranslating(false);
      }

      return text;
    },
    [language, dynamicCache]
  );

  const currentLanguageMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translateDynamic,
        supportedLanguages: SUPPORTED_LANGUAGES,
        currentLanguageMeta,
        isTranslating,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
