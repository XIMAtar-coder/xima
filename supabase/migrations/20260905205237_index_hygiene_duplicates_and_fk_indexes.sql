-- Performance advisor: three duplicate indexes (identical definition, two
-- names) and two foreign keys without a covering index.
do $$
declare dup text;
begin
  foreach dup in array array['email_outbox_idempotency_unique','pillar_scores_unique','referrals_inviter_invited_unique'] loop
    if exists (select 1 from pg_constraint where conname = dup) then
      execute format('alter table public.%I drop constraint %I',
        (select c.relname from pg_constraint k join pg_class c on c.oid = k.conrelid where k.conname = dup), dup);
    elsif exists (select 1 from pg_indexes where schemaname = 'public' and indexname = dup) then
      execute format('drop index public.%I', dup);
    end if;
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, a.attname as col,
           format('idx_%s_%s', c.conrelid::regclass::text, a.attname) as idx
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.contype = 'f'
      and c.conrelid in ('public.ai_shared_cache'::regclass, 'public.challenge_review_notes'::regclass)
      and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = a.attnum)
  loop
    execute format('create index if not exists %I on %s (%I)', replace(r.idx, 'public.', ''), r.tbl, r.col);
  end loop;
end $$;
