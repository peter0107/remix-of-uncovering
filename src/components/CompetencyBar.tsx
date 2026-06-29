import { type Grade } from "@/data/sampleReport";

const LEVEL: Record<Grade, number> = {
  "상": 100,
  "중상": 75,
  "중": 50,
  "보완 필요": 25,
};

const COLOR: Record<Grade, string> = {
  "상": "bg-brand",
  "중상": "bg-brand/70",
  "중": "bg-primary/50",
  "보완 필요": "bg-destructive/70",
};

export function CompetencyBar({
  name,
  grade,
  note,
}: {
  name: string;
  grade: Grade;
  note?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">{name}</div>
        <div className="text-xs font-semibold text-foreground">{grade}</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${COLOR[grade]}`}
          style={{ width: `${LEVEL[grade]}%` }}
        />
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
