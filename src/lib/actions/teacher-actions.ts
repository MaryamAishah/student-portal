"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";

export type RosterEntryInput = {
  studentId: string;
  mark: number | null;
  feedback: string | null;
};

export async function saveRosterEntriesAction(
  courseId: string,
  lessonId: string,
  entryDate: string,
  entries: RosterEntryInput[]
): Promise<{ error: string | null }> {
  const profile = await requireRole("teacher");

  const supabase = await createClient();
  const rows = entries.map((entry) => ({
    lesson_id: lessonId,
    course_id: courseId,
    student_id: entry.studentId,
    entry_date: entryDate,
    mark: entry.mark,
    feedback: entry.feedback,
    recorded_by: profile.id,
  }));

  const { error } = await supabase
    .from("lesson_records")
    .upsert(rows, { onConflict: "lesson_id,student_id,entry_date" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teacher/courses/${courseId}/roster`);
  return { error: null };
}

export async function updateLessonTitleAction(
  lessonId: string,
  courseId: string,
  title: string
): Promise<{ error: string | null }> {
  const profile = await requireRole("teacher");
  const supabase = await createClient();
  const trimmed = title.trim();

  const { error } =
    trimmed === ""
      ? await supabase
          .from("lesson_teacher_titles")
          .delete()
          .eq("lesson_id", lessonId)
          .eq("teacher_id", profile.id)
      : await supabase
          .from("lesson_teacher_titles")
          .upsert(
            { lesson_id: lessonId, teacher_id: profile.id, title: trimmed },
            { onConflict: "lesson_id,teacher_id" }
          );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teacher/courses/${courseId}/roster`);
  return { error: null };
}
