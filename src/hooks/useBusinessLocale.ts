/**
 * Business Locale Hook
 * 
 * Provides the current business locale and utilities for locale-aware AI calls.
 * Single source of truth: i18n.language synced with localStorage.
 */

import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type BusinessLocale = 'en' | 'it' | 'es';

export const LANGUAGE_STORAGE_KEY = 'xima.language';
export const VALID_LOCALES: BusinessLocale[] = ['en', 'it', 'es'];

/**
 * Hook for Business pages - provides locale and change function
 */
export function useBusinessLocale() {
  const { i18n } = useTranslation();

  // Sync i18n with localStorage on mount
  useEffect(() => {
    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLang && VALID_LOCALES.includes(storedLang as BusinessLocale)) {
      if (i18n.language?.split('-')[0] !== storedLang) {
        i18n.changeLanguage(storedLang);
      }
    }
  }, [i18n]);

  // Listen for language changes and persist
  useEffect(() => {
    const handleLanguageChange = (lang: string) => {
      const normalizedLang = lang.split('-')[0];
      if (VALID_LOCALES.includes(normalizedLang as BusinessLocale)) {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLang);
        if (import.meta.env.DEV) {
          console.log('[i18n] Language changed to:', normalizedLang);
        }
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const getLocale = useCallback((): BusinessLocale => {
    const i18nLang = i18n.language?.split('-')[0];
    if (VALID_LOCALES.includes(i18nLang as BusinessLocale)) {
      return i18nLang as BusinessLocale;
    }
    return 'en';
  }, [i18n.language]);

  const changeLocale = useCallback((lang: BusinessLocale) => {
    if (VALID_LOCALES.includes(lang)) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      i18n.changeLanguage(lang);
    }
  }, [i18n]);

  return {
    locale: getLocale(),
    getLocale,
    changeLocale,
  };
}

/**
 * Get locale for use outside React components (edge function calls)
 */
export function getBusinessLocale(): BusinessLocale {
  // Check localStorage first for non-React contexts
  const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLang && VALID_LOCALES.includes(storedLang as BusinessLocale)) {
    return storedLang as BusinessLocale;
  }
  return 'en';
}
