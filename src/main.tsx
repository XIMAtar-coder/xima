import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Initialize i18n before anything else
import './i18n'
import { supabase } from '@/integrations/supabase/client'

// Force logout on every app restart
(async () => {
  await supabase.auth.signOut();
  createRoot(document.getElementById("root")!).render(<App />);
})();
