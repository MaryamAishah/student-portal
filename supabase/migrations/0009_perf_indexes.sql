-- Two columns that are filtered on directly but never had an index:
-- lesson_records.recorded_by (a teacher's own-marks lookup on their
-- admin profile page) and profiles.role (every admin page that lists
-- "all teachers" / "all students" filters on this).

create index if not exists idx_lesson_records_recorded_by on lesson_records(recorded_by);
create index if not exists idx_profiles_role on profiles(role);
