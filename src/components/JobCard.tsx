import { Link } from "@tanstack/react-router";
import { Clock, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Job } from "@/data/jobs";


export function JobCard({ job }: { job: Job }) {
  const disabled = job.status === "preparing";
  const detailButton = (
    <Button size="sm" variant="outline" className="w-full bg-[#008f8f] text-white hover:bg-[#008f8f]/90 sm:w-auto">자세히 보기</Button>
  );
  return (
    <Card
      className={`flex h-full flex-col gap-4 p-6 transition-shadow ${
        disabled ? "opacity-60" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">{job.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{job.tagline}</p>
        </div>
        {disabled && <Badge variant="secondary">준비 중</Badge>}
      </div>

      <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>예상 소요 {job.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>결과 리포트 {job.reportIncluded ? "포함" : "미포함"}</span>
          </div>
        </div>
        {disabled ? (
          <Button disabled size="sm" variant="outline" className="w-full sm:w-auto">
            준비 중
          </Button>
        ) : (
          <Link to="/experiences/$slug" params={{ slug: job.slug }} className="w-full sm:w-auto">
            {detailButton}
          </Link>
        )}
      </div>
    </Card>
  );
}
