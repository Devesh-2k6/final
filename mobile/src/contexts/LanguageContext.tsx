import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LanguageCode,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  LanguageMeta,
} from "../lib/translations";

const LANGUAGE_STORAGE_KEY = "expirygo_mobile_language";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  supportedLanguages: LanguageMeta[];
  currentLanguageMeta: LanguageMeta;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && ["en", "hi", "ta", "te", "kn"].includes(saved)) {
          setLanguageState(saved as LanguageCode);
        }
      } catch (e) {
        // Ignore AsyncStorage error
      }
    })();
  }, []);

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (e) {
      // Ignore
    }
  };

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
      let text = dict[key] || TRANSLATIONS.en[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
        });
      }
      return text;
    },
    [language]
  );

  const currentLanguageMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
        currentLanguageMeta,
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
