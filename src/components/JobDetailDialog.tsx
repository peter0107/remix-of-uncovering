import { Link } from "@tanstack/react-router";
import { Compass, Target } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type JobRecommendation, type CompetencyDetail } from "@/lib/recommendations";

const LEVEL_COLOR: Record<CompetencyDetail["level"], string> = {
  good: "bg-brand",
  ok: "bg-blue-500",
  weak: "bg-orange-500",
  missing: "bg-muted",
};

const LEVEL_LABEL: Record<CompetencyDetail["level"], string> = {
  good: "잘 맞음",
  ok: "보통",
  weak: "보완 필요",
  missing: "추가 확인 필요",
};

const LEVEL_BADGE: Record<CompetencyDetail["level"], string> = {
  good: "bg-brand-soft text-brand",
  ok: "bg-blue-50 text-blue-700",
  weak: "bg-orange-50 text-orange-700",
  missing: "bg-muted text-muted-foreground",
};

export function JobDetailDialog({
  rec,
  open,
  onOpenChange,
}: {
  rec: JobRecommendation | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!rec) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft sm:h-16 sm:w-16">
            <Compass className="h-6 w-6 text-brand sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg font-bold text-primary sm:text-2xl">{rec.name}</DialogTitle>
            {rec.description && (
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{rec.description}</p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm sm:gap-4">
              <div>
                <div className="text-[11px] text-muted-foreground sm:text-xs">추천 점수</div>
                <div className="mt-1 font-bold text-foreground">
                  <span className="text-xl sm:text-2xl">{rec.finalScore}</span>
                  <span className="text-[10px] text-muted-foreground sm:text-xs"> /100</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground sm:text-xs">예상 적합도</div>
                <div className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{rec.fitPercent}%</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground sm:text-xs">측정 역량</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-foreground sm:text-base text-xl">
                    {rec.evidenceCount} <span className="text-[10px] text-muted-foreground sm:text-xs">/ {rec.evidenceTotal}</span>
                  </span>
                  <div className="flex gap-0.5 sm:gap-1">
                    {Array.from({ length: rec.evidenceTotal }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${
                          i < rec.evidenceCount ? "bg-brand" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3 sm:p-5">
          <div className="font-bold text-primary text-base">요약</div>
          <div className="mt-4 space-y-3">
            {rec.details.map((d) => (
              <div
                key={d.id}
                className="grid grid-cols-[5.5rem_1fr_2.25rem_4.5rem] items-center gap-2 text-sm sm:grid-cols-[7rem_1fr_2.5rem_5.5rem] sm:gap-3"
              >
                <span className="truncate text-xs text-foreground sm:text-sm">{d.name}</span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${LEVEL_COLOR[d.level]}`}
                    style={{ width: `${d.score ?? 0}%` }}
                  />
                </div>
                <div className="text-right text-xs font-semibold text-foreground sm:text-sm">
                  {d.score ?? "—"}
                </div>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-center text-[10px] font-medium sm:text-xs ${LEVEL_BADGE[d.level]}`}
                >
                  {LEVEL_LABEL[d.level]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-lg bg-brand-soft/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-brand sm:h-6 sm:w-6" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-primary sm:text-base">이 역량을 더 확인해보세요!</div>
              <div className="text-xs text-muted-foreground">
                시뮬레이션을 추가로 진행하면 추천의 정확도가 더 높아져요.
              </div>
            </div>
          </div>
          <Link to="/experiences" className="sm:shrink-0">
            <Button size="sm" className="w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto">
              추천 시뮬레이션 보기 →
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
