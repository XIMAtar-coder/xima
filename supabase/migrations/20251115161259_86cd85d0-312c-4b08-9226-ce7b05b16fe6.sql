-- Create company_profiles table for storing AI-generated company analysis
CREATE TABLE IF NOT EXISTS public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  website TEXT NOT NULL,
  summary TEXT,
  values TEXT[],
  operating_style TEXT,
  communication_style TEXT,
  ideal_traits TEXT[],
  risk_areas TEXT[],
  pillar_vector JSONB NOT NULL DEFAULT '{"drive": 50, "comp_power": 50, "communication": 50, "creativity": 50, "knowledge": 50}'::jsonb,
  recommended_ximatars TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Business users can view their own company profile
CREATE POLICY "Business users can view their own company profile"
  ON public.company_profiles
  FOR SELECT
  USING (auth.uid() = company_id);

-- Policy: Business users can insert their own company profile
CREATE POLICY "Business users can insert their own company profile"
  ON public.company_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = company_id);

-- Policy: Business users can update their own company profile
CREATE POLICY "Business users can update their own company profile"
  ON public.company_profiles
  FOR UPDATE
  USING (auth.uid() = company_id);

-- Add trigger for updated_at
CREATE TRIGGER update_company_profiles_updated_at
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_company_profiles_company_id ON public.company_profiles(company_id);

COMMENT ON TABLE public.company_profiles IS 'AI-generated company profiles based on website analysis for enhanced candidate matching';