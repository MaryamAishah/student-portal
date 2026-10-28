import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

// Supabase caps each select at 1000 rows by default, so a whole course's
// records are fetched page by page.
const PAGE_SIZE = 1000;

type RecordRow = {
  lesson_id: string;
  student_id: string;
  recorded_by: string | null;
  entry_date: string;
  mark: number | null;
  feedback: string | null;
};

export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const sessionProfile = await getSessionProfile();
  if (!sessionProfile || sessionProfile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { courseId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("id, name").eq("id", courseId).single();
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const records: RecordRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("lesson_records")
      .select("lesson_id, student_id, recorded_by, entry_date, mark, feedback")
      .eq("course_id", courseId)
      .order("entry_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    records.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const [{ data: lessons }, { data: groups }, { data: enrollments }] = await Promise.all([
    supabase.from("lessons").select("id, title, sort_order").eq("course_id", courseId),
    supabase.from("course_groups").select("id, name").eq("course_id", courseId),
    supabase.from("enrollments").select("student_id, group_id").eq("course_id", courseId),
  ]);

  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: overrides } =
    lessonIds.length > 0
      ? await supabase
          .from("lesson_teacher_overrides")
          .select("lesson_id, teacher_id, title")
          .in("lesson_id", lessonIds)
      : { data: [] };

  const personIds = [
    ...new Set(
      records.flatMap((r) => [r.student_id, r.recorded_by]).filter((id): id is string => id !== null)
    ),
  ];
  const nameById = new Map<string, string>();
  for (let i = 0; i < personIds.length; i += 200) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", personIds.slice(i, i + 200));
    for (const p of people ?? []) nameById.set(p.id, p.full_name);
  }

  const lessonById = new Map((lessons ?? []).map((l) => [l.id, l]));
  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const groupNameByStudent = new Map(
    (enrollments ?? []).map((e) => [e.student_id, groupNameById.get(e.group_id) ?? ""])
  );
  const overrideTitleByKey = new Map(
    (overrides ?? []).filter((o) => o.title).map((o) => [`${o.lesson_id}:${o.teacher_id}`, o.title!])
  );

  const rows = records.map((r) => {
    const lesson = lessonById.get(r.lesson_id);
    const lessonTitle =
      (r.recorded_by && overrideTitleByKey.get(`${r.lesson_id}:${r.recorded_by}`)) || lesson?.title || "";
    return {
      group: groupNameByStudent.get(r.student_id) || "(not enrolled)",
      teacher: r.recorded_by ? nameById.get(r.recorded_by) ?? "" : "(deleted teacher)",
      student: nameById.get(r.student_id) ?? "",
      lessonOrder: lesson?.sort_order ?? 0,
      lessonTitle,
      date: r.entry_date,
      mark: r.mark,
      feedback: r.feedback,
    };
  });

  rows.sort(
    (a, b) =>
      a.group.localeCompare(b.group) ||
      a.teacher.localeCompare(b.teacher) ||
      a.student.localeCompare(b.student) ||
      a.lessonOrder - b.lessonOrder ||
      a.date.localeCompare(b.date)
  );

  const csv = toCsv([
    ["Group", "Teacher", "Student", "Lesson", "Date", "Mark", "Feedback"],
    ...rows.map((r) => [
      r.group,
      r.teacher,
      r.student,
      r.lessonTitle,
      r.date,
      r.mark != null ? String(r.mark) : "",
      r.feedback ?? "",
    ]),
  ]);

  const filename = `${course.name}-feedback.csv`;
  const asciiFilename = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");

  // Leading BOM so Excel opens the file as UTF-8.
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
