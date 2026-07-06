import { cn } from "@/lib/utils";

// ─── 상수 ────────────────────────────────────────────────────

export const EDUCATION_LEVELS = [
  "고등학교 재학·졸업",
  "대학교 재학 중",
  "대학교 졸업",
  "대학원 재학 중",
  "대학원 졸업",
];

export const MAJORS = [
  "경영·경제",
  "컴퓨터공학·SW",
  "통계·데이터",
  "디자인",
  "인문학",
  "사회과학",
  "공학 (비SW)",
  "기타",
];

export const JOB_INTERESTS = [
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

export const COMPANIES = [
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

export const WORK_REGIONS = [
  "서울",
  "경기·인천",
  "부산·경남",
  "대구·경북",
  "광주·전라",
  "대전·충청",
  "제주",
  "해외",
];

export const EMPLOYMENT_TYPES = ["인턴", "신입", "계약직"];

// ─── 타입 ────────────────────────────────────────────────────

export type ProfileFormData = {
  university_name: string;
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

export const INITIAL_PROFILE_FORM: ProfileFormData = {
  university_name: "",
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

// ─── 헬퍼 컴포넌트 ───────────────────────────────────────────

export function Chip({
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

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  );
}

// ─── 필드 섹션 ───────────────────────────────────────────────

export function EducationFields({
  data,
  setData,
}: {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
}) {
  const toggleMajor = (m: string) => {
    setData({
      majors: data.majors.includes(m) ? data.majors.filter((x) => x !== m) : [...data.majors, m],
    });
  };

  return (
    <div>
      <SectionHeader title="학력을 알려주세요" subtitle="맞춤 시뮬레이션 추천에 활용됩니다" />

      {/* 학교명 */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-zinc-700">대학교 이름</p>
        <input
          type="text"
          placeholder="예: 연세대학교"
          value={data.university_name}
          onChange={(e) => setData({ university_name: e.target.value })}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
      </div>

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

export function JobInterestFields({
  data,
  setData,
}: {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
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
      <SectionHeader
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

export function CompanyInterestFields({
  data,
  setData,
}: {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
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
      <SectionHeader
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

export function WorkPreferenceFields({
  data,
  setData,
}: {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
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
      <SectionHeader
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
              data.willing_to_relocate ? "border-white bg-white" : "border-zinc-300",
            )}
          >
            {data.willing_to_relocate && <span className="h-2.5 w-2.5 rounded-full bg-zinc-900" />}
          </span>
          다른 지역으로 이주할 수 있어요
        </button>
      </div>
    </div>
  );
}

export function DiscoveryConsentFields({
  data,
  setData,
}: {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
}) {
  return (
    <div>
      <SectionHeader title="채용 제안을 받아볼까요?" />

      <div className="mb-8 rounded-2xl bg-zinc-50 p-6 text-sm leading-relaxed text-zinc-600">
        <p>
          내가 수행한 시뮬레이션 답안과 프로필을 기반으로, 관심 기업의 담당자가
          <strong className="text-zinc-900"> 이메일로 채용 제안</strong>을 보낼 수 있게 됩니다.
        </p>
        <p className="mt-3">
          동의하지 않아도 시뮬레이션 수행과 추천 기능은 정상적으로 사용할 수 있어요. 나중에 프로필
          설정에서 언제든 변경할 수 있습니다.
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
          <p className="font-semibold">네, 채용 제안을 받아볼래요</p>
          <p
            className={cn(
              "mt-1 text-sm",
              data.discovery_consent ? "text-zinc-300" : "text-zinc-400",
            )}
          >
            기업 담당자가 내 프로필을 보고 채용 제안을 보낼 수 있어요
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
