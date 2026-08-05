"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResendInviteButton({ userId }: { userId: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const res = await fetch(`/api/admin/users/${userId}/resend-invite`, { method: "POST" });
    const data = await res.json();
    setPending(false);

    if (!res.ok) {
      toast.error(data.error ?? "Something went wrong.");
      return;
    }

    toast.success("Invite resent.");
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClick}>
      <SendIcon />
      {pending ? "Resending…" : "Resend invite"}
    </Button>
  );
}
