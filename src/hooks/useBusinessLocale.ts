/**
 * Business Locale Hook
 * 
 * Provides the current business locale and utilities for locale-aware AI calls.
 * Reads from i18n.language and localStorage fallback.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type BusinessLocale = 'en' | 'it' | 'es';

const LANGUAGE_STORAGE_KEY = 'xima.language';
const VALID_LOCALES: BusinessLocale[] = ['en', 'it', 'es'];

export function useBusinessLocale() {
  const { i18n } = useTranslation();

  const getLocale = useCallback((): BusinessLocale => {
    // Priority: i18n.language > localStorage > default
    const i18nLang = i18n.language?.split('-')[0];
    if (VALID_LOCALES.includes(i18nLang as BusinessLocale)) {
      return i18nLang as BusinessLocale;
    }
    
    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLang && VALID_LOCALES.includes(storedLang as BusinessLocale)) {
      return storedLang as BusinessLocale;
    }
    
    return 'en';
  }, [i18n.language]);

  return {
    locale: getLocale(),
    getLocale,
  };
}

/**
 * Get locale for use outside React components
 */
export function getBusinessLocale(): BusinessLocale {
  const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLang && VALID_LOCALES.includes(storedLang as BusinessLocale)) {
    return storedLang as BusinessLocale;
  }
  return 'en';
}
