import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Camera,
  FileText,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Building2,
  MapPin,
  Sparkles,
  Github,
  Globe,
  Linkedin,
  CalendarDays,
  Check,
  ChevronDown,
  FilePlus2,
  Pencil,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  type ProfileFormData,
  INITIAL_PROFILE_FORM,
  EducationFields,
  JobInterestFields,
  CompanyInterestFields,
  WorkPreferenceFields,
  WORK_REGIONS,
  EMPLOYMENT_TYPES,
  EDUCATION_SCHOOL_TYPES,
} from "@/lib/profile-fields";
import { isDomainCategory } from "@/lib/domain-categories";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "프로필 — 언커버링" }] }),
  component: MyPage,
});

type ExternalLinks = { github?: string; portfolio?: string; linkedin?: string };
type AvatarEditorState = { previewUrl: string };

type CompletedSimulation = {
  submissionId: string;
  title: string;
  companyName: string;
  submittedAt: string | null;
};

type JobSeeker = Tables<"job_seekers">;
type Resume = Tables<"resumes">;
type ResumeSource = "manual" | "upload";
type JsonRecord = Record<string, Json | undefined>;

type MyProfileCache = {
  hasProfile: boolean;
  seeker: JobSeeker | null;
  displayName: string;
  links: ExternalLinks;
  profileForm: ProfileFormData;
  avatarUrl: string | null;
  history: CompletedSimulation[] | null;
};

const profileCache = new Map<string, MyProfileCache>();
const resumeCache = new Map<string, Resume[]>();

type ResumeForm = {
  title: string;
  memo: string;
  target_role: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  desired_salary: string;
  preferred_region: string;
  employment_type: string;
  education: string;
  education_school: string;
  education_major: string;
  education_status: string;
  experiences: ResumeExperienceForm[];
  skills: string;
  tools: string;
  activities: ResumeActivityForm[];
};

type ResumeExperienceForm = {
  id: string;
  company: string;
  role: string;
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  description: string;
};

type ResumeActivityForm = {
  id: string;
  title: string;
  description: string;
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_BYTES = 6 * 1024 * 1024;
const AVATAR_EXPORT_SIZE = 512;

const EMPTY_RESUME_FORM: ResumeForm = {
  title: "",
  memo: "",
  target_role: "",
  name: "",
  email: "",
  phone: "",
  location: "",
  headline: "",
  desired_salary: "",
  preferred_region: "",
  employment_type: "",
  education: "",
  education_school: "",
  education_major: "",
  education_status: "",
  experiences: [],
  skills: "",
  tools: "",
  activities: [],
};

const EMPTY_SELECT_VALUE = "__empty__";
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const SALARY_OPTIONS = Array.from({ length: 40 }, (_, index) => (index + 1) * 500);
const EDUCATION_STATUS_OPTIONS = ["재학", "휴학", "졸업", "졸업예정", "중퇴", "수료"];
const UNIVERSITY_OPTIONS = [
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

function createResumeExperience(
  overrides: Partial<ResumeExperienceForm> = {},
): ResumeExperienceForm {
  return {
    id: crypto.randomUUID(),
    company: "",
    role: "",
    startYear: "",
    startMonth: "",
    endYear: "",
    endMonth: "",
    description: "",
    ...overrides,
  };
}

function createResumeActivity(overrides: Partial<ResumeActivityForm> = {}): ResumeActivityForm {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    ...overrides,
  };
}

function formatSalaryOption(amountInManwon: number) {
  if (amountInManwon < 10000) {
    return `${amountInManwon}만원 이상`;
  }

  const eok = Math.floor(amountInManwon / 10000);
  const manwon = amountInManwon % 10000;

  if (manwon === 0) {
    return `${eok}억원 이상`;
  }

  return `${eok}억 ${manwon}만원 이상`;
}

function parsePeriodParts(period: string): Partial<ResumeExperienceForm> {
  const match = period.match(/(\d{4})[.\-/년\s]+(\d{1,2}).*?(\d{4})[.\-/년\s]+(\d{1,2})/);
  if (!match) return {};
  return {
    startYear: match[1] ?? "",
    startMonth: match[2]?.padStart(2, "0") ?? "",
    endYear: match[3] ?? "",
    endMonth: match[4]?.padStart(2, "0") ?? "",
  };
}

function experienceMonths(experience: ResumeExperienceForm) {
  const startYear = Number(experience.startYear);
  const startMonth = Number(experience.startMonth);
  const endYear = Number(experience.endYear);
  const endMonth = Number(experience.endMonth);
  if (!startYear || !startMonth || !endYear || !endMonth) return 0;
  const months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  return Math.max(0, months);
}

function formatDuration(months: number) {
  if (months <= 0) return "기간 미입력";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years && rest) return `${years}년 ${rest}개월`;
  if (years) return `${years}년`;
  return `${rest}개월`;
}

function formatExperiencePeriod(experience: ResumeExperienceForm) {
  if (
    !experience.startYear ||
    !experience.startMonth ||
    !experience.endYear ||
    !experience.endMonth
  ) {
    return "";
  }
  return `${experience.startYear}.${experience.startMonth} ~ ${experience.endYear}.${experience.endMonth}`;
}

type SectionKey = "education" | "jobInterests" | "companyInterests" | "workPreference";

type ProfileFieldsProps = {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
  showHeader?: boolean;
};

const PROFILE_SECTIONS: {
  key: SectionKey;
  fields: (keyof ProfileFormData)[];
  Component: (props: ProfileFieldsProps) => ReactElement;
}[] = [
  {
    key: "education",
    fields: ["university_name", "education_level", "majors", "academic_mark"],
    Component: EducationFields,
  },
  { key: "jobInterests", fields: ["job_interests"], Component: JobInterestFields },
  { key: "companyInterests", fields: ["company_interests"], Component: CompanyInterestFields },
  {
    key: "workPreference",
    fields: ["work_regions", "employment_types", "willing_to_relocate"],
    Component: WorkPreferenceFields,
  },
];

function serializeProfileField(key: keyof ProfileFormData, value: unknown) {
  if (key === "academic_mark") {
    return value ? parseFloat(value as string) : null;
  }
  if (key === "job_interests" && Array.isArray(value)) {
    const validJobInterests = value.filter((item): item is string => {
      return typeof item === "string" && isDomainCategory(item);
    });
    return validJobInterests.length ? validJobInterests : null;
  }
  if (Array.isArray(value)) {
    return value.length ? value : null;
  }
  if (typeof value === "string") {
    return value || null;
  }
  return value;
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

function SectionRow({
  icon: Icon,
  label,
  children,
  isEditing = false,
  onEdit,
  onCancel,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  isEditing?: boolean;
  onEdit: () => void;
  onCancel?: () => void;
}) {
  const ActionIcon = isEditing ? X : Pencil;
  const actionLabel = isEditing ? `${label} 수정 취소` : `${label} 수정`;

  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <Icon className="h-4 w-4 text-zinc-400" />
          {label}
        </div>
        <button
          type="button"
          onClick={isEditing ? (onCancel ?? onEdit) : onEdit}
          aria-label={actionLabel}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ActionIcon className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

const LINK_PILL_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900";

function normalizeExternalUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeExternalLinks(links: ExternalLinks): ExternalLinks {
  const normalized: ExternalLinks = {};
  const github = normalizeExternalUrl(links.github);
  const linkedin = normalizeExternalUrl(links.linkedin);
  const portfolio = normalizeExternalUrl(links.portfolio);

  if (github) normalized.github = github;
  if (linkedin) normalized.linkedin = linkedin;
  if (portfolio) normalized.portfolio = portfolio;

  return normalized;
}

function toDateLabel(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function asRecord(value: Json | null): JsonRecord {
  return value && !Array.isArray(value) && typeof value === "object" ? value : {};
}

function firstRecord(value: Json | null): JsonRecord {
  if (!Array.isArray(value)) return {};
  const first = value[0];
  return first && !Array.isArray(first) && typeof first === "object" ? first : {};
}

function recordsFromJson(value: Json | null): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is JsonRecord => !!item && !Array.isArray(item) && typeof item === "object",
  );
}

function asString(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

function normalizeEducationStatus(value: string) {
  if (EDUCATION_STATUS_OPTIONS.includes(value)) return value;
  const matched = [...EDUCATION_STATUS_OPTIONS]
    .sort((a, b) => b.length - a.length)
    .find((status) => value.includes(status));
  if (matched) return matched;
  return "";
}

function buildEducationDescription(form: ResumeForm) {
  const school = form.education_school.trim();
  const major = form.education_major.trim();
  const status = form.education_status.trim();
  const schoolAndMajor = [school, major].filter(Boolean).join(" ");
  if (schoolAndMajor && status) return `${schoolAndMajor} (${status})`;
  return schoolAndMajor || status;
}

function splitEducationDescription(description: string) {
  if (!description.trim()) {
    return { school: "", major: "", status: "" };
  }

  const statusMatch = description.match(/\((재학|휴학|졸업|졸업예정|중퇴|수료)\)$/);
  const status = statusMatch?.[1] ?? "";
  const withoutStatus = status
    ? description.replace(/\s*\((재학|휴학|졸업|졸업예정|중퇴|수료)\)$/, "")
    : description;
  const matchedSchool = UNIVERSITY_OPTIONS.find((school) => withoutStatus.startsWith(school));

  if (!matchedSchool) {
    return { school: withoutStatus.trim(), major: "", status };
  }

  return {
    school: matchedSchool,
    major: withoutStatus.slice(matchedSchool.length).trim(),
    status,
  };
}

function selectedOptionsFromText(value: string, options: string[]) {
  if (!value.trim()) return [];
  const selected = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return selected.filter((item) => options.includes(item));
}

function normalizeEmploymentTypeValues(values: string[] | null | undefined) {
  const normalized = new Set<string>();

  for (const value of values ?? []) {
    for (const item of value.split(",")) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const mapped =
        trimmed === "정규직" || trimmed === "하이브리드" || trimmed === "경력"
          ? "경력직"
          : trimmed;
      if (EMPLOYMENT_TYPES.includes(mapped)) normalized.add(mapped);
    }
  }

  return EMPLOYMENT_TYPES.filter((type) => normalized.has(type));
}

function normalizeEmploymentTypeText(value: string) {
  return normalizeEmploymentTypeValues(value ? value.split(",") : []).join(", ");
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fallbackDisplayName(userEmail: string) {
  return userEmail.split("@")[0] || "이름";
}

function normalizeJobInterests(values: string[] | null | undefined) {
  return (values ?? []).filter(isDomainCategory);
}

function profileFormFromSeeker(seeker: JobSeeker | null): ProfileFormData {
  return {
    university_name: seeker?.university_name ?? "",
    education_level: seeker?.education_level ?? "",
    majors: seeker?.majors ?? [],
    academic_mark: seeker?.academic_mark != null ? String(seeker.academic_mark) : "",
    job_interests: normalizeJobInterests(seeker?.job_interests),
    company_interests: seeker?.company_interests ?? [],
    work_regions: seeker?.work_regions ?? [],
    employment_types: normalizeEmploymentTypeValues(seeker?.employment_types),
    willing_to_relocate: seeker?.willing_to_relocate ?? false,
    discovery_consent: seeker?.discovery_consent ?? false,
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function createCroppedAvatarBlob(
  src: string,
  options: { zoom: number; offsetX: number; offsetY: number },
) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_EXPORT_SIZE;
  canvas.height = AVATAR_EXPORT_SIZE;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");

  const baseScale = Math.max(
    AVATAR_EXPORT_SIZE / image.naturalWidth,
    AVATAR_EXPORT_SIZE / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * baseScale * options.zoom;
  const drawHeight = image.naturalHeight * baseScale * options.zoom;
  const overflowX = Math.max(0, drawWidth - AVATAR_EXPORT_SIZE);
  const overflowY = Math.max(0, drawHeight - AVATAR_EXPORT_SIZE);
  const drawX = (AVATAR_EXPORT_SIZE - drawWidth) / 2 - (overflowX * options.offsetX) / 100;
  const drawY = (AVATAR_EXPORT_SIZE - drawHeight) / 2 - (overflowY * options.offsetY) / 100;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, AVATAR_EXPORT_SIZE, AVATAR_EXPORT_SIZE);
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create avatar image"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

function buildBlankResumeForm(userEmail: string, seeker: JobSeeker | null): ResumeForm {
  const educationSchool = seeker?.university_name ?? "";
  const educationMajor = seeker?.majors?.join(", ") ?? "";
  const educationStatus = normalizeEducationStatus(seeker?.education_level ?? "");

  return {
    ...EMPTY_RESUME_FORM,
    title: "새 이력서",
    email: seeker?.email ?? userEmail,
    headline: seeker?.one_line_intro ?? "",
    target_role: seeker?.job_interests?.[0] ?? "",
    preferred_region: seeker?.work_regions?.join(", ") ?? "",
    employment_type: normalizeEmploymentTypeValues(seeker?.employment_types).join(", "),
    education: [educationSchool, educationMajor].filter(Boolean).join(" "),
    education_school: educationSchool,
    education_major: educationMajor,
    education_status: educationStatus,
    experiences: [createResumeExperience()],
    activities: [createResumeActivity()],
  };
}

function formFromResume(resume: Resume, userEmail: string, seeker: JobSeeker | null): ResumeForm {
  const basics = asRecord(resume.basics);
  const conditions = asRecord(resume.job_conditions);
  const education = firstRecord(resume.educations);
  const experienceRows = recordsFromJson(resume.experiences);
  const activityRows = recordsFromJson(resume.portfolios);
  const educationDescription = asString(education.description);
  const parsedEducation = splitEducationDescription(educationDescription);

  return {
    ...buildBlankResumeForm(userEmail, seeker),
    title: resume.title,
    memo: resume.memo ?? "",
    target_role: resume.target_role ?? "",
    name: asString(basics.name),
    email: asString(basics.email) || userEmail,
    phone: asString(basics.phone),
    location: asString(basics.location),
    headline: asString(basics.headline),
    desired_salary: asString(conditions.desired_salary),
    preferred_region: asString(conditions.preferred_region),
    employment_type:
      normalizeEmploymentTypeText(asString(conditions.employment_type)) ||
      normalizeEmploymentTypeValues(seeker?.employment_types).join(", "),
    education: educationDescription,
    education_school: asString(education.school) || parsedEducation.school,
    education_major: asString(education.major) || parsedEducation.major,
    education_status: normalizeEducationStatus(asString(education.status) || parsedEducation.status),
    experiences: experienceRows.length
      ? experienceRows.map((experience) => {
          const periodParts = parsePeriodParts(asString(experience.period));
          return createResumeExperience({
            company: asString(experience.company),
            role: asString(experience.role),
            startYear: asString(experience.startYear) || periodParts.startYear || "",
            startMonth: asString(experience.startMonth) || periodParts.startMonth || "",
            endYear: asString(experience.endYear) || periodParts.endYear || "",
            endMonth: asString(experience.endMonth) || periodParts.endMonth || "",
            description: asString(experience.description),
          });
        })
      : [createResumeExperience()],
    skills: resume.skills.join(", "),
    tools: resume.tools.join(", "),
    activities: activityRows.length
      ? activityRows.map((activity) =>
          createResumeActivity({
            title: asString(activity.title),
            description: asString(activity.description) || asString(activity.url),
          }),
        )
      : [createResumeActivity()],
  };
}

function patchFromResumeForm(
  form: ResumeForm,
): Omit<TablesUpdate<"resumes">, "id" | "user_id" | "created_at" | "updated_at"> {
  const educationDescription = buildEducationDescription(form);

  return {
    title: form.title.trim() || "새 이력서",
    memo: form.memo.trim() || null,
    target_role: form.target_role.trim() || null,
    basics: {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      headline: form.headline.trim(),
    },
    job_conditions: {
      desired_salary: form.desired_salary.trim(),
      preferred_region: form.preferred_region.trim(),
      employment_type: normalizeEmploymentTypeText(form.employment_type),
    },
    educations: educationDescription
      ? [
          {
            school: form.education_school.trim(),
            major: form.education_major.trim(),
            status: form.education_status.trim(),
            description: educationDescription,
          },
        ]
      : [],
    experiences: form.experiences
      .filter(
        (experience) =>
          experience.company.trim() ||
          experience.role.trim() ||
          experience.startYear.trim() ||
          experience.startMonth.trim() ||
          experience.endYear.trim() ||
          experience.endMonth.trim() ||
          experience.description.trim(),
      )
      .map((experience) => {
        const months = experienceMonths(experience);
        return {
          company: experience.company.trim(),
          role: experience.role.trim(),
          startYear: experience.startYear.trim(),
          startMonth: experience.startMonth.trim(),
          endYear: experience.endYear.trim(),
          endMonth: experience.endMonth.trim(),
          period: formatExperiencePeriod(experience),
          durationMonths: months,
          duration: formatDuration(months),
          description: experience.description.trim(),
        };
      }),
    skills: splitTags(form.skills),
    tools: splitTags(form.tools),
    portfolios: form.activities
      .filter((activity) => activity.title.trim() || activity.description.trim())
      .map((activity) => ({
        title: activity.title.trim(),
        description: activity.description.trim(),
      })),
  };
}

function ResumeLabel({
  htmlFor,
  children,
  shared = false,
}: {
  htmlFor?: string;
  children: ReactNode;
  shared?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {shared && <span className="ml-1 text-red-500">*</span>}
    </Label>
  );
}

function ResumeField({
  id,
  label,
  value,
  onChange,
  placeholder,
  shared = false,
}: {
  id: keyof ResumeForm;
  label: string;
  value: string;
  onChange: (id: keyof ResumeForm, value: string) => void;
  placeholder?: string;
  shared?: boolean;
}) {
  return (
    <div>
      <ResumeLabel htmlFor={id} shared={shared}>
        {label}
      </ResumeLabel>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        className="mt-2"
      />
    </div>
  );
}

function ResumeTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  shared = false,
}: {
  id: keyof ResumeForm;
  label: string;
  value: string;
  onChange: (id: keyof ResumeForm, value: string) => void;
  placeholder?: string;
  shared?: boolean;
}) {
  return (
    <div>
      <ResumeLabel htmlFor={id} shared={shared}>
        {label}
      </ResumeLabel>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-24"
      />
    </div>
  );
}

function ResumeSelectField({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "선택",
  shared = false,
}: {
  id: keyof ResumeForm;
  label: string;
  value: string;
  options: string[];
  onChange: (id: keyof ResumeForm, value: string) => void;
  placeholder?: string;
  shared?: boolean;
}) {
  return (
    <div>
      <ResumeLabel htmlFor={id} shared={shared}>
        {label}
      </ResumeLabel>
      <Select
        value={value || EMPTY_SELECT_VALUE}
        onValueChange={(next) => onChange(id, next === EMPTY_SELECT_VALUE ? "" : next)}
      >
        <SelectTrigger id={id} className="mt-2 h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_SELECT_VALUE}>선택 안 함</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ResumeMultiSelectField({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "선택",
  shared = false,
}: {
  id: keyof ResumeForm;
  label: string;
  value: string;
  options: string[];
  onChange: (id: keyof ResumeForm, value: string) => void;
  placeholder?: string;
  shared?: boolean;
}) {
  const selected = selectedOptionsFromText(value, options);

  const toggleOption = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    onChange(id, next.join(", "));
  };

  return (
    <div>
      <ResumeLabel htmlFor={id} shared={shared}>
        {label}
      </ResumeLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="mt-2 h-9 w-full justify-between rounded-md border-neutral-300 px-3 text-left font-normal"
          >
            <span className={selected.length ? "truncate text-neutral-900" : "text-neutral-400"}>
              {selected.length ? selected.join(", ") : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-neutral-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-72 w-[var(--radix-popover-trigger-width)] overflow-y-auto p-2"
        >
          <div className="space-y-1">
            {options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleOption(option)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-100"
                >
                  <span>{option}</span>
                  {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ResumeSchoolField({
  id,
  label,
  value,
  onChange,
  shared = false,
}: {
  id: keyof ResumeForm;
  label: string;
  value: string;
  onChange: (id: keyof ResumeForm, value: string) => void;
  shared?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filteredSchools = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return UNIVERSITY_OPTIONS.slice(0, 20);
    return UNIVERSITY_OPTIONS.filter((school) => school.toLowerCase().includes(keyword)).slice(
      0,
      30,
    );
  }, [query]);

  return (
    <div>
      <ResumeLabel htmlFor={id} shared={shared}>
        {label}
      </ResumeLabel>
      <Popover
        onOpenChange={(open) => {
          if (open) setQuery(value);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="mt-2 h-9 w-full justify-between rounded-md border-neutral-300 px-3 text-left font-normal"
          >
            <span className={value ? "truncate text-neutral-900" : "text-neutral-400"}>
              {value || "학교명 검색"}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-neutral-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-80 w-[var(--radix-popover-trigger-width)] overflow-hidden p-2"
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="학교명 검색"
            className="mb-2 h-9"
          />
          <div className="max-h-60 overflow-y-auto">
            {filteredSchools.length ? (
              filteredSchools.map((school) => (
                <button
                  key={school}
                  type="button"
                  onClick={() => onChange(id, school)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-100"
                >
                  <span>{school}</span>
                  {value === school && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              ))
            ) : (
              <p className="px-2 py-6 text-center text-sm text-zinc-400">검색 결과가 없습니다.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const cachedProfile = user ? profileCache.get(user.id) : undefined;

  const [hasProfile, setHasProfile] = useState<boolean | null>(cachedProfile?.hasProfile ?? null);
  const [seeker, setSeeker] = useState<JobSeeker | null>(cachedProfile?.seeker ?? null);
  const [displayName, setDisplayName] = useState(cachedProfile?.displayName ?? "");
  const [links, setLinks] = useState<ExternalLinks>(cachedProfile?.links ?? {});
  const [profileForm, setProfileFormRaw] = useState<ProfileFormData>(
    cachedProfile?.profileForm ?? INITIAL_PROFILE_FORM,
  );

  const [editingProfileCard, setEditingProfileCard] = useState(false);
  const [savingProfileCard, setSavingProfileCard] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [savingSection, setSavingSection] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftLinks, setDraftLinks] = useState<ExternalLinks>({});
  const [draftForm, setDraftFormRaw] = useState<ProfileFormData>(INITIAL_PROFILE_FORM);

  const [discoverySaving, setDiscoverySaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedProfile?.avatarUrl ?? null);
  const [avatarEditor, setAvatarEditor] = useState<AvatarEditorState | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [history, setHistory] = useState<CompletedSimulation[] | null>(
    cachedProfile?.history ?? null,
  );
  const cachedResumes = user ? resumeCache.get(user.id) : undefined;
  const [resumes, setResumes] = useState<Resume[]>(cachedResumes ?? []);
  const [resumesLoading, setResumesLoading] = useState(!cachedResumes);
  const [resumeEditorOpen, setResumeEditorOpen] = useState(false);
  const [editingResume, setEditingResume] = useState<Resume | null>(null);
  const [resumeSourceType, setResumeSourceType] = useState<ResumeSource>("manual");
  const [resumeForm, setResumeForm] = useState<ResumeForm>(EMPTY_RESUME_FORM);
  const [savingResume, setSavingResume] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  const userEmail = user?.email ?? "";
  const defaultResumeId = useMemo(() => resumes.find((resume) => resume.is_default)?.id, [resumes]);

  const setDraftForm = (partial: Partial<ProfileFormData>) =>
    setDraftFormRaw((prev) => ({ ...prev, ...partial }));

  const refreshResumes = useCallback(async (options?: { showLoading?: boolean }) => {
    if (!user) return;
    const cached = resumeCache.get(user.id);
    const showLoading = options?.showLoading ?? !cached;

    if (cached) {
      setResumes(cached);
      setResumesLoading(false);
    } else if (showLoading) {
      setResumesLoading(true);
    }

    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("이력서를 불러오지 못했어요. Supabase SQL 적용 여부를 확인해주세요.");
    } else {
      const nextResumes = data ?? [];
      resumeCache.set(user.id, nextResumes);
      setResumes(nextResumes);
    }
    setResumesLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/my" } });
      return;
    }

    (async () => {
      const { data: seeker } = await supabase
        .from("job_seekers")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setHasProfile(!!seeker);
      setSeeker(seeker ?? null);
      const nextDisplayName = seeker?.display_name ?? fallbackDisplayName(user.email ?? "");
      const nextLinks = (seeker?.external_links as ExternalLinks) ?? {};
      const nextAvatarUrl = seeker?.avatar_url ?? null;
      const nextProfileForm = profileFormFromSeeker(seeker ?? null);

      setDisplayName(nextDisplayName);
      setLinks(nextLinks);
      setAvatarUrl(nextAvatarUrl);
      setProfileFormRaw(nextProfileForm);

      profileCache.set(user.id, {
        hasProfile: !!seeker,
        seeker: seeker ?? null,
        displayName: nextDisplayName,
        links: nextLinks,
        profileForm: nextProfileForm,
        avatarUrl: nextAvatarUrl,
        history: profileCache.get(user.id)?.history ?? null,
      });
      if (seeker) {
        await refreshResumes({ showLoading: !resumeCache.has(user.id) });
      } else {
        setResumes([]);
        setResumesLoading(false);
      }

      const { data: submissions } = await supabase
        .from("submissions")
        .select("id, submitted_at, job_simulations(title, companies(name))")
        .eq("job_seeker_id", user.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });

      type Row = {
        id: string;
        submitted_at: string | null;
        job_simulations: { title: string; companies: { name: string } | null } | null;
      };
      const rows = (submissions ?? []) as unknown as Row[];
      const nextHistory = rows.map((r) => ({
        submissionId: r.id,
        title: r.job_simulations?.title ?? "",
        companyName: r.job_simulations?.companies?.name ?? "",
        submittedAt: r.submitted_at,
      }));
      setHistory(nextHistory);
      const currentCache = profileCache.get(user.id);
      if (currentCache) {
        profileCache.set(user.id, { ...currentCache, history: nextHistory });
      }
    })();
  }, [user, authLoading, navigate, refreshResumes]);

  useEffect(() => {
    const previewUrl = avatarEditor?.previewUrl;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [avatarEditor?.previewUrl]);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있어요.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("5MB 이하의 이미지만 업로드할 수 있어요.");
      return;
    }

    setAvatarZoom(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    setAvatarEditor({ previewUrl: URL.createObjectURL(file) });
  };

  const closeAvatarEditor = () => {
    if (uploadingAvatar) return;
    setAvatarEditor(null);
  };

  const applyAvatarEdit = async () => {
    if (!user || !avatarEditor) return;

    setUploadingAvatar(true);
    const path = `${user.id}/avatar.jpg`;

    let blob: Blob;
    try {
      blob = await createCroppedAvatarBlob(avatarEditor.previewUrl, {
        zoom: avatarZoom,
        offsetX: avatarOffsetX,
        offsetY: avatarOffsetY,
      });
    } catch {
      setUploadingAvatar(false);
      toast.error("사진 편집 중 오류가 발생했어요.");
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      toast.error("사진 업로드 중 오류가 발생했어요.");
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("job_seekers")
      .update({ avatar_url: url })
      .eq("id", user.id);

    setUploadingAvatar(false);

    if (updateError) {
      toast.error("사진 저장 중 오류가 발생했어요.");
      return;
    }

    setAvatarUrl(url);
    const currentCache = profileCache.get(user.id);
    if (currentCache) {
      profileCache.set(user.id, { ...currentCache, avatarUrl: url });
    }
    setAvatarEditor(null);
    toast.success("프로필 사진이 업데이트됐어요.");
  };

  const toggleDiscovery = async (next: boolean) => {
    if (!user) return;
    setDiscoverySaving(true);
    const { error } = await supabase
      .from("job_seekers")
      .update({ discovery_consent: next })
      .eq("id", user.id);
    setDiscoverySaving(false);

    if (error) {
      toast.error("저장 중 오류가 발생했어요.");
      return;
    }

    setProfileFormRaw((prev) => ({ ...prev, discovery_consent: next }));
    const currentCache = profileCache.get(user.id);
    if (currentCache) {
      profileCache.set(user.id, {
        ...currentCache,
        profileForm: { ...currentCache.profileForm, discovery_consent: next },
      });
    }
    toast.success(next ? "채용 제안 받기로 변경됐어요." : "채용 제안 받기를 해제했어요.");
  };

  const startEditProfileCard = () => {
    setDraftDisplayName(displayName);
    setDraftLinks(links);
    setEditingProfileCard(true);
  };

  const cancelEditProfileCard = () => {
    setEditingProfileCard(false);
  };

  const saveProfileCard = async () => {
    if (!user) return;

    const nextLinks = normalizeExternalLinks(draftLinks);

    setSavingProfileCard(true);
    const patch: TablesUpdate<"job_seekers"> = {
      display_name: draftDisplayName.trim() || null,
      external_links: nextLinks,
    };
    const { error } = await supabase.from("job_seekers").update(patch).eq("id", user.id);
    setSavingProfileCard(false);

    if (error) {
      toast.error("저장 중 오류가 발생했어요.");
      return;
    }

    const nextDisplayName = draftDisplayName.trim() || fallbackDisplayName(userEmail);
    setDisplayName(nextDisplayName);
    setLinks(nextLinks);
    const currentCache = profileCache.get(user.id);
    if (currentCache) {
      profileCache.set(user.id, {
        ...currentCache,
        displayName: nextDisplayName,
        links: nextLinks,
      });
    }
    setEditingProfileCard(false);
    toast.success("저장됐어요.");
  };

  const startEditSection = (sectionKey: SectionKey) => {
    setDraftFormRaw(profileForm);
    setEditingSection(sectionKey);
  };

  const cancelEditSection = () => {
    if (savingSection) return;
    setDraftFormRaw(profileForm);
    setEditingSection(null);
  };

  const saveSection = async () => {
    if (!user || !editingSection) return;
    const section = PROFILE_SECTIONS.find((item) => item.key === editingSection);
    if (!section) return;

    if (editingSection === "education") {
      const hasSchoolType = EDUCATION_SCHOOL_TYPES.some((item) =>
        draftForm.education_level.includes(item),
      );
      const hasStatus = EDUCATION_STATUS_OPTIONS.some((item) =>
        draftForm.education_level.includes(item),
      );

      if (
        !draftForm.university_name.trim() ||
        !hasSchoolType ||
        !hasStatus ||
        !draftForm.academic_mark
      ) {
        toast.error("학교명, 최종 학력, 학점을 입력해주세요.");
        return;
      }
    }

    setSavingSection(true);
    const patch: TablesUpdate<"job_seekers"> = {};
    for (const field of section.fields) {
      (patch as Record<string, unknown>)[field] = serializeProfileField(field, draftForm[field]);
    }
    const { error } = await supabase.from("job_seekers").update(patch).eq("id", user.id);
    setSavingSection(false);

    if (error) {
      toast.error("저장 중 오류가 발생했어요.");
      return;
    }

    setProfileFormRaw((prev) => {
      const nextProfileForm = { ...prev, ...draftForm };
      const currentCache = profileCache.get(user.id);
      if (currentCache) {
        profileCache.set(user.id, { ...currentCache, profileForm: nextProfileForm });
      }
      return nextProfileForm;
    });
    setEditingSection(null);
    toast.success("저장됐어요.");
  };

  const renderSectionEditor = (sectionKey: SectionKey) => {
    const section = PROFILE_SECTIONS.find((item) => item.key === sectionKey);
    if (!section) return null;

    const SectionComponent = section.Component;
    return (
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <SectionComponent data={draftForm} setData={setDraftForm} showHeader={false} />
        <div className="mt-6 flex gap-2">
          <Button
            onClick={saveSection}
            disabled={savingSection}
            className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
          >
            {savingSection ? "저장 중..." : "저장"}
          </Button>
          <Button
            variant="outline"
            onClick={cancelEditSection}
            disabled={savingSection}
            className="rounded-xl"
          >
            취소
          </Button>
        </div>
      </div>
    );
  };

  const updateResumeForm = (key: keyof ResumeForm, value: string) => {
    setResumeForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateResumeExperience = (
    id: string,
    key: keyof Omit<ResumeExperienceForm, "id">,
    value: string,
  ) => {
    setResumeForm((prev) => ({
      ...prev,
      experiences: prev.experiences.map((experience) =>
        experience.id === id ? { ...experience, [key]: value } : experience,
      ),
    }));
  };

  const addResumeExperience = () => {
    setResumeForm((prev) => ({
      ...prev,
      experiences: [...prev.experiences, createResumeExperience()],
    }));
  };

  const removeResumeExperience = (id: string) => {
    setResumeForm((prev) => ({
      ...prev,
      experiences:
        prev.experiences.length > 1
          ? prev.experiences.filter((experience) => experience.id !== id)
          : [createResumeExperience()],
    }));
  };

  const updateResumeActivity = (
    id: string,
    key: keyof Omit<ResumeActivityForm, "id">,
    value: string,
  ) => {
    setResumeForm((prev) => ({
      ...prev,
      activities: prev.activities.map((activity) =>
        activity.id === id ? { ...activity, [key]: value } : activity,
      ),
    }));
  };

  const addResumeActivity = () => {
    setResumeForm((prev) => ({
      ...prev,
      activities: [...prev.activities, createResumeActivity()],
    }));
  };

  const removeResumeActivity = (id: string) => {
    setResumeForm((prev) => ({
      ...prev,
      activities:
        prev.activities.length > 1
          ? prev.activities.filter((activity) => activity.id !== id)
          : [createResumeActivity()],
    }));
  };

  const openNewResume = () => {
    setEditingResume(null);
    setResumeSourceType("manual");
    setResumeForm(buildBlankResumeForm(userEmail, seeker));
    setResumeEditorOpen(true);
  };

  const openResumeEditor = (resume: Resume) => {
    setEditingResume(resume);
    setResumeSourceType(resume.source_type as ResumeSource);
    setResumeForm(formFromResume(resume, userEmail, seeker));
    setResumeEditorOpen(true);
  };

  const saveResume = async () => {
    if (!user) return;
    setSavingResume(true);

    const patch = patchFromResumeForm(resumeForm);
    const result = editingResume
      ? await supabase.from("resumes").update(patch).eq("id", editingResume.id).select("*").single()
      : await supabase
          .from("resumes")
          .insert({
            ...patch,
            user_id: user.id,
            source_type: resumeSourceType,
            is_default: resumes.length === 0,
          } as TablesInsert<"resumes">)
          .select("*")
          .single();

    setSavingResume(false);

    if (result.error) {
      toast.error("이력서 저장 중 오류가 발생했어요.");
      return;
    }

    setResumeEditorOpen(false);
    setEditingResume(null);
    await refreshResumes();
    toast.success("이력서가 저장됐어요.");
  };

  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("PDF, DOC, DOCX 파일만 업로드할 수 있어요.");
      return;
    }

    if (file.size > MAX_RESUME_BYTES) {
      toast.error("6MB 이하의 파일만 업로드할 수 있어요.");
      return;
    }

    setUploadingResume(true);
    const resumeId = crypto.randomUUID();
    const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_");
    const path = `${user.id}/${resumeId}/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setUploadingResume(false);
      toast.error("파일 업로드 중 오류가 발생했어요.");
      return;
    }

    const title = file.name.replace(/\.[^.]+$/, "");
    const { error: insertError } = await supabase.from("resumes").insert({
      id: resumeId,
      user_id: user.id,
      title,
      source_type: "upload",
      uploaded_file_path: path,
      uploaded_file_name: file.name,
      uploaded_file_type: file.type,
      uploaded_file_size: file.size,
      is_default: resumes.length === 0,
      basics: { email: userEmail, headline: seeker?.one_line_intro ?? "" },
      target_role: seeker?.job_interests?.[0] ?? null,
    } as TablesInsert<"resumes">);

    setUploadingResume(false);

    if (insertError) {
      await supabase.storage.from("resumes").remove([path]);
      toast.error("업로드한 이력서 정보를 저장하지 못했어요.");
      return;
    }

    await refreshResumes();
    toast.success("이력서 파일이 업로드됐어요.");
  };

  const makeDefaultResume = async (resumeId: string) => {
    if (!user || resumeId === defaultResumeId) return;

    const { error: clearError } = await supabase
      .from("resumes")
      .update({ is_default: false })
      .eq("user_id", user.id);

    if (clearError) {
      toast.error("기본 이력서 변경 중 오류가 발생했어요.");
      return;
    }

    const { error } = await supabase
      .from("resumes")
      .update({ is_default: true })
      .eq("id", resumeId);

    if (error) {
      toast.error("기본 이력서 변경 중 오류가 발생했어요.");
      return;
    }

    setResumes((prev) => {
      const nextResumes = prev.map((resume) => ({ ...resume, is_default: resume.id === resumeId }));
      resumeCache.set(user.id, nextResumes);
      return nextResumes;
    });
    toast.success("기본 이력서로 설정됐어요.");
  };

  const deleteResume = async (resume: Resume) => {
    const ok = window.confirm("이 이력서를 삭제할까요?");
    if (!ok) return;

    const { error } = await supabase.from("resumes").delete().eq("id", resume.id);

    if (error) {
      toast.error("이력서를 삭제하지 못했어요.");
      return;
    }

    if (resume.uploaded_file_path) {
      await supabase.storage.from("resumes").remove([resume.uploaded_file_path]);
    }

    await refreshResumes();
    toast.success("이력서가 삭제됐어요.");
  };

  if (authLoading || hasProfile === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900">아직 프로필이 없어요</h1>
          <p className="mt-2 text-sm text-zinc-500">
            온보딩을 완료하면 프로필과 추천 시뮬레이션을 볼 수 있어요.
          </p>
          <Link to="/onboarding">
            <Button className="mt-6 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700">
              온보딩 시작하기
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const hasAnyLink = Boolean(links.github || links.portfolio || links.linkedin);
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900">프로필</h1>

      <Card className="mt-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl ?? undefined} alt="프로필 사진" />
                <AvatarFallback className="text-lg">
                  {(user?.email ?? "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="프로필 사진 변경"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-white shadow hover:bg-zinc-700 disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="min-w-0">
              <p className="text-lg font-bold text-zinc-900">{displayName}</p>
              <p className="mt-1 text-sm text-zinc-400">{user?.email}</p>

              {editingProfileCard ? (
                <div className="mt-4 grid gap-3">
                  <div>
                    <Label htmlFor="display-name">이름</Label>
                    <Input
                      id="display-name"
                      value={draftDisplayName}
                      onChange={(e) => setDraftDisplayName(e.target.value)}
                      placeholder="이름을 입력해주세요"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-email">이메일</Label>
                    <Input
                      id="profile-email"
                      value={userEmail}
                      readOnly
                      className="mt-2 bg-zinc-50 text-zinc-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={draftLinks.linkedin ?? ""}
                      onChange={(e) =>
                        setDraftLinks((prev) => ({ ...prev, linkedin: e.target.value }))
                      }
                      placeholder="https://linkedin.com/in/..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="github">GitHub</Label>
                    <Input
                      id="github"
                      value={draftLinks.github ?? ""}
                      onChange={(e) =>
                        setDraftLinks((prev) => ({ ...prev, github: e.target.value }))
                      }
                      placeholder="https://github.com/..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="portfolio">포트폴리오</Label>
                    <Input
                      id="portfolio"
                      value={draftLinks.portfolio ?? ""}
                      onChange={(e) =>
                        setDraftLinks((prev) => ({ ...prev, portfolio: e.target.value }))
                      }
                      placeholder="https://..."
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={saveProfileCard}
                      disabled={savingProfileCard}
                      className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
                    >
                      {savingProfileCard ? "저장 중..." : "저장"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={cancelEditProfileCard}
                      disabled={savingProfileCard}
                      className="rounded-xl"
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {links.linkedin && (
                    <a
                      href={normalizeExternalUrl(links.linkedin)}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK_PILL_CLASS}
                    >
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </a>
                  )}
                  {links.github && (
                    <a
                      href={normalizeExternalUrl(links.github)}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK_PILL_CLASS}
                    >
                      <Github className="h-3.5 w-3.5" /> GitHub
                    </a>
                  )}
                  {links.portfolio && (
                    <a
                      href={normalizeExternalUrl(links.portfolio)}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK_PILL_CLASS}
                    >
                      <Globe className="h-3.5 w-3.5" /> 포트폴리오
                    </a>
                  )}
                  {!hasAnyLink && (
                    <p className="text-sm text-zinc-400">
                      내 GitHub, LinkedIn, 포트폴리오 링크를 등록해보세요.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {!editingProfileCard && (
            <Button
              variant="outline"
              onClick={startEditProfileCard}
              className="shrink-0 rounded-xl"
            >
              프로필 수정
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <div>
            <p className="text-sm font-semibold text-zinc-700">채용 제안 받아보기</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              동의하면 관심 기업 담당자가 내 프로필을 보고 채용 제안을 보낼 수 있어요
            </p>
          </div>
        </div>
        <Switch
          checked={profileForm.discovery_consent}
          onCheckedChange={toggleDiscovery}
          disabled={discoverySaving}
        />
      </div>

      <Card className="mt-4 p-6">
        <>
          <SectionRow
            icon={GraduationCap}
            label="학력"
            isEditing={editingSection === "education"}
            onEdit={() => startEditSection("education")}
            onCancel={cancelEditSection}
          >
            {editingSection === "education" ? (
              renderSectionEditor("education")
            ) : profileForm.university_name ||
              profileForm.education_level ||
              profileForm.majors.length ||
              profileForm.academic_mark ? (
              <div className="flex flex-wrap items-center gap-2">
                {profileForm.university_name && (
                  <span className="text-sm text-zinc-800">{profileForm.university_name}</span>
                )}
                {profileForm.education_level && (
                  <span className="text-sm text-zinc-800">{profileForm.education_level}</span>
                )}
                {profileForm.majors.map((m) => (
                  <Tag key={m}>{m}</Tag>
                ))}
                {profileForm.academic_mark && (
                  <span className="text-sm text-zinc-500">
                    학점 {profileForm.academic_mark}/4.5
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">아직 입력하지 않았어요</p>
            )}
          </SectionRow>

          <Separator />

          <SectionRow
            icon={Briefcase}
            label="관심 직무"
            isEditing={editingSection === "jobInterests"}
            onEdit={() => startEditSection("jobInterests")}
            onCancel={cancelEditSection}
          >
            {editingSection === "jobInterests" ? (
              renderSectionEditor("jobInterests")
            ) : profileForm.job_interests.length ? (
              <div className="flex flex-wrap gap-2">
                {profileForm.job_interests.map((j) => (
                  <Tag key={j}>{j}</Tag>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">아직 선택하지 않았어요</p>
            )}
          </SectionRow>

          <Separator />

          <SectionRow
            icon={Building2}
            label="관심 기업"
            isEditing={editingSection === "companyInterests"}
            onEdit={() => startEditSection("companyInterests")}
            onCancel={cancelEditSection}
          >
            {editingSection === "companyInterests" ? (
              renderSectionEditor("companyInterests")
            ) : profileForm.company_interests.length ? (
              <div className="flex flex-wrap gap-2">
                {profileForm.company_interests.map((c) => (
                  <Tag key={c}>{c}</Tag>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">아직 선택하지 않았어요</p>
            )}
          </SectionRow>

          <Separator />

          <SectionRow
            icon={MapPin}
            label="근무 선호"
            isEditing={editingSection === "workPreference"}
            onEdit={() => startEditSection("workPreference")}
            onCancel={cancelEditSection}
          >
            {editingSection === "workPreference" ? (
              renderSectionEditor("workPreference")
            ) : profileForm.work_regions.length ||
              profileForm.employment_types.length ||
              profileForm.willing_to_relocate ? (
              <div className="flex flex-wrap gap-2">
                {profileForm.work_regions.map((r) => (
                  <Tag key={r}>{r}</Tag>
                ))}
                {profileForm.employment_types.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
                {profileForm.willing_to_relocate && <Tag>이주 가능</Tag>}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">아직 입력하지 않았어요</p>
            )}
          </SectionRow>
        </>
      </Card>

      <div className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">내 이력서</h2>
            <p className="mt-1 text-sm text-zinc-400">
              직무와 회사에 맞춰 여러 이력서를 따로 관리할 수 있어요.
            </p>
          </div>
          <Button
            onClick={openNewResume}
            className="shrink-0 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
          >
            <FilePlus2 className="mr-2 h-4 w-4" /> 새 이력서
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={openNewResume}
            className="flex min-h-36 flex-col items-start rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-left transition hover:border-zinc-900 hover:bg-zinc-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
              <FilePlus2 className="h-5 w-5" />
            </span>
            <strong className="mt-4 text-sm font-semibold text-zinc-900">직접 작성</strong>
            <span className="mt-1 text-xs leading-5 text-zinc-400">
              기본정보, 경력, 학력, 스킬, 활동을 입력해요.
            </span>
          </button>

          <button
            type="button"
            onClick={() => resumeFileInputRef.current?.click()}
            disabled={uploadingResume}
            className="flex min-h-36 flex-col items-start rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-left transition hover:border-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
              <Upload className="h-5 w-5" />
            </span>
            <strong className="mt-4 text-sm font-semibold text-zinc-900">파일 업로드</strong>
            <span className="mt-1 text-xs leading-5 text-zinc-400">
              PDF, DOC, DOCX 이력서를 올려서 보관해요.
            </span>
          </button>
          <input
            ref={resumeFileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleResumeUpload}
          />
        </div>

        {resumesLoading ? (
          <Skeleton className="mt-4 h-32 w-full rounded-2xl" />
        ) : resumes.length === 0 ? (
          <Card className="mt-4 p-6 text-center text-sm text-zinc-400">
            <FileText className="mx-auto h-8 w-8 opacity-40" />
            <p className="mt-2">아직 등록된 이력서가 없어요.</p>
          </Card>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {resumes.map((resume) => {
              const isUpload = resume.source_type === "upload";

              return (
                <Card
                  key={resume.id}
                  className="flex min-h-36 flex-col rounded-2xl border-zinc-200 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                      {resume.is_default && (
                        <span className="whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                          기본
                        </span>
                      )}
                      {isUpload && (
                        <span className="whitespace-nowrap rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                          파일
                        </span>
                      )}
                    </div>


                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => makeDefaultResume(resume.id)}
                        aria-label="기본 이력서 설정"
                        className="h-8 w-8 rounded-full"
                      >
                        <Check
                          className={
                            resume.is_default ? "h-4 w-4 text-blue-600" : "h-4 w-4 text-zinc-400"
                          }
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openResumeEditor(resume)}
                        aria-label="이력서 편집"
                        className="h-8 w-8 rounded-full"
                      >
                        <Pencil className="h-4 w-4 text-zinc-500" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteResume(resume)}
                        aria-label="이력서 삭제"
                        className="h-8 w-8 rounded-full"
                      >
                        <Trash2 className="h-4 w-4 text-zinc-400" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">
                      {resume.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                      {resume.memo?.trim() || "메모 없음"}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 pt-4 text-xs text-zinc-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    수정 {toDateLabel(resume.updated_at)}
                  </div>
                </Card>

              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">완료한 시뮬레이션</h2>
        {history === null ? (
          <Skeleton className="mt-4 h-24 w-full" />
        ) : history.length === 0 ? (
          <Card className="mt-4 p-6 text-center text-sm text-zinc-400">
            <FileText className="mx-auto h-8 w-8 opacity-40" />
            <p className="mt-2">아직 완료한 시뮬레이션이 없어요.</p>
            <Link to="/simulations" className="mt-3 inline-block text-sm text-zinc-600 underline">
              추천 시뮬레이션 보러 가기
            </Link>
          </Card>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((h) => (
              <li key={h.submissionId}>
                <Card className="flex items-center gap-3 p-4">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div>
                    <p className="font-medium text-zinc-900">{h.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {h.companyName}
                      {h.submittedAt && ` · ${new Date(h.submittedAt).toLocaleDateString("ko-KR")}`}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!avatarEditor} onOpenChange={(open) => !open && closeAvatarEditor()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>프로필 사진 편집</DialogTitle>
            <DialogDescription>사진을 원형 영역에 맞게 조정한 뒤 적용하세요.</DialogDescription>
          </DialogHeader>

          {avatarEditor && (
            <div className="space-y-6 py-2">
              <div className="mx-auto flex h-64 w-64 items-center justify-center overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
                <img
                  src={avatarEditor.previewUrl}
                  alt="프로필 사진 미리보기"
                  className="h-full w-full object-cover"
                  style={{
                    transform: `translate(${avatarOffsetX / 3}%, ${avatarOffsetY / 3}%) scale(${avatarZoom})`,
                    transformOrigin: "center",
                  }}
                />
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-700">확대</span>
                    <span className="text-zinc-400">{avatarZoom.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[avatarZoom]}
                    min={1}
                    max={3}
                    step={0.05}
                    onValueChange={([value]) => setAvatarZoom(value ?? 1)}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-700">가로 위치</span>
                    <span className="text-zinc-400">{avatarOffsetX}</span>
                  </div>
                  <Slider
                    value={[avatarOffsetX]}
                    min={-100}
                    max={100}
                    step={1}
                    onValueChange={([value]) => setAvatarOffsetX(value ?? 0)}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-700">세로 위치</span>
                    <span className="text-zinc-400">{avatarOffsetY}</span>
                  </div>
                  <Slider
                    value={[avatarOffsetY]}
                    min={-100}
                    max={100}
                    step={1}
                    onValueChange={([value]) => setAvatarOffsetY(value ?? 0)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeAvatarEditor} disabled={uploadingAvatar}>
              취소
            </Button>
            <Button
              onClick={applyAvatarEdit}
              disabled={uploadingAvatar}
              className="bg-zinc-900 text-white hover:bg-zinc-700"
            >
              {uploadingAvatar ? "적용 중..." : "적용"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resumeEditorOpen} onOpenChange={setResumeEditorOpen}>
        <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>{editingResume ? "이력서 수정" : "새 이력서 작성"}</DialogTitle>
            <DialogDescription>
              회사나 직무별로 다른 내용을 저장할 수 있어요. 비어 있는 항목은 저장해도 괜찮아요.
              <span className="mt-1 block">
                <span className="font-semibold text-red-500">*</span> 항목은 동의 시 기업에 공유됩니다.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-8 overflow-y-auto px-6 py-4">
            <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-sm font-bold text-zinc-500">이력서 정보</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ResumeField
                  id="title"
                  label="이력서 제목"
                  value={resumeForm.title}
                  onChange={updateResumeForm}
                />
                <ResumeField
                  id="target_role"
                  label="지원 직무"
                  value={resumeForm.target_role}
                  onChange={updateResumeForm}
                />
                <div className="md:col-span-2">
                  <ResumeTextField
                    id="memo"
                    label="메모"
                    value={resumeForm.memo}
                    onChange={updateResumeForm}
                    placeholder="이 이력서를 어떤 회사/직무에 쓸지 적어둘 수 있어요."
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">기본정보</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ResumeField
                  id="name"
                  label="이름"
                  value={resumeForm.name}
                  onChange={updateResumeForm}
                  shared
                />
                <ResumeField
                  id="email"
                  label="이메일"
                  value={resumeForm.email}
                  onChange={updateResumeForm}
                  shared
                />
                <ResumeField
                  id="phone"
                  label="전화번호"
                  value={resumeForm.phone}
                  onChange={updateResumeForm}
                  shared
                />
                <ResumeField
                  id="location"
                  label="거주 지역"
                  value={resumeForm.location}
                  onChange={updateResumeForm}
                  shared
                />
                <div className="md:col-span-2">
                  <ResumeField
                    id="headline"
                    label="한 줄 소개"
                    value={resumeForm.headline}
                    onChange={updateResumeForm}
                    placeholder="예: 데이터를 바탕으로 성장을 만드는 마케터"
                    shared
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">구직조건</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <ResumeSelectField
                  id="desired_salary"
                  label="희망 연봉"
                  value={resumeForm.desired_salary}
                  onChange={updateResumeForm}
                  options={SALARY_OPTIONS.map(formatSalaryOption)}
                  placeholder="희망 연봉 선택"
                  shared
                />
                <ResumeMultiSelectField
                  id="preferred_region"
                  label="희망 지역"
                  value={resumeForm.preferred_region}
                  onChange={updateResumeForm}
                  options={WORK_REGIONS}
                  placeholder="희망 지역 선택"
                  shared
                />
                <ResumeMultiSelectField
                  id="employment_type"
                  label="근무 형태"
                  value={resumeForm.employment_type}
                  onChange={updateResumeForm}
                  options={EMPLOYMENT_TYPES}
                  placeholder="근무 형태 선택"
                  shared
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">학력</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <ResumeSchoolField
                  id="education_school"
                  label="학교명"
                  value={resumeForm.education_school}
                  onChange={updateResumeForm}
                  shared
                />
                <ResumeField
                  id="education_major"
                  label="전공"
                  value={resumeForm.education_major}
                  onChange={updateResumeForm}
                  placeholder="예: 경영학과"
                  shared
                />
                <ResumeSelectField
                  id="education_status"
                  label="상태"
                  value={resumeForm.education_status}
                  onChange={updateResumeForm}
                  options={EDUCATION_STATUS_OPTIONS}
                  placeholder="상태 선택"
                  shared
                />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-zinc-900">
                  경력
                  <span className="ml-2 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                    총{" "}
                    {formatDuration(
                      resumeForm.experiences.reduce(
                        (total, experience) => total + experienceMonths(experience),
                        0,
                      ),
                    )}
                  </span>
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addResumeExperience}
                  className="h-8 rounded-xl px-3 text-xs"
                >
                  <FilePlus2 className="mr-1.5 h-3.5 w-3.5" /> 추가
                </Button>
              </div>
              <div className="mt-4 space-y-4">
                {resumeForm.experiences.map((experience, index) => (
                  <div
                    key={experience.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-zinc-500">경력 {index + 1}</p>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-zinc-600">
                          {formatDuration(experienceMonths(experience))}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeResumeExperience(experience.id)}
                          aria-label="경력 삭제"
                          className="h-8 w-8 rounded-full"
                        >
                          <Trash2 className="h-4 w-4 text-zinc-400" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <ResumeLabel htmlFor={`company-${experience.id}`} shared>
                          회사명
                        </ResumeLabel>
                        <Input
                          id={`company-${experience.id}`}
                          value={experience.company}
                          onChange={(e) =>
                            updateResumeExperience(experience.id, "company", e.target.value)
                          }
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <ResumeLabel htmlFor={`role-${experience.id}`} shared>
                          직무/포지션
                        </ResumeLabel>
                        <Input
                          id={`role-${experience.id}`}
                          value={experience.role}
                          onChange={(e) =>
                            updateResumeExperience(experience.id, "role", e.target.value)
                          }
                          className="mt-2"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <ResumeLabel shared>기간</ResumeLabel>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px_auto_1fr_120px]">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1900}
                            max={2100}
                            value={experience.startYear}
                            onChange={(e) =>
                              updateResumeExperience(experience.id, "startYear", e.target.value)
                            }
                            placeholder="시작 년도"
                          />
                          <Select
                            value={experience.startMonth || EMPTY_SELECT_VALUE}
                            onValueChange={(next) =>
                              updateResumeExperience(
                                experience.id,
                                "startMonth",
                                next === EMPTY_SELECT_VALUE ? "" : next,
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="시작 월" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY_SELECT_VALUE}>선택</SelectItem>
                              {MONTH_OPTIONS.map((month) => (
                                <SelectItem key={month} value={month}>
                                  {month}월
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="hidden items-center justify-center text-sm text-zinc-400 sm:flex">
                            ~
                          </span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1900}
                            max={2100}
                            value={experience.endYear}
                            onChange={(e) =>
                              updateResumeExperience(experience.id, "endYear", e.target.value)
                            }
                            placeholder="종료 년도"
                          />
                          <Select
                            value={experience.endMonth || EMPTY_SELECT_VALUE}
                            onValueChange={(next) =>
                              updateResumeExperience(
                                experience.id,
                                "endMonth",
                                next === EMPTY_SELECT_VALUE ? "" : next,
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="종료 월" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY_SELECT_VALUE}>선택</SelectItem>
                              {MONTH_OPTIONS.map((month) => (
                                <SelectItem key={month} value={month}>
                                  {month}월
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <ResumeLabel htmlFor={`experience-description-${experience.id}`} shared>
                          주요 업무/성과
                        </ResumeLabel>
                        <Textarea
                          id={`experience-description-${experience.id}`}
                          value={experience.description}
                          onChange={(e) =>
                            updateResumeExperience(experience.id, "description", e.target.value)
                          }
                          className="mt-2 min-h-24"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">스킬 / 툴</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ResumeField
                  id="skills"
                  label="스킬"
                  value={resumeForm.skills}
                  onChange={updateResumeForm}
                  placeholder="쉼표로 구분"
                  shared
                />
                <ResumeField
                  id="tools"
                  label="툴"
                  value={resumeForm.tools}
                  onChange={updateResumeForm}
                  placeholder="쉼표로 구분"
                  shared
                />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-zinc-900">활동</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addResumeActivity}
                  className="h-8 rounded-xl px-3 text-xs"
                >
                  <FilePlus2 className="mr-1.5 h-3.5 w-3.5" /> 추가
                </Button>
              </div>
              <div className="mt-4 space-y-4">
                {resumeForm.activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-zinc-500">활동 {index + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeResumeActivity(activity.id)}
                        aria-label="활동 삭제"
                        className="h-8 w-8 rounded-full"
                      >
                        <Trash2 className="h-4 w-4 text-zinc-400" />
                      </Button>
                    </div>
                    <div className="grid gap-4">
                      <div>
                        <ResumeLabel htmlFor={`activity-title-${activity.id}`} shared>
                          활동 제목
                        </ResumeLabel>
                        <Input
                          id={`activity-title-${activity.id}`}
                          value={activity.title}
                          onChange={(e) =>
                            updateResumeActivity(activity.id, "title", e.target.value)
                          }
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <ResumeLabel htmlFor={`activity-description-${activity.id}`} shared>
                          활동 내용
                        </ResumeLabel>
                        <Textarea
                          id={`activity-description-${activity.id}`}
                          value={activity.description}
                          onChange={(e) =>
                            updateResumeActivity(activity.id, "description", e.target.value)
                          }
                          className="mt-2 min-h-24"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <DialogFooter className="shrink-0 border-t border-zinc-200 bg-white px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setResumeEditorOpen(false)}
              disabled={savingResume}
            >
              취소
            </Button>
            <Button
              onClick={saveResume}
              disabled={savingResume}
              className="bg-zinc-900 text-white hover:bg-zinc-700"
            >
              {savingResume ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
