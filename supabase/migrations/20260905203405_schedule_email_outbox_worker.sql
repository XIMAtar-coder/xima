-- process-email-outbox is the only path to Resend, and nothing ever invoked
-- it: pg_cron was not installed and no external scheduler existed. The outbox
-- accumulated pending rows (oldest 143 days at the time of this migration) and
-- email_send_log stayed empty. This schedules the worker once a minute.
--
-- Secret handling: the job must authenticate to the function. Writing the
-- service-role key into a cron command would expose it to anyone who can read
-- cron.job, so the worker accepts a dedicated secret instead. That secret is
-- generated here, inside Postgres, and stored in Vault; the cron command only
-- references it by name, and the edge function reads it back through a
-- service-role-only RPC. No human ever handles the value.

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

-- Generate once; re-running the migration must not rotate it under a live job.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'email_outbox_cron_secret') then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'email_outbox_cron_secret',
      'Shared secret presented by the pg_cron job that drives process-email-outbox'
    );
  end if;
end $$;

create or replace function public.get_email_outbox_cron_secret()
returns text
language sql
security definer
set search_path = public, vault
stable
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'email_outbox_cron_secret'
  limit 1;
$$;

revoke all on function public.get_email_outbox_cron_secret() from public, anon, authenticated;
grant execute on function public.get_email_outbox_cron_secret() to service_role;

comment on function public.get_email_outbox_cron_secret() is
  'Returns the Vault secret the email-outbox cron job presents. service_role only. Read by process-email-outbox to authenticate the scheduler.';

-- Idempotent: replace any previous schedule of the same name.
select cron.unschedule(jobid) from cron.job where jobname = 'process-email-outbox-every-minute';

select cron.schedule(
  'process-email-outbox-every-minute',
  '* * * * *',
  $job$
  select net.http_post(
    url     := 'https://iyckvvnecpnldrxqmzta.supabase.co/functions/v1/process-email-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'email_outbox_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $job$
);
