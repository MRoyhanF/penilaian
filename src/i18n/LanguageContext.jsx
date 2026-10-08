'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('id');

  useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved) {
      setLang(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_lang', lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'id' ? 'en' : 'id'));
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[lang];
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // Fallback to ID then key
        let fallback = translations.id;
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) fallback = fallback[fk];
          else return key;
        }
        value = fallback;
        break;
      }
    }

    if (typeof value === 'string') {
      return Object.keys(params).reduce((acc, pKey) => {
        return acc.replace(new RegExp(`{${pKey}}`, 'g'), params[pKey]);
      }, value);
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
