import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export default async function TeacherCoursesPage() {
  const profile = await getSessionProfile();
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("course_teachers")
    .select("courses(id, name, description), course_groups(name)")
    .eq("teacher_id", profile!.id);

  const courses = (assignments ?? [])
    .filter((a) => a.courses !== null)
    .map((a) => ({ ...a.courses!, groupName: a.course_groups?.name ?? null }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Assalamu alaikum, {profile?.fullName}</h1>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">My courses</h1>
        <p className="text-sm text-muted-foreground">
          Select a course to record marks and feedback.
        </p>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="No courses assigned"
          description="Ask an admin to assign you to a course."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/teacher/courses/${course.id}/roster`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-accent/50 hover:shadow-md">
                <CardHeader>
                  <CardTitle>{course.name}</CardTitle>
                  <CardDescription>
                    {course.groupName && <span className="font-medium text-foreground">{course.groupName}</span>}
                    {course.groupName && course.description && " · "}
                    {course.description && <span className="line-clamp-2">{course.description}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
