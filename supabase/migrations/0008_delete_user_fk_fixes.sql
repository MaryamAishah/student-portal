-- courses.created_by and lesson_records.recorded_by had no ON DELETE
-- behavior, so deleting a teacher who'd recorded any mark, or an admin
-- who'd created any course, would fail outright with a foreign key
-- violation. Neither reference should cascade-delete real data (a
-- course or a student's marks shouldn't vanish because the person who
-- created/recorded them left) -- SET NULL preserves the record and
-- just forgets who did it.
--
-- Constraint names are looked up dynamically rather than assumed,
-- since they were never explicitly named in the original migration.

do $$
declare
  con_name text;
begin
  select tc.constraint_name into con_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'courses'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'created_by';

  execute format('alter table courses drop constraint %I', con_name);
  alter table courses alter column created_by drop not null;
  alter table courses add constraint courses_created_by_fkey
    foreign key (created_by) references profiles(id) on delete set null;
end $$;

do $$
declare
  con_name text;
begin
  select tc.constraint_name into con_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'lesson_records'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'recorded_by';

  execute format('alter table lesson_records drop constraint %I', con_name);
  alter table lesson_records alter column recorded_by drop not null;
  alter table lesson_records add constraint lesson_records_recorded_by_fkey
    foreign key (recorded_by) references profiles(id) on delete set null;
end $$;
