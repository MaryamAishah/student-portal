import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { RosterGrid } from "@/components/teacher/roster-grid";
import { EmptyState } from "@/components/shared/empty-state";

export default async function RosterPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const profile = await getSessionProfile();
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("course_teachers")
    .select("course_id, group_id, course_groups(name)")
    .eq("course_id", courseId)
    .eq("teacher_id", profile!.id)
    .maybeSingle();

  if (!assignment) {
    notFound();
  }

  const [{ data: course }, { data: lessons }, { data: enrollments }, { data: titleOverrides }] =
    await Promise.all([
      supabase.from("courses").select("id, name").eq("id", courseId).single(),
      supabase
        .from("lessons")
        .select("id, title, description")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("enrollments")
        .select("profiles(id, full_name)")
        .eq("course_id", courseId)
        .eq("group_id", assignment.group_id),
      supabase
        .from("lesson_teacher_titles")
        .select("lesson_id, title")
        .eq("teacher_id", profile!.id),
    ]);

  const students = (enrollments ?? [])
    .map((e) => e.profiles)
    .filter((p): p is { id: string; full_name: string } => p !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const overrideByLessonId = new Map((titleOverrides ?? []).map((o) => [o.lesson_id, o.title]));
  const lessonsWithTitles = (lessons ?? []).map((lesson) => ({
    ...lesson,
    title: overrideByLessonId.get(lesson.id) ?? lesson.title,
    defaultTitle: lesson.title,
    hasCustomTitle: overrideByLessonId.has(lesson.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{course?.name}</h1>
        <p className="text-sm text-muted-foreground">
          {assignment.course_groups?.name && (
            <span className="font-medium text-foreground">{assignment.course_groups.name} · </span>
          )}
          Pick a lesson and date, then enter marks and feedback for the class.
        </p>
      </div>

      {lessonsWithTitles.length === 0 ? (
        <EmptyState title="No lessons yet" description="Ask an admin to add lessons to this course." />
      ) : students.length === 0 ? (
        <EmptyState title="No students enrolled" description="Ask an admin to enroll students in your group." />
      ) : (
        <RosterGrid courseId={courseId} lessons={lessonsWithTitles} students={students} />
      )}
    </div>
  );
}
