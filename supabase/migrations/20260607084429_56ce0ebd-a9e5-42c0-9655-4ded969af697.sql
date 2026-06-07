
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE id = _business_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_pipeline_thread_participant(_thread_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pipeline_chat_threads t
    WHERE t.id = _thread_id
      AND (
        t.candidate_user_id = _user_id
        OR EXISTS (
          SELECT 1 FROM public.business_profiles bp
          WHERE bp.id = t.business_id AND bp.user_id = _user_id
        )
      )
  );
$$;
