-- Add verification columns to external content
ALTER TABLE IF EXISTS public.feed_external_content 
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by UUID,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Mark all existing content as unverified
UPDATE public.feed_external_content SET is_verified = false WHERE is_verified IS NULL;