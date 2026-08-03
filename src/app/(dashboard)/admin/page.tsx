import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const profile = await getSessionProfile();
  const supabase = await createClient();

  const [{ count: courseCount }, { count: teacherCount }, { count: studentCount }] =
    await Promise.all([
      supabase.from("courses").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    ]);

  const stats = [
    { label: "Courses", value: courseCount ?? 0, href: "/admin/courses" },
    { label: "Teachers", value: teacherCount ?? 0, href: "/admin/users" },
    { label: "Students", value: studentCount ?? 0, href: "/admin/users" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Assalamu alaikum, {profile?.fullName}</h1>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Manage courses, lessons, and accounts across the portal.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-all hover:-translate-y-0.5 hover:bg-accent/50 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
