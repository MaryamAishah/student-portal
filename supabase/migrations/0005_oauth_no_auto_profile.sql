-- Account creation is admin-only (see README). handle_new_user() previously
-- auto-created a profile for every new auth.users row, which would let
-- anyone sign in with "Continue with Google" and get a self-provisioned
-- student profile. Admin-created accounts always originate with the
-- 'email' provider (Admin API createUser); OAuth sign-ins for emails with
-- no existing account should get no profile at all, so the app can reject
-- them cleanly instead of silently granting student access.

create or replace function handle_new_user() returns trigger as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', 'email') <> 'email' then
    return new;
  end if;

  insert into public.profiles (id, full_name, role, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student'),
    true
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
