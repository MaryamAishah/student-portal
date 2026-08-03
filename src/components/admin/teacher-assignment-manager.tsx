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
import { Badge } from "@/components/ui/badge";
import { assignTeacherAction, removeTeacherAction } from "@/lib/actions/admin-actions";
import type { ActionResult } from "@/lib/actions/auth-actions";

const initialState: ActionResult = { error: null };

type Teacher = { id: string; full_name: string };

export function TeacherAssignmentManager({
  courseId,
  assignedTeachers,
  availableTeachers,
}: {
  courseId: string;
  assignedTeachers: Teacher[];
  availableTeachers: Teacher[];
}) {
  const [state, formAction, pending] = useActionState(assignTeacherAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {assignedTeachers.length === 0 && (
          <p className="text-sm text-muted-foreground">No teachers assigned yet.</p>
        )}
        {assignedTeachers.map((t) => (
          <Badge key={t.id} variant="secondary" className="gap-2 py-1.5">
            {t.full_name}
            <form action={removeTeacherAction.bind(null, courseId, t.id)}>
              <button type="submit" className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${t.full_name}`}>
                ×
              </button>
            </form>
          </Badge>
        ))}
      </div>

      {availableTeachers.length > 0 && (
        <form action={formAction} className="flex items-end gap-2">
          <input type="hidden" name="courseId" value={courseId} />
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
