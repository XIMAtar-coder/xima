import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
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
import './i18n'
import { validateAssessmentFreeze, verifyFreezeIntegrity } from '@/lib/assessment/freezeGuard'

// Validate assessment content integrity at startup
validateAssessmentFreeze();

// Dev-only: run verification and log PASS/FAIL
if (import.meta.env.DEV) {
  verifyFreezeIntegrity();
}

import { supabase } from '@/integrations/supabase/client'

// Render first — don't block first paint on network I/O (native webview cold start).
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Force logout on every app restart, but non-blocking so it doesn't delay first paint.
void supabase.auth.signOut().catch(() => { /* ignore */ });
