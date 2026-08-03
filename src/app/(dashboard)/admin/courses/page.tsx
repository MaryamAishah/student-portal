import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CourseForm } from "@/components/admin/course-form";
import { EmptyState } from "@/components/shared/empty-state";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, description")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-sm text-muted-foreground">Manage courses, lessons, and enrollment.</p>
        </div>
        <CourseForm />
      </div>

      {!courses || courses.length === 0 ? (
        <EmptyState title="No courses yet" description="Create your first course to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/admin/courses/${course.id}`}>
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
