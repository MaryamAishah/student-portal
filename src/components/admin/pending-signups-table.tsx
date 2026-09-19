"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cancelPendingSignupAction } from "@/lib/actions/admin-actions";

export type PendingSignupRow = {
  id: string;
  full_name: string;
  email: string;
  role: "teacher" | "student";
  courseName: string | null;
  groupName: string | null;
};

export function PendingSignupsTable({ rows }: { rows: PendingSignupRow[] }) {
  const [isPending, startTransition] = useTransition();

  if (rows.length === 0) return null;

  function handleCancel(id: string) {
    startTransition(async () => {
      await cancelPendingSignupAction(id);
      toast.success("Cancelled.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Awaiting signup ({rows.length})</h2>
      <p className="text-sm text-muted-foreground">
        Added without an email invite — they&apos;ll activate their own account from the signup
        link.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Course</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.full_name}</TableCell>
              <TableCell className="text-muted-foreground">{r.email}</TableCell>
              <TableCell className="capitalize">{r.role}</TableCell>
              <TableCell className="text-muted-foreground">
                {r.courseName ? (
                  <>
                    {r.courseName}
                    {r.groupName && <Badge variant="outline" className="ml-2">{r.groupName}</Badge>}
                  </>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleCancel(r.id)}
                  aria-label={`Cancel pending signup for ${r.full_name}`}
                >
                  <XIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
