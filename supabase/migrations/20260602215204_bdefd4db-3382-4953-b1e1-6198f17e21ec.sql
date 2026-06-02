CREATE OR REPLACE FUNCTION public.get_member_codes(_user_ids uuid[])
RETURNS TABLE(user_id uuid, subscriber_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.subscriber_code
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids);
$$;

REVOKE EXECUTE ON FUNCTION public.get_member_codes(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_member_codes(uuid[]) TO authenticated;