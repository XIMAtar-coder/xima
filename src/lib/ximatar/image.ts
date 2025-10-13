import { supabase } from '@/integrations/supabase/client';

// Convert avatar_path from ximatars table to public URL with cache-busting
export function getXimatarImageUrl(avatar_path?: string | null, cacheBust?: string) {
  if (!avatar_path) return null;
  
  // Clean path (remove 'public/' prefix if present)
  const clean = avatar_path.replace(/^public\//, '');
  
  // Try to get public URL from Supabase Storage
  const { data } = supabase.storage.from('ximatar').getPublicUrl(clean);
  const url = data?.publicUrl || `/${avatar_path}`;
  
  // Add cache-buster if provided
  return cacheBust ? `${url}?v=${encodeURIComponent(cacheBust)}` : url;
}
