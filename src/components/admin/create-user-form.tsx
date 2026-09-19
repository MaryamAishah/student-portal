"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateUserForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [method, setMethod] = useState<"invite" | "pending">("invite");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; method: "invite" | "pending" } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, role, method }),
    });
    const data = await res.json();

    setPending(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setDone({ email, method });
    setFullName("");
    setEmail("");
    router.refresh();
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{done.method === "invite" ? "Invitation sent" : "Account added"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {done.method === "invite" ? (
            <p>
              An email has been sent to <span className="font-medium">{done.email}</span> with a
              link to set their password and log in. No action is needed from you.
            </p>
          ) : (
            <p>
              <span className="font-medium">{done.email}</span> can now visit the signup link and
              set their own password to activate their account. Share the link from the Users
              page.
            </p>
          )}
          <Button variant="outline" onClick={() => setDone(null)}>
            Add another account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => v && setRole(v as "teacher" | "student")}
              items={[
                { value: "student", label: "Student" },
                { value: "teacher", label: "Teacher" },
              ]}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>How will they activate this account?</Label>
            <div className="inline-flex w-fit rounded-lg border p-1">
              <Button
                type="button"
                size="sm"
                variant={method === "invite" ? "default" : "ghost"}
                onClick={() => setMethod("invite")}
              >
                Email invite
              </Button>
              <Button
                type="button"
                size="sm"
                variant={method === "pending" ? "default" : "ghost"}
                onClick={() => setMethod("pending")}
              >
                Self-serve link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {method === "invite"
                ? "We'll email them a link to set their password."
                : "No email is sent — share the signup link from the Users page and they'll set their own password there."}
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : method === "invite" ? "Send invite" : "Add account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
