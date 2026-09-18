-- get_candidate_visibility builds '/ximatars/' || ximatar || '.png'; the
-- files are .webp since 2026-09-05. (This first attempt matched on letter case
-- and changed nothing; see the next migration.)
do $$
begin
  execute replace(
    pg_get_functiondef('public.get_candidate_visibility'::regproc),
    '''/ximatars/'' || pg_catalog.lower(p.ximatar::text) || ''.png''',
    '''/ximatars/'' || pg_catalog.lower(p.ximatar::text) || ''.webp''');
end
$$;
