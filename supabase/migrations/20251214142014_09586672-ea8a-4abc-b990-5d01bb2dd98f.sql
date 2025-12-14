-- Create business_shortlists table for persistent shortlisting
CREATE TABLE public.business_shortlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  hiring_goal_id uuid NOT NULL REFERENCES public.hiring_goal_drafts(id) ON DELETE CASCADE,
  candidate_profile_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (business_id, hiring_goal_id, candidate_profile_id)
);

-- Enable RLS
ALTER TABLE public.business_shortlists ENABLE ROW LEVEL SECURITY;

-- RLS policies: business users can manage their own shortlist
CREATE POLICY "Business users can view their shortlist"
ON public.business_shortlists
FOR SELECT
USING (auth.uid() = business_id);

CREATE POLICY "Business users can add to shortlist"
ON public.business_shortlists
FOR INSERT
WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Business users can remove from shortlist"
ON public.business_shortlists
FOR DELETE
USING (auth.uid() = business_id);

-- Add index for efficient queries
CREATE INDEX idx_business_shortlists_business_goal 
ON public.business_shortlists(business_id, hiring_goal_id);