
CREATE OR REPLACE FUNCTION public.admin_revoke_role(
  _admin uuid, _target uuid, _role app_role
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
  deleted int;
BEGIN
  IF NOT public.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF _role = 'admin'::app_role THEN
    PERFORM 1 FROM public.user_roles WHERE role = 'admin'::app_role FOR UPDATE;
    SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin'::app_role;
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target AND role = _role;
  GET DIAGNOSTICS deleted = ROW_COUNT;

  IF _role = 'admin'::app_role THEN
    SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin'::app_role;
    IF admin_count < 1 THEN
      RAISE EXCEPTION 'LOCKOUT_DETECTED' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN jsonb_build_object('deleted', deleted, 'admin_count', COALESCE(admin_count, -1));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_revoke_role(uuid,uuid,app_role) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_revoke_role(uuid,uuid,app_role) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_list_users_with_roles(
  _admin uuid, _search text, _limit int, _offset int
) RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  roles app_role[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT u.id, u.email::text AS email, u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE (_search IS NULL OR _search = ''
           OR u.email ILIKE '%'||_search||'%'
           OR p.full_name ILIKE '%'||_search||'%')
    ORDER BY u.created_at DESC
    LIMIT _limit OFFSET _offset
  )
  SELECT
    f.id,
    f.email,
    p.full_name,
    f.created_at,
    COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}'::app_role[]) AS roles
  FROM filtered f
  LEFT JOIN public.profiles  p  ON p.user_id = f.id
  LEFT JOIN public.user_roles ur ON ur.user_id = f.id
  GROUP BY f.id, f.email, p.full_name, f.created_at
  ORDER BY f.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users_with_roles(uuid,text,int,int) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_list_users_with_roles(uuid,text,int,int) TO service_role;
