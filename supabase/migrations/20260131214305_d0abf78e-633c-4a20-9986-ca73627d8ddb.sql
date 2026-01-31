-- Fix Security Definer Views
-- Set security_invoker = true on views that may have been created with SECURITY DEFINER

-- Fix v_dashboard view
ALTER VIEW public.v_dashboard SET (security_invoker = true);

-- Fix feed_reaction_counts view  
ALTER VIEW public.feed_reaction_counts SET (security_invoker = true);

-- Verify mentors_public is also set correctly (idempotent)
ALTER VIEW public.mentors_public SET (security_invoker = true);