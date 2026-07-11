import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, FileText, Filter, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import {
  advanceApplicantReviewStageByCompanyCode,
  evaluateApplicantWithAiByCompanyCode,
  extractJobPostingFromUrl,
  getApplicantsByCompanyCode,
  listJobPostingCandidatesFromUrl,
  markApplicantInterviewProposedByCompanyCode,
  markApplicantReadByCompanyCode,
  saveCompanyJobPostingByCode,
  setApplicantDecisionByCompanyCode,
  setSavedApplicantByCompanyCode,
  type Applicant,
  type ApplicantAiReview,
  type ApplicantDecisionStatus,
  type ApplicantReviewStage,
  type ApplicantReviewState,
  type CompanyApplicants,
  type CompanyJobPosting,
  type JobPostingCandidate,
} from "@/lib/applicants.functions";
import { WORK_REGIONS } from "@/lib/profile-fields";
import { toast } from "sonner";

const searchSchema = z.object({
  code: z.string().catch(""),
});

const SALARY_RANGE = [500, 20000] as const;
const EXPERIENCE_RANGE = [0, 360] as const;

type ApplicantSortKey =
  | "submitted_desc"
  | "name_asc"
  | "experience_desc"
  | "experience_asc"
  | "salary_asc"
  | "salary_desc";

const SORT_OPTIONS: Array<{ value: ApplicantSortKey; label: string }> = [
  { value: "submitted_desc", label: "최신 제출순" },
  { value: "name_asc", label: "이름순" },
  { value: "experience_desc", label: "경력 높은 순" },
  { value: "experience_asc", label: "경력 낮은 순" },
  { value: "salary_asc", label: "희망 연봉 낮은순" },
  { value: "salary_desc", label: "희망 연봉 높은순" },
];

type ApplicantFilters = {
  salaryRange: [number, number];
  employmentTypes: string[];
  preferredRegions: string[];
  school: string;
  experienceRange: [number, number];
};

const DEFAULT_FILTERS: ApplicantFilters = {
  salaryRange: [...SALARY_RANGE],
  employmentTypes: [],
  preferredRegions: [],
  school: "",
  experienceRange: [...EXPERIENCE_RANGE],
};

const REVIEW_STAGE_LABELS: Record<ApplicantReviewStage, string> = {
  document_review: "서류 검토",
  interview_proposed: "면접 제안",
  interview_scheduled: "면접 예정",
  interview_in_progress: "면접 중",
  final_review: "최종 검토",
};

const DECISION_LABELS: Record<ApplicantDecisionStatus, string> = {
  undecided: "미정",
  passed: "합격",
  rejected: "불합격",
};

const DECISION_ORDER: ApplicantDecisionStatus[] = ["undecided", "passed", "rejected"];

const DEFAULT_REVIEW_STATE: Omit<ApplicantReviewState, "applicantId"> = {
  reviewStage: "document_review",
  decisionStatus: "undecided",
};

export const Route = createFileRoute("/biz_/review")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Beginner - 지원자 검토" },
      { name: "description", content: "기업 코드로 제출된 지원자 시뮬레이션을 검토하세요." },
    ],
  }),
  component: BizReview,
});

function BizReview() {
  const { code } = Route.useSearch();
  const [data, setData] = useState<CompanyApplicants | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [readingIds, setReadingIds] = useState<Set<string>>(() => new Set());
  const [reviewStates, setReviewStates] = useState<ApplicantReviewState[]>([]);
  const [jobPostings, setJobPostings] = useState<CompanyJobPosting[]>([]);
  const [aiReviews, setAiReviews] = useState<ApplicantAiReview[]>([]);
  const [isJobPostingOpen, setIsJobPostingOpen] = useState(false);
  const [advancingIds, setAdvancingIds] = useState<Set<string>>(() => new Set());
  const [decisionIds, setDecisionIds] = useState<Set<string>>(() => new Set());
  const [evaluatingIds, setEvaluatingIds] = useState<Set<string>>(() => new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [filters, setFilters] = useState<ApplicantFilters>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<ApplicantSortKey>("submitted_desc");

  useEffect(() => {
    let alive = true;

    async function loadApplicants() {
      if (!code) {
        setError("기업 코드가 없습니다.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await getApplicantsByCompanyCode({ data: { code } });
        if (!alive) return;
        setData(result);
        setSavedIds(new Set(result.savedApplicantIds));
        setReadIds(new Set(result.readApplicantIds));
        setReviewStates(result.reviewStates);
        setJobPostings(result.jobPostings);
        setAiReviews(result.aiReviews);
        setSelectedId(result.applicants[0]?.id ?? null);
      } catch {
        if (!alive) return;
        setError("지원자 정보를 불러오지 못했습니다.");
      } finally {
        if (alive) setIsLoading(false);
      }
    }

    void loadApplicants();
    return () => {
      alive = false;
    };
  }, [code]);

  const roleOptions = useMemo(() => {
    const roles = new Map<string, string>();
    for (const simulation of data?.simulations ?? []) {
      roles.set(simulation.roleLabel, simulation.roleLabel);
    }
    for (const applicant of data?.applicants ?? []) {
      if (!roles.has(applicant.role)) roles.set(applicant.role, applicant.role);
    }
    return Array.from(roles.values());
  }, [data]);

  const filteredApplicants = useMemo(() => {
    const applicants = data?.applicants ?? [];
    return applicants.filter((applicant) => {
      if (roleFilter !== "all" && applicant.role !== roleFilter) return false;
      if (showSavedOnly && !savedIds.has(applicant.id)) return false;
      if (!matchesApplicantFilters(applicant, filters)) return false;
      return true;
    });
  }, [data, filters, roleFilter, savedIds, showSavedOnly]);

  const visibleApplicants = useMemo(
    () => sortApplicants(filteredApplicants, sortKey),
    [filteredApplicants, sortKey],
  );

  const employmentOptions = useMemo(() => {
    const options = new Set<string>();
    for (const applicant of data?.applicants ?? []) {
      for (const type of splitEmploymentTypes(applicant.employmentType)) {
        options.add(type);
      }
    }
    return Array.from(options).sort((a, b) => a.localeCompare(b, "ko-KR"));
  }, [data]);

  const preferredRegionOptions = useMemo(() => {
    const options = new Set<string>();
    for (const applicant of data?.applicants ?? []) {
      for (const region of getApplicantPreferredRegions(applicant)) {
        options.add(region);
      }
    }
    return Array.from(options).sort(
      (a, b) => WORK_REGIONS.indexOf(a) - WORK_REGIONS.indexOf(b) || a.localeCompare(b, "ko-KR"),
    );
  }, [data]);

  const schoolOptions = useMemo(() => {
    const schools = new Set<string>();
    for (const applicant of data?.applicants ?? []) {
      const educationSchools = applicant.educations
        .map((education) => education.school || extractSchoolName(education.description))
        .filter(Boolean);
      if (educationSchools.length) {
        for (const school of educationSchools) schools.add(school);
        continue;
      }
      const fallbackSchool = extractSchoolName(applicant.education);
      if (fallbackSchool) schools.add(fallbackSchool);
    }
    return Array.from(schools).sort((a, b) => a.localeCompare(b, "ko-KR"));
  }, [data]);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const reviewTitle = roleFilter === "all" ? "전체 직무" : roleFilter;

  const selectedApplicant = useMemo(
    () =>
      visibleApplicants.find((applicant) => applicant.id === selectedId) ??
      visibleApplicants[0] ??
      null,
    [selectedId, visibleApplicants],
  );

  const reviewStateByApplicantId = useMemo(
    () => new Map(reviewStates.map((state) => [state.applicantId, state])),
    [reviewStates],
  );

  const selectedJobPosting = useMemo(() => {
    if (!selectedApplicant) return null;
    return jobPostings.find((posting) => posting.roleLabel === selectedApplicant.role) ?? null;
  }, [jobPostings, selectedApplicant]);

  const selectedAiReview = useMemo(() => {
    if (!selectedApplicant || !selectedJobPosting) return null;
    return (
      aiReviews.find(
        (review) =>
          review.applicantId === selectedApplicant.id &&
          review.jobPostingId === selectedJobPosting.id,
      ) ?? null
    );
  }, [aiReviews, selectedApplicant, selectedJobPosting]);

  function updateReviewState(nextState: ApplicantReviewState) {
    setReviewStates((current) => [
      ...current.filter((state) => state.applicantId !== nextState.applicantId),
      nextState,
    ]);
  }

  async function toggleSaved(id: string) {
    if (savingIds.has(id)) return;
    const nextSaved = !savedIds.has(id);

    setSavedIds((current) => {
      const next = new Set(current);
      if (nextSaved) next.add(id);
      else next.delete(id);
      return next;
    });
    setSavingIds((current) => new Set(current).add(id));

    try {
      await setSavedApplicantByCompanyCode({
        data: {
          code,
          applicantId: id,
          isSaved: nextSaved,
        },
      });
    } catch {
      setSavedIds((current) => {
        const rollback = new Set(current);
        if (nextSaved) rollback.delete(id);
        else rollback.add(id);
        return rollback;
      });
      toast.error("관심 지원자 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function markRead(id: string) {
    if (readIds.has(id) || readingIds.has(id)) return;

    setReadIds((current) => new Set(current).add(id));
    setReadingIds((current) => new Set(current).add(id));

    try {
      await markApplicantReadByCompanyCode({
        data: {
          code,
          applicantId: id,
        },
      });
    } catch {
      setReadIds((current) => {
        const rollback = new Set(current);
        rollback.delete(id);
        return rollback;
      });
      toast.error("지원자 읽음 처리 중 오류가 발생했습니다.");
    } finally {
      setReadingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  function selectApplicant(id: string) {
    setSelectedId(id);
    void markRead(id);
  }

  async function advanceReviewStage(id: string) {
    if (advancingIds.has(id)) return;
    const currentStage =
      reviewStateByApplicantId.get(id)?.reviewStage ?? DEFAULT_REVIEW_STATE.reviewStage;
    if (currentStage === "document_review") {
      toast.error("면접 제안 메일 템플릿을 복사하면 면접 제안으로 변경됩니다.");
      return;
    }
    setAdvancingIds((current) => new Set(current).add(id));
    try {
      const nextState = await advanceApplicantReviewStageByCompanyCode({
        data: { code, applicantId: id },
      });
      updateReviewState(nextState);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "지원 단계 저장에 실패했습니다.");
    } finally {
      setAdvancingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function setDecision(id: string, decisionStatus: ApplicantDecisionStatus) {
    if (decisionIds.has(id)) return;
    const previous = reviewStateByApplicantId.get(id) ?? {
      applicantId: id,
      ...DEFAULT_REVIEW_STATE,
    };
    updateReviewState({ ...previous, decisionStatus });
    setDecisionIds((current) => new Set(current).add(id));
    try {
      const nextState = await setApplicantDecisionByCompanyCode({
        data: { code, applicantId: id, decisionStatus },
      });
      updateReviewState(nextState);
    } catch {
      updateReviewState(previous);
      toast.error("지원 결과 저장에 실패했습니다.");
    } finally {
      setDecisionIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  function cycleDecision(id: string, currentDecision: ApplicantDecisionStatus) {
    const currentIndex = DECISION_ORDER.indexOf(currentDecision);
    const nextDecision = DECISION_ORDER[(currentIndex + 1) % DECISION_ORDER.length];
    void setDecision(id, nextDecision);
  }

  async function markInterviewProposed(id: string) {
    const nextState = await markApplicantInterviewProposedByCompanyCode({
      data: { code, applicantId: id },
    });
    updateReviewState(nextState);
  }

  async function evaluateApplicant(id: string) {
    if (!selectedJobPosting || evaluatingIds.has(id)) return;
    setEvaluatingIds((current) => new Set(current).add(id));
    try {
      const review = await evaluateApplicantWithAiByCompanyCode({
        data: { code, applicantId: id, jobPostingId: selectedJobPosting.id },
      });
      setAiReviews((current) => [
        ...current.filter(
          (item) =>
            item.applicantId !== review.applicantId || item.jobPostingId !== review.jobPostingId,
        ),
        review,
      ]);
      toast.success("AI 평가와 면접 질문 추천을 생성했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 평가 생성에 실패했습니다.");
    } finally {
      setEvaluatingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  if (isLoading) {
    return <BizShell>지원자 정보를 불러오는 중입니다...</BizShell>;
  }

  if (error || !data) {
    return (
      <BizShell>
        <div className="mx-auto max-w-sm text-center">
          <h1 className="text-lg font-semibold text-neutral-900">입장할 수 없습니다</h1>
          <p className="mt-2 text-sm text-neutral-500">{error}</p>
          <Link
            to="/biz"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white"
          >
            코드 다시 입력
          </Link>
        </div>
      </BizShell>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto grid max-w-7xl gap-3 px-6 py-3 xl:min-h-14 xl:grid-cols-[360px_1fr] xl:items-center xl:gap-6 xl:py-2">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="shrink-0 whitespace-nowrap">
                <span className="text-sm font-semibold tracking-tight">Beginner</span>
                <span className="ml-1 text-xs font-light text-neutral-500">biz</span>
              </div>
              <span className="max-w-24 shrink-0 truncate text-sm font-medium text-neutral-500">
                {data.company.name}
              </span>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                aria-label="직무 선택"
                className="hidden h-9 min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900 xl:block"
              >
                <option value="all">전체 직무</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <Link
              to="/biz"
              className="shrink-0 whitespace-nowrap text-xs font-medium text-neutral-500 hover:text-neutral-900 xl:hidden"
            >
              코드 변경
            </Link>
          </div>
          <div className="min-w-0 xl:hidden">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              aria-label="직무 선택"
              className="h-9 w-full min-w-0 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
            >
              <option value="all">전체 직무</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 xl:grid-cols-[360px_1fr]">
        <aside>
          <h1 className="text-2xl font-semibold tracking-tight">{reviewTitle}</h1>
          <p className="mt-2 text-sm text-neutral-500">
            총 {visibleApplicants.length}명의 제출자가 있습니다.
          </p>

          <div className="mt-5 grid grid-cols-2 rounded-md border border-neutral-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setShowSavedOnly(false)}
              className={`h-9 rounded text-xs font-medium transition-colors ${
                !showSavedOnly
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setShowSavedOnly(true)}
              className={`h-9 rounded text-xs font-medium transition-colors ${
                showSavedOnly ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              관심 지원자
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr]">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              <Filter className="h-4 w-4" />
              필터
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as ApplicantSortKey)}
              aria-label="지원자 정렬"
              className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 outline-none hover:bg-neutral-50 focus:border-neutral-900"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsJobPostingOpen(true)}
            className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <FileText className="h-3.5 w-3.5" />
            {selectedJobPosting ? "채용 공고 수정" : "채용 공고 연결"}
          </button>
          {selectedJobPosting && (
            <p className="mt-2 truncate text-xs text-neutral-500" title={selectedJobPosting.title}>
              {selectedJobPosting.title}
            </p>
          )}

          <div className="mt-6 space-y-2">
            {visibleApplicants.map((applicant) => {
              const reviewState = reviewStateByApplicantId.get(applicant.id) ?? {
                applicantId: applicant.id,
                ...DEFAULT_REVIEW_STATE,
              };

              return (
                <div
                  key={applicant.id}
                  className={`grid grid-cols-[1fr_auto] gap-2 rounded-md border transition-colors ${
                    applicant.id === selectedApplicant?.id
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectApplicant(applicant.id)}
                    className="min-w-0 p-4 text-left"
                  >
                    <div className="flex items-center gap-2 font-medium text-neutral-900">
                      {!readIds.has(applicant.id) && (
                        <span
                          aria-label="새 제출"
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                        />
                      )}
                      <span>{applicant.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {applicant.role} · {applicant.experience}
                    </div>
                  </button>
                  <div className="mr-3 mt-3 flex items-start gap-1">
                    <button
                      type="button"
                      onClick={() => toggleSaved(applicant.id)}
                      aria-disabled={savingIds.has(applicant.id)}
                      aria-label={`${applicant.name} 관심 지원자`}
                      aria-pressed={savedIds.has(applicant.id)}
                      className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 hover:bg-white hover:text-neutral-900"
                    >
                      <Bookmark
                        className={`h-4 w-4 ${
                          savedIds.has(applicant.id) ? "fill-neutral-900 text-neutral-900" : ""
                        }`}
                      />
                    </button>
                  </div>
                  <div className="col-span-2 flex flex-wrap items-center gap-2 border-t border-neutral-200 px-3 pb-3 pt-2">
                    <button
                      type="button"
                      onClick={() => void advanceReviewStage(applicant.id)}
                      disabled={advancingIds.has(applicant.id)}
                      title={
                        reviewState.reviewStage === "document_review"
                          ? "면접 제안 메일 템플릿을 복사하면 면접 제안으로 변경됩니다"
                          : reviewState.reviewStage === "final_review"
                            ? "클릭하면 서류 검토로 돌아갑니다"
                            : "클릭하면 다음 지원 단계로 변경됩니다"
                      }
                      className="h-7 rounded border border-transparent bg-neutral-100 px-2 text-[11px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:bg-white hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {REVIEW_STAGE_LABELS[reviewState.reviewStage]}
                    </button>
                    <button
                      type="button"
                      onClick={() => cycleDecision(applicant.id, reviewState.decisionStatus)}
                      disabled={decisionIds.has(applicant.id)}
                      aria-label={`${applicant.name} 지원 결과`}
                      title="클릭하면 미정, 합격, 불합격 순서로 변경됩니다"
                      className="h-7 rounded border border-neutral-200 bg-white px-2 text-[11px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {DECISION_LABELS[reviewState.decisionStatus]}
                    </button>
                  </div>
                </div>
              );
            })}

            {visibleApplicants.length === 0 && (
              <div className="rounded-md border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
                조건에 맞는 지원자가 없습니다.
              </div>
            )}
          </div>
        </aside>

        {selectedApplicant ? (
          <ApplicantDetail
            applicant={selectedApplicant}
            jobPosting={selectedJobPosting}
            aiReview={selectedAiReview}
            isEvaluating={evaluatingIds.has(selectedApplicant.id)}
            onEvaluate={() => void evaluateApplicant(selectedApplicant.id)}
            onInterviewProposed={() => markInterviewProposed(selectedApplicant.id)}
          />
        ) : (
          <section className="rounded-md border border-neutral-200 p-8 text-sm text-neutral-500">
            {roleFilter === "all"
              ? "검토할 지원자를 선택하세요."
              : "이 직무에는 아직 제출한 지원자가 없습니다."}
          </section>
        )}
      </main>

      {isFilterOpen && (
        <ApplicantFilterDialog
          filters={filters}
          employmentOptions={employmentOptions}
          preferredRegionOptions={preferredRegionOptions}
          schoolOptions={schoolOptions}
          onApply={(nextFilters) => {
            setFilters(nextFilters);
            setIsFilterOpen(false);
          }}
          onClose={() => setIsFilterOpen(false)}
        />
      )}

      {isJobPostingOpen && (
        <JobPostingDialog
          companyCode={code}
          roleOptions={roleOptions}
          initialRole={
            selectedApplicant?.role ?? (roleFilter !== "all" ? roleFilter : (roleOptions[0] ?? ""))
          }
          initialPosting={selectedJobPosting}
          onSaved={(posting) => {
            setJobPostings((current) => [
              ...current.filter(
                (item) => item.id !== posting.id && item.roleLabel !== posting.roleLabel,
              ),
              posting,
            ]);
            setIsJobPostingOpen(false);
          }}
          onClose={() => setIsJobPostingOpen(false)}
        />
      )}
    </div>
  );
}

function matchesApplicantFilters(applicant: Applicant, filters: ApplicantFilters) {
  const salaryFilterActive =
    filters.salaryRange[0] !== SALARY_RANGE[0] || filters.salaryRange[1] !== SALARY_RANGE[1];
  if (salaryFilterActive) {
    const salary = parseSalaryManwon(applicant.desiredSalary);
    if (salary === null || salary < filters.salaryRange[0] || salary > filters.salaryRange[1]) {
      return false;
    }
  }

  if (filters.employmentTypes.length > 0) {
    const applicantTypes = splitEmploymentTypes(applicant.employmentType);
    if (!filters.employmentTypes.some((type) => applicantTypes.includes(type))) return false;
  }

  if (filters.preferredRegions.length > 0) {
    const applicantRegions = getApplicantPreferredRegions(applicant);
    if (!filters.preferredRegions.some((region) => applicantRegions.includes(region))) {
      return false;
    }
  }

  if (filters.school) {
    const applicantSchools = applicant.educations
      .map((education) => education.school || extractSchoolName(education.description))
      .filter(Boolean);
    const fallbackSchool = extractSchoolName(applicant.education);
    if (![...applicantSchools, fallbackSchool].includes(filters.school)) return false;
  }

  const experienceFilterActive =
    filters.experienceRange[0] !== EXPERIENCE_RANGE[0] ||
    filters.experienceRange[1] !== EXPERIENCE_RANGE[1];
  if (experienceFilterActive) {
    const months = parseExperienceMonths(applicant.experience);
    if (
      months === null ||
      months < filters.experienceRange[0] ||
      months > filters.experienceRange[1]
    ) {
      return false;
    }
  }

  return true;
}

function sortApplicants(applicants: Applicant[], sortKey: ApplicantSortKey) {
  return [...applicants].sort((a, b) => {
    const fallback = compareSubmittedAtDesc(a, b);

    if (sortKey === "name_asc") {
      return a.name.localeCompare(b.name, "ko-KR") || fallback;
    }

    if (sortKey === "experience_desc") {
      return (
        compareNullableNumbers(
          parseExperienceMonths(a.experience),
          parseExperienceMonths(b.experience),
          "desc",
        ) || fallback
      );
    }

    if (sortKey === "experience_asc") {
      return (
        compareNullableNumbers(
          parseExperienceMonths(a.experience),
          parseExperienceMonths(b.experience),
          "asc",
        ) || fallback
      );
    }

    if (sortKey === "salary_asc") {
      return (
        compareNullableNumbers(
          parseSalaryManwon(a.desiredSalary),
          parseSalaryManwon(b.desiredSalary),
          "asc",
        ) || fallback
      );
    }

    if (sortKey === "salary_desc") {
      return (
        compareNullableNumbers(
          parseSalaryManwon(a.desiredSalary),
          parseSalaryManwon(b.desiredSalary),
          "desc",
        ) || fallback
      );
    }

    return fallback;
  });
}

function compareNullableNumbers(a: number | null, b: number | null, direction: "asc" | "desc") {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

function compareSubmittedAtDesc(a: Applicant, b: Applicant) {
  return parseSubmittedAt(b.submittedAt) - parseSubmittedAt(a.submittedAt);
}

function parseSubmittedAt(value: string) {
  const normalized = value.replace(" ", "T");
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function countActiveFilters(filters: ApplicantFilters) {
  let count = 0;
  if (filters.salaryRange[0] !== SALARY_RANGE[0] || filters.salaryRange[1] !== SALARY_RANGE[1]) {
    count += 1;
  }
  if (filters.employmentTypes.length > 0) count += 1;
  if (filters.preferredRegions.length > 0) count += 1;
  if (filters.school) count += 1;
  if (
    filters.experienceRange[0] !== EXPERIENCE_RANGE[0] ||
    filters.experienceRange[1] !== EXPERIENCE_RANGE[1]
  ) {
    count += 1;
  }
  return count;
}

function parseSalaryManwon(value: string) {
  const text = value.replaceAll(",", "").trim();
  const eokMatch = text.match(/(\d+)\s*억/);
  const manwonMatch = text.match(/(\d+)\s*만원/);
  const eok = eokMatch ? Number(eokMatch[1]) * 10000 : 0;
  const manwon = manwonMatch ? Number(manwonMatch[1]) : 0;
  const total = eok + manwon;
  return total > 0 ? total : null;
}

function parseExperienceMonths(value: string) {
  const yearMatch = value.match(/(\d+)\s*년/);
  const monthMatch = value.match(/(\d+)\s*개월/);
  const years = yearMatch ? Number(yearMatch[1]) : 0;
  const months = monthMatch ? Number(monthMatch[1]) : 0;
  if (years || months) return years * 12 + months;
  if (value.includes("신입")) return 0;
  return null;
}

function formatSalaryManwon(value: number) {
  if (value < 10000) return `${value}만원`;
  const eok = Math.floor(value / 10000);
  const manwon = value % 10000;
  return manwon ? `${eok}억 ${manwon}만원` : `${eok}억원`;
}

function formatExperienceMonths(months: number) {
  if (months === 0) return "0개월";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years && rest) return `${years}년 ${rest}개월`;
  if (years) return `${years}년`;
  return `${rest}개월`;
}

function splitEmploymentTypes(value: string) {
  return value
    .split(/[,.·/]/)
    .map((item) => item.trim())
    .filter((item) => item && item !== "근무 형태 미입력");
}

function getApplicantPreferredRegions(applicant: Applicant) {
  const preferred = splitPreferredRegions(applicant.preferredRegion);
  if (preferred.length) return preferred;
  return splitPreferredRegions(normalizeLocation(applicant.location));
}

function splitPreferredRegions(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized === "희망 지역 미입력") return [];

  const matchedRegions = WORK_REGIONS.filter((region) => normalized.includes(region));
  if (matchedRegions.length) return matchedRegions;

  return normalized
    .split(/[,/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractSchoolName(education: string) {
  const normalized = education.replace(/\([^)]*\)/g, "").trim();
  if (!normalized) return "";
  const markers = ["교육대학교", "과학기술원", "사관학교", "대학교", "대학"];
  let matched = "";
  let matchedEnd = 0;
  for (const marker of markers) {
    const index = normalized.indexOf(marker);
    if (index === -1) continue;
    const end = index + marker.length;
    if (!matched || end > matchedEnd) {
      matched = normalized.slice(0, end).trim();
      matchedEnd = end;
    }
  }
  if (!matched) return normalized.split(/\s+/)[0] ?? "";
  const rest = normalized.slice(matchedEnd).trim();
  const campus = rest.match(/^([A-Za-z가-힣]+캠퍼스)/)?.[1];
  return campus ? `${matched} ${campus}` : matched;
}

function ApplicantFilterDialog({
  filters,
  employmentOptions,
  preferredRegionOptions,
  schoolOptions,
  onApply,
  onClose,
}: {
  filters: ApplicantFilters;
  employmentOptions: string[];
  preferredRegionOptions: string[];
  schoolOptions: string[];
  onApply: (filters: ApplicantFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ApplicantFilters>(filters);
  const [schoolQuery, setSchoolQuery] = useState("");

  const filteredSchoolOptions = useMemo(() => {
    const keyword = schoolQuery.trim().toLowerCase();
    if (!keyword) return schoolOptions.slice(0, 8);
    return schoolOptions.filter((school) => school.toLowerCase().includes(keyword)).slice(0, 8);
  }, [schoolOptions, schoolQuery]);

  function toggleEmploymentType(type: string) {
    setDraft((current) => ({
      ...current,
      employmentTypes: current.employmentTypes.includes(type)
        ? current.employmentTypes.filter((item) => item !== type)
        : [...current.employmentTypes, type],
    }));
  }

  function togglePreferredRegion(region: string) {
    setDraft((current) => ({
      ...current,
      preferredRegions: current.preferredRegions.includes(region)
        ? current.preferredRegions.filter((item) => item !== region)
        : [...current.preferredRegions, region],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="max-h-[86vh] w-full max-w-xl overflow-hidden rounded-md bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-5">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-neutral-900">지원자 필터</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="필터 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(86vh-142px)] space-y-7 overflow-y-auto p-5">
          <FilterSection title="연봉">
            <DualRangeSlider
              min={SALARY_RANGE[0]}
              max={SALARY_RANGE[1]}
              step={500}
              value={draft.salaryRange}
              onChange={(salaryRange) => setDraft((current) => ({ ...current, salaryRange }))}
              formatValue={formatSalaryManwon}
            />
          </FilterSection>

          <FilterSection title="근무형태">
            <div className="flex flex-wrap gap-2">
              {employmentOptions.length ? (
                employmentOptions.map((type) => {
                  const selected = draft.employmentTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleEmploymentType(type)}
                      className={`h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                        selected
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-neutral-500">선택 가능한 근무형태가 없습니다.</p>
              )}
            </div>
          </FilterSection>

          <FilterSection title="희망 지역">
            <div className="flex flex-wrap gap-2">
              {preferredRegionOptions.length ? (
                preferredRegionOptions.map((region) => {
                  const selected = draft.preferredRegions.includes(region);
                  return (
                    <button
                      key={region}
                      type="button"
                      onClick={() => togglePreferredRegion(region)}
                      className={`h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                        selected
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {region}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-neutral-500">선택 가능한 희망 지역이 없습니다.</p>
              )}
            </div>
          </FilterSection>

          <FilterSection title="학교">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={schoolQuery}
                onChange={(event) => setSchoolQuery(event.target.value)}
                placeholder="학교 이름 검색"
                className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-900"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {filteredSchoolOptions.length ? (
                filteredSchoolOptions.map((school) => (
                  <button
                    key={school}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        school: current.school === school ? "" : school,
                      }))
                    }
                    className={`h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                      draft.school === school
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {school}
                  </button>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-500">
                  검색 결과가 없습니다.
                </p>
              )}
            </div>
          </FilterSection>

          <FilterSection title="경력">
            <DualRangeSlider
              min={EXPERIENCE_RANGE[0]}
              max={EXPERIENCE_RANGE[1]}
              step={1}
              value={draft.experienceRange}
              onChange={(experienceRange) =>
                setDraft((current) => ({ ...current, experienceRange }))
              }
              formatValue={formatExperienceMonths}
            />
          </FilterSection>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 p-5">
          <button
            type="button"
            onClick={() => {
              setDraft(DEFAULT_FILTERS);
              setSchoolQuery("");
            }}
            className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-sm font-semibold text-neutral-900">{title}</h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DualRangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  formatValue,
}: {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue: (value: number) => string;
}) {
  const [low, high] = value;
  const lowPercent = ((low - min) / (max - min)) * 100;
  const highPercent = ((high - min) / (max - min)) * 100;

  function updateLow(nextLow: number) {
    onChange([Math.min(nextLow, high - step), high]);
  }

  function updateHigh(nextHigh: number) {
    onChange([low, Math.max(nextHigh, low + step)]);
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
        <span>{formatValue(low)}</span>
        <span>{formatValue(high)}</span>
      </div>
      <div className="relative mt-4 h-8">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-900"
          style={{ left: `${lowPercent}%`, width: `${highPercent - lowPercent}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(event) => updateLow(Number(event.target.value))}
          className="pointer-events-none absolute inset-x-0 top-1/2 h-2 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-neutral-900 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
          aria-label="최소값"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(event) => updateHigh(Number(event.target.value))}
          className="pointer-events-none absolute inset-x-0 top-1/2 h-2 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-neutral-900 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
          aria-label="최대값"
        />
      </div>
    </div>
  );
}

function BizShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="flex h-14 items-center border-b border-neutral-200 px-6">
        <span className="text-sm font-semibold tracking-tight">Beginner</span>
        <span className="ml-1 text-xs font-light text-neutral-500">biz</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 text-sm text-neutral-500">
        {children}
      </main>
    </div>
  );
}

function ApplicantDetail({
  applicant,
  jobPosting,
  aiReview,
  isEvaluating,
  onEvaluate,
  onInterviewProposed,
}: {
  applicant: Applicant;
  jobPosting: CompanyJobPosting | null;
  aiReview: ApplicantAiReview | null;
  isEvaluating: boolean;
  onEvaluate: () => void;
  onInterviewProposed: () => Promise<void>;
}) {
  const [isMailOpen, setIsMailOpen] = useState(false);

  return (
    <section className="rounded-md border border-neutral-200">
      <div className="border-b border-neutral-200 p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-sm text-neutral-500">{applicant.headline}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{applicant.name}</h2>
            <p className="mt-2 text-sm text-neutral-600">
              {applicant.role} · {applicant.experience}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEvaluate}
              disabled={!jobPosting || isEvaluating}
              title={!jobPosting ? "채용 공고를 먼저 연결해주세요" : undefined}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              {isEvaluating ? "AI 평가 중..." : aiReview ? "AI 평가 갱신" : "AI 평가"}
            </button>
            <button
              type="button"
              onClick={() => setIsMailOpen(true)}
              className="h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
            >
              면접 제안 메일
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 p-6 xl:grid-cols-[1fr_1fr]">
        <section>
          <h3 className="text-xl font-semibold tracking-tight text-neutral-900">
            이력서 / 포트폴리오
          </h3>
          <div className="mt-5 space-y-4">
            <InfoBlock title="기본 정보">
              <dl className="grid gap-x-8 gap-y-4 text-sm md:grid-cols-2">
                <Field label="이메일" value={applicant.email} />
                <Field label="전화번호" value={applicant.phone} />
                <Field label="거주 지역" value={applicant.location} />
                <Field label="제출 일시" value={applicant.submittedAt} />
              </dl>
            </InfoBlock>

            <InfoBlock title="구직조건">
              <dl className="grid gap-x-8 gap-y-4 text-sm md:grid-cols-3">
                <Field label="희망 연봉" value={applicant.desiredSalary} />
                <Field
                  label="희망 지역"
                  value={applicant.preferredRegion || normalizeLocation(applicant.location)}
                />
                <Field label="근무 형태" value={applicant.employmentType} />
              </dl>
            </InfoBlock>

            <InfoBlock title="학력">
              {applicant.educations.length ? (
                <div className="space-y-2">
                  {applicant.educations.map((education, index) => (
                    <div
                      key={`${education.school}-${education.major}-${education.status}-${index}`}
                      className="rounded-md border border-neutral-200 p-3"
                    >
                      <p className="text-sm font-medium leading-6 text-neutral-900">
                        {education.description ||
                          [education.school, education.major, education.status]
                            .filter(Boolean)
                            .join(" ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium leading-6 text-neutral-900">
                  {applicant.education}
                </p>
              )}
            </InfoBlock>

            <InfoBlock
              title={
                <span className="inline-flex flex-wrap items-center gap-2">
                  경력
                  <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                    {applicant.experience}
                  </span>
                </span>
              }
            >
              {applicant.experiences.length ? (
                <div className="space-y-4">
                  {applicant.experiences.map((experience, index) => (
                    <div
                      key={`${experience.company}-${experience.role}-${index}`}
                      className="rounded-md border border-neutral-200 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900">
                          {[experience.company, experience.role].filter(Boolean).join(" · ") ||
                            "경력"}
                        </p>
                        {experience.duration && (
                          <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                            {experience.duration}
                          </span>
                        )}
                      </div>
                      {experience.period && (
                        <p className="mt-1 text-xs text-neutral-500">{experience.period}</p>
                      )}
                      {experience.description && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-700">
                          {experience.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium leading-6 text-neutral-900">
                  {applicant.recentJob}
                </p>
              )}
            </InfoBlock>

            <InfoBlock title="스킬 / 툴">
              <ChipList items={[...applicant.skills, ...applicant.tools]} />
            </InfoBlock>

            <InfoBlock title="활동">
              <div className="grid gap-3 md:grid-cols-2">
                {applicant.portfolio.map((item) => (
                  <div
                    key={item.title}
                    className="block rounded-md border border-neutral-200 p-3 text-sm"
                  >
                    <div className="font-medium text-neutral-900">{item.title}</div>
                    {item.description ? (
                      <div className="mt-2 whitespace-pre-line text-xs leading-5 text-neutral-500">
                        {item.description}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-neutral-500">
                        {item.updatedAt && `업데이트 ${item.updatedAt}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </InfoBlock>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold tracking-tight text-neutral-900">제출 정보</h3>
          <div className="mt-5 space-y-4">
            <InfoBlock>
              <dl className="grid gap-x-8 gap-y-4 text-sm md:grid-cols-2">
                <Field label="제출 일시" value={applicant.submittedAt} />
                <Field label="소요 시간" value={applicant.duration} />
              </dl>
            </InfoBlock>

            <InfoBlock title="직무 시뮬레이션 제출 내용">
              <div className="space-y-6">
                {applicant.simulation.map((step) => (
                  <p
                    key={step.step}
                    className="whitespace-pre-line text-sm leading-relaxed text-neutral-700"
                  >
                    {step.answer}
                  </p>
                ))}
              </div>
            </InfoBlock>

            <AiReviewPanel jobPosting={jobPosting} review={aiReview} />

            <InfoBlock
              title={`AI 어시스트 활용 내역 (${applicant.aiChatLog.filter((m) => m.role === "user").length}건)`}
            >
              {applicant.aiChatLog.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  응시 중 AI 어시스트를 사용하지 않았습니다.
                </p>
              ) : (
                <ul className="space-y-3">
                  {applicant.aiChatLog.map((m, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                        <span
                          className={m.role === "user" ? "text-neutral-900" : "text-indigo-600"}
                        >
                          {m.role === "user" ? "응시자 질문" : "AI 응답"}
                        </span>
                        {m.at && (
                          <span className="font-normal normal-case tracking-normal text-neutral-400">
                            {new Date(m.at).toLocaleString("ko-KR", {
                              timeZone: "Asia/Seoul",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-800">
                        {m.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </InfoBlock>
          </div>
        </section>
      </div>

      {isMailOpen && (
        <InterviewMailDialog
          applicant={applicant}
          onInterviewProposed={onInterviewProposed}
          onClose={() => setIsMailOpen(false)}
        />
      )}
    </section>
  );
}

function normalizeLocation(location: string): string {
  if (location.includes("강남")) return "서울, 강남구";
  if (location.includes("마포")) return "서울, 마포구";
  if (location.includes("송파")) return "서울, 송파구";
  if (location.includes("용산")) return "서울, 용산구";
  if (location.includes("성남")) return "경기, 성남시";
  return location;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-900">{value}</dd>
    </div>
  );
}

function InfoBlock({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-neutral-200 p-4">
      {title && <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>}
      <div className={title ? "mt-3" : ""}>{children}</div>
    </section>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function AiReviewPanel({
  jobPosting,
  review,
}: {
  jobPosting: CompanyJobPosting | null;
  review: ApplicantAiReview | null;
}) {
  if (!jobPosting) {
    return (
      <InfoBlock title="AI 평가">
        <p className="text-sm leading-6 text-neutral-500">
          채용 공고를 연결하면 시뮬레이션, 이력서, 활동 내용을 공고 기준으로 평가할 수 있습니다.
        </p>
      </InfoBlock>
    );
  }

  if (!review) {
    return (
      <InfoBlock title="AI 평가">
        <p className="text-sm leading-6 text-neutral-500">
          연결된 공고: {jobPosting.title}. AI 평가 버튼을 누르면 적합도와 면접 질문을 생성합니다.
        </p>
      </InfoBlock>
    );
  }

  return (
    <InfoBlock title="AI 평가">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-neutral-500">시뮬레이션 평가</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            {review.simulation.score}점
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-700">{review.simulation.summary}</p>
          <ReviewList label="강점" items={review.simulation.strengths} />
          <ReviewList label="확인할 점" items={review.simulation.concerns} />
        </div>
        <div className="border-t border-neutral-200 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-xs text-neutral-500">공고 대비 이력서 적합도</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            {review.resumeFit.score}점
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-700">{review.resumeFit.summary}</p>
          <ReviewList label="일치 근거" items={review.resumeFit.matched} />
          <ReviewList label="보완 확인" items={review.resumeFit.gaps} />
        </div>
      </div>

      <div className="mt-5 border-t border-neutral-200 pt-4">
        <p className="text-sm font-semibold text-neutral-900">추천 면접 질문</p>
        <ol className="mt-3 space-y-3">
          {review.interviewQuestions.map((question, index) => (
            <li key={`${question.category}-${question.question}-${index}`}>
              <p className="text-xs font-medium text-neutral-500">{question.category}</p>
              <p className="mt-1 text-sm font-medium leading-6 text-neutral-900">
                {question.question}
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">{question.intent}</p>
            </li>
          ))}
        </ol>
      </div>
    </InfoBlock>
  );
}

function ReviewList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <ul className="mt-1 space-y-1 text-xs leading-5 text-neutral-600">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function JobPostingDialog({
  companyCode,
  roleOptions,
  initialRole,
  initialPosting,
  onSaved,
  onClose,
}: {
  companyCode: string;
  roleOptions: string[];
  initialRole: string;
  initialPosting: CompanyJobPosting | null;
  onSaved: (posting: CompanyJobPosting) => void;
  onClose: () => void;
}) {
  const [roleLabel, setRoleLabel] = useState(initialPosting?.roleLabel ?? initialRole);
  const [sourceUrl, setSourceUrl] = useState(initialPosting?.sourceUrl ?? "");
  const [title, setTitle] = useState(initialPosting?.title ?? "");
  const [content, setContent] = useState(initialPosting?.content ?? "");
  const [isExtracting, setIsExtracting] = useState(false);
  const [candidates, setCandidates] = useState<JobPostingCandidate[]>([]);
  const [selectingCandidateUrl, setSelectingCandidateUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function selectCandidate(candidate: JobPostingCandidate) {
    if (selectingCandidateUrl) return;
    setSelectingCandidateUrl(candidate.sourceUrl);
    try {
      if (candidate.content.length >= 120) {
        setSourceUrl(candidate.sourceUrl);
        setTitle(candidate.title);
        setContent(candidate.content);
      } else {
        const extracted = await extractJobPostingFromUrl({
          data: { sourceUrl: candidate.sourceUrl },
        });
        setSourceUrl(extracted.sourceUrl);
        setTitle(extracted.title);
        setContent(extracted.content);
      }
      toast.success("선택한 공고 내용을 불러왔습니다. 저장 전 내용을 확인해주세요.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "공고 내용을 불러오지 못했습니다.");
    } finally {
      setSelectingCandidateUrl(null);
    }
  }

  async function listPostings() {
    if (!sourceUrl.trim()) {
      toast.error("잡코리아 공고 링크를 입력해주세요.");
      return;
    }
    setIsExtracting(true);
    try {
      const nextCandidates = await listJobPostingCandidatesFromUrl({
        data: { sourceUrl: sourceUrl.trim() },
      });
      setCandidates(nextCandidates);
      if (nextCandidates.length === 1) {
        await selectCandidate(nextCandidates[0]);
      } else {
        toast.success(`${nextCandidates.length}개 공고를 찾았습니다. 저장할 공고를 선택해주세요.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "공고 목록을 불러오지 못했습니다.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function savePosting() {
    if (!roleLabel.trim() || !sourceUrl.trim() || !content.trim()) {
      toast.error("직무, 공고 링크, 공고 내용을 모두 입력해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      const posting = await saveCompanyJobPostingByCode({
        data: {
          code: companyCode,
          roleLabel: roleLabel.trim(),
          sourceUrl: sourceUrl.trim(),
          title: title.trim(),
          content: content.trim(),
        },
      });
      onSaved(posting);
      toast.success("채용 공고를 저장했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "채용 공고 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-md bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-neutral-200 p-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              채용 공고 연결
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              잡코리아 공고를 불러와 지원자 평가 기준으로 사용합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="채용 공고 연결 닫기"
            className="grid h-8 w-8 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <label className="block">
            <span className="text-xs font-medium text-neutral-600">저장할 Beginner 직무</span>
            <select
              value={roleLabel}
              onChange={(event) => setRoleLabel(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block min-w-0">
              <span className="text-xs font-medium text-neutral-600">잡코리아 공고 링크</span>
              <input
                type="url"
                value={sourceUrl}
                onChange={(event) => {
                  setSourceUrl(event.target.value);
                  setCandidates([]);
                }}
                placeholder="채용 공고 또는 기업 채용 공고 모음 링크"
                className="mt-2 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900"
              />
            </label>
            <button
              type="button"
              onClick={() => void listPostings()}
              disabled={isExtracting}
              className="h-10 rounded-md border border-neutral-300 px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExtracting ? "불러오는 중..." : "공고 목록 불러오기"}
            </button>
          </div>
          {candidates.length > 1 && (
            <div>
              <p className="text-xs font-medium text-neutral-600">저장할 채용 공고 선택</p>
              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-md border border-neutral-200 p-2">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.sourceUrl}
                    type="button"
                    onClick={() => void selectCandidate(candidate)}
                    disabled={Boolean(selectingCandidateUrl)}
                    className="flex w-full items-center justify-between gap-3 rounded border border-neutral-200 px-3 py-2 text-left text-sm text-neutral-800 hover:border-neutral-900 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="min-w-0 truncate">{candidate.title}</span>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {selectingCandidateUrl === candidate.sourceUrl ? "불러오는 중..." : "선택"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="block">
            <span className="text-xs font-medium text-neutral-600">공고 제목</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-600">공고 내용</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={14}
              className="mt-2 w-full resize-y rounded-md border border-neutral-300 p-3 text-sm leading-6 outline-none focus:border-neutral-900"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 p-5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void savePosting()}
            disabled={isSaving}
            className="h-9 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "공고 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InterviewMailDialog({
  applicant,
  onInterviewProposed,
  onClose,
}: {
  applicant: Applicant;
  onInterviewProposed: () => Promise<void>;
  onClose: () => void;
}) {
  const subject = `[Beginner] ${applicant.name}님 면접 일정 안내`;
  const body = `${applicant.name}님, 안녕하세요.\n\nBeginner를 통해 제출해주신 ${applicant.role} 실무 시뮬레이션 결과를 검토한 뒤 면접을 제안드리고자 연락드립니다.\n\n가능하신 일정 2~3개를 회신해주시면 확인 후 면접 일정을 확정해드리겠습니다.\n\n감사합니다.`;
  const [isCopying, setIsCopying] = useState(false);

  async function copyTemplate() {
    if (!navigator.clipboard) {
      toast.error("이 브라우저에서는 클립보드 복사를 지원하지 않습니다.");
      return;
    }
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(`제목: ${subject}\n\n${body}`);
    } catch {
      toast.error("메일 템플릿을 복사하지 못했습니다.");
      setIsCopying(false);
      return;
    }

    try {
      await onInterviewProposed();
      toast.success("메일 템플릿을 복사했고, 지원 단계를 면접 제안으로 변경했습니다.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `템플릿은 복사했지만 단계 변경에 실패했습니다: ${error.message}`
          : "템플릿은 복사했지만 지원 단계 변경에 실패했습니다.",
      );
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-xl rounded-md bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">면접 제안 메일 템플릿</h3>
            <p className="mt-1 text-sm text-neutral-500">{applicant.email}</p>
          </div>
          <button onClick={onClose} className="text-sm text-neutral-500 hover:text-neutral-900">
            닫기
          </button>
        </div>

        <label className="mt-5 block text-xs font-medium text-neutral-600">제목</label>
        <input
          readOnly
          value={subject}
          className="mt-2 h-10 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm"
        />

        <label className="mt-4 block text-xs font-medium text-neutral-600">본문</label>
        <textarea
          readOnly
          value={body}
          className="mt-2 h-56 w-full resize-none rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm leading-relaxed"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-md border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-50"
          >
            취소
          </button>
          <button
            onClick={() => void copyTemplate()}
            disabled={isCopying}
            className="h-9 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800"
          >
            {isCopying ? "복사 중..." : "템플릿 복사"}
          </button>
        </div>
      </div>
    </div>
  );
}
