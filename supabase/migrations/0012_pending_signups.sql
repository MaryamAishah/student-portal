-- ============================================================
-- pending_signups: a roster spot an admin has pre-approved but
-- that has no auth.users account yet. Instead of admins emailing
-- an individual invite to every person, a person claims their own
-- spot by visiting the shared public /signup page, entering the
-- exact email an admin registered for them, and choosing their own
-- password. No email is sent for these.
-- ============================================================
create table pending_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  full_name   text not null,
  role        user_role not null check (role in ('teacher', 'student')),
  course_id   uuid references courses(id) on delete cascade,
  group_id    uuid references course_groups(id) on delete cascade,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  check ((course_id is null) = (group_id is null))
);

-- Case-insensitive uniqueness — the signup page looks these up by
-- whatever casing the person happens to type.
create unique index idx_pending_signups_email on pending_signups (lower(email));

alter table pending_signups enable row level security;

-- No public select policy: the unauthenticated /signup page looks
-- rows up via the service-role admin client (server-only), never
-- the anon client, so it never needs its own RLS grant.
create policy pending_signups_all_admin on pending_signups
  for all using (is_admin()) with check (is_admin());
