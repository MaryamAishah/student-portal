import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { LessonForm } from "@/components/admin/lesson-form";
import { LessonActions } from "@/components/admin/lesson-actions";
import { BulkLessonUpload } from "@/components/admin/bulk-lesson-upload";
import { TeacherAssignmentManager } from "@/components/admin/teacher-assignment-manager";
import { EnrollmentManager } from "@/components/admin/enrollment-manager";
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
    { data: allTeachers },
    { data: allStudents },
    { data: courseTeachers },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from("courses").select("id, name, description").eq("id", courseId).single(),
    supabase
      .from("lessons")
      .select("id, title, description")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true }),
    supabase.from("profiles").select("id, full_name").eq("role", "teacher"),
    supabase.from("profiles").select("id, full_name").eq("role", "student"),
    supabase.from("course_teachers").select("teacher_id, created_at").eq("course_id", courseId),
    supabase.from("enrollments").select("student_id, enrolled_at").eq("course_id", courseId),
  ]);

  if (!course) {
    notFound();
  }

  const teacherAssignedAt = new Map((courseTeachers ?? []).map((t) => [t.teacher_id, t.created_at]));
  const studentEnrolledAt = new Map((enrollments ?? []).map((e) => [e.student_id, e.enrolled_at]));

  const assignedTeachers = (allTeachers ?? [])
    .filter((t) => teacherAssignedAt.has(t.id))
    .map((t) => ({ ...t, assignedAt: teacherAssignedAt.get(t.id)! }));
  const availableTeachers = (allTeachers ?? []).filter((t) => !teacherAssignedAt.has(t.id));
  const enrolledStudents = (allStudents ?? [])
    .filter((s) => studentEnrolledAt.has(s.id))
    .map((s) => ({ ...s, enrolledAt: studentEnrolledAt.get(s.id)! }));
  const availableStudents = (allStudents ?? []).filter((s) => !studentEnrolledAt.has(s.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{course.name}</h1>
        {course.description && <p className="text-sm text-muted-foreground">{course.description}</p>}
      </div>

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
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

        <TabsContent value="teachers">
          <TeacherAssignmentManager
            courseId={courseId}
            assignedTeachers={assignedTeachers}
            availableTeachers={availableTeachers}
          />
        </TabsContent>

        <TabsContent value="enrollments">
          <EnrollmentManager
            courseId={courseId}
            enrolledStudents={enrolledStudents}
            availableStudents={availableStudents}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
