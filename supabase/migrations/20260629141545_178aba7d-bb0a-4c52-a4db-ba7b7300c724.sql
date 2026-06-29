
-- Hide referred_email PII from inviters while keeping referral status visible.
REVOKE SELECT ON public.referrals FROM authenticated, anon;
GRANT SELECT (id, inviter_user_id, invited_user_id, created_at, status, confirmed_at, qualified_at, rewarded_at) ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
