import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

// ─── 상수 ────────────────────────────────────────────────────

const EDUCATION_LEVELS = [
  "고등학교 재학·졸업",
  "대학교 재학 중",
  "대학교 졸업",
  "대학원 재학 중",
  "대학원 졸업",
];

const MAJORS = [
  "경영·경제",
  "컴퓨터공학·SW",
  "통계·데이터",
  "디자인",
  "인문학",
  "사회과학",
  "공학 (비SW)",
  "기타",
];

const JOB_INTERESTS = [
  "서비스기획·PM",
  "개발",
  "데이터",
  "디자인",
  "마케팅·그로스",
  "운영·CS",
  "회계·감사",
  "임상시험·제약",
  "MD·바이어",
  "품질·엔지니어링",
];

const COMPANIES = [
  "당근마켓",
  "직방",
  "야놀자",
  "무신사",
  "오늘의집",
  "컬리",
  "카카오페이",
  "NHN",
  "토스",
  "배달의민족",
  "라인",
  "쿠팡",
];

const WORK_REGIONS = [
  "서울",
  "경기·인천",
  "부산·경남",
  "대구·경북",
  "광주·전라",
  "대전·충청",
  "제주",
  "해외",
];

const EMPLOYMENT_TYPES = ["인턴", "신입", "계약직"];

// ─── 타입 ────────────────────────────────────────────────────

type OnboardingData = {
  education_level: string;
  majors: string[];
  academic_mark: string;
  job_interests: string[];
  company_interests: string[];
  work_regions: string[];
  employment_types: string[];
  willing_to_relocate: boolean;
  discovery_consent: boolean;
};

const INITIAL: OnboardingData = {
  education_level: "",
  majors: [],
  academic_mark: "",
  job_interests: [],
  company_interests: [],
  work_regions: [],
  employment_types: [],
  willing_to_relocate: false,
  discovery_consent: false,
};

const STEP_LABELS = ["학력", "관심 직무", "관심 기업", "근무 선호", "공개 동의"];

// ─── 헬퍼 컴포넌트 ───────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-all",
        selected
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400",
      )}
    >
      {label}
    </button>
  );
}

function StepHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  );
}

// ─── 단계별 화면 ─────────────────────────────────────────────

function Step1({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (d: Partial<OnboardingData>) => void;
}) {
  const toggleMajor = (m: string) => {
    setData({
      majors: data.majors.includes(m)
        ? data.majors.filter((x) => x !== m)
        : [...data.majors, m],
    });
  };

  return (
    <div>
      <StepHeader
        title="학력을 알려주세요"
        subtitle="맞춤 시뮬레이션 추천에 활용됩니다"
      />

      {/* 학력 */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-zinc-700">현재/최종 학력</p>
        <div className="flex flex-wrap gap-2">
          {EDUCATION_LEVELS.map((level) => (
            <Chip
              key={level}
              label={level}
              selected={data.education_level === level}
              onClick={() => setData({ education_level: level })}
            />
          ))}
        </div>
      </div>

      {/* 전공 */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-zinc-700">
          전공 <span className="font-normal text-zinc-400">(복수 선택 가능)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {MAJORS.map((m) => (
            <Chip
              key={m}
              label={m}
              selected={data.majors.includes(m)}
              onClick={() => toggleMajor(m)}
            />
          ))}
        </div>
      </div>

      {/* 학점 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-zinc-700">
          학점 <span className="font-normal text-zinc-400">(선택)</span>
        </p>
        <input
          type="number"
          min={0}
          max={4.5}
          step={0.01}
          placeholder="예: 3.8"
          value={data.academic_mark}
          onChange={(e) => setData({ academic_mark: e.target.value })}
          className="w-32 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
        <span className="ml-2 text-sm text-zinc-400">/ 4.5</span>
      </div>
    </div>
  );
}

function Step2({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (d: Partial<OnboardingData>) => void;
}) {
  const toggle = (item: string) => {
    setData({
      job_interests: data.job_interests.includes(item)
        ? data.job_interests.filter((x) => x !== item)
        : [...data.job_interests, item],
    });
  };

  return (
    <div>
      <StepHeader
        title="관심 있는 직무를 선택해주세요"
        subtitle="시뮬레이션 추천의 핵심 기준이 됩니다 · 복수 선택 가능"
      />
      <div className="flex flex-wrap gap-3">
        {JOB_INTERESTS.map((job) => (
          <Chip
            key={job}
            label={job}
            selected={data.job_interests.includes(job)}
            onClick={() => toggle(job)}
          />
        ))}
      </div>
    </div>
  );
}

function Step3({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (d: Partial<OnboardingData>) => void;
}) {
  const toggle = (company: string) => {
    setData({
      company_interests: data.company_interests.includes(company)
        ? data.company_interests.filter((x) => x !== company)
        : [...data.company_interests, company],
    });
  };

  return (
    <div>
      <StepHeader
        title="관심 있는 기업을 선택해주세요"
        subtitle="해당 기업의 실제 업무 시뮬레이션을 먼저 추천해 드려요 · 복수 선택 가능"
      />
      <div className="flex flex-wrap gap-3">
        {COMPANIES.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={data.company_interests.includes(c)}
            onClick={() => toggle(c)}
          />
        ))}
      </div>
    </div>
  );
}

function Step4({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (d: Partial<OnboardingData>) => void;
}) {
  const toggleRegion = (r: string) => {
    setData({
      work_regions: data.work_regions.includes(r)
        ? data.work_regions.filter((x) => x !== r)
        : [...data.work_regions, r],
    });
  };
  const toggleType = (t: string) => {
    setData({
      employment_types: data.employment_types.includes(t)
        ? data.employment_types.filter((x) => x !== t)
        : [...data.employment_types, t],
    });
  };

  return (
    <div>
      <StepHeader
        title="근무 조건을 알려주세요"
        subtitle="모두 선택 사항이에요 · 나중에 언제든 수정할 수 있어요"
      />

      {/* 지역 */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-zinc-700">
          근무 가능 지역 <span className="font-normal text-zinc-400">(복수 선택)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {WORK_REGIONS.map((r) => (
            <Chip
              key={r}
              label={r}
              selected={data.work_regions.includes(r)}
              onClick={() => toggleRegion(r)}
            />
          ))}
        </div>
      </div>

      {/* 고용형태 */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-zinc-700">
          관심 고용형태 <span className="font-normal text-zinc-400">(복수 선택)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {EMPLOYMENT_TYPES.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={data.employment_types.includes(t)}
              onClick={() => toggleType(t)}
            />
          ))}
        </div>
      </div>

      {/* 이주 가능 여부 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-zinc-700">이주 가능 여부</p>
        <button
          type="button"
          onClick={() => setData({ willing_to_relocate: !data.willing_to_relocate })}
          className={cn(
            "flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-sm font-medium transition-all",
            data.willing_to_relocate
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2",
              data.willing_to_relocate
                ? "border-white bg-white"
                : "border-zinc-300",
            )}
          >
            {data.willing_to_relocate && (
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-900" />
            )}
          </span>
          다른 지역으로 이주할 수 있어요
        </button>
      </div>
    </div>
  );
}

function Step5({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (d: Partial<OnboardingData>) => void;
}) {
  return (
    <div>
      <StepHeader title="기업이 나를 발견할 수 있을까요?" />

      <div className="mb-8 rounded-2xl bg-zinc-50 p-6 text-sm leading-relaxed text-zinc-600">
        <p>
          내가 수행한 시뮬레이션 답안과 프로필을 기반으로, 관심 기업의 담당자가
          나를 발견하고 <strong className="text-zinc-900">이메일로 면접 제안</strong>을
          보낼 수 있게 됩니다.
        </p>
        <p className="mt-3">
          동의하지 않아도 시뮬레이션 수행과 추천 기능은 정상적으로 사용할 수 있어요.
          나중에 프로필 설정에서 언제든 변경할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setData({ discovery_consent: true })}
          className={cn(
            "w-full rounded-xl border-2 px-6 py-5 text-left transition-all",
            data.discovery_consent
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400",
          )}
        >
          <p className="font-semibold">네, 기업에게 발견되고 싶어요</p>
          <p
            className={cn(
              "mt-1 text-sm",
              data.discovery_consent ? "text-zinc-300" : "text-zinc-400",
            )}
          >
            기업 담당자가 내 프로필을 보고 연락을 보낼 수 있어요
          </p>
        </button>

        <button
          type="button"
          onClick={() => setData({ discovery_consent: false })}
          className={cn(
            "w-full rounded-xl border-2 px-6 py-5 text-left transition-all",
            !data.discovery_consent
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400",
          )}
        >
          <p className="font-semibold">지금은 괜찮아요</p>
          <p
            className={cn(
              "mt-1 text-sm",
              !data.discovery_consent ? "text-zinc-300" : "text-zinc-400",
            )}
          >
            나중에 설정에서 바꿀 수 있어요
          </p>
        </button>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────

function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setDataRaw] = useState<OnboardingData>(INITIAL);

  const setData = (partial: Partial<OnboardingData>) =>
    setDataRaw((prev) => ({ ...prev, ...partial }));

  const canProceed = () => {
    if (step === 1) return data.education_level !== "";
    if (step === 2) return data.job_interests.length > 0;
    return true;
  };

  const handleFinish = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate({ to: "/login", search: { redirect: "/onboarding" } });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("job_seekers").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        education_level: data.education_level || null,
        majors: data.majors.length ? data.majors : null,
        academic_mark: data.academic_mark ? parseFloat(data.academic_mark) : null,
        job_interests: data.job_interests.length ? data.job_interests : null,
        company_interests: data.company_interests.length ? data.company_interests : null,
        work_regions: data.work_regions.length ? data.work_regions : null,
        employment_types: data.employment_types.length ? data.employment_types : null,
        willing_to_relocate: data.willing_to_relocate,
        discovery_consent: data.discovery_consent,
      },
      { onConflict: "id" },
    );

    setSaving(false);

    if (error) {
      toast.error("저장 중 오류가 발생했어요. 다시 시도해 주세요.");
      return;
    }

    toast.success("프로필이 저장됐어요!");
    navigate({ to: "/simulations" });
  };

  const progress = (step / 5) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* 상단 진행 바 */}
      <div className="h-1 bg-zinc-100">
        <div
          className="h-full bg-zinc-900 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        {/* 단계 표시 */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  i + 1 === step
                    ? "bg-zinc-900 text-white"
                    : i + 1 < step
                      ? "bg-zinc-200 text-zinc-500"
                      : "text-zinc-300",
                )}
              >
                {i + 1 < step ? "✓" : label}
              </div>
            ))}
          </div>
          <span className="text-xs text-zinc-400">
            {step} / 5
          </span>
        </div>

        {/* 단계별 콘텐츠 */}
        <div className="mt-8">
          {step === 1 && <Step1 data={data} setData={setData} />}
          {step === 2 && <Step2 data={data} setData={setData} />}
          {step === 3 && <Step3 data={data} setData={setData} />}
          {step === 4 && <Step4 data={data} setData={setData} />}
          {step === 5 && <Step5 data={data} setData={setData} />}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="mt-10 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="min-w-28 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              다음
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="min-w-36 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              {saving ? "저장 중..." : "시작하기"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
