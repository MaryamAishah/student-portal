-- ============================================================
-- Student Feedback & Progress Portal — initial schema
-- ============================================================

create type user_role as enum ('admin', 'teacher', 'student');

-- ============================================================
-- profiles: 1:1 with auth.users, holds role + display info
-- ============================================================
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text not null,
  role                  user_role not null,
  must_change_password  boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- courses
-- ============================================================
create table courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- lessons: reusable topics within a course (no fixed date)
-- ============================================================
create table lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  title       text not null,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (course_id, title)
);

-- ============================================================
-- course_teachers: which teacher(s) may act on which course
-- ============================================================
create table course_teachers (
  course_id  uuid not null references courses(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, teacher_id)
);

-- ============================================================
-- enrollments: which student(s) belong to which course
-- ============================================================
create table enrollments (
  course_id   uuid not null references courses(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (course_id, student_id)
);

-- ============================================================
-- lesson_records: one row per (student, lesson, date) entry
--   holds both the mark and the personalized feedback
-- ============================================================
create table lesson_records (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references lessons(id) on delete cascade,
  course_id    uuid not null references courses(id) on delete cascade,
  student_id   uuid not null references profiles(id) on delete cascade,
  entry_date   date not null,
  mark         numeric(5,2) check (mark is null or (mark >= 0 and mark <= 100)),
  feedback     text,
  recorded_by  uuid not null references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (lesson_id, student_id, entry_date)
);

create index idx_lessons_course on lessons(course_id);
create index idx_lesson_records_student on lesson_records(student_id);
create index idx_lesson_records_course on lesson_records(course_id);
create index idx_lesson_records_lesson_date on lesson_records(lesson_id, entry_date);
create index idx_enrollments_student on enrollments(student_id);
create index idx_course_teachers_teacher on course_teachers(teacher_id);
