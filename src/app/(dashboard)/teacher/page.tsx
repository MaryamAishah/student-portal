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
    .select("courses(id, name, description)")
    .eq("teacher_id", profile!.id);

  const courses = (assignments ?? [])
    .map((a) => a.courses)
    .filter((c): c is { id: string; name: string; description: string | null } => c !== null);

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
                  {course.description && (
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  )}
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
