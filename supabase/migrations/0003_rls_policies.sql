-- ============================================================
-- Enable RLS everywhere. No policy = no access (safe default).
-- ============================================================

alter table profiles         enable row level security;
alter table courses          enable row level security;
alter table lessons          enable row level security;
alter table course_teachers  enable row level security;
alter table enrollments      enable row level security;
alter table lesson_records   enable row level security;

-- ============================================================
-- profiles
-- ============================================================

create policy profiles_select_own on profiles
  for select using (id = auth.uid());

create policy profiles_select_admin on profiles
  for select using (is_admin());

-- teachers can read student profiles for students enrolled in courses they teach
create policy profiles_select_teacher_students on profiles
  for select using (
    role = 'student' and exists (
      select 1 from enrollments e
      join course_teachers ct on ct.course_id = e.course_id
      where e.student_id = profiles.id and ct.teacher_id = auth.uid()
    )
  );

-- self-update limited to non-role fields (role must stay the same)
create policy profiles_update_own_limited on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from profiles p where p.id = auth.uid()));

create policy profiles_update_admin on profiles
  for update using (is_admin());

create policy profiles_delete_admin on profiles
  for delete using (is_admin());

-- ============================================================
-- courses
-- ============================================================

create policy courses_all_admin on courses
  for all using (is_admin()) with check (is_admin());

create policy courses_select_teacher on courses
  for select using (is_teacher_of_course(id));

create policy courses_select_student on courses
  for select using (
    exists (select 1 from enrollments where course_id = courses.id and student_id = auth.uid())
  );

-- ============================================================
-- lessons
-- ============================================================

create policy lessons_all_admin on lessons
  for all using (is_admin()) with check (is_admin());

create policy lessons_select_teacher on lessons
  for select using (is_teacher_of_course(course_id));

create policy lessons_select_student on lessons
  for select using (
    exists (select 1 from enrollments where course_id = lessons.course_id and student_id = auth.uid())
  );

-- ============================================================
-- course_teachers
-- ============================================================

create policy course_teachers_all_admin on course_teachers
  for all using (is_admin()) with check (is_admin());

create policy course_teachers_select_self on course_teachers
  for select using (teacher_id = auth.uid());

-- ============================================================
-- enrollments
-- ============================================================

create policy enrollments_all_admin on enrollments
  for all using (is_admin()) with check (is_admin());

create policy enrollments_select_teacher on enrollments
  for select using (is_teacher_of_course(course_id));

create policy enrollments_select_student on enrollments
  for select using (student_id = auth.uid());

-- ============================================================
-- lesson_records (marks + feedback — the sensitive table)
-- ============================================================

create policy lesson_records_all_admin on lesson_records
  for all using (is_admin()) with check (is_admin());

create policy lesson_records_select_student on lesson_records
  for select using (student_id = auth.uid());

create policy lesson_records_select_teacher on lesson_records
  for select using (is_teacher_of_course(course_id));

create policy lesson_records_insert_teacher on lesson_records
  for insert with check (
    is_teacher_of_course(course_id)
    and is_enrolled(course_id, student_id)
    and recorded_by = auth.uid()
  );

create policy lesson_records_update_teacher on lesson_records
  for update using (
    is_teacher_of_course(course_id)
  ) with check (
    is_teacher_of_course(course_id)
    and is_enrolled(course_id, student_id)
  );

create policy lesson_records_delete_admin on lesson_records
  for delete using (is_admin());
