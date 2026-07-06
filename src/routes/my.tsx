import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  FilePlus2,
  FileText,
  Pencil,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "내 이력서 — 언커버링" }] }),
  component: MyPage,
});

type JobSeeker = Tables<"job_seekers">;
type Resume = Tables<"resumes">;
type ResumeSource = "manual" | "upload";

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

type JsonRecord = Record<string, Json | undefined>;

const MAX_RESUME_BYTES = 6 * 1024 * 1024;

const EMPTY_FORM: ResumeForm = {
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

function buildBlankForm(userEmail: string, seeker: JobSeeker | null): ResumeForm {
  return {
    ...EMPTY_FORM,
    title: "새 이력서",
    email: seeker?.email ?? userEmail,
    headline: seeker?.one_line_intro ?? "",
    target_role: seeker?.job_interests?.[0] ?? "",
    preferred_region: seeker?.work_regions?.join(", ") ?? "",
    employment_type: seeker?.employment_types?.join(", ") ?? "",
    education: [seeker?.education_level, seeker?.majors?.join(", ")].filter(Boolean).join(" / "),
  };
}

function formFromResume(resume: Resume, userEmail: string, seeker: JobSeeker | null): ResumeForm {
  const basics = asRecord(resume.basics);
  const conditions = asRecord(resume.job_conditions);
  const education = firstRecord(resume.educations);
  const experience = firstRecord(resume.experiences);
  const portfolio = firstRecord(resume.portfolios);

  return {
    ...buildBlankForm(userEmail, seeker),
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

function patchFromForm(
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
        ? [
            {
              title: form.portfolio_title.trim(),
              url: form.portfolio_url.trim(),
            },
          ]
        : [],
  };
}

function ActionCard({
  icon,
  title,
  description,
  action,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex min-h-52 flex-col items-start rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-left transition hover:border-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white">
        {icon}
      </span>
      <strong className="mt-6 text-base font-semibold text-zinc-900">{title}</strong>
      <span className="mt-2 text-sm leading-6 text-zinc-500">{description}</span>
      <span className="mt-auto pt-6 text-sm font-semibold text-zinc-900">{action}</span>
    </button>
  );
}

function Field({
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

function TextField({
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

  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [seeker, setSeeker] = useState<JobSeeker | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingResume, setEditingResume] = useState<Resume | null>(null);
  const [sourceType, setSourceType] = useState<ResumeSource>("manual");
  const [form, setForm] = useState<ResumeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const userEmail = user?.email ?? "";
  const defaultResumeId = useMemo(() => resumes.find((resume) => resume.is_default)?.id, [resumes]);

  const loadPage = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: seekerRow } = await supabase
      .from("job_seekers")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    setHasProfile(!!seekerRow);
    setSeeker(seekerRow);

    if (seekerRow) {
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
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/my" } });
      return;
    }
    void loadPage();
  }, [user, authLoading, navigate, loadPage]);

  const updateForm = (key: keyof ResumeForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openNewResume = () => {
    setEditingResume(null);
    setSourceType("manual");
    setForm(buildBlankForm(userEmail, seeker));
    setEditorOpen(true);
  };

  const openEditor = (resume: Resume) => {
    setEditingResume(resume);
    setSourceType(resume.source_type as ResumeSource);
    setForm(formFromResume(resume, userEmail, seeker));
    setEditorOpen(true);
  };

  const saveResume = async () => {
    if (!user) return;
    setSaving(true);

    const patch = patchFromForm(form);
    const result = editingResume
      ? await supabase.from("resumes").update(patch).eq("id", editingResume.id).select("*").single()
      : await supabase
          .from("resumes")
          .insert({
            ...patch,
            user_id: user.id,
            source_type: sourceType,
            is_default: resumes.length === 0,
          } as TablesInsert<"resumes">)
          .select("*")
          .single();

    setSaving(false);

    if (result.error) {
      toast.error("이력서 저장 중 오류가 발생했어요.");
      return;
    }

    setEditorOpen(false);
    setEditingResume(null);
    await loadPage();
    toast.success("이력서가 저장됐어요.");
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);
    const resumeId = crypto.randomUUID();
    const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_");
    const path = `${user.id}/${resumeId}/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setUploading(false);
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

    setUploading(false);

    if (insertError) {
      await supabase.storage.from("resumes").remove([path]);
      toast.error("업로드한 이력서 정보를 저장하지 못했어요.");
      return;
    }

    await loadPage();
    toast.success("이력서 파일이 업로드됐어요.");
  };

  const makeDefault = async (resumeId: string) => {
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

    await loadPage();
    toast.success("이력서가 삭제됐어요.");
  };

  if (authLoading || loading || hasProfile === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Skeleton className="h-8 w-40" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900">아직 프로필이 없어요</h1>
          <p className="mt-2 text-sm text-zinc-500">
            온보딩을 완료하면 이력서를 만들고 관리할 수 있어요.
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-500">My Resume</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">내 이력서</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            직무와 회사에 맞춰 여러 이력서를 만들어두고, 파일 이력서도 함께 보관할 수 있어요.
          </p>
        </div>
        <Button
          onClick={openNewResume}
          className="h-10 rounded-xl bg-zinc-900 px-4 text-white hover:bg-zinc-700"
        >
          <FilePlus2 className="mr-2 h-4 w-4" /> 새 이력서
        </Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          icon={<FilePlus2 className="h-5 w-5" />}
          title="직접 작성"
          description="기본정보, 경력, 학력, 스킬, 포트폴리오를 입력해서 이력서를 만들어요."
          action="작성 시작"
          onClick={openNewResume}
        />
        <ActionCard
          icon={<Upload className="h-5 w-5" />}
          title="파일 업로드"
          description="이미 만든 PDF, DOC, DOCX 이력서를 올리고 나중에 메모를 추가해요."
          action={uploading ? "업로드 중..." : "파일 선택"}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleUpload}
        />

        {resumes.map((resume) => {
          const basics = asRecord(resume.basics);
          const experience = firstRecord(resume.experiences);
          const isUpload = resume.source_type === "upload";
          return (
            <Card key={resume.id} className="flex min-h-52 flex-col rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => makeDefault(resume.id)}
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
                    onClick={() => openEditor(resume)}
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

              <div className="mt-5">
                <div className="flex flex-wrap items-center gap-2">
                  {resume.is_default && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      기본 이력서
                    </span>
                  )}
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {isUpload ? "파일 업로드" : "직접 작성"}
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-2 text-lg font-bold tracking-tight text-zinc-950">
                  {resume.title}
                </h2>
                <p className="mt-2 line-clamp-1 text-sm text-zinc-500">
                  {resume.target_role ||
                    asString(experience.role) ||
                    asString(basics.headline) ||
                    "직무 미지정"}
                </p>
              </div>

              <div className="mt-auto pt-6 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  수정 {toDateLabel(resume.updated_at)}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {resumes.length === 0 && (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-8 text-center">
          <BriefcaseBusiness className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-sm font-semibold text-zinc-800">아직 등록된 이력서가 없어요</p>
          <p className="mt-1 text-sm text-zinc-500">
            직접 작성하거나 기존 파일을 업로드해서 첫 이력서를 만들어보세요.
          </p>
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
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
                <Field id="title" label="이력서 제목" value={form.title} onChange={updateForm} />
                <Field
                  id="target_role"
                  label="지원 직무"
                  value={form.target_role}
                  onChange={updateForm}
                />
                <div className="md:col-span-2">
                  <TextField
                    id="memo"
                    label="메모"
                    value={form.memo}
                    onChange={updateForm}
                    placeholder="이 이력서를 어떤 회사/직무에 쓸지 적어둘 수 있어요."
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">기본정보</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field id="name" label="이름" value={form.name} onChange={updateForm} />
                <Field id="email" label="이메일" value={form.email} onChange={updateForm} />
                <Field id="phone" label="전화번호" value={form.phone} onChange={updateForm} />
                <Field
                  id="location"
                  label="거주 지역"
                  value={form.location}
                  onChange={updateForm}
                />
                <div className="md:col-span-2">
                  <Field
                    id="headline"
                    label="한 줄 소개"
                    value={form.headline}
                    onChange={updateForm}
                    placeholder="예: 데이터를 바탕으로 성장을 만드는 마케터"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">구직조건</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field
                  id="desired_salary"
                  label="희망 연봉"
                  value={form.desired_salary}
                  onChange={updateForm}
                />
                <Field
                  id="preferred_region"
                  label="희망 지역"
                  value={form.preferred_region}
                  onChange={updateForm}
                />
                <Field
                  id="employment_type"
                  label="근무 형태"
                  value={form.employment_type}
                  onChange={updateForm}
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">학력</h3>
              <div className="mt-4">
                <Field
                  id="education"
                  label="학력 내용"
                  value={form.education}
                  onChange={updateForm}
                  placeholder="예: 연세대학교 경영학과 (2016.02 졸업)"
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">경력</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field id="company" label="회사명" value={form.company} onChange={updateForm} />
                <Field id="role" label="직무/포지션" value={form.role} onChange={updateForm} />
                <Field id="period" label="기간" value={form.period} onChange={updateForm} />
                <div className="md:col-span-3">
                  <TextField
                    id="experience_description"
                    label="주요 업무/성과"
                    value={form.experience_description}
                    onChange={updateForm}
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">스킬 / 툴</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field
                  id="skills"
                  label="스킬"
                  value={form.skills}
                  onChange={updateForm}
                  placeholder="쉼표로 구분"
                />
                <Field
                  id="tools"
                  label="툴"
                  value={form.tools}
                  onChange={updateForm}
                  placeholder="쉼표로 구분"
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-zinc-900">포트폴리오</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field
                  id="portfolio_title"
                  label="포트폴리오 제목"
                  value={form.portfolio_title}
                  onChange={updateForm}
                />
                <Field
                  id="portfolio_url"
                  label="URL"
                  value={form.portfolio_url}
                  onChange={updateForm}
                />
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              취소
            </Button>
            <Button
              onClick={saveResume}
              disabled={saving}
              className="bg-zinc-900 text-white hover:bg-zinc-700"
            >
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
