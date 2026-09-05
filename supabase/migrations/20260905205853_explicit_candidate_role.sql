-- "Candidate" was the absence of a role: 258 of 319 users had no user_roles row.
-- The enum value was added in the previous migration; this grants it on signup,
-- withdraws it when a user gains a privileged role or a business profile, and
-- backfills existing users. No existing check reads it, so behaviour is
-- unchanged today; it exists so the next check can be explicit.

create or replace function public.grant_candidate_role_on_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role) values (new.user_id, 'candidate') on conflict do nothing;
  return new;
end; $$;

drop trigger if exists grant_candidate_role_on_signup on public.profiles;
create trigger grant_candidate_role_on_signup
  after insert on public.profiles for each row execute function public.grant_candidate_role_on_signup();

create or replace function public.withdraw_candidate_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.user_roles where user_id = new.user_id and role = 'candidate';
  return new;
end; $$;

drop trigger if exists withdraw_candidate_role_on_privileged_role on public.user_roles;
create trigger withdraw_candidate_role_on_privileged_role
  after insert on public.user_roles for each row when (new.role <> 'candidate')
  execute function public.withdraw_candidate_role();

drop trigger if exists withdraw_candidate_role_on_business_profile on public.business_profiles;
create trigger withdraw_candidate_role_on_business_profile
  after insert on public.business_profiles for each row execute function public.withdraw_candidate_role();

insert into public.user_roles (user_id, role)
select p.user_id, 'candidate' from public.profiles p
where not exists (select 1 from public.user_roles r where r.user_id = p.user_id)
  and not exists (select 1 from public.business_profiles b where b.user_id = p.user_id)
  and not exists (select 1 from public.mentors m where m.user_id = p.user_id)
on conflict do nothing;
