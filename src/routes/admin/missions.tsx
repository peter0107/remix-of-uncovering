import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Plus,
  Search,
  UserCheck,
  MoreHorizontal,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createOfficialMission,
  deleteMission,
  DIFFICULTY_LABEL,
  DIFFICULTY_TONE,
  EXPERIENCE_OPTIONS,
  experienceLabel,
  COMPANY_SIZES,
  listMissions,
  normalizeWizardSteps,
  type MaterialBlock,
  type MissionQuestion,
  type Mission,
  type MissionContentMode,
  type MissionDifficulty,
  type MissionStatus,
  type WizardStep,
  STATUS_LABEL,
  STATUS_TONE,
  updateMission,
} from "@/lib/missions";
import { getCompetencyName, COMPETENCY_GROUPS } from "@/data/competencies";
import { JOBS } from "@/data/jobs";
import { JOB_CATEGORIES, INDUSTRIES } from "@/data/jobCategories";
import { listCustomJobs, type CustomJob } from "@/lib/customJobs";
import { Separator } from "@/components/ui/separator";
import { Plus as PlusIcon, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MaterialBlocksEditor } from "@/components/admin/MaterialBlocksEditor";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { WizardStepsEditor } from "@/components/admin/WizardStepsEditor";
import {
  missionWizardIntroHtml,
  normalizeRichTextHtml,
  plainTextToRichTextHtml,
  wizardStepBodyHtml,
} from "@/lib/rich-text";

export const Route = createFileRoute("/admin/missions")({
  head: () => ({ meta: [{ title: "시뮬레이션 관리 — beginner" }] }),
  component: MissionsAdminPage,
});

function getJobName(slug: string) {
  return JOBS.find((j) => j.slug === slug)?.name ?? slug;
}

const STATUS_TABS: { key: "all" | MissionStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "published", label: "공개 중" },
  { key: "private", label: "비공개" },
  { key: "draft", label: "임시저장" },
  { key: "expert_submitted", label: "현직자 제출" },
  { key: "review_pending", label: "검토 대기" },
];

type FormState = {
  // 기본정보
  title: string;
  job_slug: string;
  job_name: string;
  job_category: string;
  content_mode: MissionContentMode;
  industries: string[];
  author_name: string;
  status: MissionStatus;
  duration_min: number;
  difficulty: MissionDifficulty;
  description: string;
  // 시뮬레이션 내용
  situation: string;
  material_blocks: MaterialBlock[];
  questions: MissionQuestion[];
  wizard_intro_html: string;
  wizard_intro_blocks: MaterialBlock[];
  wizard_steps: WizardStep[];
  // 직전 요약
  summary_title: string;
  summary_description: string;
  recommended_for: string;
  included_results_text: string;
  mission_steps_text: string;
  preview_notice: string;
  locked_preview_text: string;
  sample_answer: string;
  expert_comment_html: string;
  offline_activity_html: string;
  // 현직자 정보
  author_role: string;
  years_experience: number;
  company_size: string;
  submitted_competencies_text: string;
  is_expert_authored: boolean;
};

const EMPTY_FORM: FormState = {
  title: "",
  job_slug: "",
  job_name: "",
  job_category: "",
  content_mode: "legacy",
  industries: [],
  author_name: "Beginner 공식",
  status: "draft",
  duration_min: 25,
  difficulty: "medium",
  description: "",
  situation: "",
  material_blocks: [],
  questions: [],
  wizard_intro_html: "",
  wizard_intro_blocks: [],
  wizard_steps: [],
  summary_title: "",
  summary_description: "",
  recommended_for: "",
  included_results_text: "",
  mission_steps_text: "",
  preview_notice: "",
  locked_preview_text: "",
  sample_answer: "",
  expert_comment_html: "",
  offline_activity_html: "",
  author_role: "",
  years_experience: 0,
  company_size: "",
  submitted_competencies_text: "",
  is_expert_authored: false,
};

const splitLines = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
const splitCommas = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function MissionsAdminPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [customJobs, setCustomJobs] = useState<CustomJob[]>([]);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("__all");
  const [editing, setEditing] = useState<Mission | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // 합쳐진 직무 옵션 (built-in + 관리자 추가)
  const jobOptions = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>();
    for (const j of JOBS) map.set(j.slug, { slug: j.slug, name: j.name });
    for (const j of customJobs) map.set(j.slug, { slug: j.slug, name: j.name });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [customJobs]);

  function jobNameOf(slug: string) {
    return jobOptions.find((j) => j.slug === slug)?.name ?? getJobName(slug);
  }

  async function refresh() {
    try {
      const [m, cj] = await Promise.all([listMissions(), listCustomJobs()]);
      setMissions(m);
      setCustomJobs(cj);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`admin-missions-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_jobs" }, () =>
        refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: missions.length };
    for (const m of missions) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [missions]);

  const jobs = useMemo(
    () =>
      Array.from(
        new Set(missions.map((m) => m.job_slug).filter((s): s is string => !!s && s.trim() !== "")),
      ).sort(),
    [missions],
  );

  const filtered = useMemo(() => {
    return missions.filter((m) => {
      if (tab !== "all" && m.status !== tab) return false;
      if (jobFilter !== "__all" && m.job_slug !== jobFilter) return false;
      if (
        query &&
        !`${m.title} ${m.job_slug} ${m.author_name}`.toLowerCase().includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [missions, tab, jobFilter, query]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  }

  function openEdit(m: Mission) {
    setEditing(m);
    setCreating(true);
  }

  useEffect(() => {
    if (!creating) return;
    if (!editing) return;

    const isReview = editing.status === "expert_submitted" || editing.status === "review_pending";
    if (isReview) {
      setForm({
        ...EMPTY_FORM,
        title: "",
        job_slug: "",
        job_name: "",
        author_name: "Beginner 공식",
        status: "draft",
        duration_min: 25,
        difficulty: "medium",
        wizard_intro_html: "",
      });
      return;
    }

    setForm({
      title: editing.title,
      job_slug: editing.job_slug,
      job_name: getJobName(editing.job_slug),
      job_category: editing.job_category ?? "",
      content_mode: editing.content_mode ?? "legacy",
      industries: editing.industries ?? [],
      author_name: editing.author_name,
      status: editing.status,
      duration_min: editing.duration_min,
      difficulty: editing.difficulty,
      description: editing.description ?? "",
      situation: editing.situation ?? "",
      material_blocks: editing.material_blocks ?? [],
      questions: (editing.questions ?? []).map((q) => ({ ...q, guide: q.guide ?? "" })),
      wizard_intro_html: missionWizardIntroHtml(editing),
      wizard_intro_blocks: editing.wizard_intro_blocks ?? [],
      wizard_steps: (editing.wizard_steps ?? []).map((step) => ({
        ...step,
        body_html: wizardStepBodyHtml(step),
      })),
      summary_title: editing.summary_title ?? "",
      summary_description: editing.summary_description ?? "",
      recommended_for: editing.recommended_for ?? "",
      included_results_text: (editing.included_results ?? []).join("\n"),
      mission_steps_text: (editing.mission_steps ?? []).join("\n"),
      preview_notice: editing.preview_notice ?? "",
      locked_preview_text: editing.locked_preview_text ?? "",
      sample_answer:
        normalizeRichTextHtml(editing.sample_answer) ??
        plainTextToRichTextHtml(editing.sample_answer) ??
        "",
      expert_comment_html:
        normalizeRichTextHtml(editing.expert_comment_html) ??
        plainTextToRichTextHtml(editing.expert_comment_html) ??
        "",
      offline_activity_html:
        normalizeRichTextHtml(editing.offline_activity_html) ??
        plainTextToRichTextHtml(editing.offline_activity_html) ??
        "",
      author_role: editing.author_role ?? "",
      years_experience: editing.years_experience ?? 0,
      company_size: editing.company_size ?? "",
      submitted_competencies_text: (editing.submitted_competencies ?? []).join(", "),
      is_expert_authored: editing.is_expert_authored ?? false,
    });
  }, [creating, editing]);

  function buildPayload() {
    return {
      title: form.title,
      job_slug: form.job_slug,
      job_category: form.job_category || null,
      content_mode: form.content_mode,
      industries: form.industries,
      author_name: form.author_name,
      status: form.status,
      duration_min: form.duration_min,
      difficulty: form.difficulty,
      description: form.description || null,
      situation: form.content_mode === "legacy" ? form.situation || null : null,
      data_points: [],
      material_blocks:
        form.content_mode === "legacy"
          ? form.material_blocks.map((b, i) => ({ ...b, order: i }))
          : [],
      questions:
        form.content_mode === "legacy"
          ? form.questions
              .filter((q) => q.label.trim())
              .map((q) => ({ id: q.id, label: q.label, guide: q.guide ?? "" }))
          : [],
      wizard_intro_html:
        form.content_mode === "step_wizard" ? normalizeRichTextHtml(form.wizard_intro_html) : null,
      wizard_intro_blocks:
        form.content_mode === "step_wizard"
          ? form.wizard_intro_blocks.map((b, i) => ({ ...b, order: i }))
          : [],
      wizard_steps:
        form.content_mode === "step_wizard"
          ? normalizeWizardSteps(
              form.wizard_steps.map((step) => ({
                ...step,
                body_html: normalizeRichTextHtml(step.body_html ?? ""),
                content_blocks: step.content_blocks.map((b, i) => ({ ...b, order: i })),
                prompts: step.prompts
                  .filter((prompt) => prompt.label.trim())
                  .map((prompt) => ({
                    ...prompt,
                    input_type: "textarea",
                    guide: prompt.guide ?? "",
                    options: [],
                  })),
              })),
            )
          : [],
      summary_title: form.summary_title || null,
      summary_description: form.summary_description || null,
      recommended_for: form.recommended_for || null,
      included_results: splitLines(form.included_results_text),
      mission_steps:
        form.content_mode === "step_wizard" && splitLines(form.mission_steps_text).length === 0
          ? form.wizard_steps.map((step) => step.title).filter(Boolean)
          : splitLines(form.mission_steps_text),
      preview_notice: form.preview_notice || null,
      locked_preview_text: form.locked_preview_text || null,
      sample_answer: normalizeRichTextHtml(form.sample_answer),
      expert_comment_html: normalizeRichTextHtml(form.expert_comment_html),
      offline_activity_html: normalizeRichTextHtml(form.offline_activity_html),
      author_role: form.author_role || null,
      years_experience: Number(form.years_experience) || null,
      company_size: form.company_size || null,
      submitted_competencies: splitCommas(form.submitted_competencies_text),
      is_expert_authored: form.is_expert_authored,
    };
  }

  async function save() {
    if (!form.title.trim() || !form.job_slug.trim()) {
      toast.error("제목과 직무는 필수입니다.");
      return;
    }
    try {
      const payload = buildPayload();
      if (editing) {
        await updateMission(editing.id, payload);
        toast.success("시뮬레이션이 수정되었습니다.");
      } else {
        await createOfficialMission(payload);
        toast.success("시뮬레이션이 추가되었습니다.");
      }
      setCreating(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function changeStatus(m: Mission, status: MissionStatus) {
    try {
      await updateMission(m.id, { status });
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(m: Mission) {
    if (!confirm(`'${m.title}' 시뮬레이션을 삭제하시겠습니까?`)) return;
    try {
      await deleteMission(m.id);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="block min-h-screen bg-muted/30 lg:flex">
      <AdminSidebar />

      {/* Main */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary sm:text-2xl">시뮬레이션 목록</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                등록된 시뮬레이션을 관리하고 공개 상태를 설정할 수 있습니다.
              </p>
            </div>
            <Button
              onClick={openCreate}
              style={{ backgroundColor: "#008f8f" }}
              className="w-full text-white hover:opacity-90 sm:w-auto"
            >
              <Plus className="h-4 w-4" /> 시뮬레이션 추가
            </Button>
          </div>

          {(counts.review_pending ?? 0) + (counts.expert_submitted ?? 0) > 0 &&
            tab !== "review_pending" &&
            tab !== "expert_submitted" && (
              <button
                onClick={() => setTab("review_pending")}
                className="mt-5 flex w-full items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-left transition-colors hover:bg-rose-100"
              >
                <div>
                  <div className="text-sm font-semibold text-rose-700">
                    현직자 제출 검토 대기{" "}
                    {(counts.review_pending ?? 0) + (counts.expert_submitted ?? 0)}건
                  </div>
                  <div className="mt-0.5 text-xs text-rose-600/80">
                    클릭하면 검토 대기 시뮬레이션만 모아서 확인할 수 있어요.
                  </div>
                </div>
                <span className="text-sm font-medium text-rose-700">→</span>
              </button>
            )}

          {/* Tabs */}
          <div className="mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {STATUS_TABS.map((t) => {
              const active = tab === t.key;
              const count = counts[t.key] ?? 0;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-brand-soft/60 font-semibold text-brand"
                      : "text-foreground/70 hover:bg-muted"
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white text-brand" : "bg-muted text-muted-foreground"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="mt-4 grid gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목, 직무, 작성자로 검색"
                className="h-10 pl-9"
              />
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="직무 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">직무 전체</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j} value={j}>
                    {getJobName(j)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-10"
              onClick={() => {
                setQuery("");
                setJobFilter("__all");
                setTab("all");
              }}
            >
              초기화
            </Button>
          </div>

          {/* Table (desktop) */}
          <div className="mt-4 hidden overflow-hidden rounded-xl border border-border bg-background md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 py-3">시뮬레이션 제목</TableHead>
                  <TableHead>직무</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>시간</TableHead>
                  <TableHead>난이도</TableHead>
                  <TableHead>업데이트</TableHead>
                  <TableHead className="text-right pr-5">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-16 text-center text-sm text-muted-foreground"
                    >
                      조건에 맞는 시뮬레이션이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="px-5 py-4 font-semibold text-primary">
                      {m.title}
                    </TableCell>
                    <TableCell className="text-foreground/80">{jobNameOf(m.job_slug)}</TableCell>
                    <TableCell className="text-foreground/80">{m.author_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${STATUS_TONE[m.status]} border-0`}>
                        {STATUS_LABEL[m.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground/80">{m.duration_min}분</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`${DIFFICULTY_TONE[m.difficulty]} border-0`}
                      >
                        {DIFFICULTY_LABEL[m.difficulty]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground/70">{fmt(m.updated_at)}</TableCell>
                    <TableCell className="pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                          {m.status === "review_pending" || m.status === "expert_submitted"
                            ? "검토"
                            : "수정"}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {m.status !== "published" && (
                              <DropdownMenuItem onClick={() => changeStatus(m, "published")}>
                                <Eye className="h-4 w-4" /> 공개로 전환
                              </DropdownMenuItem>
                            )}
                            {m.status !== "private" && (
                              <DropdownMenuItem onClick={() => changeStatus(m, "private")}>
                                <EyeOff className="h-4 w-4" /> 비공개로 전환
                              </DropdownMenuItem>
                            )}
                            {(m.status === "expert_submitted" || m.status === "review_pending") && (
                              <DropdownMenuItem onClick={() => changeStatus(m, "published")}>
                                <CheckCircle2 className="h-4 w-4" /> 검수 승인 후 공개
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => remove(m)}
                            >
                              <Trash2 className="h-4 w-4" /> 삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Card list (mobile) */}
          <div className="mt-4 space-y-3 md:hidden">
            {filtered.length === 0 && (
              <div className="rounded-xl border border-border bg-background py-10 text-center text-sm text-muted-foreground">
                조건에 맞는 시뮬레이션이 없습니다.
              </div>
            )}
            {filtered.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-primary">{m.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {jobNameOf(m.job_slug)} · {m.author_name}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {m.status !== "published" && (
                        <DropdownMenuItem onClick={() => changeStatus(m, "published")}>
                          <Eye className="h-4 w-4" /> 공개로 전환
                        </DropdownMenuItem>
                      )}
                      {m.status !== "private" && (
                        <DropdownMenuItem onClick={() => changeStatus(m, "private")}>
                          <EyeOff className="h-4 w-4" /> 비공개로 전환
                        </DropdownMenuItem>
                      )}
                      {(m.status === "expert_submitted" || m.status === "review_pending") && (
                        <DropdownMenuItem onClick={() => changeStatus(m, "published")}>
                          <CheckCircle2 className="h-4 w-4" /> 검수 승인 후 공개
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => remove(m)}
                      >
                        <Trash2 className="h-4 w-4" /> 삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className={`${STATUS_TONE[m.status]} border-0`}>
                    {STATUS_LABEL[m.status]}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`${DIFFICULTY_TONE[m.difficulty]} border-0`}
                  >
                    {DIFFICULTY_LABEL[m.difficulty]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{m.duration_min}분</span>
                  <span className="text-xs text-muted-foreground">· {fmt(m.updated_at)}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => openEdit(m)}
                >
                  {m.status === "review_pending" || m.status === "expert_submitted"
                    ? "검토"
                    : "수정"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Dialog
        open={creating}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="flex w-[min(96vw,1600px)] max-w-none max-h-[94vh] flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
            <DialogTitle>
              {editing
                ? editing.status === "expert_submitted" || editing.status === "review_pending"
                  ? "현직자 제출 시뮬레이션 검토"
                  : "시뮬레이션 수정"
                : "새 시뮬레이션 추가"}
            </DialogTitle>
          </DialogHeader>

          {/* 제출 요약은 하단으로 이동 */}

          <div className="grid flex-1 gap-6 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {/* 기본정보 */}
            <section className="grid gap-3">
              <h3 className="font-bold text-primary text-base">기본정보</h3>
              <Separator />
              <div className="grid gap-2">
                <Label>시뮬레이션 제목</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>설명</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>직무</Label>
                <Select
                  value={form.job_slug || undefined}
                  onValueChange={(v) => {
                    const cat = customJobs.find((c) => c.slug === v)?.category_id ?? "";
                    setForm({ ...form, job_slug: v, job_category: cat });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="직무 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobOptions.map((j) => (
                      <SelectItem key={j.slug} value={j.slug}>
                        {j.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>콘텐츠 방식</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "legacy" as const, label: "기존형" },
                    { id: "step_wizard" as const, label: "단계형 위저드" },
                  ].map((mode) => {
                    const active = form.content_mode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setForm({ ...form, content_mode: mode.id })}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "border-brand bg-brand text-white"
                            : "border-border bg-background text-foreground/70 hover:border-brand/40"
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>산업군 (다중 선택)</Label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.filter((i) => i.id !== "all").map((ind) => {
                    const active = form.industries.includes(ind.id);
                    return (
                      <button
                        type="button"
                        key={ind.id}
                        onClick={() =>
                          setForm({
                            ...form,
                            industries: active
                              ? form.industries.filter((x) => x !== ind.id)
                              : [...form.industries, ind.id],
                          })
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "border-brand bg-brand text-white"
                            : "border-border bg-background text-foreground/70 hover:border-brand/40"
                        }`}
                      >
                        {ind.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>작성자</Label>
                <Input
                  value={form.author_name}
                  onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                />
              </div>
              <label className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-brand"
                  checked={form.is_expert_authored}
                  onChange={(e) => setForm({ ...form, is_expert_authored: e.target.checked })}
                />
                <div>
                  <div className="font-medium text-primary">현직자 제작 시뮬레이션으로 표시</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    체크하면 사용자에게 보라색 "현직자" 뱃지로 표시됩니다. 현직자 제출 폼을 거치지
                    않은 시뮬레이션도 직접 마킹할 수 있어요.
                  </div>
                </div>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>상태</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as MissionStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as MissionStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>예상 시간(분)</Label>
                  <Input
                    type="number"
                    min={5}
                    value={form.duration_min}
                    onChange={(e) =>
                      setForm({ ...form, duration_min: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>난이도</Label>
                  <Select
                    value={form.difficulty}
                    onValueChange={(v) => setForm({ ...form, difficulty: v as MissionDifficulty })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DIFFICULTY_LABEL) as MissionDifficulty[]).map((d) => (
                        <SelectItem key={d} value={d}>
                          {DIFFICULTY_LABEL[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {form.content_mode === "legacy" ? (
              <>
                {/* 시뮬레이션 내용 */}
                <section className="grid gap-3">
                  <h3 className="font-bold text-primary text-base">시뮬레이션 내용</h3>
                  <Separator />
                  <div className="grid gap-2">
                    <Label>상황 (situation)</Label>
                    <Textarea
                      rows={4}
                      value={form.situation}
                      onChange={(e) => setForm({ ...form, situation: e.target.value })}
                      placeholder="시뮬레이션의 배경/상황을 설명해주세요."
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>제공 자료 블록</Label>
                      <span className="text-xs text-muted-foreground">
                        {form.material_blocks.length}개
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      필요한 자료 유형을 골라 블록으로 추가하세요. 블록은 순서대로 사용자에게
                      표시됩니다.
                    </p>
                    <MaterialBlocksEditor
                      value={form.material_blocks}
                      onChange={(next) => setForm({ ...form, material_blocks: next })}
                    />
                  </div>
                </section>

                {/* 제출 항목 */}
                <section className="grid gap-3">
                  <h3 className="font-bold text-primary text-base">제출 항목</h3>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    사용자가 파일 형식으로 제출하게 됩니다. 각 항목별 작성 가이드를 남겨주세요.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/70">
                      현재 {form.questions.length}개 항목
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm({
                          ...form,
                          questions: [
                            ...form.questions,
                            {
                              id: `q${form.questions.length + 1}`,
                              label: "",
                              guide: "",
                            },
                          ],
                        })
                      }
                    >
                      <PlusIcon className="h-3.5 w-3.5" /> 제출 항목 추가
                    </Button>
                  </div>
                  {form.questions.length === 0 && (
                    <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      아직 제출 항목이 없습니다.
                    </p>
                  )}
                  {form.questions.map((q, i) => (
                    <div
                      key={i}
                      className="grid gap-2 rounded-xl border border-border bg-background p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-soft/50 text-xs font-bold text-brand">
                          {i + 1}
                        </span>
                        <Input
                          value={q.label}
                          onChange={(e) => {
                            const next = [...form.questions];
                            next[i] = { ...next[i], label: e.target.value };
                            setForm({ ...form, questions: next });
                          }}
                          placeholder="제출 항목 제목 (예: 문제 상황 요약)"
                          className="h-9 flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            setForm({
                              ...form,
                              questions: form.questions.filter((_, idx) => idx !== i),
                            })
                          }
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        rows={2}
                        value={q.guide ?? ""}
                        onChange={(e) => {
                          const next = [...form.questions];
                          next[i] = { ...next[i], guide: e.target.value };
                          setForm({ ...form, questions: next });
                        }}
                        placeholder="작성 가이드 (예: 사용자가 어떤 순간에 망설이거나 이탈하는지 핵심 문제 상황을 간단히 정리해주세요.)"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">ID</span>
                        <Input
                          value={q.id}
                          onChange={(e) => {
                            const next = [...form.questions];
                            next[i] = { ...next[i], id: e.target.value };
                            setForm({ ...form, questions: next });
                          }}
                          className="h-7 w-32 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </section>
              </>
            ) : (
              <>
                <section className="grid gap-3">
                  <h3 className="font-bold text-primary text-base">도입 페이지</h3>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    직무 소개, 배경지식, 용어 정리처럼 Step 1 전에 보여줄 내용을 문서 편집기처럼
                    작성하세요.
                  </p>
                  <RichTextEditor
                    value={form.wizard_intro_html}
                    onChange={(next) => setForm({ ...form, wizard_intro_html: next })}
                    placeholder="직무 소개, 배경 지식, 용어 정리 등을 일반 문서처럼 작성하세요."
                    minHeightClassName="min-h-[340px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    저장 후 사용자 화면에서는 이 본문이 HTML로 그대로 렌더링됩니다.
                  </p>
                </section>

                <section className="grid gap-3">
                  <h3 className="font-bold text-primary text-base">단계형 위저드</h3>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    각 단계마다 제목, 현업 설명, 제공 자료, 입력 프롬프트를 설정하세요.
                  </p>
                  <WizardStepsEditor
                    value={form.wizard_steps}
                    onChange={(next) => setForm({ ...form, wizard_steps: next })}
                  />
                </section>
              </>
            )}

            {/* 모범 답안 */}
            <section className="grid gap-3">
              <h3 className="font-bold text-primary text-base">모범 답안</h3>
              <Separator />
              <div className="grid gap-2">
                <Label>현직자 모범 답안</Label>
                <RichTextEditor
                  value={form.sample_answer}
                  onChange={(next) => setForm({ ...form, sample_answer: next })}
                  placeholder={
                    "문항별 모범 답안과 핵심 포인트를 자유롭게 작성하세요.\n\n예)\n1. 문제 정의\n- ...\n\n2. 가설과 검증\n- ..."
                  }
                  minHeightClassName="min-h-[320px]"
                />
                <p className="text-xs text-muted-foreground">
                  사용자가 시뮬레이션 제출 후 결제하고 보는 "모범 답안" 페이지에 그대로 표시됩니다.
                  작성한 서식도 함께 반영됩니다.
                </p>
              </div>
            </section>

            <section className="grid gap-3">
              <h3 className="font-bold text-primary text-base">풀서비스 추가 콘텐츠</h3>
              <Separator />
              <div className="grid gap-2">
                <Label>현직자 코멘트</Label>
                <RichTextEditor
                  value={form.expert_comment_html}
                  onChange={(next) => setForm({ ...form, expert_comment_html: next })}
                  placeholder="직무에서 보는 포인트, 현업과의 연결점, 취업 어필 포인트를 자유롭게 작성하세요."
                  minHeightClassName="min-h-[240px]"
                />
                <p className="text-xs text-muted-foreground">
                  풀서비스의 "현직자 코멘트" 카드에서 그대로 보여집니다.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>관련 오프라인 활동 추천</Label>
                <RichTextEditor
                  value={form.offline_activity_html}
                  onChange={(next) => setForm({ ...form, offline_activity_html: next })}
                  placeholder="추천 활동, 행사, 네트워킹, 스터디, 탐방 포인트 등을 자유롭게 작성하세요."
                  minHeightClassName="min-h-[240px]"
                />
                <p className="text-xs text-muted-foreground">
                  풀서비스의 "관련 오프라인 활동 추천" 카드에서 그대로 보여집니다.
                </p>
              </div>
            </section>

            {/* 이런 분께 추천해요 */}
            <section className="grid gap-3">
              <h3 className="font-bold text-primary text-base">이런 분께 추천해요</h3>
              <Separator />
              <div className="grid gap-2">
                <Label>추천 대상 설명</Label>
                <Input
                  value={form.recommended_for}
                  onChange={(e) => setForm({ ...form, recommended_for: e.target.value })}
                  placeholder="예: 프로덕트 디자인에 관심 있는 분"
                />
                <p className="text-xs text-muted-foreground">
                  시뮬레이션 상세 페이지의 "이런 분께 추천해요" 영역에 표시됩니다.
                </p>
              </div>
            </section>

            {/* 현직자 정보 */}
            <section className="grid gap-3">
              <h3 className="font-bold text-primary text-base">현직자 정보</h3>
              <Separator />
              <div className="grid gap-2">
                <Label>이름</Label>
                <Input
                  value={form.author_name}
                  onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                  placeholder="예: 김OO"
                />
              </div>
              <div className="grid gap-2">
                <Label>현직 역할</Label>
                <Input
                  value={form.author_role}
                  onChange={(e) => setForm({ ...form, author_role: e.target.value })}
                  placeholder="예: 프로덕트 디자이너"
                />
              </div>
              <div className="grid gap-2">
                <Label>경력 연차</Label>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_OPTIONS.map((opt) => {
                    const active = Number(form.years_experience) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, years_experience: opt.value })}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "border-brand bg-brand text-white"
                            : "border-border bg-background text-foreground/70 hover:border-brand/40"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>기업 규모</Label>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_SIZES.map((size) => {
                    const active = form.company_size === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setForm({ ...form, company_size: active ? "" : size })}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "border-brand bg-brand text-white"
                            : "border-border bg-background text-foreground/70 hover:border-brand/40"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 시뮬레이션 측정 역량 */}
            <section className="grid gap-3">
              <h3 className="font-bold text-primary text-base">측정 역량</h3>
              <Separator />
              <p className="text-xs text-muted-foreground">
                선택한 역량이 사용자의 결과 리포트(역량 요약·분포)에 그대로 표시됩니다.
              </p>
              {(() => {
                const selected = splitCommas(form.submitted_competencies_text);
                const toggle = (id: string) => {
                  const next = selected.includes(id)
                    ? selected.filter((x) => x !== id)
                    : [...selected, id];
                  setForm({ ...form, submitted_competencies_text: next.join(", ") });
                };
                return (
                  <div className="space-y-3">
                    <div className="text-xs text-foreground/70">
                      선택된 역량{" "}
                      <span className="font-semibold text-brand">{selected.length}</span>개
                    </div>
                    <div className="grid gap-3 max-h-72 overflow-y-auto rounded-md border border-border p-3">
                      {COMPETENCY_GROUPS.map((g) => (
                        <div key={g.id}>
                          <div className="text-xs font-semibold text-primary">{g.name}</div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {g.competencies.map((c) => {
                              const active = selected.includes(c.id);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => toggle(c.id)}
                                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                                    active
                                      ? "border-brand bg-brand text-white"
                                      : "border-border bg-background text-foreground/70 hover:border-brand/40"
                                  }`}
                                >
                                  {c.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* 현직자 제출 원본 (검토용) */}
            {editing &&
              (editing.author_id ||
                editing.frequent_tasks ||
                editing.years_experience !== null ||
                editing.industry_categories.length > 0 ||
                editing.verification_file_url ||
                editing.submitted_competencies.length > 0 ||
                editing.status === "expert_submitted" ||
                editing.status === "review_pending") && (
                <section className="grid gap-3">
                  <h3 className="font-bold text-primary text-base">📝 현직자 제출 원본</h3>
                  <Separator />
                  <div className="rounded-md border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 space-y-2">
                    <div>
                      <b>이름:</b> {editing.author_name}
                    </div>
                    <div>
                      <b>직무:</b>{" "}
                      {editing.author_role || <span className="text-violet-700/60">미입력</span>}
                    </div>
                    {editing.years_experience !== null && (
                      <div>
                        <b>경력:</b>{" "}
                        {experienceLabel(editing.years_experience) ??
                          `${editing.years_experience}년`}
                      </div>
                    )}
                    {editing.company_name && (
                      <div>
                        <b>회사명:</b> {editing.company_name}
                      </div>
                    )}
                    {editing.company_size && (
                      <div>
                        <b>기업 규모:</b> {editing.company_size}
                      </div>
                    )}
                    {editing.industry && (
                      <div>
                        <b>산업군:</b> {editing.industry}
                      </div>
                    )}
                    {!editing.industry && editing.industry_categories.length > 0 && (
                      <div>
                        <b>산업군:</b> {editing.industry_categories.join(", ")}
                      </div>
                    )}
                    {editing.frequent_tasks && (
                      <div>
                        <b>1. 반복하거나 자주 하는 업무:</b>
                        <div className="mt-1 whitespace-pre-wrap rounded bg-white/70 p-2 text-xs">
                          {editing.frequent_tasks}
                        </div>
                      </div>
                    )}
                    {editing.situation && (
                      <div>
                        <b>2. 실제 상황/배경:</b>
                        <div className="mt-1 whitespace-pre-wrap rounded bg-white/70 p-2 text-xs">
                          {editing.situation}
                        </div>
                      </div>
                    )}
                    {editing.data_points.length > 0 && (
                      <div>
                        <b>3. 주로 보는 데이터나 지표:</b>
                        <div className="mt-1 whitespace-pre-wrap rounded bg-white/70 p-2 text-xs">
                          {editing.data_points.join("\n")}
                        </div>
                      </div>
                    )}
                    {editing.submitted_competencies.length > 0 && (
                      <div>
                        <b>필요 역량 ({editing.submitted_competencies.length}개):</b>{" "}
                        {editing.submitted_competencies
                          .map((id) => getCompetencyName(id))
                          .join(", ")}
                      </div>
                    )}
                    <div className="pt-1">
                      <b>현직자 인증 파일:</b>{" "}
                      {editing.verification_file_url ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="ml-2 h-7"
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase.storage
                                .from("expert-verification")
                                .createSignedUrl(editing.verification_file_url!, 3600);
                              if (error) throw error;
                              window.open(data.signedUrl, "_blank");
                            } catch (e) {
                              toast.error((e as Error).message);
                            }
                          }}
                        >
                          파일 열기/다운로드
                        </Button>
                      ) : (
                        <span className="ml-1 text-xs text-violet-700/70">제출되지 않음</span>
                      )}
                    </div>
                  </div>
                </section>
              )}
          </div>
          <DialogFooter className="sticky bottom-0 z-10 flex shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6 lg:px-8">
            <Button variant="outline" onClick={() => setCreating(false)}>
              취소
            </Button>
            {editing &&
              (editing.status === "expert_submitted" || editing.status === "review_pending") && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await updateMission(editing.id, { ...buildPayload(), status: "published" });
                      toast.success("승인 후 공개되었습니다.");
                      setCreating(false);
                      setEditing(null);
                      await refresh();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  승인 후 공개
                </Button>
              )}
            <Button
              onClick={save}
              style={{ backgroundColor: "#008f8f" }}
              className="text-white hover:opacity-90"
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function fmt(t: string) {
  const d = new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
