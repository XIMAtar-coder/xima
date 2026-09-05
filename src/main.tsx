import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import { RootErrorBoundary } from '@/components/ui/RootErrorBoundary'
import './index.css'
// Self-hosted fonts (no render-blocking Google Fonts fetch — works offline in native webview)
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
// Initialize i18n before anything else
import { initI18n } from './i18n'
import { supabase } from '@/integrations/supabase/client'

// Locales are code-split, so the active one has to arrive before the first
// paint — otherwise the app renders raw translation keys. This awaits one JSON
// chunk rather than parsing all three inline, which is the trade being made.
//
// The assessment freeze check runs inside the i18n backend as each locale
// loads; in production a hash mismatch throws there, so the render below never
// happens and the app refuses to start, as before.
void initI18n()
  .catch((err) => {
    // A freeze violation must stay fatal. Anything else (a chunk that failed to
    // download) should still render — the UI is more useful in a fallback
    // language than as a blank page.
    if (import.meta.env.PROD && err instanceof Error && err.message.includes('ASSESSMENT FREEZE')) {
      throw err;
    }
    console.error('[i18n] Initialisation failed, rendering anyway:', err);
  })
  .then(() => {
    createRoot(document.getElementById("root")!).render(
      <RootErrorBoundary>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </RootErrorBoundary>
    );
  });

// No forced sign-out here. An unconditional supabase.auth.signOut() lived on
// this line from 2025-10-26 to 2026-08-28: it was written for the native app's
// cold start and never gated, so on the web every full page load — a refresh,
// a second tab, every email deep link — silently ended the session, undoing
// persistSession: true in the client. The native behaviour lives in
// initNative() on the capacitor-ios branch, where it is platform-gated.
