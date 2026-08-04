"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadIcon } from "lucide-react";
import { extractLessonRows, type ParsedLessonRow } from "@/lib/csv";
import { bulkAddLessonsAction } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ResultRow = { title: string; status: "added" | "error"; message?: string };

export function BulkLessonUpload({ courseId }: { courseId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedLessonRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

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
    const { rows: parsed, error } = extractLessonRows(text);
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
    const { results: newResults } = await bulkAddLessonsAction(courseId, rows);
    setPending(false);
    setResults(newResults);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <UploadIcon />
        Bulk upload CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk add lessons</DialogTitle>
        </DialogHeader>

        {results ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Added <span className="font-medium">{results.filter((r) => r.status === "added").length}</span>{" "}
              of <span className="font-medium">{results.length}</span> lessons.
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={`${r.title}-${i}`}>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>
                        {r.status === "added" ? (
                          <Badge variant="secondary">Added</Badge>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Upload another file
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lesson-csv">CSV file</Label>
              <Input
                id="lesson-csv"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                Needs a header row with a <span className="font-mono">title</span> column, and
                optionally a <span className="font-mono">description</span> column.
              </p>
            </div>

            {parseError && <p className="text-sm text-destructive">{parseError}</p>}

            {fileName && !parseError && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {rows.length} lesson{rows.length === 1 ? "" : "s"} ready to add from{" "}
                  <span className="font-medium text-foreground">{fileName}</span>.
                </p>
                {rows.length > 0 && (
                  <div className="max-h-64 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => (
                          <TableRow key={`${r.title}-${i}`}>
                            <TableCell>{r.title}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {r.description || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" disabled={pending || rows.length === 0} onClick={handleSubmit}>
                {pending ? "Adding…" : `Add ${rows.length || ""} lesson${rows.length === 1 ? "" : "s"}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
