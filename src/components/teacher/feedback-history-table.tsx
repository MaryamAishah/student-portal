import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";

export type FeedbackHistoryRow = {
  id: string;
  studentName: string;
  courseName: string;
  lessonTitle: string;
  entryDate: string;
  mark: number | null;
  feedback: string | null;
};

export function FeedbackHistoryTable({ rows }: { rows: FeedbackHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No feedback yet"
        description="Feedback you enter for students will appear here."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Lesson</TableHead>
            <TableHead className="w-20">Mark</TableHead>
            <TableHead>Feedback</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {new Date(row.entryDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="font-medium">{row.studentName}</TableCell>
              <TableCell>{row.courseName}</TableCell>
              <TableCell>{row.lessonTitle}</TableCell>
              <TableCell>{row.mark != null ? row.mark : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{row.feedback ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
