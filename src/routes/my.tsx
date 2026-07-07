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
  FilePlus2,
  Pencil,
  Star,
  Trash2,
  Upload,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
} from "@/lib/profile-fields";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "프로필 — 언커버링" }] }),
  component: MyPage,
});

type ExternalLinks = { github?: string; portfolio?: string; linkedin?: string };

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
  company: string;
  role: string;
  period: string;
  experience_description: string;
  skills: string;
  tools: string;
  portfolio_title: string;
  portfolio_url: string;
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_BYTES = 6 * 1024 * 1024;

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
  company: "",
  role: "",
  period: "",
  experience_description: "",
  skills: "",
  tools: "",
  portfolio_title: "",
  portfolio_url: "",
};

type SectionKey = "education" | "jobInterests" | "companyInterests" | "workPreference";

type ProfileFieldsProps = {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
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
  onEdit,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  onEdit: () => void;
}) {
  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <Icon className="h-4 w-4 text-zinc-400" />
          {label}
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${label} 수정`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

const LINK_PILL_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900";

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

function asString(value: Json | undefined) {
  return typeof value === "string" ? value : "";
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

function buildBlankResumeForm(userEmail: string, seeker: JobSeeker | null): ResumeForm {
  return {
    ...EMPTY_RESUME_FORM,
    title: "새 이력서",
    email: seeker?.email ?? userEmail,
    headline: seeker?.one_line_intro ?? "",
    target_role: seeker?.job_interests?.[0] ?? "",
    preferred_region: seeker?.work_regions?.join(", ") ?? "",
    employment_type: seeker?.employment_types?.join(", ") ?? "",
    education: [seeker?.university_name, seeker?.education_level, seeker?.majors?.join(", ")]
      .filter(Boolean)
      .join(" / "),
  };
}

function formFromResume(resume: Resume, userEmail: string, seeker: JobSeeker | null): ResumeForm {
  const basics = asRecord(resume.basics);
  const conditions = asRecord(resume.job_conditions);
  const education = firstRecord(resume.educations);
  const experience = firstRecord(resume.experiences);
  const portfolio = firstRecord(resume.portfolios);

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
    employment_type: asString(conditions.employment_type),
    education: asString(education.description),
    company: asString(experience.company),
    role: asString(experience.role),
    period: asString(experience.period),
    experience_description: asString(experience.description),
    skills: resume.skills.join(", "),
    tools: resume.tools.join(", "),
    portfolio_title: asString(portfolio.title),
    portfolio_url: asString(portfolio.url),
  };
}

function patchFromResumeForm(
  form: ResumeForm,
): Omit<TablesUpdate<"resumes">, "id" | "user_id" | "created_at" | "updated_at"> {
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
      employment_type: form.employment_type.trim(),
    },
    educations: form.education.trim() ? [{ description: form.education.trim() }] : [],
    experiences:
      form.company.trim() ||
      form.role.trim() ||
      form.period.trim() ||
      form.experience_description.trim()
        ? [
            {
              company: form.company.trim(),
              role: form.role.trim(),
              period: form.period.trim(),
              description: form.experience_description.trim(),
            },
          ]
        : [],
    skills: splitTags(form.skills),
    tools: splitTags(form.tools),
    portfolios:
      form.portfolio_title.trim() || form.portfolio_url.trim()
        ? [{ title: form.portfolio_title.trim(), url: form.portfolio_url.trim() }]
        : [],
  };
}

function ResumeField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: keyof ResumeForm;
  label: string;
  value: string;
  onChange: (id: keyof ResumeForm, value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
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
}: {
  id: keyof ResumeForm;
  label: string;
  value: string;
  onChange: (id: keyof ResumeForm, value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
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

function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [seeker, setSeeker] = useState<JobSeeker | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [oneLineIntro, setOneLineIntro] = useState("");
  const [links, setLinks] = useState<ExternalLinks>({});
  const [profileForm, setProfileFormRaw] = useState<ProfileFormData>(INITIAL_PROFILE_FORM);

  const [editingProfileCard, setEditingProfileCard] = useState(false);
  const [savingProfileCard, setSavingProfileCard] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [savingSection, setSavingSection] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftIntro, setDraftIntro] = useState("");
  const [draftLinks, setDraftLinks] = useState<ExternalLinks>({});
  const [draftForm, setDraftFormRaw] = useState<ProfileFormData>(INITIAL_PROFILE_FORM);

  const [discoverySaving, setDiscoverySaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [history, setHistory] = useState<CompletedSimulation[] | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
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

  const refreshResumes = useCallback(async () => {
    if (!user) return;
    setResumesLoading(true);
    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("이력서를 불러오지 못했어요. Supabase SQL 적용 여부를 확인해주세요.");
    } else {
      setResumes(data ?? []);
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
      setDisplayName(seeker?.display_name ?? fallbackDisplayName(user.email ?? ""));
      setOneLineIntro(seeker?.one_line_intro ?? "");
      setLinks((seeker?.external_links as ExternalLinks) ?? {});
      setAvatarUrl(seeker?.avatar_url ?? null);
      setProfileFormRaw({
        university_name: seeker?.university_name ?? "",
        education_level: seeker?.education_level ?? "",
        majors: seeker?.majors ?? [],
        academic_mark: seeker?.academic_mark != null ? String(seeker.academic_mark) : "",
        job_interests: seeker?.job_interests ?? [],
        company_interests: seeker?.company_interests ?? [],
        work_regions: seeker?.work_regions ?? [],
        employment_types: seeker?.employment_types ?? [],
        willing_to_relocate: seeker?.willing_to_relocate ?? false,
        discovery_consent: seeker?.discovery_consent ?? false,
      });
      if (seeker) {
        await refreshResumes();
      } else {
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
      setHistory(
        rows.map((r) => ({
          submissionId: r.id,
          title: r.job_simulations?.title ?? "",
          companyName: r.job_simulations?.companies?.name ?? "",
          submittedAt: r.submitted_at,
        })),
      );
    })();
  }, [user, authLoading, navigate, refreshResumes]);

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

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

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
    toast.success(next ? "채용 제안 받기로 변경됐어요." : "채용 제안 받기를 해제했어요.");
  };

  const startEditProfileCard = () => {
    setDraftDisplayName(displayName);
    setDraftIntro(oneLineIntro);
    setDraftLinks(links);
    setEditingProfileCard(true);
  };

  const cancelEditProfileCard = () => {
    setEditingProfileCard(false);
  };

  const saveProfileCard = async () => {
    if (!user) return;

    setSavingProfileCard(true);
    const patch: TablesUpdate<"job_seekers"> = {
      display_name: draftDisplayName.trim() || null,
      one_line_intro: draftIntro || null,
      external_links: draftLinks,
    };
    const { error } = await supabase.from("job_seekers").update(patch).eq("id", user.id);
    setSavingProfileCard(false);

    if (error) {
      toast.error("저장 중 오류가 발생했어요.");
      return;
    }

    setDisplayName(draftDisplayName.trim() || fallbackDisplayName(userEmail));
    setOneLineIntro(draftIntro);
    setLinks(draftLinks);
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

    setProfileFormRaw((prev) => ({ ...prev, ...draftForm }));
    setEditingSection(null);
    toast.success("저장됐어요.");
  };

  const renderSectionEditor = (sectionKey: SectionKey) => {
    const section = PROFILE_SECTIONS.find((item) => item.key === sectionKey);
    if (!section) return null;

    const SectionComponent = section.Component;
    return (
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <SectionComponent data={draftForm} setData={setDraftForm} />
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

    setResumes((prev) => prev.map((resume) => ({ ...resume, is_default: resume.id === resumeId })));
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
                  {links.github && (
                    <a
                      href={links.github}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK_PILL_CLASS}
                    >
                      <Github className="h-3.5 w-3.5" /> GitHub
                    </a>
                  )}
                  {links.portfolio && (
                    <a
                      href={links.portfolio}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK_PILL_CLASS}
                    >
                      <Globe className="h-3.5 w-3.5" /> 포트폴리오
                    </a>
                  )}
                  {links.linkedin && (
                    <a
                      href={links.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK_PILL_CLASS}
                    >
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
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
            onEdit={() => startEditSection("education")}
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
            onEdit={() => startEditSection("jobInterests")}
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
            onEdit={() => startEditSection("companyInterests")}
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
            onEdit={() => startEditSection("workPreference")}
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
              기본정보, 경력, 학력, 스킬, 포트폴리오를 입력해요.
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
              const basics = asRecord(resume.basics);
              const experience = firstRecord(resume.experiences);
              const isUpload = resume.source_type === "upload";

              return (
                <Card key={resume.id} className="flex min-h-44 flex-col rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => makeDefaultResume(resume.id)}
                        aria-label="기본 이력서 설정"
                        className="h-8 w-8 rounded-full"
                      >
                        {resume.is_default ? (
                          <Check className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Star className="h-4 w-4 text-zinc-400" />
                        )}
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
                    <div className="flex flex-wrap items-center gap-2">
                      {resume.is_default && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          기본
                        </span>
                      )}
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                        {isUpload ? "파일" : "작성"}
                      </span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-base font-bold text-zinc-900">
                      {resume.title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                      {resume.target_role ||
                        asString(experience.role) ||
                        asString(basics.headline) ||
                        "직무 미지정"}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 pt-5 text-xs text-zinc-400">
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

      <Dialog open={resumeEditorOpen} onOpenChange={setResumeEditorOpen}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResume ? "이력서 수정" : "새 이력서 작성"}</DialogTitle>
            <DialogDescription>
              회사나 직무별로 다른 내용을 저장할 수 있어요. 비어 있는 항목은 저장해도 괜찮아요.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-8 py-2">
            <section>
              <h3 className="text-sm font-bold text-zinc-900">이력서 정보</h3>
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
                />
                <ResumeField
                  id="email"
                  label="이메일"
                  value={resumeForm.email}
                  onChange={updateResumeForm}
                />
                <ResumeField
                  id="phone"
                  label="전화번호"
                  value={resumeForm.phone}
                  onChange={updateResumeForm}
                />
                <ResumeField
                  id="location"
                  label="거주 지역"
                  value={resumeForm.location}
                  onChange={updateResumeForm}
                />
                <div className="md:col-span-2">
                  <ResumeField
                    id="headline"
                    label="한 줄 소개"
                    value={resumeForm.headline}
                    onChange={updateResumeForm}
                    placeholder="예: 데이터를 바탕으로 성장을 만드는 마케터"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">구직조건</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <ResumeField
                  id="desired_salary"
                  label="희망 연봉"
                  value={resumeForm.desired_salary}
                  onChange={updateResumeForm}
                />
                <ResumeField
                  id="preferred_region"
                  label="희망 지역"
                  value={resumeForm.preferred_region}
                  onChange={updateResumeForm}
                />
                <ResumeField
                  id="employment_type"
                  label="근무 형태"
                  value={resumeForm.employment_type}
                  onChange={updateResumeForm}
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">학력</h3>
              <div className="mt-4">
                <ResumeField
                  id="education"
                  label="학력 내용"
                  value={resumeForm.education}
                  onChange={updateResumeForm}
                  placeholder="예: 연세대학교 경영학과 (2016.02 졸업)"
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">경력</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <ResumeField
                  id="company"
                  label="회사명"
                  value={resumeForm.company}
                  onChange={updateResumeForm}
                />
                <ResumeField
                  id="role"
                  label="직무/포지션"
                  value={resumeForm.role}
                  onChange={updateResumeForm}
                />
                <ResumeField
                  id="period"
                  label="기간"
                  value={resumeForm.period}
                  onChange={updateResumeForm}
                />
                <div className="md:col-span-3">
                  <ResumeTextField
                    id="experience_description"
                    label="주요 업무/성과"
                    value={resumeForm.experience_description}
                    onChange={updateResumeForm}
                  />
                </div>
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
                />
                <ResumeField
                  id="tools"
                  label="툴"
                  value={resumeForm.tools}
                  onChange={updateResumeForm}
                  placeholder="쉼표로 구분"
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">포트폴리오</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ResumeField
                  id="portfolio_title"
                  label="포트폴리오 제목"
                  value={resumeForm.portfolio_title}
                  onChange={updateResumeForm}
                />
                <ResumeField
                  id="portfolio_url"
                  label="URL"
                  value={resumeForm.portfolio_url}
                  onChange={updateResumeForm}
                />
              </div>
            </section>
          </div>

          <DialogFooter>
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
