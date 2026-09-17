-- Email the candidate when a business invites them to a challenge.
--
-- Until now an invitation produced only the in-app notification
-- (on_challenge_invitation_created -> notify_challenge_invitation) and a feed
-- item. The email path depended on the client calling the
-- send-challenge-invitation edge function after the insert: most invite paths
-- (shortlist, L2/L3 modals, useChallengeInvitations) never call it, and the one
-- that does can be skipped by closing the tab. The candidate therefore only
-- found out by opening the app.
--
-- This trigger queues the email in the same transaction as the invitation, so
-- no client path can skip it. It writes straight into email_outbox, which
-- process-email-outbox (pg_cron, every minute) delivers.
--
--  * Idempotency key is 'challenge_invite_<invitation id>' — the same key
--    send-challenge-invitation uses, so if the client still calls that function
--    its enqueue becomes a no-op instead of a second email.
--  * Suppression: an address in suppressed_emails, or whose unsubscribe token
--    has been used, gets no email (logged as 'suppressed' in email_send_log),
--    matching send-transactional-email.
--  * The email carries the one-per-address unsubscribe token link, created on
--    demand exactly like send-transactional-email does.
--  * Any failure is swallowed with a WARNING: an email problem must never
--    abort the invitation itself.

create or replace function public.email_html_escape(p text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select replace(replace(replace(replace(replace(coalesce(p, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#039;');
$$;

create or replace function public.email_challenge_invitation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email        text;
  v_norm_email   text;
  v_lang         text;
  v_name         text;
  v_company      text;
  v_role         text;
  v_challenge    text;
  v_deadline     timestamptz;
  v_token        text;
  v_token_used   timestamptz;
  v_link         text;
  v_unsub_link   text;
  v_subject      text;
  v_html         text;
  v_idem         text := 'challenge_invite_' || new.id::text;
  v_site         constant text := 'https://ximatar.com';
  -- copy
  c_subject      text;
  c_hi           text;
  c_intro        text;
  c_company      text;
  c_role         text;
  c_challenge    text;
  c_deadline     text;
  c_cta          text;
  c_footer       text;
  c_unsub        text;
begin
  if new.status is distinct from 'invited' then
    return new;
  end if;

  select p.email, coalesce(p.preferred_lang::text, 'en'),
         coalesce(nullif(trim(p.first_name), ''), nullif(trim(p.full_name), ''), nullif(trim(p.name), ''))
    into v_email, v_lang, v_name
  from public.profiles p
  where p.id = new.candidate_profile_id;

  if v_email is null or position('@' in v_email) = 0 then
    return new;
  end if;
  v_norm_email := lower(trim(v_email));

  -- Suppression list (bounces, complaints, unsubscribes).
  if exists (select 1 from public.suppressed_emails s where s.email = v_norm_email) then
    insert into public.email_send_log (message_id, template_name, recipient_email, status, metadata)
    values (v_idem, 'challenge_invitation', v_norm_email, 'suppressed',
            jsonb_build_object('invitation_id', new.id));
    return new;
  end if;

  -- One unsubscribe token per address; a used token means unsubscribed.
  select t.token, t.used_at into v_token, v_token_used
  from public.email_unsubscribe_tokens t
  where t.email = v_norm_email;

  if v_token is not null and v_token_used is not null then
    insert into public.email_send_log (message_id, template_name, recipient_email, status, error_message, metadata)
    values (v_idem, 'challenge_invitation', v_norm_email, 'suppressed',
            'Unsubscribe token used but email missing from suppressed list',
            jsonb_build_object('invitation_id', new.id));
    return new;
  end if;

  if v_token is null then
    -- 64 hex chars from two v4 UUIDs (gen_random_uuid is in pg_catalog; pgcrypto's
    -- schema is not on this function's search_path).
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    insert into public.email_unsubscribe_tokens (token, email)
    values (v_token, v_norm_email)
    on conflict do nothing;
    select t.token into v_token from public.email_unsubscribe_tokens t where t.email = v_norm_email;
  end if;

  select coalesce(nullif(trim(bp.company_name), ''), null) into v_company
  from public.business_profiles bp where bp.user_id = new.business_id;

  select hg.role_title into v_role
  from public.hiring_goal_drafts hg where hg.id = new.hiring_goal_id;

  if new.challenge_id is not null then
    select bc.title, coalesce(bc.end_at, bc.deadline) into v_challenge, v_deadline
    from public.business_challenges bc where bc.id = new.challenge_id;
  end if;

  if v_lang = 'it' then
    c_subject   := coalesce(v_company, 'Un''azienda') || ' ti ha invitato a una sfida su XIMA';
    c_hi        := 'Ciao' || coalesce(' ' || v_name, '') || ',';
    c_intro     := coalesce(v_company, 'Un''azienda') || ' ti ha invitato a partecipare alla sua sfida di selezione su XIMA.';
    c_company   := 'Azienda';
    c_role      := 'Ruolo';
    c_challenge := 'Sfida';
    c_deadline  := 'Scadenza';
    c_cta       := 'Apri l''invito';
    c_footer    := 'Ricevi questa email perché un''azienda ti ha invitato a una sfida su XIMA.';
    c_unsub     := 'Non ricevere più queste email';
  elsif v_lang = 'es' then
    c_subject   := coalesce(v_company, 'Una empresa') || ' te ha invitado a un desafío en XIMA';
    c_hi        := 'Hola' || coalesce(' ' || v_name, '') || ',';
    c_intro     := coalesce(v_company, 'Una empresa') || ' te ha invitado a participar en su desafío de selección en XIMA.';
    c_company   := 'Empresa';
    c_role      := 'Puesto';
    c_challenge := 'Desafío';
    c_deadline  := 'Fecha límite';
    c_cta       := 'Abrir la invitación';
    c_footer    := 'Recibes este correo porque una empresa te ha invitado a un desafío en XIMA.';
    c_unsub     := 'No recibir más estos correos';
  else
    c_subject   := coalesce(v_company, 'A company') || ' invited you to a challenge on XIMA';
    c_hi        := 'Hi' || coalesce(' ' || v_name, '') || ',';
    c_intro     := coalesce(v_company, 'A company') || ' has invited you to take part in their hiring challenge on XIMA.';
    c_company   := 'Company';
    c_role      := 'Role';
    c_challenge := 'Challenge';
    c_deadline  := 'Deadline';
    c_cta       := 'Open the invitation';
    c_footer    := 'You are receiving this email because a company invited you to a challenge on XIMA.';
    c_unsub     := 'Stop receiving these emails';
  end if;

  v_link       := v_site || '/challenge/accept?token=' || new.invite_token::text;
  v_unsub_link := v_site || '/unsubscribe?token=' || v_token;
  v_subject    := c_subject;

  v_html :=
    '<!DOCTYPE html><html lang="' || v_lang || '"><head><meta charset="utf-8">'
    || '<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
    || '<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">'
    || '<div style="background-color: #ffffff; padding: 32px; border-radius: 12px;">'
    || '<p style="font-size: 22px; font-weight: bold; color: #4171d6; margin: 0 0 24px;">XIMA</p>'
    || '<p style="font-size: 16px; margin: 0 0 12px;">' || public.email_html_escape(c_hi) || '</p>'
    || '<p style="font-size: 16px; margin: 0 0 20px;">' || public.email_html_escape(c_intro) || '</p>'
    || '<table role="presentation" style="width: 100%; background-color: #f8f9fa; border-left: 4px solid #4171d6; border-radius: 8px; padding: 12px 16px; margin: 0 0 24px; font-size: 15px;">'
    || case when v_company is not null then
         '<tr><td style="padding: 4px 8px; color: #666;">' || c_company || '</td><td style="padding: 4px 8px; font-weight: bold;">' || public.email_html_escape(v_company) || '</td></tr>'
       else '' end
    || case when v_role is not null then
         '<tr><td style="padding: 4px 8px; color: #666;">' || c_role || '</td><td style="padding: 4px 8px; font-weight: bold;">' || public.email_html_escape(v_role) || '</td></tr>'
       else '' end
    || case when v_challenge is not null then
         '<tr><td style="padding: 4px 8px; color: #666;">' || c_challenge || '</td><td style="padding: 4px 8px; font-weight: bold;">' || public.email_html_escape(v_challenge) || '</td></tr>'
       else '' end
    || case when v_deadline is not null then
         '<tr><td style="padding: 4px 8px; color: #666;">' || c_deadline || '</td><td style="padding: 4px 8px; font-weight: bold;">' || to_char(v_deadline at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC</td></tr>'
       else '' end
    || '</table>'
    || '<p style="text-align: center; margin: 32px 0;"><a href="' || v_link || '" style="background-color: #4171d6; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">' || c_cta || '</a></p>'
    || '<p style="font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 16px; margin: 32px 0 0;">'
    || c_footer || '<br><a href="' || v_unsub_link || '" style="color: #999;">' || c_unsub || '</a></p>'
    || '</div></body></html>';

  insert into public.email_outbox (idempotency_key, email_type, recipient_email, subject, html_body, metadata)
  values (
    v_idem, 'challenge_invitation', v_email, v_subject, v_html,
    jsonb_build_object(
      'invitation_id', new.id,
      'challenge_id', new.challenge_id,
      'hiring_goal_id', new.hiring_goal_id,
      'unsubscribe_token', v_token,
      'purpose', 'transactional',
      'source', 'trigger:email_challenge_invitation'
    )
  )
  on conflict (idempotency_key) do nothing;

  if found then
    insert into public.email_send_log (message_id, template_name, recipient_email, status, metadata)
    values (v_idem, 'challenge_invitation', v_norm_email, 'pending',
            jsonb_build_object('invitation_id', new.id));

    update public.challenge_invitations
       set sent_via = (select array_agg(distinct x) from unnest(coalesce(sent_via, '{}'::text[]) || array['email']) as x)
     where id = new.id
       and not ('email' = any(coalesce(sent_via, '{}'::text[])));
  end if;

  return new;
exception when others then
  raise warning 'email_challenge_invitation failed for invitation %: %', new.id, sqlerrm;
  return new;
end;
$$;

revoke all on function public.email_challenge_invitation() from public, anon, authenticated;

drop trigger if exists on_challenge_invitation_email on public.challenge_invitations;
create trigger on_challenge_invitation_email
  after insert on public.challenge_invitations
  for each row execute function public.email_challenge_invitation();

comment on function public.email_challenge_invitation() is
  'Queues the candidate invitation email in email_outbox on challenge_invitations INSERT. Respects suppressed_emails and used unsubscribe tokens. Idempotency key challenge_invite_<id> is shared with send-challenge-invitation.';
