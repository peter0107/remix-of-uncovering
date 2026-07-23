import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SimulationCardPreview } from "@/components/SimulationCardPreview";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { isDomainCategory } from "@/lib/domain-categories";
import { INITIAL_PROFILE_FORM, JobInterestFields } from "@/lib/profile-fields";
import { toast } from "sonner";

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
  company_description: string | null;
  company_logo_url: string | null;
  company_is_partner: boolean;
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
  companies: {
    name: string;
    description: string | null;
    logo_url: string | null;
    is_partner: boolean | null;
  } | null;
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
    company_description: row.companies?.description ?? null,
    company_logo_url: row.companies?.logo_url ?? null,
    company_is_partner: row.companies?.is_partner ?? false,
  };
}

async function fetchRecommended(seeker: JobSeeker): Promise<Simulation[]> {
  const jobInterests = (seeker.job_interests ?? []).filter(isDomainCategory);
  const companyInterests = seeker.company_interests ?? [];

  // job_simulations + companies 조인, 관심 도메인 일치 우선 정렬
  const { data, error } = await supabase
    .from("job_simulations")
    .select(
      "id, title, role_label, description, job_family, domain, estimated_minutes, card_image_url, companies(name, description, logo_url, is_partner)",
    )
    .eq("simulation_source", "company")
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
      "id, title, role_label, description, job_family, domain, estimated_minutes, card_image_url, companies(name, description, logo_url, is_partner)",
    )
    .eq("simulation_source", "company")
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
        companyDescription={sim.company_description}
        companyLogoUrl={sim.company_logo_url}
        cardImageUrl={sim.card_image_url}
        roleLabel={roleLine}
        title={sim.title}
        description={sim.description}
        domain={sim.domain}
        estimatedMinutes={sim.estimated_minutes}
        isPartner={sim.company_is_partner}
        className="h-full"
      />
    </Link>
  );
}

// ─── 스켈레톤 ────────────────────────────────────────────────

export function CardSkeleton() {
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

// ─── 빈 상태 ─────────────────────────────────────────────────

function EmptyState({ hasOnboarding }: { hasOnboarding: boolean }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <LayoutGrid className="h-8 w-8 text-zinc-300" />
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
          <Button className="rounded-md bg-zinc-900 text-white hover:bg-zinc-700">
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
  const [jobInterestEditorOpen, setJobInterestEditorOpen] = useState(false);
  const [draftJobInterests, setDraftJobInterests] = useState<string[]>([]);
  const [savingJobInterests, setSavingJobInterests] = useState(false);

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
  const jobInterestForm = {
    ...INITIAL_PROFILE_FORM,
    job_interests: draftJobInterests,
  };

  function openJobInterestEditor() {
    setDraftJobInterests(seeker?.job_interests ?? []);
    setJobInterestEditorOpen(true);
  }

  async function saveJobInterests() {
    if (!user) return;
    if (draftJobInterests.length === 0) {
      toast.error("관심 직무를 하나 이상 선택해주세요.");
      return;
    }

    setSavingJobInterests(true);
    const { data: updated, error: updateError } = await supabase
      .from("job_seekers")
      .update({ job_interests: draftJobInterests })
      .eq("id", user.id)
      .select("id");

    // 시커 행이 아직 없는 경우 업서트로 생성
    if (!updateError && (!updated || updated.length === 0)) {
      const { error: upsertError } = await supabase
        .from("job_seekers")
        .upsert(
          {
            id: user.id,
            email: user.email ?? "",
            job_interests: draftJobInterests,
          },
          { onConflict: "id" },
        );
      if (upsertError) {
        console.error("job_seekers upsert failed", upsertError);
        setSavingJobInterests(false);
        toast.error("관심 직무 저장 중 오류가 발생했어요.");
        return;
      }
    } else if (updateError) {
      console.error("job_seekers update failed", updateError);
      setSavingJobInterests(false);
      toast.error("관심 직무 저장 중 오류가 발생했어요.");
      return;
    }
    setSavingJobInterests(false);

    const updatedSeeker: JobSeeker = {
      job_interests: draftJobInterests,
      company_interests: seeker?.company_interests ?? null,
    };
    setSeeker(updatedSeeker);
    try {
      setSims(await fetchRecommended(updatedSeeker));
    } catch {
      // 저장은 완료됐으므로, 다음 방문 시 최신 관심 직무 기준으로 다시 불러온다.
    }
    setJobInterestEditorOpen(false);
    toast.success("관심 직무를 수정했어요.");
  }


  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* 헤더 */}
      <p className="mb-2 text-sm font-medium text-zinc-500">
        {isGuest ? "직무 시뮬레이션" : "맞춤 추천"}
      </p>
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
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700"
            >
              {j}
            </span>
          ))}
          <button
            type="button"
            onClick={openJobInterestEditor}
            className="rounded-lg bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            수정
          </button>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="mt-6 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
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
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link to="/simulations/all">
            <Button
              variant="outline"
              className="rounded-md border-zinc-300 text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              전체 직무 보기
            </Button>
          </Link>
          <Link to="/expert-simulations">
            <Button
              variant="outline"
              className="rounded-md border-zinc-300 text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
            >
              현직자 제시 보기
            </Button>
          </Link>
        </div>
      )}

      <Dialog open={jobInterestEditorOpen} onOpenChange={setJobInterestEditorOpen}>
        <DialogContent className="max-w-2xl rounded-md p-6 shadow-none data-[state=closed]:!animate-none data-[state=open]:!animate-none">
          <DialogHeader>
            <DialogTitle>관심 직무 수정</DialogTitle>
            <DialogDescription>추천에 반영할 관심 직무군을 선택하세요.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto py-2">
            <JobInterestFields
              data={jobInterestForm}
              setData={(partial) => {
                if (partial.job_interests) setDraftJobInterests(partial.job_interests);
              }}
              showHeader={false}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setJobInterestEditorOpen(false)}
              disabled={savingJobInterests}
              className="rounded-md"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={saveJobInterests}
              disabled={savingJobInterests}
              className="rounded-md bg-zinc-900 text-white hover:bg-zinc-700"
            >
              {savingJobInterests ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
