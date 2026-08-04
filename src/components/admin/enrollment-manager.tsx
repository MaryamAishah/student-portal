"use client";

import { useActionState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { enrollStudentAction, removeEnrollmentAction } from "@/lib/actions/admin-actions";
import type { ActionResult } from "@/lib/actions/auth-actions";

const initialState: ActionResult = { error: null };

type Student = { id: string; full_name: string; enrolledAt: string };

export function EnrollmentManager({
  courseId,
  enrolledStudents,
  availableStudents,
}: {
  courseId: string;
  enrolledStudents: Student[];
  availableStudents: { id: string; full_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(enrollStudentAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      {enrolledStudents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrolledStudents.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(s.enrolledAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <form action={removeEnrollmentAction.bind(null, courseId, s.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {availableStudents.length > 0 && (
        <form action={formAction} className="flex items-end gap-2">
          <input type="hidden" name="courseId" value={courseId} />
          <div className="flex-1">
            <Select
              name="studentId"
              items={availableStudents.map((s) => ({ value: s.id, label: s.full_name }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a student to enroll" />
              </SelectTrigger>
              <SelectContent>
                {availableStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending} variant="outline">
            Enroll
          </Button>
        </form>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}
