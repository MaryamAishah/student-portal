"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { extractInviteRows, type ParsedInviteRow } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ResultRow = {
  email: string;
  fullName: string;
  status: "invited" | "error";
  message?: string;
};

export function BulkInviteForm({ courses }: { courses: { id: string; name: string }[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedInviteRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

  const validRows = rows.filter((r) => r.fullName && r.email);
  const skippedCount = rows.length - validRows.length;
  const hasGroups = validRows.some((r) => r.group);
  const missingCourseForGroups = role === "student" && hasGroups && !courseId;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResults(null);
    if (!file) {
      setFileName(null);
      setRows([]);
      setParseError(null);
      return;
    }

    setFileName(file.name);
    const text = await file.text();
    const { rows: parsed, error } = extractInviteRows(text);
    setParseError(error);
    setRows(error ? [] : parsed);
  }

  function reset() {
    setFileName(null);
    setRows([]);
    setParseError(null);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    setPending(true);
    const res = await fetch("/api/admin/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        rows: validRows,
        courseId: role === "student" ? courseId : null,
      }),
    });
    const data = await res.json();
    setPending(false);

    if (!res.ok) {
      setParseError(data.error ?? "Something went wrong.");
      return;
    }

    setResults(data.results as ResultRow[]);
    router.refresh();
  }

  if (results) {
    const invited = results.filter((r) => r.status === "invited").length;
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          Invited <span className="font-medium">{invited}</span> of{" "}
          <span className="font-medium">{results.length}</span> accounts.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.email}>
                <TableCell>{r.fullName || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.email}</TableCell>
                <TableCell>
                  {r.status === "invited" ? (
                    <Badge variant="secondary" title={r.message}>
                      {r.message ? "Invited & enrolled" : "Invited"}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" title={r.message}>
                      {r.message ?? "Error"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button variant="outline" onClick={reset} className="self-start">
          Upload another file
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Account type</Label>
        <div className="inline-flex w-fit rounded-lg border p-1">
          <Button
            type="button"
            size="sm"
            variant={role === "student" ? "default" : "ghost"}
            onClick={() => setRole("student")}
          >
            Student
          </Button>
          <Button
            type="button"
            size="sm"
            variant={role === "teacher" ? "default" : "ghost"}
            onClick={() => setRole("teacher")}
          >
            Teacher
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Every account in this file will be created as this role.
        </p>
      </div>

      {role === "student" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="course">Course (optional)</Label>
          <Select
            value={courseId ?? undefined}
            onValueChange={(v) => setCourseId(v || null)}
            items={courses.map((c) => ({ value: c.id, label: c.name }))}
          >
            <SelectTrigger id="course" className="w-full">
              <SelectValue placeholder="No course — skip group assignment" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            If your CSV has an optional <span className="font-mono">group</span> column, pick the
            course it belongs to here and each student will be auto-enrolled into the matching
            group.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="csv">CSV file</Label>
        <Input id="csv" type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} />
        <p className="text-xs text-muted-foreground">
          Needs a header row with <span className="font-mono">name</span> and{" "}
          <span className="font-mono">email</span> columns, plus an optional{" "}
          <span className="font-mono">group</span> column for students.
        </p>
      </div>

      {parseError && <p className="text-sm text-destructive">{parseError}</p>}

      {fileName && !parseError && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {validRows.length} account{validRows.length === 1 ? "" : "s"} ready to invite from{" "}
            <span className="font-medium text-foreground">{fileName}</span>
            {skippedCount > 0 && ` — ${skippedCount} row${skippedCount === 1 ? "" : "s"} skipped (missing name or email)`}
            .
          </p>
          {validRows.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {hasGroups && <TableHead>Group</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validRows.map((r, i) => (
                    <TableRow key={`${r.email}-${i}`}>
                      <TableCell>{r.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.email}</TableCell>
                      {hasGroups && <TableCell className="text-muted-foreground">{r.group || "—"}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {missingCourseForGroups && (
            <p className="text-sm text-destructive">
              This file has group names — pick a course above so they can be assigned, or upload
              without a group column.
            </p>
          )}
        </div>
      )}

      <Button
        type="button"
        disabled={pending || validRows.length === 0 || missingCourseForGroups}
        onClick={handleSubmit}
        className="self-start"
      >
        {pending ? "Sending invites…" : `Invite ${validRows.length || ""} account${validRows.length === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}
