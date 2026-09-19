import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { LessonHistoryTable, type LessonHistoryRow } from "@/components/student/lesson-history-table";
import { DownloadCsvButton } from "@/components/shared/download-csv-button";
import { toCsv } from "@/lib/csv";

export default async function StudentHistoryPage() {
  const profile = await getSessionProfile();
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("lesson_records")
    .select("id, entry_date, mark, feedback, lesson_id, recorded_by, lessons(title, description), courses(name)")
    .eq("student_id", profile!.id)
    .order("entry_date", { ascending: false });

  const lessonIds = [...new Set((records ?? []).map((r) => r.lesson_id))];
  const teacherIds = [
    ...new Set((records ?? []).map((r) => r.recorded_by).filter((id): id is string => id !== null)),
  ];

  let overrides: { lesson_id: string; teacher_id: string; title: string | null; description: string | null }[] = [];
  if (lessonIds.length > 0 && teacherIds.length > 0) {
    const { data } = await supabase
      .from("lesson_teacher_overrides")
      .select("lesson_id, teacher_id, title, description")
      .in("lesson_id", lessonIds)
      .in("teacher_id", teacherIds);
    overrides = data ?? [];
  }
  const overrideByKey = new Map(overrides.map((o) => [`${o.lesson_id}:${o.teacher_id}`, o]));

  const rows: LessonHistoryRow[] = (records ?? []).map((r) => {
    const override = r.recorded_by ? overrideByKey.get(`${r.lesson_id}:${r.recorded_by}`) : undefined;
    return {
      id: r.id,
      courseName: r.courses?.name ?? "",
      lessonTitle: override?.title ?? r.lessons?.title ?? "",
      lessonDescription: override?.description ?? r.lessons?.description ?? null,
      entryDate: r.entry_date,
      mark: r.mark,
      feedback: r.feedback,
    };
  });

  const csv = toCsv([
    ["Date", "Course", "Lesson", "Mark", "Feedback"],
    ...rows.map((r) => [
      r.entryDate,
      r.courseName,
      r.lessonTitle,
      r.mark != null ? String(r.mark) : "",
      r.feedback ?? "",
    ]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Lesson history</h1>
          <p className="text-sm text-muted-foreground">Every mark and note recorded for you.</p>
        </div>
        {rows.length > 0 && (
          <DownloadCsvButton filename="my-feedback.csv" csv={csv} />
        )}
      </div>
      <LessonHistoryTable rows={rows} />
    </div>
  );
}
