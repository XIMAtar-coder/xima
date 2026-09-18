-- The previous attempt matched on letter case and changed nothing. The
-- function has exactly one '.png' literal: the XIMAtar image suffix.
do $$
begin
  execute replace(pg_get_functiondef('public.get_candidate_visibility'::regproc), '''.png''', '''.webp''');
end
$$;
