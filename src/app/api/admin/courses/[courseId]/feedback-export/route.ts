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
      .select("lesson_id, student_id, entry_date, mark, feedback")
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
    supabase
      .from("lessons")
      .select("id, title")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true }),
    supabase.from("course_groups").select("id, name").eq("course_id", courseId),
    supabase.from("enrollments").select("student_id, group_id").eq("course_id", courseId),
  ]);

  // Every enrolled student gets rows, plus anyone with records who has
  // since been unenrolled.
  const studentIds = [
    ...new Set([...(enrollments ?? []).map((e) => e.student_id), ...records.map((r) => r.student_id)]),
  ];
  const nameById = new Map<string, string>();
  for (let i = 0; i < studentIds.length; i += 200) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds.slice(i, i + 200));
    for (const p of people ?? []) nameById.set(p.id, p.full_name);
  }

  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const groupNameByStudent = new Map(
    (enrollments ?? []).map((e) => [e.student_id, groupNameById.get(e.group_id) ?? ""])
  );

  // A student can have more than one entry for the same lesson (on
  // different dates), so each cell collects all of them in date order.
  const entriesByCell = new Map<string, RecordRow[]>();
  for (const r of records) {
    const key = `${r.student_id}:${r.lesson_id}`;
    const list = entriesByCell.get(key) ?? [];
    list.push(r);
    entriesByCell.set(key, list);
  }

  function cell(entries: RecordRow[], value: (r: RecordRow) => string): string {
    const filled = entries.filter((r) => value(r) !== "");
    if (filled.length <= 1) return filled[0] ? value(filled[0]) : "";
    return filled.map((r) => `${r.entry_date}: ${value(r)}`).join("\n");
  }

  const students = studentIds
    .map((id) => ({
      id,
      name: nameById.get(id) ?? "",
      group: groupNameByStudent.get(id) || "(not enrolled)",
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  const lessonList = lessons ?? [];
  const table: string[][] = [["Teacher (group)", "Student", "", ...lessonList.map((l) => l.title)]];
  for (const s of students) {
    const entriesFor = (lessonId: string) => entriesByCell.get(`${s.id}:${lessonId}`) ?? [];
    table.push([
      s.group,
      s.name,
      "Mark",
      ...lessonList.map((l) => cell(entriesFor(l.id), (r) => (r.mark != null ? String(r.mark) : ""))),
    ]);
    table.push([
      s.group,
      s.name,
      "Feedback",
      ...lessonList.map((l) => cell(entriesFor(l.id), (r) => r.feedback?.trim() ?? "")),
    ]);
  }

  const csv = toCsv(table);

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
