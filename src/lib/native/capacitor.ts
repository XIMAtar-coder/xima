import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';

/**
 * One-time native (Capacitor) bootstrap.
 * No-op on the web build so nothing changes for the Lovable web app.
 */
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Tag <html> so CSS can apply mobile-only safe-area rules.
  document.documentElement.classList.add('capacitor-native');

  // Status bar: keep the web gradient flowing under it (overlay = true),
  // content is kept clear of the notch via env(safe-area-inset-*) padding in CSS.
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await applyStatusBarStyle();
  } catch {
    /* StatusBar unavailable (e.g. unsupported platform) — ignore. */
  }

  // Hide the splash once the web layer is ready.
  try {
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }

  // Add a class while the keyboard is open so layouts can react if needed.
  try {
    Keyboard.addListener('keyboardWillShow', () => {
      document.documentElement.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.classList.remove('keyboard-open');
    });
  } catch {
    /* ignore */
  }

  // Hardware back button (Android) — mirror browser history, exit at the root.
  try {
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {
    /* ignore */
  }
}

/** Match the status bar text color to the current light/dark theme. */
async function applyStatusBarStyle(): Promise<void> {
  const isDark = document.documentElement.classList.contains('dark');
  await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
}
