import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";

export type LessonHistoryRow = {
  id: string;
  courseName: string;
  lessonTitle: string;
  lessonDescription: string | null;
  entryDate: string;
  mark: number | null;
  feedback: string | null;
};

export function LessonHistoryTable({ rows }: { rows: LessonHistoryRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No records yet" description="Your marks and feedback will appear here." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
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
              <TableCell className="font-medium">{row.courseName}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{row.lessonTitle}</span>
                  {row.lessonDescription && (
                    <span className="text-xs text-muted-foreground">{row.lessonDescription}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{row.mark != null ? row.mark : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{row.feedback ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
