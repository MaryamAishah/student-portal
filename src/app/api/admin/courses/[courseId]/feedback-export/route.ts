import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase/server";

// Supabase caps each select at 1000 rows by default, so a whole course's
// records are fetched page by page.
const PAGE_SIZE = 1000;

// Scoring key shown above the table, matching the academy's own sheets.
const ATTENDANCE_KEY: [string, number][] = [
  ["Present on time", 10],
  ["Present late", 8],
  ["Left early", 8],
  ["Make up", 7],
  ["Absent", 0],
];
const HEADER_ROW = ATTENDANCE_KEY.length + 2;
const FIXED_COLUMNS = ["Full Name", "Email", "Phone Number"];
const NOT_ENROLLED = "(not enrolled)";

type RecordRow = {
  lesson_id: string;
  student_id: string;
  entry_date: string;
  mark: number | null;
  feedback: string | null;
};

// Excel sheet names: max 31 chars, no []:*?/\ and unique per workbook.
function sheetName(name: string, used: Set<string>): string {
  const base = (name.replace(/[[\]:*?/\\]/g, " ").trim() || "Group").slice(0, 31);
  let candidate = base;
  for (let n = 2; used.has(candidate.toLowerCase()); n++) {
    const suffix = ` (${n})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

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
    supabase.from("course_groups").select("id, name").eq("course_id", courseId).order("name"),
    supabase.from("enrollments").select("student_id, group_id").eq("course_id", courseId),
  ]);

  // Every enrolled student gets a row, plus anyone with records who has
  // since been unenrolled.
  const studentIds = [
    ...new Set([...(enrollments ?? []).map((e) => e.student_id), ...records.map((r) => r.student_id)]),
  ];
  const profileById = new Map<string, { full_name: string; email: string | null }>();
  for (let i = 0; i < studentIds.length; i += 200) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", studentIds.slice(i, i + 200));
    for (const p of people ?? []) profileById.set(p.id, p);
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

  const students = studentIds
    .map((id) => ({
      id,
      name: profileById.get(id)?.full_name ?? "",
      email: profileById.get(id)?.email ?? "",
      group: groupNameByStudent.get(id) || NOT_ENROLLED,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const lessonList = lessons ?? [];
  const lessonCol = (index: number) => FIXED_COLUMNS.length + 1 + index * 2;
  const totalCol = lessonCol(lessonList.length);

  // One tab per group (i.e. per teacher), with any unenrolled students last.
  const workbook = new ExcelJS.Workbook();
  const usedSheetNames = new Set<string>();

  for (const groupName of [...(groups ?? []).map((g) => g.name), NOT_ENROLLED]) {
    const groupStudents = students.filter((s) => s.group === groupName);
    if (groupName === NOT_ENROLLED && groupStudents.length === 0) continue;

    const sheet = workbook.addWorksheet(sheetName(groupName, usedSheetNames), {
      views: [{ state: "frozen", xSplit: 1, ySplit: HEADER_ROW + 1 }],
    });

    ATTENDANCE_KEY.forEach(([label, score], i) => {
      sheet.getCell(i + 1, 2).value = label;
      sheet.getCell(i + 1, 3).value = score;
    });

    const headerRow = sheet.getRow(HEADER_ROW);
    const lessonRow = sheet.getRow(HEADER_ROW + 1);
    FIXED_COLUMNS.forEach((label, i) => (headerRow.getCell(i + 1).value = label));
    lessonList.forEach((lesson, i) => {
      const col = lessonCol(i);
      headerRow.getCell(col).value = "Attendance";
      headerRow.getCell(col + 1).value = "Performance";
      lessonRow.getCell(col).value = lesson.title;
      sheet.mergeCells(HEADER_ROW + 1, col, HEADER_ROW + 1, col + 1);
    });
    headerRow.getCell(totalCol).value = "Total";
    for (const row of [headerRow, lessonRow]) {
      row.font = { bold: true };
      row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }

    groupStudents.forEach((s, i) => {
      const row = sheet.getRow(HEADER_ROW + 2 + i);
      row.getCell(1).value = s.name;
      row.getCell(2).value = s.email;
      let total = 0;
      lessonList.forEach((lesson, j) => {
        const col = lessonCol(j);
        const entries = entriesByCell.get(`${s.id}:${lesson.id}`) ?? [];
        const marked = entries.filter((r) => r.mark != null);
        const withFeedback = entries.filter((r) => r.feedback?.trim());
        for (const r of marked) total += Number(r.mark);

        row.getCell(col).value =
          marked.length === 1
            ? Number(marked[0].mark)
            : marked.map((r) => `${r.entry_date}: ${r.mark}`).join("\n") || null;
        row.getCell(col + 1).value =
          withFeedback.length === 1
            ? withFeedback[0].feedback!.trim()
            : withFeedback.map((r) => `${r.entry_date}: ${r.feedback!.trim()}`).join("\n") || null;
      });
      row.getCell(totalCol).value = total;
    });

    sheet.getColumn(1).width = 24;
    sheet.getColumn(2).width = 28;
    sheet.getColumn(3).width = 16;
    lessonList.forEach((_, j) => {
      sheet.getColumn(lessonCol(j)).width = 12;
      sheet.getColumn(lessonCol(j) + 1).width = 50;
    });
    sheet.getColumn(totalCol).width = 10;

    for (let r = HEADER_ROW + 2; r < HEADER_ROW + 2 + groupStudents.length; r++) {
      sheet.getRow(r).eachCell({ includeEmpty: true }, (cell, col) => {
        const centered = col === totalCol || (col > FIXED_COLUMNS.length && (col - FIXED_COLUMNS.length) % 2 === 1);
        cell.alignment = { vertical: "top", wrapText: true, horizontal: centered ? "center" : "left" };
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${course.name}-feedback.xlsx`;
  const asciiFilename = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
