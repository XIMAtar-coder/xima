import { supabase } from '@/integrations/supabase/client';

export interface VerificationStatus {
  verified: boolean;
  deadline: Date | null;
  expired: boolean;
  hoursLeft: number | null;
}

export function computeVerificationStatus(
  email_verified_at: string | null | undefined,
  verification_required_until: string | null | undefined,
): VerificationStatus {
  if (email_verified_at) return { verified: true, deadline: null, expired: false, hoursLeft: null };
  if (!verification_required_until) {
    return { verified: false, deadline: null, expired: false, hoursLeft: null };
  }
  const deadline = new Date(verification_required_until);
  const ms = deadline.getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
  return { verified: false, deadline, expired: ms <= 0, hoursLeft };
}

/**
 * Returns the verification status of the currently authenticated user.
 * Returns { verified: true, ... } when no session (don't block public flows).
 */
export async function getCurrentVerificationStatus(): Promise<VerificationStatus> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { verified: true, deadline: null, expired: false, hoursLeft: null };
  const { data } = await supabase
    .from('profiles')
    .select('email_verified_at, verification_required_until')
    .eq('user_id', user.id)
    .maybeSingle();
  return computeVerificationStatus(data?.email_verified_at, data?.verification_required_until);
}

/**
 * Throws-by-toast guard: returns true if action is allowed (verified OR within 48h grace).
 * Returns false (blocked) only when unverified AND deadline expired.
 */
export async function canPerformSensitiveAction(): Promise<{ allowed: boolean; reason?: string }> {
  const s = await getCurrentVerificationStatus();
  if (s.verified) return { allowed: true };
  if (s.expired) {
    return {
      allowed: false,
      reason: 'Verifica la tua email per continuare. Reinvia il link di conferma dalla dashboard.',
    };
  }
  return { allowed: true };
}
