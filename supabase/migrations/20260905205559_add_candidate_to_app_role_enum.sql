-- 'candidate' was never a value of app_role; "candidate" meant "no role row".
-- Added alone: Postgres will not let a new enum value be referenced in the
-- transaction that adds it. Triggers and backfill follow in the next migration.
alter type public.app_role add value if not exists 'candidate';
