import { supabase } from '@/integrations/supabase/client';

// Convert avatar_path from ximatars table to public URL with cache-busting
export function getXimatarImageUrl(avatar_path?: string | null, cacheBust?: string) {
  if (!avatar_path) return null;

  const isAbsolute = /^https?:\/\//i.test(avatar_path);
  const appendCache = (u: string) => cacheBust ? `${u}${u.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheBust)}` : u;

  // If already a full URL, just return it with optional cache-buster
  if (isAbsolute) {
    return appendCache(avatar_path);
  }

  // Clean path (remove leading prefixes)
  const clean = avatar_path.replace(/^public\//, '').replace(/^\//, '');

  // If it's a local public asset path, return as-is from public/
  if (/^(assets|images|ximatars)\//.test(clean)) {
    return appendCache(`/${clean}`);
  }

  // Otherwise assume it's a key in the 'ximatar' bucket in Supabase Storage
  const { data } = supabase.storage.from('ximatar').getPublicUrl(clean);
  const url = data?.publicUrl || `/${clean}`;
  return appendCache(url);
}
