"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SendIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";

type Student = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  must_change_password: boolean;
};

type ResultRow = {
  id: string;
  email: string;
  fullName: string;
  status: "invited" | "error";
  message?: string;
};

export function StudentsTable({ students }: { students: Student[] }) {
  const pending = students.filter((s) => s.must_change_password);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

  const allPendingSelected = pending.length > 0 && pending.every((s) => selected.has(s.id));

  function toggle(id: string) {
    setResults(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setResults(null);
    setSelected(allPendingSelected ? new Set() : new Set(pending.map((s) => s.id)));
  }

  async function handleResend() {
    const userIds = Array.from(selected);
    if (userIds.length === 0) return;

    setIsPending(true);
    const res = await fetch("/api/admin/users/bulk-resend-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds }),
    });
    const data = await res.json();
    setIsPending(false);

    if (!res.ok) {
      toast.error(data.error ?? "Something went wrong.");
      return;
    }

    const rows = data.results as ResultRow[];
    const invited = rows.filter((r) => r.status === "invited").length;
    const failed = rows.length - invited;

    if (failed === 0) {
      toast.success(`Resent ${invited} invite${invited === 1 ? "" : "s"}.`);
    } else {
      toast.error(`Resent ${invited}, ${failed} failed — see details below.`);
    }

    setResults(rows);
    setSelected(new Set());
  }

  if (students.length === 0) {
    return <EmptyState title="No students yet" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {pending.length > 0 && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={selected.size === 0 || isPending}
          onClick={handleResend}
          className="self-start"
        >
          <SendIcon />
          {isPending
            ? "Resending…"
            : selected.size > 0
              ? `Resend invite${selected.size === 1 ? "" : "s"} (${selected.size})`
              : "Resend invites"}
        </Button>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-4">
              {pending.length > 0 && (
                <Checkbox
                  checked={allPendingSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all pending students"
                />
              )}
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="px-4 py-3">
                {u.must_change_password && (
                  <Checkbox
                    checked={selected.has(u.id)}
                    onCheckedChange={() => toggle(u.id)}
                    aria-label={`Select ${u.full_name}`}
                  />
                )}
              </TableCell>
              <TableCell className="p-0">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="flex items-center gap-2 px-4 py-3 font-medium"
                >
                  {u.full_name}
                  {u.must_change_password && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Pending
                    </Badge>
                  )}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link href={`/admin/users/${u.id}`} className="block px-4 py-3 text-muted-foreground">
                  {u.email ?? "—"}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link href={`/admin/users/${u.id}`} className="block px-4 py-3 text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {results && results.some((r) => r.status === "error") && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="mb-2 font-medium">Couldn&apos;t resend to:</p>
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {results
              .filter((r) => r.status === "error")
              .map((r) => (
                <li key={r.id}>
                  {r.fullName || r.email || r.id}: {r.message}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
