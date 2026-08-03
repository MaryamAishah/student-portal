import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { LessonHistoryTable, type LessonHistoryRow } from "@/components/student/lesson-history-table";

export default async function StudentHistoryPage() {
  const profile = await getSessionProfile();
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("lesson_records")
    .select("id, entry_date, mark, feedback, lessons(title), courses(name)")
    .eq("student_id", profile!.id)
    .order("entry_date", { ascending: false });

  const rows: LessonHistoryRow[] = (records ?? []).map((r) => ({
    id: r.id,
    courseName: r.courses?.name ?? "",
    lessonTitle: r.lessons?.title ?? "",
    entryDate: r.entry_date,
    mark: r.mark,
    feedback: r.feedback,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Lesson history</h1>
        <p className="text-sm text-muted-foreground">Every mark and note recorded for you.</p>
      </div>
      <LessonHistoryTable rows={rows} />
    </div>
  );
}
