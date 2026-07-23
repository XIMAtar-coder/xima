import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import i18n from '@/i18n';

const SUPPORTED = ['it', 'en', 'es'];
// Region default when the device language isn't one we ship — Italy-first, never English.
const DEFAULT_LANG = 'it';

/**
 * On the native app, open in the device's language (the iOS WebView otherwise
 * reports the app's bundle locale — English — regardless of the phone's
 * setting). Falls back to Italian, not English, for unsupported languages.
 *
 * The device language wins over the previously-stored value on each launch, so
 * changing the phone's language is reflected immediately. No-op on web, where
 * the browser LanguageDetector already uses navigator.language.
 */
export async function applyDeviceLanguage(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { value } = await Device.getLanguageCode(); // ISO-639-1, e.g. 'it'
    const code = (value || '').slice(0, 2).toLowerCase();
    const lang = SUPPORTED.includes(code) ? code : DEFAULT_LANG;
    if (i18n.language !== lang) {
      await i18n.changeLanguage(lang);
    }
  } catch {
    // Detection failed — prefer Italian over the English fallback.
    try {
      if (i18n.language === 'en') await i18n.changeLanguage(DEFAULT_LANG);
    } catch {
      /* ignore */
    }
  }
}
