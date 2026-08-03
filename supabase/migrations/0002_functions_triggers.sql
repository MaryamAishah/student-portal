-- ============================================================
-- Helper functions (SECURITY DEFINER so they can be used inside
-- RLS policies without recursive RLS evaluation on `profiles`)
-- ============================================================

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function is_teacher_of_course(p_course_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from course_teachers
    where course_id = p_course_id and teacher_id = auth.uid()
  );
$$;

create or replace function is_enrolled(p_course_id uuid, p_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments
    where course_id = p_course_id and student_id = p_student_id
  );
$$;

-- ============================================================
-- updated_at maintenance
-- ============================================================

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_courses_updated_at before update on courses
  for each row execute function set_updated_at();
create trigger trg_lessons_updated_at before update on lessons
  for each row execute function set_updated_at();
create trigger trg_lesson_records_updated_at before update on lesson_records
  for each row execute function set_updated_at();

-- ============================================================
-- role-legitimacy guards for join tables
-- ============================================================

create or replace function check_role_matches() returns trigger as $$
begin
  if TG_TABLE_NAME = 'course_teachers' then
    if not exists (select 1 from profiles where id = new.teacher_id and role = 'teacher') then
      raise exception 'teacher_id must reference a profile with role teacher';
    end if;
  elsif TG_TABLE_NAME = 'enrollments' then
    if not exists (select 1 from profiles where id = new.student_id and role = 'student') then
      raise exception 'student_id must reference a profile with role student';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_course_teachers_role_check before insert or update on course_teachers
  for each row execute function check_role_matches();
create trigger trg_enrollments_role_check before insert or update on enrollments
  for each row execute function check_role_matches();

-- ============================================================
-- keep lesson_records.course_id in sync with lessons.course_id
-- ============================================================

create or replace function sync_lesson_record_course_id() returns trigger as $$
begin
  select course_id into new.course_id from lessons where id = new.lesson_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_lesson_records_course_sync before insert or update of lesson_id
  on lesson_records for each row execute function sync_lesson_record_course_id();

-- ============================================================
-- auto-create a profile row when a new auth.users row is created
-- (fired by the Admin API createUser call; reads role/full_name
-- from user_metadata set at creation time)
-- ============================================================

create or replace function handle_new_user() returns trigger as $$
begin
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
