-- ============================================================
-- lesson_teacher_titles: a teacher's personal label for a lesson,
-- overlaid on top of (never replacing) the shared lessons.title
-- that admins set and that other teachers/students see.
-- ============================================================
create table lesson_teacher_titles (
  lesson_id   uuid not null references lessons(id) on delete cascade,
  teacher_id  uuid not null references profiles(id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (lesson_id, teacher_id)
);

create trigger trg_lesson_teacher_titles_updated_at before update on lesson_teacher_titles
  for each row execute function set_updated_at();

alter table lesson_teacher_titles enable row level security;

create policy lesson_teacher_titles_all_admin on lesson_teacher_titles
  for all using (is_admin()) with check (is_admin());

-- A teacher may only read/write their own override, and only for a
-- lesson that belongs to a course they're assigned to.
create policy lesson_teacher_titles_all_own on lesson_teacher_titles
  for all using (
    teacher_id = auth.uid()
    and exists (
      select 1 from lessons l
      where l.id = lesson_teacher_titles.lesson_id and is_teacher_of_course(l.course_id)
    )
  )
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from lessons l
      where l.id = lesson_teacher_titles.lesson_id and is_teacher_of_course(l.course_id)
    )
  );
