import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
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
import { initNative } from '@/lib/native/capacitor'
import { applyDeviceLanguage } from '@/lib/native/language'

// Force logout on every app restart
(async () => {
  await supabase.auth.signOut();
  // Native: open in the device language (Italy-first), before first render.
  await applyDeviceLanguage();
  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
  // Native (Capacitor) bootstrap — no-op on the web build.
  initNative();
})();
