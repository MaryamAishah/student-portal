-- ============================================================
-- A teacher's personalized lesson title/description was previously
-- visible only to that teacher. Now the students in their group (for
-- that course) can see it too -- not other groups' students, and not
-- other teachers' overrides. Admins already see everything via the
-- existing lesson_teacher_overrides_all_admin policy.
-- ============================================================
create policy lesson_teacher_overrides_select_student on lesson_teacher_overrides
  for select using (
    exists (
      select 1
      from lessons l
      join course_teachers ct
        on ct.course_id = l.course_id and ct.teacher_id = lesson_teacher_overrides.teacher_id
      join enrollments e
        on e.course_id = l.course_id and e.group_id = ct.group_id
      where l.id = lesson_teacher_overrides.lesson_id
        and e.student_id = auth.uid()
    )
  );
