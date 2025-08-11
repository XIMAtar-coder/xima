-- Create saved_opportunities table for persisting user-saved jobs
CREATE TABLE IF NOT EXISTS public.saved_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id text NOT NULL,
  title text,
  company text,
  location text,
  skills text[],
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique per user per job
CREATE UNIQUE INDEX IF NOT EXISTS saved_opportunities_user_job_idx
  ON public.saved_opportunities (user_id, job_id);

-- Foreign key to auth.users (soft, not enforced due to anon access)
-- We keep it simple without FK to avoid cross-schema dependency in some environments

-- Enable RLS
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their saved opportunities"
ON public.saved_opportunities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their saved opportunities"
ON public.saved_opportunities
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their saved opportunities"
ON public.saved_opportunities
FOR DELETE
USING (auth.uid() = user_id);

-- Optional: allow updates by owner (e.g., adding notes later)
CREATE POLICY "Users can update their saved opportunities"
ON public.saved_opportunities
FOR UPDATE
USING (auth.uid() = user_id);
