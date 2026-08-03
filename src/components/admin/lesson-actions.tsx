"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateLessonAction, deleteLessonAction } from "@/lib/actions/admin-actions";
import type { ActionResult } from "@/lib/actions/auth-actions";

const initialState: ActionResult = { error: null };

type Lesson = { id: string; title: string; description: string | null };

export function LessonActions({ lesson, courseId }: { lesson: Lesson; courseId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateLessonAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.error === null) {
      setEditOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <div className="flex items-center gap-1">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${lesson.title}`} />}
        >
          <PencilIcon />
        </DialogTrigger>
        <DialogContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="lessonId" value={lesson.id} />
            <input type="hidden" name="courseId" value={courseId} />
            <DialogHeader>
              <DialogTitle>Edit lesson</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`title-${lesson.id}`}>Lesson title</Label>
              <Input id={`title-${lesson.id}`} name="title" defaultValue={lesson.title} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`description-${lesson.id}`}>Description</Label>
              <Input
                id={`description-${lesson.id}`}
                name="description"
                defaultValue={lesson.description ?? ""}
              />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${lesson.title}`}
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{lesson.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This also permanently deletes every mark and feedback entry recorded for this
              lesson. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteLessonAction.bind(null, lesson.id, courseId)}>
              <AlertDialogAction render={<Button type="submit" variant="destructive" />}>
                Delete lesson
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
