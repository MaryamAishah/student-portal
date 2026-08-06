import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherAssignmentManager } from "@/components/admin/teacher-assignment-manager";
import { EnrollmentManager } from "@/components/admin/enrollment-manager";
import { GroupActions } from "@/components/admin/group-actions";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; groupId: string }>;
}) {
  const { courseId, groupId } = await params;
  const supabase = await createClient();

  const [
    { data: course },
    { data: group },
    { data: allTeachers },
    { data: allStudents },
    { data: courseTeachers },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from("courses").select("id, name").eq("id", courseId).single(),
    supabase.from("course_groups").select("id, name").eq("id", groupId).eq("course_id", courseId).single(),
    supabase.from("profiles").select("id, full_name").eq("role", "teacher"),
    supabase.from("profiles").select("id, full_name").eq("role", "student"),
    supabase.from("course_teachers").select("teacher_id, group_id, created_at").eq("course_id", courseId),
    supabase.from("enrollments").select("student_id, group_id, enrolled_at").eq("course_id", courseId),
  ]);

  if (!course || !group) {
    notFound();
  }

  // "Assigned anywhere in this course" (any group) is what makes someone
  // unavailable -- a person can only belong to one group per course.
  const teacherAssignedAt = new Map((courseTeachers ?? []).map((t) => [t.teacher_id, t]));
  const studentEnrolledAt = new Map((enrollments ?? []).map((e) => [e.student_id, e]));

  const assignedTeachers = (allTeachers ?? [])
    .filter((t) => teacherAssignedAt.get(t.id)?.group_id === groupId)
    .map((t) => ({ ...t, assignedAt: teacherAssignedAt.get(t.id)!.created_at }));
  const availableTeachers = (allTeachers ?? []).filter((t) => !teacherAssignedAt.has(t.id));

  const enrolledStudents = (allStudents ?? [])
    .filter((s) => studentEnrolledAt.get(s.id)?.group_id === groupId)
    .map((s) => ({ ...s, enrolledAt: studentEnrolledAt.get(s.id)!.enrolled_at }));
  const availableStudents = (allStudents ?? []).filter((s) => !studentEnrolledAt.has(s.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/admin/courses/${courseId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          {course.name}
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <GroupActions group={group} courseId={courseId} />
        </div>
      </div>

      <Tabs defaultValue="teachers">
        <TabsList>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="teachers">
          <TeacherAssignmentManager
            courseId={courseId}
            groupId={groupId}
            assignedTeachers={assignedTeachers}
            availableTeachers={availableTeachers}
          />
        </TabsContent>

        <TabsContent value="students">
          <EnrollmentManager
            courseId={courseId}
            groupId={groupId}
            enrolledStudents={enrolledStudents}
            availableStudents={availableStudents}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
