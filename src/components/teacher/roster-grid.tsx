"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveRosterEntriesAction } from "@/lib/actions/teacher-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Lesson = { id: string; title: string; description: string | null };
type Student = { id: string; full_name: string };
type RowState = { mark: string; feedback: string };

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function RosterGrid({
  courseId,
  lessons,
  students,
}: {
  courseId: string;
  lessons: Lesson[];
  students: Student[];
}) {
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [entryDate, setEntryDate] = useState(todayIso());
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);
  const selectedLesson = lessons.find((lesson) => lesson.id === lessonId);

  useEffect(() => {
    if (!lessonId || !entryDate) return;
    let cancelled = false;

    async function loadExisting() {
      setLoading(true);
      const { data } = await supabase
        .from("lesson_records")
        .select("student_id, mark, feedback")
        .eq("lesson_id", lessonId)
        .eq("entry_date", entryDate);

      if (cancelled) return;

      const next: Record<string, RowState> = {};
      for (const student of students) {
        const existing = data?.find((r) => r.student_id === student.id);
        next[student.id] = {
          mark: existing?.mark != null ? String(existing.mark) : "",
          feedback: existing?.feedback ?? "",
        };
      }
      setRows(next);
      setLoading(false);
    }

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [lessonId, entryDate, students, supabase]);

  function updateRow(studentId: string, field: keyof RowState, value: string) {
    setRows((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  function handleSave() {
    if (!lessonId || !entryDate) return;

    const entries = students.map((student) => {
      const row = rows[student.id] ?? { mark: "", feedback: "" };
      const mark = row.mark.trim() === "" ? null : Number(row.mark);
      return {
        studentId: student.id,
        mark: mark === null || Number.isNaN(mark) ? null : mark,
        feedback: row.feedback.trim() === "" ? null : row.feedback,
      };
    });

    startTransition(async () => {
      const result = await saveRosterEntriesAction(courseId, lessonId, entryDate, entries);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Saved marks and feedback for the class.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="lesson">Lesson</Label>
            <Select
              value={lessonId}
              onValueChange={(value) => value && setLessonId(value)}
              items={lessons.map((lesson) => ({ value: lesson.id, label: lesson.title }))}
            >
              <SelectTrigger id="lesson" className="w-full">
                <SelectValue placeholder="Select a lesson" />
              </SelectTrigger>
              <SelectContent>
                {lessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="entryDate">Date</Label>
            <Input
              id="entryDate"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={isPending || loading} className="sm:w-40">
            {isPending ? "Saving…" : "Save all"}
          </Button>
        </div>
        {selectedLesson?.description && (
          <p className="text-sm text-muted-foreground">{selectedLesson.description}</p>
        )}
      </div>

      {/* Card layout below md: a 3-column table (name, mark, freeform
          feedback) doesn't fit a phone screen without constant
          horizontal scrolling mid-entry, so stack each student instead. */}
      <div className="flex flex-col gap-3 md:hidden">
        {students.map((student) => (
          <div key={student.id} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{student.full_name}</p>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.5"
                disabled={loading}
                value={rows[student.id]?.mark ?? ""}
                onChange={(e) => updateRow(student.id, "mark", e.target.value)}
                className="w-20 shrink-0"
                aria-label={`Mark for ${student.full_name}`}
              />
            </div>
            <Textarea
              rows={2}
              disabled={loading}
              value={rows[student.id]?.feedback ?? ""}
              onChange={(e) => updateRow(student.id, "feedback", e.target.value)}
              placeholder="Personalized feedback…"
              aria-label={`Feedback for ${student.full_name}`}
            />
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Student</TableHead>
              <TableHead className="w-24">Mark</TableHead>
              <TableHead>Feedback</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.full_name}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    disabled={loading}
                    value={rows[student.id]?.mark ?? ""}
                    onChange={(e) => updateRow(student.id, "mark", e.target.value)}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Textarea
                    rows={1}
                    disabled={loading}
                    value={rows[student.id]?.feedback ?? ""}
                    onChange={(e) => updateRow(student.id, "feedback", e.target.value)}
                    placeholder="Personalized feedback…"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
