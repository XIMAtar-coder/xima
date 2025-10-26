import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from '@/integrations/supabase/client'

;(async () => {
  try {
    // Force logout on app (re)start as requested
    await supabase.auth.signOut();
  } catch {}
  createRoot(document.getElementById('root')!).render(<App />)
})();
