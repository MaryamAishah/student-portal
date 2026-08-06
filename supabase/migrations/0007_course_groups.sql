-- ============================================================
-- course_groups: sub-groups within a course. Lessons stay global
-- to the course; teachers and students are now enrolled/assigned
-- into exactly one group per course (still enforced by the
-- existing (course_id, teacher_id) / (course_id, student_id)
-- primary keys on course_teachers / enrollments -- we're only
-- adding which group that single course-level row belongs to).
-- ============================================================

create table course_groups (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (course_id, name)
);

create trigger trg_course_groups_updated_at before update on course_groups
  for each row execute function set_updated_at();

-- Backfill: every course that already has teachers/students gets a
-- "General" group, and all of their existing assignments/enrollments
-- move into it. Nothing is lost or requires manual re-entry.
insert into course_groups (course_id, name)
select distinct course_id, 'General' from course_teachers
union
select distinct course_id, 'General' from enrollments;

alter table course_teachers add column group_id uuid references course_groups(id) on delete cascade;
alter table enrollments add column group_id uuid references course_groups(id) on delete cascade;

update course_teachers ct
set group_id = cg.id
from course_groups cg
where cg.course_id = ct.course_id and cg.name = 'General';

update enrollments e
set group_id = cg.id
from course_groups cg
where cg.course_id = e.course_id and cg.name = 'General';

alter table course_teachers alter column group_id set not null;
alter table enrollments alter column group_id set not null;

create index idx_course_teachers_group on course_teachers(group_id);
create index idx_enrollments_group on enrollments(group_id);

-- Guard against a group_id/course_id mismatch (e.g. an app bug passing
-- a group that belongs to a different course).
create or replace function check_group_course_match() returns trigger as $$
begin
  if not exists (
    select 1 from course_groups where id = new.group_id and course_id = new.course_id
  ) then
    raise exception 'group_id must belong to the given course_id';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_course_teachers_group_check before insert or update on course_teachers
  for each row execute function check_group_course_match();
create trigger trg_enrollments_group_check before insert or update on enrollments
  for each row execute function check_group_course_match();

-- ============================================================
-- Marking is scoped to a teacher's own group: a teacher can only
-- see/record marks for students enrolled in the same group they're
-- assigned to, not the whole course.
-- ============================================================

create or replace function shares_group_with_student(p_course_id uuid, p_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from course_teachers ct
    join enrollments e on e.group_id = ct.group_id
    where ct.course_id = p_course_id
      and ct.teacher_id = auth.uid()
      and e.course_id = p_course_id
      and e.student_id = p_student_id
  );
$$;

-- ============================================================
-- RLS: course_groups
-- ============================================================

alter table course_groups enable row level security;

create policy course_groups_all_admin on course_groups
  for all using (is_admin()) with check (is_admin());

create policy course_groups_select_teacher on course_groups
  for select using (
    exists (select 1 from course_teachers where group_id = course_groups.id and teacher_id = auth.uid())
  );

create policy course_groups_select_student on course_groups
  for select using (
    exists (select 1 from enrollments where group_id = course_groups.id and student_id = auth.uid())
  );

-- ============================================================
-- RLS: tighten to group scope where marking/rosters are involved
-- ============================================================

drop policy if exists enrollments_select_teacher on enrollments;
create policy enrollments_select_teacher on enrollments
  for select using (
    exists (select 1 from course_teachers ct where ct.group_id = enrollments.group_id and ct.teacher_id = auth.uid())
  );

drop policy if exists profiles_select_teacher_students on profiles;
create policy profiles_select_teacher_students on profiles
  for select using (
    role = 'student' and exists (
      select 1 from enrollments e
      join course_teachers ct on ct.group_id = e.group_id
      where e.student_id = profiles.id and ct.teacher_id = auth.uid()
    )
  );

drop policy if exists lesson_records_select_teacher on lesson_records;
create policy lesson_records_select_teacher on lesson_records
  for select using (shares_group_with_student(course_id, student_id));

drop policy if exists lesson_records_insert_teacher on lesson_records;
create policy lesson_records_insert_teacher on lesson_records
  for insert with check (
    shares_group_with_student(course_id, student_id)
    and recorded_by = auth.uid()
  );

drop policy if exists lesson_records_update_teacher on lesson_records;
create policy lesson_records_update_teacher on lesson_records
  for update using (
    shares_group_with_student(course_id, student_id)
  ) with check (
    shares_group_with_student(course_id, student_id)
  );
