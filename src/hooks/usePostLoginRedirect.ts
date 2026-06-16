import { supabase } from '@/integrations/supabase/client';

/**
 * Determines the correct redirect path after login based on user role.
 * Order: admin → /admin, mentor → /mentor, else → /profile (candidate).
 * Role detection uses the user_roles table (never a column on profiles).
 */
export async function getPostLoginRedirectPath(userId: string): Promise<string> {
  try {
    // 1) Admin check via user_roles
    const { data: roles, error: roleErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (!roleErr && roles?.some((r: any) => r.role === 'admin')) {
      console.log('[getPostLoginRedirectPath] User is admin → /admin');
      return '/admin';
    }

    // 2) Mentor check
    const { data, error } = await supabase
      .from('mentors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[getPostLoginRedirectPath] mentor check error:', error.message);
      return '/profile';
    }

    if (data) {
      console.log('[getPostLoginRedirectPath] User is mentor → /mentor');
      return '/mentor';
    }

    return '/profile';
  } catch (err) {
    console.error('[getPostLoginRedirectPath] Unexpected error:', err);
    return '/profile';
  }
}
