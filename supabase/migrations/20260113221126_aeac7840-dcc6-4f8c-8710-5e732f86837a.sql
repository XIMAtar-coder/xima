-- Add structured content columns to job_posts for publish-ready job posts
ALTER TABLE public.job_posts 
ADD COLUMN IF NOT EXISTS content_json JSONB,
ADD COLUMN IF NOT EXISTS content_html TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN public.job_posts.content_json IS 'Structured job post content blocks for candidate-friendly rendering';
COMMENT ON COLUMN public.job_posts.content_html IS 'Sanitized HTML generated from content_json for candidate preview';