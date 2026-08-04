-- Surface email on profiles so the admin UI can display it without
-- needing the service-role admin API on every users-page render.

alter table profiles add column email text;

update profiles p
set email = u.email
from auth.users u
where u.id = p.id;

create or replace function handle_new_user() returns trigger as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', 'email') <> 'email' then
    return new;
  end if;

  insert into public.profiles (id, full_name, email, role, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student'),
    true
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
