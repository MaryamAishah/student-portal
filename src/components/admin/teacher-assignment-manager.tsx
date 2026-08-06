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
import { assignTeacherAction, removeTeacherAction } from "@/lib/actions/admin-actions";
import type { ActionResult } from "@/lib/actions/auth-actions";

const initialState: ActionResult = { error: null };

type Teacher = { id: string; full_name: string; assignedAt: string };

export function TeacherAssignmentManager({
  courseId,
  groupId,
  assignedTeachers,
  availableTeachers,
}: {
  courseId: string;
  groupId: string;
  assignedTeachers: Teacher[];
  availableTeachers: { id: string; full_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignTeacherAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      {assignedTeachers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teachers assigned yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignedTeachers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.full_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(t.assignedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <form action={removeTeacherAction.bind(null, courseId, groupId, t.id)}>
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

      {availableTeachers.length > 0 && (
        <form action={formAction} className="flex items-end gap-2">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="groupId" value={groupId} />
          <div className="flex-1">
            <Select
              name="teacherId"
              items={availableTeachers.map((t) => ({ value: t.id, label: t.full_name }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a teacher to assign" />
              </SelectTrigger>
              <SelectContent>
                {availableTeachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending} variant="outline">
            Assign
          </Button>
        </form>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}
