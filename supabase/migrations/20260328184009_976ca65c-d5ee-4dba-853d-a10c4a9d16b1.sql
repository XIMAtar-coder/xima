-- Revoke SELECT on email column from public roles to prevent direct access
-- Even though RLS allows reading the row, column-level REVOKE prevents reading email
REVOKE SELECT (email) ON public.mentors FROM authenticated;
REVOKE SELECT (email) ON public.mentors FROM anon;

-- Ensure service_role can still read email for edge functions
GRANT SELECT (email) ON public.mentors TO service_role;