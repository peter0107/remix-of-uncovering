import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Gem,
  Search,
  HelpCircle,
  BarChart3,
  Star,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listOrders } from "@/lib/orders";
import {
  buildProfile,
  rankJobs,
  type JobRecommendation,
} from "@/lib/recommendations";
import { JobDetailDialog } from "@/components/JobDetailDialog";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/my/recommendations")({
  head: () => ({ meta: [{ title: "추천 직무 전체보기 — beginner" }] }),
  component: RecommendationsPage,
});



function RecommendationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [recs, setRecs] = useState<JobRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobRecommendation | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listOrders()
      .then(async (orders) => {
        const profile = buildProfile(orders);
        const ranked = await rankJobs(profile);
        setRecs(ranked);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const groups = useMemo(() => {
    const high = recs.filter((r) => r.status === "high" || r.status === "ok");
    const explore = recs.filter((r) => r.status === "explore");
    const more = recs.filter((r) => r.status === "more_needed");
    return { high, explore, more };
  }, [recs]);

  const stats = useMemo(() => {
    return {
      total: recs.length,
      priority: groups.high.length,
      explore: groups.explore.length,
      moreNeeded: groups.more.length,
    };
  }, [recs, groups]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-primary">로그인이 필요합니다</h1>
          <Link to="/login" search={{ redirect: "/my/recommendations" }}>
            <Button className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90">
              로그인하러 가기
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-12">
      <Link
        to="/my"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand"
      >
        <ChevronLeft className="h-4 w-4" />
        마이페이지로 돌아가기
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-primary md:text-4xl">추천 직무 전체보기</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        여러 시뮬레이션에서 확인된 세부 역량을 바탕으로 추천 가능한 직무를 정리했어요.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:grid-cols-4 md:gap-4">
        <StatBox icon={<BarChart3 className="h-5 w-5 text-brand" />} label="분석 직무" value={`${stats.total}개`} />
        <StatBox icon={<Star className="h-5 w-5 text-brand" />} label="우선 추천" value={`${stats.priority}개`} />
        <StatBox icon={<Search className="h-5 w-5 text-brand" />} label="탐색 가능" value={`${stats.explore}개`} />
        <StatBox icon={<HelpCircle className="h-5 w-5 text-muted-foreground" />} label="추가 확인 필요" value={`${stats.moreNeeded}개`} />
      </div>

      <div className="mt-8 space-y-6">
        <Section
          icon={<Gem className="h-4 w-4 text-brand" />}
          title="잘 맞을 가능성 높음"
          recs={groups.high}
          rankOffset={0}
          tone="brand"
          onOpen={setSelected}
        />
        <Section
          icon={<Search className="h-4 w-4 text-blue-600" />}
          title="조금 더 탐색해볼 직무"
          recs={groups.explore}
          rankOffset={groups.high.length}
          tone="blue"
          onOpen={setSelected}
        />
        <Section
          icon={<HelpCircle className="h-4 w-4 text-muted-foreground" />}
          title="추가 시뮬레이션 후 판단"
          recs={groups.more}
          rankOffset={groups.high.length + groups.explore.length}
          tone="muted"
          onOpen={setSelected}
        />
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        ⓘ 추천 결과는 추가 시뮬레이션에 따라 달라질 수 있어요.
      </p>

      <JobDetailDialog rec={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 font-bold text-primary text-xl">{value}</div>
      </div>
    </Card>
  );
}

function Section({
  icon,
  title,
  recs,
  rankOffset,
  tone,
  onOpen,
}: {
  icon: React.ReactNode;
  title: string;
  recs: JobRecommendation[];
  rankOffset: number;
  tone: "brand" | "blue" | "muted";
  onOpen: (r: JobRecommendation) => void;
}) {
  if (recs.length === 0) return null;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-5 py-3">
        {icon}
        <span className="text-sm font-semibold text-primary">{title}</span>
      </div>
      <ul className="divide-y">
        {recs.map((r, i) => (
          <RecRow key={r.slug} rec={r} rank={rankOffset + i + 1} tone={tone} onOpen={onOpen} />
        ))}
      </ul>
    </Card>
  );
}

function RecRow({
  rec,
  rank,
  tone,
  onOpen,
}: {
  rec: JobRecommendation;
  rank: number;
  tone: "brand" | "blue" | "muted";
  onOpen: (r: JobRecommendation) => void;
}) {
  
  const scoreColor =
    tone === "brand" ? "text-brand" : tone === "blue" ? "text-blue-600" : "text-muted-foreground";
  const rankBg =
    tone === "brand" ? "bg-brand text-brand-foreground" : tone === "blue" ? "bg-blue-600 text-white" : "bg-muted-foreground/30 text-foreground";

  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankBg}`}>
        {rank}
      </div>
      <div className="flex w-full items-center justify-between gap-3 md:contents">
        <div className="min-w-[140px] flex-shrink-0">
          <div className="font-semibold text-primary">{rec.name}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${scoreColor}`}>{rec.finalScore}</span>
            <span className="text-xs text-muted-foreground">점</span>
          </div>
        </div>
        <div className="min-w-[100px] shrink-0 text-right md:text-left">
          <div className="text-xs text-muted-foreground">근거 {rec.evidenceCount}/{rec.evidenceTotal}</div>
          <div className="mt-1 flex justify-end gap-1 md:justify-start">
            {Array.from({ length: rec.evidenceTotal }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${i < rec.evidenceCount ? "bg-brand" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="min-w-[140px] flex-1">
        <div className="text-xs text-muted-foreground">잘 맞음</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {rec.goodFits.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            rec.goodFits.slice(0, 3).map((c) => (
              <span key={c.id} className="rounded-md bg-brand-soft px-2 py-0.5 text-xs text-brand">
                {c.name.replace(" 역량", "")}
              </span>
            ))
          )}
        </div>
      </div>
      <div className="min-w-[140px] flex-1">
        <div className="text-xs text-muted-foreground">
          {rec.weakPoints.length > 0 ? "보완" : "확인 필요"}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {(rec.weakPoints.length > 0 ? rec.weakPoints : rec.missingPoints).slice(0, 2).map((c) => (
            <span
              key={c.id}
              className={`rounded-md px-2 py-0.5 text-xs ${
                c.level === "weak" ? "bg-orange-50 text-orange-700" : "bg-muted text-muted-foreground"
              }`}
            >
              {c.name.replace(" 역량", "")}
            </span>
          ))}
          {rec.weakPoints.length === 0 && rec.missingPoints.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => onOpen(rec)}>
        {rec.status === "more_needed" ? "관련 시뮬레이션" : "상세 보기"}
        <ChevronRight className="ml-1 h-3 w-3" />
      </Button>
    </li>
  );
}
