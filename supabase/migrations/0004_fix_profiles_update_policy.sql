-- profiles_update_own_limited's WITH CHECK queried `profiles` directly,
-- which re-triggers RLS on the same table mid-evaluation and Postgres
-- rejects as infinite recursion. Route it through a SECURITY DEFINER
-- function instead, same pattern as is_admin() etc. in 0002.

create or replace function current_user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

drop policy if exists profiles_update_own_limited on profiles;

create policy profiles_update_own_limited on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = current_user_role());
