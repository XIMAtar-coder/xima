-- Publishing a listing now requires the company's consent to show it to
-- every XIMA candidate and to spread it on other channels. The consent is
-- stored on the post; listings published before this have none and stay
-- out of the candidate list until the company publishes them again.
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS publish_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS publish_consent_version text;

-- Candidates could not read any job post: job_posts only lets the owning
-- business select its own rows. The opportunities page therefore always
-- showed "0". This function exposes the published, complete listings to
-- signed-in users with only the fields a listing needs, and skips the
-- half-imported ones (placeholder titles, PDF noise, empty descriptions).
CREATE OR REPLACE FUNCTION public.list_published_jobs(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  title text,
  company_name text,
  description text,
  location text,
  employment_type text,
  seniority text,
  salary_range text,
  ral_min integer,
  ral_max integer,
  locale text,
  published_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (lower(j.title), j.business_id)
    j.id,
    j.title,
    bp.company_name,
    left(j.description, 1200) AS description,
    j.location,
    j.employment_type,
    j.seniority,
    j.salary_range,
    j.ral_min,
    j.ral_max,
    j.locale,
    j.published_at,
    j.created_at
  FROM public.job_posts j
  LEFT JOIN public.business_profiles bp ON bp.user_id = j.business_id
  WHERE j.status = 'published'
    AND j.publish_consent_at IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND coalesce(trim(j.title), '') <> ''
    AND j.title NOT ILIKE 'imported job position%'
    AND j.title NOT LIKE '\%%'
    AND length(coalesce(j.description, '')) >= 80
    AND j.description NOT LIKE '\%%'
  ORDER BY lower(j.title), j.business_id, coalesce(j.published_at, j.created_at) DESC
  LIMIT greatest(1, least(coalesce(p_limit, 50), 200));
$$;

REVOKE ALL ON FUNCTION public.list_published_jobs(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_published_jobs(integer) TO authenticated;
