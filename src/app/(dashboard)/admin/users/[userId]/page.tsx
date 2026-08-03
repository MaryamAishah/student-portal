import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";

type NormalizedRecord = {
  id: string;
  date: string;
  courseName: string | null;
  lessonName: string | null;
  mark: number | null;
  feedback: string | null;
  personId: string;
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", userId)
    .single();

  if (!profile) {
    notFound();
  }

  let records: NormalizedRecord[] = [];
  let peopleColumnLabel = "";
  let peopleById = new Map<string, string>();

  if (profile.role === "teacher") {
    peopleColumnLabel = "Student";
    const { data } = await supabase
      .from("lesson_records")
      .select("id, entry_date, mark, feedback, student_id, lessons(title), courses(name)")
      .eq("recorded_by", userId)
      .order("entry_date", { ascending: false });

    records = (data ?? []).map((r) => ({
      id: r.id,
      date: r.entry_date,
      courseName: r.courses?.name ?? null,
      lessonName: r.lessons?.title ?? null,
      mark: r.mark,
      feedback: r.feedback,
      personId: r.student_id,
    }));

    const studentIds = [...new Set(records.map((r) => r.personId))];
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      peopleById = new Map((students ?? []).map((s) => [s.id, s.full_name]));
    }
  } else if (profile.role === "student") {
    peopleColumnLabel = "Recorded by";
    const { data } = await supabase
      .from("lesson_records")
      .select("id, entry_date, mark, feedback, recorded_by, lessons(title), courses(name)")
      .eq("student_id", userId)
      .order("entry_date", { ascending: false });

    records = (data ?? []).map((r) => ({
      id: r.id,
      date: r.entry_date,
      courseName: r.courses?.name ?? null,
      lessonName: r.lessons?.title ?? null,
      mark: r.mark,
      feedback: r.feedback,
      personId: r.recorded_by,
    }));

    const teacherIds = [...new Set(records.map((r) => r.personId))];
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", teacherIds);
      peopleById = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));
    }
  }

  const marked = records.filter((r) => r.mark != null);
  const average =
    marked.length > 0 ? marked.reduce((sum, r) => sum + Number(r.mark), 0) / marked.length : null;
  const distinctCourses = new Set(records.map((r) => r.courseName).filter(Boolean)).size;
  const distinctPeople = new Set(records.map((r) => r.personId)).size;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={profile.role === "admin" ? "default" : "secondary"} className="capitalize">
          {profile.role}
        </Badge>
      </div>

      {profile.role === "admin" ? (
        <EmptyState
          title="No marks or feedback"
          description="Admin accounts don't record or receive marks."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Average mark" value={average != null ? average.toFixed(1) : "—"} />
            <StatTile label="Records" value={String(records.length)} />
            <StatTile
              label={profile.role === "teacher" ? "Students marked" : "Courses"}
              value={String(profile.role === "teacher" ? distinctPeople : distinctCourses)}
            />
          </div>

          {records.length === 0 ? (
            <EmptyState
              title="No marks or feedback yet"
              description={
                profile.role === "teacher"
                  ? "This teacher hasn't recorded any marks yet."
                  : "This student has no recorded marks yet."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Lesson</TableHead>
                  <TableHead>{peopleColumnLabel}</TableHead>
                  <TableHead>Mark</TableHead>
                  <TableHead>Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{r.courseName ?? "—"}</TableCell>
                    <TableCell>{r.lessonName ?? "—"}</TableCell>
                    <TableCell>{peopleById.get(r.personId) ?? "—"}</TableCell>
                    <TableCell className="font-medium">{r.mark ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {r.feedback ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
