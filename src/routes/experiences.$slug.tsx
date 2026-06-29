import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, FileText, Search, Flame } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getJob } from "@/data/jobs";
import { INDUSTRIES } from "@/data/jobCategories";
import { listPublishedByJob, type Mission, experienceLabel } from "@/lib/missions";
import { listCustomJobs } from "@/lib/customJobs";
import { toast } from "sonner";

export const Route = createFileRoute("/experiences/$slug")({
  component: JobDetailPage,
});

function JobDetailPage() {
  const { slug } = Route.useParams();
  const staticJob = getJob(slug);
  const [job, setJob] = useState<{ name: string } | null>(staticJob ?? null);
  const [jobLoading, setJobLoading] = useState(!staticJob);
  const childMatches = useChildMatches();

  useEffect(() => {
    if (staticJob) {
      setJob(staticJob);
      setJobLoading(false);
      return;
    }
    setJobLoading(true);
    listCustomJobs()
      .then((rows) => {
        const found = rows.find((r) => r.slug === slug);
        setJob(found ? { name: found.name } : null);
      })
      .catch(() => setJob(null))
      .finally(() => setJobLoading(false));
  }, [slug, staticJob]);
  const [industryId, setIndustryId] = useState<string>("all");
  const [missionQuery, setMissionQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "official" | "expert">("all");
  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);

  const isChildRoute = childMatches.length > 0;

  useEffect(() => {
    setMissionsLoading(true);
    listPublishedByJob(slug)
      .then((m) => setAllMissions(m))
      .catch((e) => {
        setAllMissions([]);
        toast.error((e as Error).message || "시뮬레이션을 불러오지 못했어요");
      })
      .finally(() => setMissionsLoading(false));
  }, [slug]);

  const missions = useMemo(() => {
    return allMissions.filter((m) => {
      const byIndustry = industryId === "all" || m.industries.includes(industryId);
      const byQuery = m.title.toLowerCase().includes(missionQuery.toLowerCase());
      const isOfficial = !m.is_expert_authored;
      const byType =
        typeFilter === "all" ||
        (typeFilter === "official" && isOfficial) ||
        (typeFilter === "expert" && !isOfficial);
      return byIndustry && byQuery && byType;
    });
  }, [allMissions, industryId, missionQuery, typeFilter]);

  if (isChildRoute) return <Outlet />;
  if (jobLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  }
  if (!job) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        직무를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 pb-10">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-10">
        <Link to="/experiences" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 직무 목록으로 돌아가기
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-primary md:text-3xl">{job.name} · 체험 가능한 시뮬레이션</h1>
          <p className="mt-2 text-sm text-muted-foreground">원하는 산업군과 시뮬레이션을 선택해 바로 체험을 시작하세요.</p>

          <div className="mt-4 -mx-4 overflow-x-auto px-4">
            <div className="flex gap-2 whitespace-nowrap pb-1">
              {INDUSTRIES.map((ind) => {
                const active = ind.id === industryId;
                return (
                  <button
                    key={ind.id}
                    onClick={() => setIndustryId(ind.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active ? "border-brand bg-brand text-white" : "border-border bg-background text-foreground/70 hover:border-brand/40"
                    }`}
                  >
                    {ind.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative md:max-w-xs md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={missionQuery} onChange={(e) => setMissionQuery(e.target.value)} placeholder="시뮬레이션 검색" className="h-10 rounded-md bg-background pl-9 text-sm" />
            </div>
            <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-sm">
              {[{ id: "all", label: "전체" }, { id: "official", label: "공식" }, { id: "expert", label: "현직자 제작" }].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id as typeof typeFilter)}
                  className={`rounded-[5px] px-3.5 py-1.5 text-xs font-medium transition-colors md:text-sm ${
                    typeFilter === t.id ? "bg-brand text-white" : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {missionsLoading ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex h-full flex-col rounded-xl border border-border bg-background p-5">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-5/6" />
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-7 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : missions.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
              해당 조건의 시뮬레이션을 준비 중입니다.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {missions.map((m, i) => (
                <MissionCard key={m.id} mission={m} index={i + 1} jobSlug={slug} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MissionCard({ mission, index, jobSlug }: { mission: Mission; index: number; jobSlug: string }) {
  const isOfficial = !mission.is_expert_authored;
  const initial = mission.author_name.charAt(0);
  return (
    <Link
      to="/experiences/$slug/missions/$missionId"
      params={{ slug: jobSlug, missionId: mission.id }}
      className="flex h-full flex-col rounded-xl border border-border bg-background p-5 transition-shadow hover:shadow-md hover:border-brand/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-primary">{mission.title}</h3>
        {!isOfficial && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold leading-none text-violet-700">
            <Flame className="h-3 w-3" /> 현직자
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground/70">{mission.description}</p>

      <div className="mt-4 flex items-center gap-2">
        <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${isOfficial ? "bg-foreground text-background" : "bg-purple-200 text-purple-700"}`}>
          {initial}
        </div>
        <div className="text-xs text-foreground/70">
          <span className="font-semibold">{mission.author_name}</span>
          {(() => {
            const parts = [
              mission.author_role,
              mission.company_size,
              experienceLabel(mission.years_experience),
            ].filter(Boolean) as string[];
            return parts.length > 0 ? (
              <span className="text-muted-foreground"> · {parts.join(" · ")}</span>
            ) : null;
          })()}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 예상 {mission.duration_min}분</span>
          <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> 결과 리포트 제공</span>
        </div>
        <span className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold text-white" style={{ backgroundColor: "#008f8f" }}>
          시작하기
        </span>
      </div>
    </Link>
  );
}
