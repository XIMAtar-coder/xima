import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { validateLocaleFreeze } from '@/lib/assessment/freezeGuard';
import { log } from '@/lib/log';

/**
 * Locales are loaded on demand, not bundled.
 *
 * All three used to be static imports, which put roughly 1.1 MB of translation
 * JSON into the entry chunk — the bulk of it — so every visitor parsed three
 * languages in order to read one. They are dynamic imports now, and Vite emits
 * each as its own chunk.
 *
 * Loading goes through an i18next backend rather than a hand-rolled loader so
 * that i18next owns the pending state. That matters because changeLanguage() is
 * called from four places in the app: with a backend, i18next fetches the new
 * bundle before it switches, so none of those call sites need to know that
 * loading became asynchronous, and no screen flashes raw keys mid-switch.
 */
const SUPPORTED = ['en', 'it', 'es'] as const;
type Lang = (typeof SUPPORTED)[number];

const FALLBACK: Lang = 'en';

const loaders: Record<Lang, () => Promise<Record<string, unknown>>> = {
  en: () => import('./locales/en.json').then((m) => m.default as Record<string, unknown>),
  it: () => import('./locales/it.json').then((m) => m.default as Record<string, unknown>),
  es: () => import('./locales/es.json').then((m) => m.default as Record<string, unknown>),
};

const isSupported = (lng: string): lng is Lang =>
  (SUPPORTED as readonly string[]).includes(lng);

const lazyLocaleBackend = {
  type: 'backend' as const,
  init: () => { /* nothing to configure */ },
  read(
    language: string,
    _namespace: string,
    callback: (err: unknown, data?: Record<string, unknown>) => void
  ) {
    if (!isSupported(language)) {
      // Not an error: i18next probes region variants and the fallback chain.
      callback(null, {});
      return;
    }
    loaders[language]()
      .then((data) => {
        // Each locale carries its own sealed assessment content, so it is
        // checked as it arrives. One startup pass over all three is no longer
        // possible when only some of them are ever loaded.
        validateLocaleFreeze(language, data);
        callback(null, data);
      })
      .catch((err) => callback(err));
  },
};

const LANGUAGE_STORAGE_KEY = 'xima.language';

const getStoredLanguage = (): string | null => {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
};

let initPromise: Promise<typeof i18n> | null = null;

/**
 * Initialise i18n and load the active language.
 *
 * Awaited before the first render so the app never paints untranslated keys.
 * The cost is one JSON chunk fetched instead of three parsed inline, which is
 * the point of the change.
 */
export function initI18n(): Promise<typeof i18n> {
  if (initPromise) return initPromise;

  const stored = getStoredLanguage();
  const lng = stored && isSupported(stored) ? stored : undefined;

  initPromise = i18n
    .use(lazyLocaleBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      lng,
      // 'en' only. The chain used to be ['en', 'it'], from when en.json was
      // missing 659 keys and Italian was the real backstop. i18next preloads
      // every language in the chain rather than fetching one lazily on a miss,
      // so with locales split that second entry cost an extra ~350 KB on every
      // non-Italian first load — verified in the network panel, which showed
      // both en.json and it.json fetched for an English visitor.
      //
      // en is now a complete superset of it (identical key sets), so 'it' can
      // never resolve a key that 'en' does not. The one locale that genuinely
      // needs a fallback is es, which is short the 70 frozen assessmentSets
      // keys, and those resolve from en.
      fallbackLng: FALLBACK,
      supportedLngs: SUPPORTED as unknown as string[],
      debug: false,

      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      },

      interpolation: {
        escapeValue: false,
      },

      // Handle language variants (e.g., en-GB -> en)
      load: 'languageOnly',

      returnEmptyString: false,

      saveMissing: import.meta.env.DEV,

      missingKeyHandler: import.meta.env.DEV
        ? (lngs, _ns, key) => {
            log.warn(`[i18n] Missing key: "${key}" for languages: ${lngs.join(', ')}`);
          }
        : undefined,

      // Resources arrive from the backend, so the first render has to wait for
      // them. main.tsx awaits initI18n() rather than suspending mid-tree.
      react: { useSuspense: false },
    })
    .then(() => i18n);

  return initPromise;
}

// Persist language changes to localStorage
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // Ignore localStorage errors
  }
  // index.html ships lang="en" and nothing updated it, so screen readers read
  // Italian UI with English pronunciation rules and search engines were told
  // the wrong language. WCAG 3.1.1.
  try {
    document.documentElement.lang = lng;
  } catch {
    // non-DOM environment (tests)
  }
});

export default i18n;
