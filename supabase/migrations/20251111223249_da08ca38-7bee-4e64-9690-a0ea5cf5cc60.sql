-- Add 'business' to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'business';

-- Create business_profiles table for company information
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  company_logo TEXT,
  website TEXT,
  hr_contact_email TEXT,
  default_challenge_duration INTEGER DEFAULT 7,
  default_challenge_difficulty INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_profiles
CREATE POLICY "Business users can view their own profile"
ON public.business_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Business users can insert their own profile"
ON public.business_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business users can update their own profile"
ON public.business_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Create business_challenges table
CREATE TABLE IF NOT EXISTS public.business_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_skills TEXT[],
  deadline TIMESTAMP WITH TIME ZONE,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_challenges
CREATE POLICY "Business users can view their own challenges"
ON public.business_challenges
FOR SELECT
USING (auth.uid() = business_id);

CREATE POLICY "Business users can create challenges"
ON public.business_challenges
FOR INSERT
WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Business users can update their own challenges"
ON public.business_challenges
FOR UPDATE
USING (auth.uid() = business_id);

CREATE POLICY "Business users can delete their own challenges"
ON public.business_challenges
FOR DELETE
USING (auth.uid() = business_id);

-- Create candidate_challenges junction table
CREATE TABLE IF NOT EXISTS public.candidate_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES business_challenges(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'evaluated')) DEFAULT 'pending',
  score FLOAT,
  feedback TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(candidate_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.candidate_challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies for candidate_challenges
CREATE POLICY "Business users can view challenges they created"
ON public.candidate_challenges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_challenges bc
    WHERE bc.id = candidate_challenges.challenge_id
    AND bc.business_id = auth.uid()
  )
);

CREATE POLICY "Candidates can view their own challenges"
ON public.candidate_challenges
FOR SELECT
USING (auth.uid() = candidate_id);

CREATE POLICY "Business users can assign challenges"
ON public.candidate_challenges
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_challenges bc
    WHERE bc.id = candidate_challenges.challenge_id
    AND bc.business_id = auth.uid()
  )
);

CREATE POLICY "Business users can update challenge assignments"
ON public.candidate_challenges
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM business_challenges bc
    WHERE bc.id = candidate_challenges.challenge_id
    AND bc.business_id = auth.uid()
  )
);

CREATE POLICY "Candidates can update their challenge status"
ON public.candidate_challenges
FOR UPDATE
USING (auth.uid() = candidate_id);

-- Create candidate_shortlist table for tracking shortlisted candidates
CREATE TABLE IF NOT EXISTS public.candidate_shortlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('shortlisted', 'contacted', 'interviewing', 'hired', 'rejected')) DEFAULT 'shortlisted',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, candidate_id)
);

-- Enable RLS
ALTER TABLE public.candidate_shortlist ENABLE ROW LEVEL SECURITY;

-- RLS policies for candidate_shortlist
CREATE POLICY "Business users can manage their shortlist"
ON public.candidate_shortlist
FOR ALL
USING (auth.uid() = business_id)
WITH CHECK (auth.uid() = business_id);

-- Candidates can view if they're shortlisted
CREATE POLICY "Candidates can view their shortlist status"
ON public.candidate_shortlist
FOR SELECT
USING (auth.uid() = candidate_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_profiles_updated_at
BEFORE UPDATE ON public.business_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_challenges_updated_at
BEFORE UPDATE ON public.business_challenges
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_shortlist_updated_at
BEFORE UPDATE ON public.candidate_shortlist
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();