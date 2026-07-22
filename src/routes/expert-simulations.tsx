import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LayoutGrid, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ExpertSimulationCard } from "@/components/ExpertSimulationCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { DOMAIN_CATEGORIES, isDomainCategory } from "@/lib/domain-categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expert-simulations")({
  head: () => ({ meta: [{ title: "현직자 제시 시뮬레이션 — Beginner" }] }),
  component: ExpertSimulationsPage,
});

type ExpertSimulation = {
  id: string;
  title: string;
  roleLabel: string;
  description: string;
  domain: string;
  estimatedMinutes: number | null;
  nickname: string;
  companyType: string;
  experienceBand: string;
  jobTitle: string;
  backgroundColor: string;
  textColor: string;
};

type JobSeeker = {
  job_interests: string[] | null;
};

function ExpertCardSkeleton() {
  return (
    <div className="flex aspect-[4/3] flex-col overflow-hidden rounded-md border border-zinc-100 bg-white">
      <Skeleton className="basis-[38%] shrink-0 w-full" />
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-3.5 w-5/6" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <div className="mt-auto flex items-center justify-between pt-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

function ExpertSimulationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [simulations, setSimulations] = useState<ExpertSimulation[]>([]);
  const [jobInterests, setJobInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error: queryError } = await supabase
        .from("job_simulations")
        .select(
          "id, title, role_label, job_family, description, domain, estimated_minutes, expert_nickname, expert_company_type, expert_experience_band, expert_job_title, card_background_color, card_text_color",
        )
        .eq("simulation_source", "expert")
        .eq("is_public", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (queryError) {
        setError("현직자 시뮬레이션을 불러오지 못했습니다.");
      } else {
        setSimulations(
          (data ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            roleLabel: row.role_label || row.job_family || row.title,
            description: row.description || "",
            domain: row.domain || "",
            estimatedMinutes: row.estimated_minutes,
            nickname: row.expert_nickname || "현직자",
            companyType: row.expert_company_type || "",
            experienceBand: row.expert_experience_band || "",
            jobTitle: row.expert_job_title || row.role_label || "",
            backgroundColor: row.card_background_color || "#ffffff",
            textColor: row.card_text_color || "#18181b",
          })),
        );
      }

      if (user) {
        const { data: seekerData } = await supabase
          .from("job_seekers")
          .select("job_interests")
          .eq("id", user.id)
          .maybeSingle();
        const seeker = seekerData as JobSeeker | null;
        setJobInterests((seeker?.job_interests ?? []).filter(isDomainCategory));
      } else {
        setJobInterests([]);
      }

      setLoading(false);
    }

    if (!authLoading) void load();
  }, [authLoading, user]);

  const availableDomains = useMemo(() => {
    const domains = new Set(simulations.map((simulation) => simulation.domain).filter(Boolean));
    return DOMAIN_CATEGORIES.filter((domain) => domains.has(domain));
  }, [simulations]);

  const filteredSimulations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

    return simulations.filter((simulation) => {
      if (selectedDomain && simulation.domain !== selectedDomain) return false;
      if (!normalizedQuery) return true;

      return [simulation.roleLabel, simulation.jobTitle, simulation.title]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase("ko-KR").includes(normalizedQuery));
    });
  }, [query, selectedDomain, simulations]);

  const recommendedSimulations = useMemo(() => {
    const matched = simulations.filter((simulation) => jobInterests.includes(simulation.domain));
    const remaining = simulations.filter((simulation) => !jobInterests.includes(simulation.domain));
    return [...matched, ...remaining].slice(0, 3);
  }, [jobInterests, simulations]);

  const isRecommendationView = Boolean(user && jobInterests.length > 0 && !showAll);
  const visibleSimulations = isRecommendationView ? recommendedSimulations : filteredSimulations;

  function resetFilters() {
    setQuery("");
    setSelectedDomain(null);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" /> 홈으로
      </Link>
      <h1 className="mt-5 text-2xl font-bold text-zinc-900 md:text-3xl">
        {isRecommendationView ? "나를 위한 현직자 시뮬레이션 3개" : "현직자 제시 시뮬레이션"}
      </h1>

      {error ? (
        <p className="mt-8 text-sm text-zinc-500">{error}</p>
      ) : (
        <>
          {!loading && simulations.length > 0 && !isRecommendationView && (
            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDomain(null)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    selectedDomain === null
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                  )}
                >
                  전체
                </button>
                {availableDomains.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setSelectedDomain(domain === selectedDomain ? null : domain)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedDomain === domain
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                    )}
                  >
                    {domain}
                  </button>
                ))}
              </div>

              <div className="relative md:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="직무명 검색"
                  className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    aria-label="검색어 지우기"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <>
                <ExpertCardSkeleton />
                <ExpertCardSkeleton />
                <ExpertCardSkeleton />
              </>
            ) : visibleSimulations.length > 0 ? (
              visibleSimulations.map((simulation) => (
                <Link
                  key={simulation.id}
                  to="/simulation/$id"
                  params={{ id: simulation.id }}
                  className="block h-full"
                >
                  <ExpertSimulationCard
                    nickname={simulation.nickname}
                    companyType={simulation.companyType}
                    experienceBand={simulation.experienceBand}
                    jobTitle={simulation.jobTitle}
                    roleLabel={simulation.roleLabel}
                    title={simulation.title}
                    description={simulation.description}
                    estimatedMinutes={simulation.estimatedMinutes}
                    backgroundColor={simulation.backgroundColor}
                    textColor={simulation.textColor}
                    className="h-full"
                  />
                </Link>
              ))
            ) : simulations.length > 0 ? (
              <div className="col-span-full flex flex-col items-center py-20 text-center text-zinc-500">
                <Search className="h-8 w-8 text-zinc-300" />
                <p className="mt-4 text-sm">조건에 맞는 시뮬레이션이 없습니다.</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
                >
                  필터 초기화
                </button>
              </div>
            ) : (
              <div className="col-span-full flex flex-col items-center py-20 text-center text-zinc-500">
                <LayoutGrid className="h-8 w-8 text-zinc-300" />
                <p className="mt-4 text-sm">공개된 현직자 시뮬레이션이 없습니다.</p>
              </div>
            )}
          </div>

          {isRecommendationView && !loading && (
            <div className="mt-8 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAll(true)}
                className="rounded-md border-zinc-300 text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                전체 직무 보기
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
