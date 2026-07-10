import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SimulationCardPreview } from "@/components/SimulationCardPreview";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { isDomainCategory } from "@/lib/domain-categories";

export const Route = createFileRoute("/simulations")({
  head: () => ({ meta: [{ title: "추천 시뮬레이션 — Beginner" }] }),
  component: SimulationsPage,
});

// ─── 타입 ────────────────────────────────────────────────────

export type Simulation = {
  id: string;
  title: string;
  role_label: string | null;
  description: string | null;
  job_family: string | null;
  domain: string | null;
  estimated_minutes: number | null;
  card_image_url: string | null;
  company_name: string;
  company_logo_url: string | null;
};

type JobSeeker = {
  job_interests: string[] | null;
  company_interests: string[] | null;
};

// ─── 추천 쿼리 (룰 기반) ─────────────────────────────────────

type RawRow = {
  id: string;
  title: string;
  role_label: string | null;
  description: string | null;
  job_family: string | null;
  domain: string | null;
  estimated_minutes: number | null;
  card_image_url: string | null;
  companies: { name: string; logo_url: string | null } | null;
};

function toSimulation(row: RawRow): Simulation {
  return {
    id: row.id,
    title: row.title,
    role_label: row.role_label,
    description: row.description,
    job_family: row.job_family,
    domain: row.domain,
    estimated_minutes: row.estimated_minutes,
    card_image_url: row.card_image_url,
    company_name: row.companies?.name ?? "",
    company_logo_url: row.companies?.logo_url ?? null,
  };
}

async function fetchRecommended(seeker: JobSeeker): Promise<Simulation[]> {
  const jobInterests = (seeker.job_interests ?? []).filter(isDomainCategory);
  const companyInterests = seeker.company_interests ?? [];

  // job_simulations + companies 조인, 관심 도메인 일치 우선 정렬
  const { data, error } = await supabase
    .from("job_simulations")
    .select(
      "id, title, role_label, description, job_family, domain, estimated_minutes, card_image_url, companies(name, logo_url)",
    )
    .eq("is_public", true)
    .is("deleted_at", null)
    .limit(20); // 클라이언트에서 필터·정렬 후 3개 추출

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const rows = (data as unknown as RawRow[]).map((row) => ({
    ...toSimulation(row),
    // 관심 직무 선택값은 21개 도메인 카테고리와 같은 목록을 사용한다.
    _domainMatch: (jobInterests as readonly string[]).includes(row.domain ?? ""),
    _companyMatch: companyInterests.includes(row.companies?.name ?? ""),
  }));

  // 도메인 일치 > 기업 일치 > 나머지 순서
  const sorted = rows.sort((a, b) => {
    const scoreA = (a._domainMatch ? 2 : 0) + (a._companyMatch ? 1 : 0);
    const scoreB = (b._domainMatch ? 2 : 0) + (b._companyMatch ? 1 : 0);
    return scoreB - scoreA;
  });

  return sorted.slice(0, 3).map(({ _domainMatch: _d, _companyMatch: _c, ...rest }) => rest);
}

// 비로그인 방문자용 · 전체 직무 보기: 개인화 없이 전체 시뮬레이션 목록
export async function fetchAll(): Promise<Simulation[]> {
  const { data, error } = await supabase
    .from("job_simulations")
    .select(
      "id, title, role_label, description, job_family, domain, estimated_minutes, card_image_url, companies(name, logo_url)",
    )
    .eq("is_public", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];
  return (data as unknown as RawRow[]).map(toSimulation);
}

// ─── 카드 컴포넌트 ────────────────────────────────────────────

export function SimCard({ sim }: { sim: Simulation }) {
  const roleLine = sim.role_label || sim.job_family || sim.title;

  return (
    <Link to="/simulation/$id" params={{ id: sim.id }} className="block h-full">
      <SimulationCardPreview
        companyName={sim.company_name}
        companyLogoUrl={sim.company_logo_url}
        cardImageUrl={sim.card_image_url}
        roleLabel={roleLine}
        title={sim.title}
        description={sim.description}
        domain={sim.domain}
        estimatedMinutes={sim.estimated_minutes}
        className="h-full"
      />
    </Link>
  );
}

// ─── 스켈레톤 ────────────────────────────────────────────────

export function CardSkeleton() {
  return (
    <div className="flex aspect-[4/3] flex-col overflow-hidden rounded-xl border border-zinc-100 bg-white">
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

// ─── 빈 상태 ─────────────────────────────────────────────────

function EmptyState({ hasOnboarding }: { hasOnboarding: boolean }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Sparkles className="h-10 w-10 text-zinc-300" />
      <h3 className="mt-4 text-lg font-semibold text-zinc-700">
        {hasOnboarding ? "아직 준비된 시뮬레이션이 없어요" : "온보딩을 먼저 완료해주세요"}
      </h3>
      <p className="mt-2 max-w-xs text-sm text-zinc-400">
        {hasOnboarding
          ? "곧 기업 시뮬레이션이 추가될 예정이에요. 조금만 기다려 주세요!"
          : "관심 직무와 기업을 설정하면 맞춤 시뮬레이션을 추천해 드려요."}
      </p>
      {!hasOnboarding && (
        <Link to="/onboarding" className="mt-6">
          <Button className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-700">
            온보딩 시작하기
          </Button>
        </Link>
      )}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────

function SimulationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [seeker, setSeeker] = useState<JobSeeker | null>(null);
  const [sims, setSims] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    (async () => {
      try {
        if (!user) {
          // 비로그인 방문자: 개인화 없이 전체 목록 둘러보기
          setSeeker(null);
          setSims(await fetchAll());
          return;
        }

        // 구직자 프로필 조회
        const { data: seekerData } = await supabase
          .from("job_seekers")
          .select("job_interests, company_interests")
          .eq("id", user.id)
          .maybeSingle();

        const profile: JobSeeker = seekerData
          ? {
              ...seekerData,
              job_interests: (seekerData.job_interests ?? []).filter(isDomainCategory),
            }
          : {
              job_interests: null,
              company_interests: null,
            };
        setSeeker(profile);

        // 추천 시뮬레이션 조회
        const recommended = await fetchRecommended(profile);
        setSims(recommended);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  const hasOnboarding = !!seeker?.job_interests?.length;
  const isGuest = !authLoading && !user;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* 헤더 */}
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-zinc-500" />
        <span className="text-sm font-medium text-zinc-500">
          {isGuest ? "직무 시뮬레이션" : "맞춤 추천"}
        </span>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 md:text-3xl">
        {isGuest ? "원하는 시뮬레이션을 선택하세요" : "나를 위한 시뮬레이션 3개"}
      </h1>
      {isGuest && (
        <p className="mt-2 text-sm text-zinc-400">
          로그인하면 관심 직무·기업에 맞는 시뮬레이션을 추천해 드려요.
        </p>
      )}

      {/* 관심 직무 태그 */}
      {!loading && seeker?.job_interests && seeker.job_interests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {seeker.job_interests.map((j) => (
            <span
              key={j}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600"
            >
              {j}
            </span>
          ))}
          <Link
            to="/onboarding"
            className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-600"
          >
            수정
          </Link>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 카드 목록 */}
      <div
        className={cn(
          "mt-8 grid gap-4",
          sims.length === 1 ? "md:max-w-sm" : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : sims.length > 0 ? (
          sims.map((sim) => <SimCard key={sim.id} sim={sim} />)
        ) : (
          <div className="col-span-full">
            <EmptyState hasOnboarding={hasOnboarding} />
          </div>
        )}
      </div>

      {/* 전체 직무 보기 */}
      {!loading && (
        <div className="mt-8 flex justify-center">
          <Link to="/simulations/all">
            <Button
              variant="outline"
              className="rounded-xl border-zinc-300 text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              전체 직무 보기
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
