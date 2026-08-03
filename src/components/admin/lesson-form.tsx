"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { addLessonAction } from "@/lib/actions/admin-actions";
import type { ActionResult } from "@/lib/actions/auth-actions";

const initialState: ActionResult = { error: null };

export function LessonForm({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(addLessonAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.error === null) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="courseId" value={courseId} />
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="title">Lesson title</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add lesson"}
      </Button>
      {state.error && <p className="text-sm text-destructive sm:basis-full">{state.error}</p>}
    </form>
  );
}
