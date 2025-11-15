-- Create CV analysis table
CREATE TABLE IF NOT EXISTS public.assessment_cv_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_text text,
  summary text,
  strengths text[],
  soft_skills text[],
  pillar_vector jsonb,
  ximatar_suggestions text[],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assessment_cv_analysis ENABLE ROW LEVEL SECURITY;

-- Users can view their own CV analysis
CREATE POLICY "Users can view their own CV analysis"
  ON public.assessment_cv_analysis
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own CV analysis
CREATE POLICY "Users can insert their own CV analysis"
  ON public.assessment_cv_analysis
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert CV analysis (for edge function)
CREATE POLICY "Service role can insert CV analysis"
  ON public.assessment_cv_analysis
  FOR INSERT
  WITH CHECK (true);