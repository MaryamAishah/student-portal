"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createGroupAction } from "@/lib/actions/admin-actions";
import type { ActionResult } from "@/lib/actions/auth-actions";

const initialState: ActionResult = { error: null };

export function GroupForm({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createGroupAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.error === null) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New group</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="courseId" value={courseId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Group name</Label>
            <Input id="name" name="name" placeholder="e.g. Group A" required />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create group"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
