import { supabase } from '@/integrations/supabase/client';

/**
 * Determines the correct redirect path after login based on user role.
 * Checks if user is a mentor by querying the mentors table.
 * Returns '/mentor' for mentors, '/profile' for candidates.
 */
export async function getPostLoginRedirectPath(userId: string): Promise<string> {
  try {
    // Check if user is a mentor
    const { data, error } = await supabase
      .from('mentors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[getPostLoginRedirectPath] Error checking mentor status:', error.message);
      return '/profile'; // Default to candidate flow on error
    }

    if (data) {
      console.log('[getPostLoginRedirectPath] User is a mentor, redirecting to /mentor');
      return '/mentor';
    }

    return '/profile'; // Default candidate path
  } catch (err) {
    console.error('[getPostLoginRedirectPath] Unexpected error:', err);
    return '/profile';
  }
}
