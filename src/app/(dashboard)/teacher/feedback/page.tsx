import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { FeedbackHistoryTable, type FeedbackHistoryRow } from "@/components/teacher/feedback-history-table";

export default async function TeacherFeedbackPage() {
  const profile = await getSessionProfile();
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("lesson_records")
    .select(
      "id, entry_date, mark, feedback, lessons(title), courses(name), profiles!lesson_records_student_id_fkey(full_name)"
    )
    .eq("recorded_by", profile!.id)
    .not("feedback", "is", null)
    .order("entry_date", { ascending: false });

  const rows: FeedbackHistoryRow[] = (records ?? []).map((r) => ({
    id: r.id,
    studentName: r.profiles?.full_name ?? "",
    courseName: r.courses?.name ?? "",
    lessonTitle: r.lessons?.title ?? "",
    entryDate: r.entry_date,
    mark: r.mark,
    feedback: r.feedback,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Feedback history</h1>
        <p className="text-sm text-muted-foreground">Every note you&apos;ve entered for students.</p>
      </div>
      <FeedbackHistoryTable rows={rows} />
    </div>
  );
}
