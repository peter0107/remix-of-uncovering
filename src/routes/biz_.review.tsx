import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import {
  getApplicantsByCompanyCode,
  setSavedApplicantByCompanyCode,
  type Applicant,
  type CompanyApplicants,
  type Status,
} from "@/lib/applicants.functions";
import { toast } from "sonner";

const searchSchema = z.object({
  code: z.string().catch(""),
});

const STATUS_LABEL: Record<Status, string> = {
  submitted: "신규 제출",
  in_review: "검토 중",
  completed: "검토 완료",
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
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");

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

  const visibleApplicants = useMemo(() => {
    const applicants = data?.applicants ?? [];
    return applicants.filter((applicant) => {
      if (roleFilter !== "all" && applicant.role !== roleFilter) return false;
      if (showSavedOnly && !savedIds.has(applicant.id)) return false;
      return true;
    });
  }, [data, roleFilter, savedIds, showSavedOnly]);

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
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3 md:min-h-14 md:flex-row md:items-center md:justify-between md:gap-6 md:py-2">
          <div className="flex min-w-0 shrink-0 items-center justify-between gap-4 md:max-w-[46%] md:justify-start">
            <div className="flex min-w-0 items-center gap-4">
              <div className="shrink-0 whitespace-nowrap">
                <span className="text-sm font-semibold tracking-tight">Beginner</span>
                <span className="ml-2 text-xs text-neutral-500">for Business</span>
              </div>
              <span className="truncate text-sm font-medium text-neutral-500">
                {data.company.name}
              </span>
            </div>
            <Link
              to="/biz"
              className="shrink-0 whitespace-nowrap text-xs font-medium text-neutral-500 hover:text-neutral-900 md:hidden"
            >
              코드 변경
            </Link>
          </div>
          <div className="min-w-0 flex-1 md:flex md:justify-center">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              aria-label="직무 선택"
              className="h-9 w-full min-w-0 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900 md:max-w-[320px]"
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
            className="hidden shrink-0 whitespace-nowrap text-xs font-medium text-neutral-500 hover:text-neutral-900 md:block"
          >
            코드 변경
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 xl:grid-cols-[360px_1fr]">
        <aside>
          <h1 className="text-2xl font-semibold tracking-tight">{data.company.roleLabel}</h1>
          <p className="mt-2 text-sm text-neutral-500">
            총 {data.applicants.length}명의 제출자가 있습니다.
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
                  onClick={() => setSelectedId(applicant.id)}
                  className="min-w-0 p-4 text-left"
                >
                  <div className="font-medium text-neutral-900">{applicant.name}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {applicant.role} · {applicant.experience}
                  </div>
                  <div className="mt-3">
                    <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                      {STATUS_LABEL[applicant.status]}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSaved(applicant.id)}
                  disabled={savingIds.has(applicant.id)}
                  aria-label={`${applicant.name} 관심 지원자`}
                  aria-pressed={savedIds.has(applicant.id)}
                  className="mr-3 mt-3 grid h-8 w-8 place-items-center rounded-md text-neutral-400 hover:bg-white hover:text-neutral-900 disabled:opacity-50"
                >
                  <Bookmark
                    className={`h-4 w-4 ${
                      savedIds.has(applicant.id) ? "fill-neutral-900 text-neutral-900" : ""
                    }`}
                  />
                </button>
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
    </div>
  );
}

function BizShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="flex h-14 items-center border-b border-neutral-200 px-6">
        <span className="text-sm font-semibold tracking-tight">Beginner</span>
        <span className="ml-2 text-xs text-neutral-500">for Business</span>
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
                <Field label="연결 이력서" value={applicant.resumeTitle || "기본 프로필"} />
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
              <p className="text-sm font-medium leading-6 text-neutral-900">
                {applicant.education}
              </p>
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
              <p className="text-sm font-medium leading-6 text-neutral-900">
                {applicant.recentJob}
              </p>
            </InfoBlock>

            <InfoBlock title="스킬 / 툴">
              <ChipList items={[...applicant.skills, ...applicant.tools]} />
            </InfoBlock>

            <InfoBlock title="포트폴리오">
              <div className="grid gap-3 md:grid-cols-2">
                {applicant.portfolio.map((item) => (
                  <a
                    key={item.title}
                    href={item.url}
                    className="block rounded-md border border-neutral-200 p-3 text-sm hover:bg-neutral-50"
                  >
                    <div className="font-medium text-neutral-900">{item.title}</div>
                    <div className="mt-2 text-xs text-neutral-500">업데이트 {item.updatedAt}</div>
                  </a>
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
