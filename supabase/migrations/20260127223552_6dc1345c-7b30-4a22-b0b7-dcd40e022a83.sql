-- Add partial unique index on linkedin_url for reliable UPSERT matching
-- This allows UPSERT ON CONFLICT to work when linkedin_url is provided

CREATE UNIQUE INDEX IF NOT EXISTS mentors_linkedin_url_unique 
ON public.mentors (linkedin_url) 
WHERE linkedin_url IS NOT NULL;