import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LessonForm } from "@/components/admin/lesson-form";
import { LessonActions } from "@/components/admin/lesson-actions";
import { BulkLessonUpload } from "@/components/admin/bulk-lesson-upload";
import { GroupForm } from "@/components/admin/group-form";
import { CourseActions } from "@/components/admin/course-actions";
import { EmptyState } from "@/components/shared/empty-state";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  const [
    { data: course },
    { data: lessons },
    { data: groups },
    { data: courseTeachers },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from("courses").select("id, name, description").eq("id", courseId).single(),
    supabase
      .from("lessons")
      .select("id, title, description")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("course_groups")
      .select("id, name, created_at")
      .eq("course_id", courseId)
      .order("name", { ascending: true }),
    supabase.from("course_teachers").select("group_id").eq("course_id", courseId),
    supabase.from("enrollments").select("group_id").eq("course_id", courseId),
  ]);

  if (!course) {
    notFound();
  }

  const teacherCountByGroup = new Map<string, number>();
  for (const t of courseTeachers ?? []) {
    teacherCountByGroup.set(t.group_id, (teacherCountByGroup.get(t.group_id) ?? 0) + 1);
  }
  const studentCountByGroup = new Map<string, number>();
  for (const e of enrollments ?? []) {
    studentCountByGroup.set(e.group_id, (studentCountByGroup.get(e.group_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{course.name}</h1>
          {course.description && <p className="text-sm text-muted-foreground">{course.description}</p>}
        </div>
        <CourseActions course={course} />
      </div>

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                <div className="flex-1">
                  <LessonForm courseId={courseId} />
                </div>
                <BulkLessonUpload courseId={courseId} />
              </div>
            </CardContent>
          </Card>
          {!lessons || lessons.length === 0 ? (
            <EmptyState title="No lessons yet" description="Add the first lesson topic above." />
          ) : (
            <div className="flex flex-col gap-2">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="font-medium">{lesson.title}</p>
                    {lesson.description && (
                      <p className="text-sm text-muted-foreground">{lesson.description}</p>
                    )}
                  </div>
                  <LessonActions lesson={lesson} courseId={courseId} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Teachers and students are assigned to a group, not the course directly. Lessons
              above are shared across every group.
            </p>
            <GroupForm courseId={courseId} />
          </div>

          {!groups || groups.length === 0 ? (
            <EmptyState
              title="No groups yet"
              description="Create a group to start assigning teachers and enrolling students."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Link key={group.id} href={`/admin/courses/${courseId}/groups/${group.id}`}>
                  <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-accent/50 hover:shadow-md">
                    <CardHeader>
                      <CardTitle>{group.name}</CardTitle>
                      <CardDescription>
                        {teacherCountByGroup.get(group.id) ?? 0} teacher
                        {(teacherCountByGroup.get(group.id) ?? 0) === 1 ? "" : "s"} ·{" "}
                        {studentCountByGroup.get(group.id) ?? 0} student
                        {(studentCountByGroup.get(group.id) ?? 0) === 1 ? "" : "s"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
