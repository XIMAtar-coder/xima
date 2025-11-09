import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from '@/integrations/supabase/client'

// Force logout on every app restart
(async () => {
  await supabase.auth.signOut();
  createRoot(document.getElementById("root")!).render(<App />);
})();
