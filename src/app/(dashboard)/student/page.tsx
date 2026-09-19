import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { ProgressSummaryCards } from "@/components/student/progress-summary-cards";
import { ProgressTrendChart } from "@/components/student/progress-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export default async function StudentDashboardPage() {
  const profile = await getSessionProfile();
  const supabase = await createClient();

  const [{ data: records }, { count: courseCount }] = await Promise.all([
    supabase
      .from("lesson_records")
      .select("id, entry_date, mark, feedback, lesson_id, recorded_by, lessons(title), courses(name)")
      .eq("student_id", profile!.id)
      .order("entry_date", { ascending: true }),
    supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("student_id", profile!.id),
  ]);

  const rows = records ?? [];
  const marked = rows.filter((r) => r.mark != null);
  const overallAverage =
    marked.length > 0 ? marked.reduce((sum, r) => sum + Number(r.mark), 0) / marked.length : null;

  const trendPoints = marked.map((r) => ({
    date: r.entry_date,
    label: new Date(r.entry_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    mark: Number(r.mark),
  }));

  const perCourse = new Map<string, { name: string; total: number; count: number }>();
  for (const r of rows) {
    if (r.mark == null || !r.courses) continue;
    const name = r.courses.name;
    const existing = perCourse.get(name) ?? { name, total: 0, count: 0 };
    existing.total += Number(r.mark);
    existing.count += 1;
    perCourse.set(name, existing);
  }

  const recentFeedback = [...rows].reverse().find((r) => r.feedback);

  let recentFeedbackLessonTitle = recentFeedback?.lessons?.title ?? null;
  if (recentFeedback?.recorded_by) {
    const { data: override } = await supabase
      .from("lesson_teacher_overrides")
      .select("title")
      .eq("lesson_id", recentFeedback.lesson_id)
      .eq("teacher_id", recentFeedback.recorded_by)
      .maybeSingle();
    recentFeedbackLessonTitle = override?.title ?? recentFeedbackLessonTitle;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {profile?.fullName}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s how you&apos;re progressing.</p>
      </div>

      <ProgressSummaryCards
        overallAverage={overallAverage}
        recordCount={rows.length}
        courseCount={courseCount ?? 0}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProgressTrendChart points={trendPoints} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By course</CardTitle>
          </CardHeader>
          <CardContent>
            {perCourse.size === 0 ? (
              <p className="text-sm text-muted-foreground">No marks recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {[...perCourse.values()].map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="font-medium">{(c.total / c.count).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Most recent feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {recentFeedback && recentFeedback.feedback ? (
            <div className="flex flex-col gap-1 text-sm">
              <p className="text-muted-foreground">
                {recentFeedback.courses?.name} · {recentFeedbackLessonTitle} ·{" "}
                {new Date(recentFeedback.entry_date).toLocaleDateString()}
              </p>
              <p>{recentFeedback.feedback}</p>
            </div>
          ) : (
            <EmptyState title="No feedback yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
