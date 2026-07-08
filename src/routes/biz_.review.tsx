import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Filter, Search, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import {
  getApplicantsByCompanyCode,
  markApplicantReadByCompanyCode,
  setApplicantMailSentByCompanyCode,
  setSavedApplicantByCompanyCode,
  type Applicant,
  type CompanyApplicants,
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
  const [mailSentIds, setMailSentIds] = useState<Set<string>>(() => new Set());
  const [mailingIds, setMailingIds] = useState<Set<string>>(() => new Set());
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
        setMailSentIds(new Set(result.mailSentApplicantIds));
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

  async function toggleMailSent(id: string) {
    if (mailingIds.has(id)) return;
    const nextMailSent = !mailSentIds.has(id);

    setMailSentIds((current) => {
      const next = new Set(current);
      if (nextMailSent) next.add(id);
      else next.delete(id);
      return next;
    });
    setMailingIds((current) => new Set(current).add(id));

    try {
      await setApplicantMailSentByCompanyCode({
        data: {
          code,
          applicantId: id,
          isMailSent: nextMailSent,
        },
      });
    } catch {
      setMailSentIds((current) => {
        const rollback = new Set(current);
        if (nextMailSent) rollback.delete(id);
        else rollback.add(id);
        return rollback;
      });
      toast.error("메일 발송 상태 저장 중 오류가 발생했습니다.");
    } finally {
      setMailingIds((current) => {
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

          <div className="mt-6 space-y-2">
            {visibleApplicants.map((applicant) => (
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
                        className="h-2 w-2 shrink-0 rounded-full bg-red-500"
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
                    onClick={() => toggleMailSent(applicant.id)}
                    aria-disabled={mailingIds.has(applicant.id)}
                    aria-label={`${applicant.name} 메일 발송 표시`}
                    aria-pressed={mailSentIds.has(applicant.id)}
                    className={`grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-white ${
                      mailSentIds.has(applicant.id)
                        ? "text-blue-600"
                        : "text-pink-500 hover:text-pink-600"
                    }`}
                  >
                    <Send
                      className={`h-4 w-4 ${
                        mailSentIds.has(applicant.id) ? "fill-blue-600" : "fill-pink-500"
                      }`}
                    />
                  </button>
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
              </div>
            ))}

            {visibleApplicants.length === 0 && (
              <div className="rounded-md border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
                조건에 맞는 지원자가 없습니다.
              </div>
            )}
          </div>
        </aside>

        {selectedApplicant ? (
          <ApplicantDetail applicant={selectedApplicant} />
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
        ) ||
        fallback
      );
    }

    if (sortKey === "experience_asc") {
      return (
        compareNullableNumbers(
          parseExperienceMonths(a.experience),
          parseExperienceMonths(b.experience),
          "asc",
        ) ||
        fallback
      );
    }

    if (sortKey === "salary_asc") {
      return (
        compareNullableNumbers(
          parseSalaryManwon(a.desiredSalary),
          parseSalaryManwon(b.desiredSalary),
          "asc",
        ) ||
        fallback
      );
    }

    if (sortKey === "salary_desc") {
      return (
        compareNullableNumbers(
          parseSalaryManwon(a.desiredSalary),
          parseSalaryManwon(b.desiredSalary),
          "desc",
        ) ||
        fallback
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
    return schoolOptions
      .filter((school) => school.toLowerCase().includes(keyword))
      .slice(0, 8);
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

function ApplicantDetail({ applicant }: { applicant: Applicant }) {
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
          <button
            type="button"
            onClick={() => setIsMailOpen(true)}
            className="h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
          >
            면접 제안 메일
          </button>
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
          </div>
        </section>
      </div>

      {isMailOpen && (
        <InterviewMailDialog applicant={applicant} onClose={() => setIsMailOpen(false)} />
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

function InterviewMailDialog({
  applicant,
  onClose,
}: {
  applicant: Applicant;
  onClose: () => void;
}) {
  const subject = `[Beginner] ${applicant.name}님 면접 일정 안내`;
  const body = `${applicant.name}님, 안녕하세요.\n\nBeginner를 통해 제출해주신 ${applicant.role} 실무 시뮬레이션 결과를 검토한 뒤 면접을 제안드리고자 연락드립니다.\n\n가능하신 일정 2~3개를 회신해주시면 확인 후 면접 일정을 확정해드리겠습니다.\n\n감사합니다.`;

  function copyTemplate() {
    void navigator.clipboard?.writeText(`제목: ${subject}\n\n${body}`);
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
            onClick={copyTemplate}
            className="h-9 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800"
          >
            템플릿 복사
          </button>
        </div>
      </div>
    </div>
  );
}
