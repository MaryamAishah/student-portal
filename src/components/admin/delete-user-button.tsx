"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { UserRole } from "@/lib/types/database.types";

const WARNING_BY_ROLE: Record<UserRole, string> = {
  student:
    "This permanently deletes their account, including every mark and piece of feedback ever recorded for them. This can't be undone.",
  teacher:
    "This permanently deletes their account. Marks and feedback they've recorded stay in students' histories, but will no longer show who recorded them. This can't be undone.",
  admin: "This permanently deletes their admin account. This can't be undone.",
};

export function DeleteUserButton({
  userId,
  fullName,
  role,
}: {
  userId: string;
  fullName: string;
  role: UserRole;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}/delete`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setDeleting(false);
      setError(data.error ?? "Something went wrong.");
      return;
    }

    window.location.href = "/admin/users";
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="outline" className="text-destructive hover:text-destructive">
            <Trash2Icon />
            Delete account
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{fullName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>{WARNING_BY_ROLE[role]}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={handleDelete}
            render={<Button type="button" variant="destructive" />}
          >
            {deleting ? "Deleting…" : "Delete account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
