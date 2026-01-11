-- =============================================
-- Job Posts Entity (separate from Challenges)
-- =============================================

-- Create job_posts table
CREATE TABLE public.job_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  locale TEXT DEFAULT 'it',
  description TEXT,
  responsibilities TEXT,
  requirements_must TEXT,
  requirements_nice TEXT,
  benefits TEXT,
  location TEXT,
  employment_type TEXT,
  seniority TEXT,
  department TEXT,
  salary_range TEXT,
  source_pdf_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_job_posts_business_status ON public.job_posts(business_id, status);
CREATE INDEX idx_job_posts_created_at ON public.job_posts(created_at DESC);

-- Enable RLS
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_posts
CREATE POLICY "Business users can view their own job posts"
ON public.job_posts FOR SELECT
USING (auth.uid() = business_id);

CREATE POLICY "Business users can create their own job posts"
ON public.job_posts FOR INSERT
WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Business users can update their own job posts"
ON public.job_posts FOR UPDATE
USING (auth.uid() = business_id);

CREATE POLICY "Business users can delete their own job posts"
ON public.job_posts FOR DELETE
USING (auth.uid() = business_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_job_posts_updated_at
BEFORE UPDATE ON public.job_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Add Job Post reference to business_challenges
-- =============================================

-- Add job_post_id column to business_challenges
ALTER TABLE public.business_challenges
ADD COLUMN job_post_id UUID REFERENCES public.job_posts(id) ON DELETE SET NULL;

-- Add created_from_job_post flag
ALTER TABLE public.business_challenges
ADD COLUMN created_from_job_post BOOLEAN DEFAULT false;

-- Create index for challenges by job_post
CREATE INDEX idx_business_challenges_job_post_id ON public.business_challenges(job_post_id);

-- =============================================
-- Update PDF imports to reference job_posts
-- =============================================

-- Add job_post_id to business_job_post_imports (instead of opportunities)
ALTER TABLE public.business_job_post_imports
ADD COLUMN new_job_post_id UUID REFERENCES public.job_posts(id) ON DELETE SET NULL;