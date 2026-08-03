import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ProgressSummaryCards({
  overallAverage,
  recordCount,
  courseCount,
}: {
  overallAverage: number | null;
  recordCount: number;
  courseCount: number;
}) {
  const tiles = [
    { label: "Overall average", value: overallAverage != null ? overallAverage.toFixed(1) : "—" },
    { label: "Lessons recorded", value: String(recordCount) },
    { label: "Enrolled courses", value: String(courseCount) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">{tile.label}</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{tile.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
