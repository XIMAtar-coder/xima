
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import itTranslations from './locales/it.json';
import esTranslations from './locales/es.json';

const resources = {
  it: {
    translation: itTranslations
  },
  en: {
    translation: enTranslations
  },
  es: {
    translation: esTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: ['en', 'it'], // Fallback chain: try 'en' first, then 'it'
    debug: false,
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },
    
    // Handle language variants (e.g., en-GB -> en)
    load: 'languageOnly',
    
    // Return empty string if translation not found (prevents raw keys in UI)
    returnEmptyString: false,
    
    // Use key as fallback (but with saveMissing we'll log it in dev)
    saveMissing: import.meta.env.DEV,
    
    // Log missing keys in development only
    missingKeyHandler: import.meta.env.DEV 
      ? (lngs, ns, key, fallbackValue) => {
          console.warn(`[i18n] Missing key: "${key}" for languages: ${lngs.join(', ')}`);
        }
      : undefined,
  });

export default i18n;
