-- The previous migration was first applied with the petrol accent (#17665B)
-- from a palette the owner then rejected; this puts the email back to the
-- original XIMA blue. The file above already carries #4171d6, so on a fresh
-- database this is a no-op.
do $$
begin
  execute replace(pg_get_functiondef('public.email_challenge_invitation()'::regprocedure), '#17665B', '#4171d6');
end
$$;
