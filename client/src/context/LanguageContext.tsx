import React, { createContext, useContext, useState } from 'react';
import { translations } from '../translations';

type Language = 'en' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved === 'th' || saved === 'en') ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
  };

  const t = (path: string, params?: Record<string, string | number>) => {
    const keys = path.split('.');
    let value = translations[language];

    for (const key of keys) {
      if (value[key] === undefined) {
        // Fallback to English if Thai key is missing
        let fallback = translations['en'];
        for (const fKey of keys) {
          if (fallback[fKey] === undefined) return path;
          fallback = fallback[fKey];
        }
        value = fallback;
        break;
      }
      value = value[key];
    }

    if (typeof value !== 'string') return path;

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        value = (value as string).replace(`{${key}}`, String(val));
      });
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
