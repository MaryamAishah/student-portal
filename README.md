# Student Feedback & Progress Portal

Next.js + Supabase portal for Admins, Teachers, and Students. Admins manage courses,
lessons, and accounts; teachers record marks and feedback per lesson/date; students
view their own progress.

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS, shadcn/ui
- Supabase: Postgres, Auth, Row Level Security
- recharts for the student progress trend chart

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Copy environment variables**: duplicate `.env.local.example` as `.env.local` and fill in
   your project's URL and keys (Project Settings → API):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
   The service role key is server-only — never expose it to the client.
3. **Install dependencies**:
   ```
   npm install
   ```
4. **Run the migrations** against your Supabase project:
   ```
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   This creates the schema (`0001_init_schema.sql`), helper functions/triggers
   (`0002_functions_triggers.sql`), and RLS policies (`0003_rls_policies.sql`) in
   `supabase/migrations/`.
5. **Bootstrap the first admin account.** Account creation in the app is admin-only, so the
   very first admin must be created manually:
   - In the Supabase dashboard, go to Authentication → Users → Add user, create a user with
     an email and password, and set "Auto Confirm User" on.
   - In the SQL editor, insert their profile row:
     ```sql
     insert into public.profiles (id, full_name, role, must_change_password)
     values ('<the new user''s auth.users id>', 'Admin Name', 'admin', false);
     ```
6. **Run the app**:
   ```
   npm run dev
   ```
   Sign in as the admin you just created, then use Admin → Users to invite teacher and
   student accounts by email — they'll get an email with a link to set their own password.

## Regenerating types

`src/lib/types/database.types.ts` is hand-written to match the migrations. After changing
the schema, you can regenerate it from the live database instead:
```
npx supabase gen types typescript --linked > src/lib/types/database.types.ts
```

## Extending the schema

The schema is designed so new features hang off existing tables without touching them:

- **Attendance**: a new `attendance_records` table shaped like `lesson_records`.
- **Homework**: `homework` + `homework_submissions`, FK'd to `lessons` / `profiles`.
- **Certificates**: `certificates`, FK'd to `profiles` / `courses`.
- **Announcements**: `announcements`, with a nullable `course_id` for global vs. course-scoped.

Each follows the same convention: FK to `profiles`, `courses`, or `lessons`; RLS scoped with
the existing `is_admin()` / `is_teacher_of_course()` / `is_enrolled()` helpers.
