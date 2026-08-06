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
import { updateGroupAction, deleteGroupAction } from "@/lib/actions/admin-actions";
import type { ActionResult } from "@/lib/actions/auth-actions";

const initialState: ActionResult = { error: null };

export function GroupActions({
  group,
  courseId,
}: {
  group: { id: string; name: string };
  courseId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [state, formAction, pending] = useActionState(updateGroupAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.error === null) {
      setEditOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  async function handleDelete() {
    setDeleting(true);
    await deleteGroupAction(group.id, courseId);
    window.location.href = `/admin/courses/${courseId}`;
  }

  return (
    <div className="flex items-center gap-1">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${group.name}`} />}
        >
          <PencilIcon />
        </DialogTrigger>
        <DialogContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="groupId" value={group.id} />
            <input type="hidden" name="courseId" value={courseId} />
            <DialogHeader>
              <DialogTitle>Edit group</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Group name</Label>
              <Input id="name" name="name" defaultValue={group.name} required />
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
              aria-label={`Delete ${group.name}`}
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{group.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every teacher and student assigned to this group. Marks already
              recorded stay in their history, but they&apos;ll need to be re-assigned to a group
              to continue. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDelete}
              render={<Button type="button" variant="destructive" />}
            >
              {deleting ? "Deleting…" : "Delete group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
