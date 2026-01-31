-- FEATURE 2: Coaching Relationships Table
CREATE TABLE public.mentor_coaching_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  candidate_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, candidate_profile_id)
);

-- Enable RLS on coaching relationships
ALTER TABLE public.mentor_coaching_relationships ENABLE ROW LEVEL SECURITY;

-- Mentors can see their own coaching relationships
CREATE POLICY "Mentors can view their coaching relationships" 
ON public.mentor_coaching_relationships FOR SELECT 
USING (
  mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
);

-- Candidates can see relationships where they are the candidate
CREATE POLICY "Candidates can view their coaching relationships" 
ON public.mentor_coaching_relationships FOR SELECT 
USING (
  candidate_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- FEATURE 2: Add coaching counter columns to mentors table
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS active_coached_profiles_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_coached_profiles_count INTEGER NOT NULL DEFAULT 0;

-- FEATURE 2: Create trigger function to update coaching counters
CREATE OR REPLACE FUNCTION public.update_mentor_coaching_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  target_mentor_id UUID;
  active_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Determine which mentor to update
  IF TG_OP = 'DELETE' THEN
    target_mentor_id := OLD.mentor_id;
  ELSE
    target_mentor_id := NEW.mentor_id;
  END IF;
  
  -- Count active and total
  SELECT 
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*)
  INTO active_count, total_count
  FROM public.mentor_coaching_relationships
  WHERE mentor_id = target_mentor_id;
  
  -- Update mentor record
  UPDATE public.mentors
  SET 
    active_coached_profiles_count = active_count,
    total_coached_profiles_count = total_count,
    updated_at = now()
  WHERE id = target_mentor_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for coaching counter updates
CREATE TRIGGER trg_update_coaching_counters_insert
AFTER INSERT ON public.mentor_coaching_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_mentor_coaching_counters();

CREATE TRIGGER trg_update_coaching_counters_update
AFTER UPDATE ON public.mentor_coaching_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_mentor_coaching_counters();

CREATE TRIGGER trg_update_coaching_counters_delete
AFTER DELETE ON public.mentor_coaching_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_mentor_coaching_counters();

-- FEATURE 3: CV Access Consent Table
CREATE TABLE public.mentor_cv_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  candidate_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_allowed BOOLEAN NOT NULL DEFAULT false,
  allowed_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, candidate_profile_id)
);

-- Enable RLS on CV access
ALTER TABLE public.mentor_cv_access ENABLE ROW LEVEL SECURITY;

-- Candidates can manage their own CV access grants
CREATE POLICY "Candidates can manage their CV access" 
ON public.mentor_cv_access FOR ALL 
USING (
  candidate_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  candidate_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Mentors can view access grants where they are allowed
CREATE POLICY "Mentors can view allowed CV access" 
ON public.mentor_cv_access FOR SELECT 
USING (
  mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
  AND is_allowed = true
);

-- FEATURE 3: Audit Log Table
CREATE TABLE public.mentor_access_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL,
  candidate_profile_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CONSENT_GRANTED', 'CONSENT_REVOKED', 'CV_VIEWED')),
  actor_user_id UUID NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('candidate', 'mentor')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.mentor_access_audit_logs ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own audit logs
CREATE POLICY "Candidates can view their audit logs" 
ON public.mentor_access_audit_logs FOR SELECT 
USING (
  candidate_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Mentors can view audit logs for candidates who have granted access
CREATE POLICY "Mentors can view audit logs for allowed candidates" 
ON public.mentor_access_audit_logs FOR SELECT 
USING (
  mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.mentor_cv_access mca 
    WHERE mca.mentor_id = mentor_access_audit_logs.mentor_id 
    AND mca.candidate_profile_id = mentor_access_audit_logs.candidate_profile_id 
    AND mca.is_allowed = true
  )
);

-- Candidates can insert audit logs for their own actions
CREATE POLICY "Candidates can insert their audit logs" 
ON public.mentor_access_audit_logs FOR INSERT 
WITH CHECK (
  candidate_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND actor_user_id = auth.uid()
  AND actor_role = 'candidate'
);

-- FEATURE 2: Update mentors_public view to include counters (but never email)
DROP VIEW IF EXISTS public.mentors_public;
CREATE VIEW public.mentors_public AS
SELECT 
  id,
  name,
  title,
  bio,
  profile_image_url,
  linkedin_url,
  specialties,
  xima_pillars,
  rating,
  is_active,
  first_session_expectations,
  active_coached_profiles_count,
  total_coached_profiles_count,
  updated_at
FROM public.mentors
WHERE is_active = true OR is_active IS NULL;

-- Grant access to the view
GRANT SELECT ON public.mentors_public TO anon, authenticated;

-- FEATURE 1: Create storage bucket for mentor avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mentor-avatars',
  'mentor-avatars',
  true,
  4194304,  -- 4MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 4194304,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- FEATURE 1: Storage policies for mentor avatars
-- Allow public read access
CREATE POLICY "Public read access for mentor avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'mentor-avatars');

-- Allow authenticated mentors to upload to their own folder
CREATE POLICY "Mentors can upload their avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mentor-avatars'
  AND EXISTS (
    SELECT 1 FROM public.mentors 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

-- Allow mentors to update their own avatar
CREATE POLICY "Mentors can update their avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mentor-avatars'
  AND EXISTS (
    SELECT 1 FROM public.mentors 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

-- Allow mentors to delete their own avatar
CREATE POLICY "Mentors can delete their avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mentor-avatars'
  AND EXISTS (
    SELECT 1 FROM public.mentors 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);