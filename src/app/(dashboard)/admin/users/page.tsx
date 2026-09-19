import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StudentsTable } from "@/components/admin/students-table";
import { SignupLinkCard } from "@/components/admin/signup-link-card";
import { PendingSignupsTable, type PendingSignupRow } from "@/components/admin/pending-signups-table";

type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  must_change_password: boolean;
};

function UserTable({ users, emptyLabel }: { users: Profile[]; emptyLabel: string }) {
  if (users.length === 0) {
    return <EmptyState title={emptyLabel} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id} className="cursor-pointer">
            <TableCell className="p-0">
              <Link
                href={`/admin/users/${u.id}`}
                className="flex items-center gap-2 px-4 py-3 font-medium"
              >
                {u.full_name}
                {u.must_change_password && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Pending
                  </Badge>
                )}
              </Link>
            </TableCell>
            <TableCell className="p-0">
              <Link href={`/admin/users/${u.id}`} className="block px-4 py-3 text-muted-foreground">
                {u.email ?? "—"}
              </Link>
            </TableCell>
            <TableCell className="p-0">
              <Link href={`/admin/users/${u.id}`} className="block px-4 py-3 text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString()}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function UsersPage() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: pending }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at, must_change_password")
      .order("full_name", { ascending: true }),
    supabase
      .from("pending_signups")
      .select("id, full_name, email, role, courses(name), course_groups(name)")
      .order("full_name", { ascending: true }),
  ]);

  const all = profiles ?? [];
  const teachers = all.filter((p) => p.role === "teacher");
  const students = all.filter((p) => p.role === "student");
  const admins = all.filter((p) => p.role === "admin");

  const pendingSignups: PendingSignupRow[] = (pending ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: p.role as "teacher" | "student",
    courseName: p.courses?.name ?? null,
    groupName: p.course_groups?.name ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Teachers and students in the portal.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/users/new">Add account</Link>} />
      </div>

      <SignupLinkCard />

      <PendingSignupsTable rows={pendingSignups} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Teachers ({teachers.length})</h2>
        <UserTable users={teachers} emptyLabel="No teachers yet" />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Students ({students.length})</h2>
        <StudentsTable students={students} />
      </div>

      {admins.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Admins ({admins.length})</h2>
          <UserTable users={admins} emptyLabel="No admins yet" />
        </div>
      )}
    </div>
  );
}
