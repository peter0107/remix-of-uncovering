import { cn } from "@/lib/utils";
import { DOMAIN_CATEGORIES } from "@/lib/domain-categories";

// ─── 상수 ────────────────────────────────────────────────────

export const EDUCATION_SCHOOL_TYPES = ["고등학교", "학부", "대학원"];
export const EDUCATION_STATUS_OPTIONS = ["재학", "휴학", "졸업", "졸업예정", "중퇴", "수료"];

export const UNIVERSITY_OPTIONS = [
  "가야대학교",
  "가천대학교",
  "가톨릭관동대학교",
  "가톨릭꽃동네대학교",
  "가톨릭대학교",
  "감리교신학대학교",
  "강남대학교",
  "강서대학교",
  "강원대학교",
  "건국대학교",
  "건국대학교 GLOCAL캠퍼스",
  "건양대학교",
  "경기대학교",
  "경남대학교",
  "경동대학교",
  "경북대학교",
  "경상국립대학교",
  "경성대학교",
  "경운대학교",
  "경인교육대학교",
  "경일대학교",
  "경찰대학",
  "경희대학교",
  "계명대학교",
  "고려대학교",
  "고려대학교 세종캠퍼스",
  "고신대학교",
  "공군사관학교",
  "공주교육대학교",
  "광신대학교",
  "광운대학교",
  "광주대학교",
  "광주가톨릭대학교",
  "광주과학기술원",
  "광주교육대학교",
  "광주여자대학교",
  "국군간호사관학교",
  "국립경국대학교",
  "국립공주대학교",
  "국립군산대학교",
  "국립금오공과대학교",
  "국립목포대학교",
  "국립목포해양대학교",
  "국립부경대학교",
  "국립순천대학교",
  "국립창원대학교",
  "국립한국교통대학교",
  "국립한국해양대학교",
  "국립한밭대학교",
  "국민대학교",
  "극동대학교",
  "금강대학교",
  "김천대학교",
  "나사렛대학교",
  "나주대학교",
  "남부대학교",
  "남서울대학교",
  "단국대학교",
  "대구대학교",
  "대구가톨릭대학교",
  "대구경북과학기술원",
  "대구교육대학교",
  "대구예술대학교",
  "대구한의대학교",
  "대신대학교",
  "대전대학교",
  "대전가톨릭대학교",
  "대전신학대학교",
  "대진대학교",
  "덕성여자대학교",
  "동국대학교",
  "동국대학교 WISE캠퍼스",
  "동덕여자대학교",
  "동명대학교",
  "동서대학교",
  "동신대학교",
  "동아대학교",
  "동아방송예술대학교",
  "동양대학교",
  "동의대학교",
  "두원공과대학교",
  "루터대학교",
  "명지대학교",
  "목원대학교",
  "목포가톨릭대학교",
  "배재대학교",
  "백석대학교",
  "부산대학교",
  "부산가톨릭대학교",
  "부산교육대학교",
  "부산외국어대학교",
  "부산장신대학교",
  "삼육대학교",
  "상명대학교",
  "상지대학교",
  "서강대학교",
  "서경대학교",
  "서울대학교",
  "서울과학기술대학교",
  "서울교육대학교",
  "서울기독대학교",
  "서울시립대학교",
  "서울신학대학교",
  "서울여자대학교",
  "서울장신대학교",
  "서울한영대학교",
  "서원대학교",
  "선문대학교",
  "성결대학교",
  "성공회대학교",
  "성균관대학교",
  "성신여자대학교",
  "세명대학교",
  "세종대학교",
  "세한대학교",
  "송원대학교",
  "수원대학교",
  "수원가톨릭대학교",
  "숙명여자대학교",
  "순천향대학교",
  "숭실대학교",
  "신경주대학교",
  "신라대학교",
  "신한대학교",
  "서일대학교",
  "아신대학교",
  "아주대학교",
  "안양대학교",
  "연세대학교",
  "연세대학교 미래캠퍼스",
  "영남대학교",
  "영남신학대학교",
  "영산대학교",
  "영산선학대학교",
  "예수대학교",
  "예원예술대학교",
  "용인대학교",
  "우석대학교",
  "우송대학교",
  "울산대학교",
  "울산과학기술원",
  "웅지세무대학교",
  "원광대학교",
  "위덕대학교",
  "유원대학교",
  "육군사관학교",
  "을지대학교",
  "이화여자대학교",
  "인제대학교",
  "인천대학교",
  "인천가톨릭대학교",
  "인하대학교",
  "장로회신학대학교",
  "전남대학교",
  "전북대학교",
  "전주대학교",
  "전주교육대학교",
  "제주대학교",
  "제주국제대학교",
  "제주한라대학교",
  "조선대학교",
  "중부대학교",
  "중앙대학교",
  "중앙승가대학교",
  "중원대학교",
  "진주교육대학교",
  "차의과학대학교",
  "창신대학교",
  "청운대학교",
  "청주교육대학교",
  "청주대학교",
  "초당대학교",
  "총신대학교",
  "추계예술대학교",
  "춘천교육대학교",
  "충남대학교",
  "충북대학교",
  "칼빈대학교",
  "평택대학교",
  "포항공과대학교",
  "한경국립대학교",
  "한국공학대학교",
  "한국과학기술원",
  "한국교원대학교",
  "한국기술교육대학교",
  "한국방송통신대학교",
  "한국성서대학교",
  "한국예술종합학교",
  "한국외국어대학교",
  "한국전통문화대학교",
  "한국체육대학교",
  "한국침례신학대학교",
  "한국항공대학교",
  "한남대학교",
  "한동대학교",
  "한라대학교",
  "한림대학교",
  "한서대학교",
  "한성대학교",
  "한세대학교",
  "한신대학교",
  "한양대학교",
  "한양대학교 ERICA캠퍼스",
  "한일장신대학교",
  "해군사관학교",
  "협성대학교",
  "호남대학교",
  "호남신학대학교",
  "호서대학교",
  "호원대학교",
  "홍익대학교",
  "화성의과학대학교",
];

export const JOB_INTERESTS = DOMAIN_CATEGORIES;

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

export const EMPLOYMENT_TYPES = ["인턴", "신입", "계약직", "경력직"];

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
  appearance = "outlined",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  appearance?: "outlined" | "filled";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors",
        appearance === "filled" ? "rounded-lg" : "rounded-full border",
        selected
          ? appearance === "filled"
            ? "bg-zinc-900 text-white"
            : "border-zinc-900 bg-zinc-900 text-white"
          : appearance === "filled"
            ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
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

function splitEducationLevel(value: string) {
  const schoolType =
    EDUCATION_SCHOOL_TYPES.find((item) => value.includes(item)) ??
    (value.includes("대학교") ? "학부" : "");
  const status =
    [...EDUCATION_STATUS_OPTIONS]
      .sort((a, b) => b.length - a.length)
      .find((item) => value.includes(item)) ?? "";
  return { schoolType, status };
}

function composeEducationLevel(schoolType: string, status: string) {
  return [schoolType, status].filter(Boolean).join(" ");
}

// ─── 필드 섹션 ───────────────────────────────────────────────

export function EducationFields({
  data,
  setData,
  showHeader = true,
}: {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
  showHeader?: boolean;
}) {
  const { schoolType, status } = splitEducationLevel(data.education_level);
  const major = data.majors[0] ?? "";

  return (
    <div>
      {showHeader && (
        <SectionHeader
          title="최종 학력을 알려주세요"
          subtitle="맞춤 시뮬레이션 추천에 활용됩니다"
        />
      )}

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* 학교명 */}
        <div>
          <p className="mb-3 text-sm font-semibold text-zinc-700">대학교 이름</p>
          <input
            type="text"
            list="profile-university-options"
            placeholder="예: 연세대학교"
            value={data.university_name}
            onChange={(e) => setData({ university_name: e.target.value })}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
          <datalist id="profile-university-options">
            {UNIVERSITY_OPTIONS.map((school) => (
              <option key={school} value={school} />
            ))}
          </datalist>
        </div>

        {/* 전공 */}
        <div>
          <p className="mb-3 text-sm font-semibold text-zinc-700">전공</p>
          <input
            type="text"
            placeholder="예: 신소재공학부"
            value={major}
            onChange={(e) => {
              const value = e.target.value;
              setData({ majors: value.trim() ? [value] : [] });
            }}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
        </div>
      </div>

      {/* 학력 */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-zinc-700">최종 학력</p>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {EDUCATION_SCHOOL_TYPES.map((type) => (
              <Chip
                key={type}
                label={type}
                selected={schoolType === type}
                onClick={() => setData({ education_level: composeEducationLevel(type, status) })}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {EDUCATION_STATUS_OPTIONS.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={status === option}
                onClick={() =>
                  setData({ education_level: composeEducationLevel(schoolType, option) })
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* 학점 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-zinc-700">학점</p>
        <input
          type="number"
          min={0}
          max={4.5}
          step={0.01}
          required
          placeholder="예: 3.8"
          value={data.academic_mark}
          onChange={(e) => setData({ academic_mark: e.target.value })}
          className="w-32 rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
        <span className="ml-2 text-sm text-zinc-400">/ 4.5</span>
      </div>
    </div>
  );
}

export function JobInterestFields({
  data,
  setData,
  showHeader = true,
}: {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
  showHeader?: boolean;
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
      {showHeader && (
        <SectionHeader
          title="관심 있는 직무를 선택해주세요"
          subtitle="시뮬레이션 추천의 핵심 기준이 됩니다 · 복수 선택 가능"
        />
      )}
      <div className="flex flex-wrap gap-3">
        {JOB_INTERESTS.map((job) => (
          <Chip
            key={job}
            label={job}
            selected={data.job_interests.includes(job)}
            onClick={() => toggle(job)}
            appearance="filled"
          />
        ))}
      </div>
    </div>
  );
}

export function CompanyInterestFields({
  data,
  setData,
  showHeader = true,
}: {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
  showHeader?: boolean;
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
      {showHeader && (
        <SectionHeader
          title="관심 있는 기업을 선택해주세요"
          subtitle="해당 기업의 실제 업무 시뮬레이션을 먼저 추천해 드려요 · 복수 선택 가능"
        />
      )}
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
  showHeader = true,
}: {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
  showHeader?: boolean;
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
      {showHeader && (
        <SectionHeader
          title="근무 조건을 알려주세요"
          subtitle="모두 선택 사항이에요 · 나중에 언제든 수정할 수 있어요"
        />
      )}

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
            "flex items-center gap-3 rounded-md border-2 px-5 py-4 text-sm font-medium transition-colors",
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

      <div className="mb-8 border-y border-zinc-200 py-5 text-sm leading-relaxed text-zinc-600">
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
            "w-full rounded-md border-2 px-6 py-5 text-left transition-colors",
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
            "w-full rounded-md border-2 px-6 py-5 text-left transition-colors",
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
