
-- User onboarding state table
CREATE TABLE public.user_onboarding_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  dismissed_hints JSONB NOT NULL DEFAULT '[]'::jsonb,
  first_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_onboarding_state ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own onboarding state
CREATE POLICY "Users can view their own onboarding state"
  ON public.user_onboarding_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding state"
  ON public.user_onboarding_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding state"
  ON public.user_onboarding_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create onboarding state on first profile access
CREATE OR REPLACE FUNCTION public.ensure_onboarding_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_onboarding_state (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_ensure_onboarding_state
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_onboarding_state();

-- Backfill for existing users
INSERT INTO public.user_onboarding_state (user_id, first_login_at)
SELECT user_id, created_at FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
