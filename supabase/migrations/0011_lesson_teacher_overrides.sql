-- ============================================================
-- Extend the per-teacher lesson title override to also cover the
-- description. Renamed to lesson_teacher_overrides since it's no
-- longer title-only. Either column may be null (no override for
-- that field); a row is only kept while at least one is set.
-- ============================================================
alter table lesson_teacher_titles rename to lesson_teacher_overrides;

alter table lesson_teacher_overrides alter column title drop not null;
alter table lesson_teacher_overrides add column description text;

alter table lesson_teacher_overrides
  add constraint lesson_teacher_overrides_not_empty
  check (title is not null or description is not null);

alter trigger trg_lesson_teacher_titles_updated_at on lesson_teacher_overrides
  rename to trg_lesson_teacher_overrides_updated_at;

alter policy lesson_teacher_titles_all_admin on lesson_teacher_overrides
  rename to lesson_teacher_overrides_all_admin;
alter policy lesson_teacher_titles_all_own on lesson_teacher_overrides
  rename to lesson_teacher_overrides_all_own;
