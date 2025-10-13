import { supabase } from '@/integrations/supabase/client';

/**
 * Get a public URL for an avatar stored in Supabase Storage
 * @param avatarPath - Path to the avatar (e.g., 'avatars/pietro-cozzi.jpg')
 * @param cacheBust - Optional cache-buster string (e.g., updated_at timestamp)
 * @returns Public URL or null if no avatar path provided
 */
export function getAvatarUrl(avatarPath?: string | null, cacheBust?: string | null): string | null {
  if (!avatarPath) return null;
  
  // Clean up the path - remove 'public/' prefix if present
  const cleanPath = avatarPath.replace(/^public\//, '');
  
  // Get public URL from Supabase Storage
  const { data } = supabase.storage.from('avatars').getPublicUrl(cleanPath);
  
  const url = data?.publicUrl || `/${avatarPath}`;
  
  // Add cache-buster to force refresh when avatar is updated
  return cacheBust ? `${url}?v=${encodeURIComponent(cacheBust)}` : url;
}
