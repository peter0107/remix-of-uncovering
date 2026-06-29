import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminSidebar } from "@/components/AdminSidebar";
import { MaterialBlocksEditor } from "@/components/admin/MaterialBlocksEditor";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { WizardStepsEditor } from "@/components/admin/WizardStepsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { getCompetencyName, COMPETENCY_GROUPS } from "@/data/competencies";
import { INDUSTRIES } from "@/data/jobCategories";
import { JOBS } from "@/data/jobs";
import { supabase } from "@/integrations/supabase/client";
import {
  COMPANY_SIZES,
  createOfficialMission,
  DIFFICULTY_LABEL,
  EXPERIENCE_OPTIONS,
  experienceLabel,
  getMission,
  normalizeWizardSteps,
  type MaterialBlock,
  type Mission,
  type MissionContentMode,
  type MissionDifficulty,
  type MissionQuestion,
  type MissionStatus,
  type WizardStep,
  STATUS_LABEL,
  updateMission,
} from "@/lib/missions";
import {
  missionWizardIntroHtml,
  normalizeRichTextHtml,
  plainTextToRichTextHtml,
  wizardStepBodyHtml,
} from "@/lib/rich-text";
import { listCustomJobs, type CustomJob } from "@/lib/customJobs";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/missions/$missionId")({
  head: () => ({ meta: [{ title: "시뮬레이션 편집 — beginner" }] }),
  component: MissionEditorPage,
});

function getJobName(slug: string) {
  return JOBS.find((j) => j.slug === slug)?.name ?? slug;
}

type FormState = {
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
  situation: string;
  material_blocks: MaterialBlock[];
  questions: MissionQuestion[];
  wizard_intro_html: string;
  wizard_intro_blocks: MaterialBlock[];
  wizard_steps: WizardStep[];
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

function MissionEditorPage() {
  const { missionId } = Route.useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [customJobs, setCustomJobs] = useState<CustomJob[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const jobOptions = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>();
    for (const j of JOBS) map.set(j.slug, { slug: j.slug, name: j.name });
    for (const j of customJobs) map.set(j.slug, { slug: j.slug, name: j.name });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [customJobs]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      missionId === "new" ? Promise.resolve(null) : getMission(missionId),
      listCustomJobs(),
    ])
      .then(([m, cj]) => {
        setCustomJobs(cj);
        setMission(m);
        if (!m) {
          setForm(EMPTY_FORM);
          return;
        }

        const isReview = m.status === "expert_submitted" || m.status === "review_pending";
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
          title: m.title,
          job_slug: m.job_slug,
          job_name: getJobName(m.job_slug),
          job_category: m.job_category ?? "",
          content_mode: m.content_mode ?? "legacy",
          industries: m.industries ?? [],
          author_name: m.author_name,
          status: m.status,
          duration_min: m.duration_min,
          difficulty: m.difficulty,
          description: m.description ?? "",
          situation: m.situation ?? "",
          material_blocks: m.material_blocks ?? [],
          questions: (m.questions ?? []).map((q) => ({ ...q, guide: q.guide ?? "" })),
          wizard_intro_html: missionWizardIntroHtml(m),
          wizard_intro_blocks: m.wizard_intro_blocks ?? [],
          wizard_steps: (m.wizard_steps ?? []).map((step) => ({
            ...step,
            body_html: wizardStepBodyHtml(step),
          })),
          summary_title: m.summary_title ?? "",
          summary_description: m.summary_description ?? "",
          recommended_for: m.recommended_for ?? "",
          included_results_text: (m.included_results ?? []).join("\n"),
          mission_steps_text: (m.mission_steps ?? []).join("\n"),
          preview_notice: m.preview_notice ?? "",
          locked_preview_text: m.locked_preview_text ?? "",
          sample_answer:
            normalizeRichTextHtml(m.sample_answer) ??
            plainTextToRichTextHtml(m.sample_answer) ??
            "",
          expert_comment_html:
            normalizeRichTextHtml(m.expert_comment_html) ??
            plainTextToRichTextHtml(m.expert_comment_html) ??
            "",
          offline_activity_html:
            normalizeRichTextHtml(m.offline_activity_html) ??
            plainTextToRichTextHtml(m.offline_activity_html) ??
            "",
          author_role: m.author_role ?? "",
          years_experience: m.years_experience ?? 0,
          company_size: m.company_size ?? "",
          submitted_competencies_text: (m.submitted_competencies ?? []).join(", "),
          is_expert_authored: m.is_expert_authored ?? false,
        });
      })
      .catch((e) => toast.error((e as Error).message || "시뮬레이션을 불러오지 못했어요"))
      .finally(() => setLoading(false));
  }, [missionId]);

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

    setSaving(true);
    try {
      const payload = buildPayload();
      if (mission && missionId !== "new") {
        await updateMission(mission.id, payload);
        toast.success("시뮬레이션이 수정되었습니다.");
      } else {
        await createOfficialMission(payload);
        toast.success("시뮬레이션이 추가되었습니다.");
      }
      navigate({ to: "/admin/missions" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function approveAndPublish() {
    if (!mission) return;
    setSaving(true);
    try {
      await updateMission(mission.id, { ...buildPayload(), status: "published" });
      toast.success("승인 후 공개되었습니다.");
      navigate({ to: "/admin/missions" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (missionId !== "new" && !mission) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <p className="text-sm text-muted-foreground">시뮬레이션을 찾을 수 없습니다.</p>
          <Link to="/admin/missions" className="mt-3 inline-block text-sm text-brand underline">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="block min-h-screen bg-muted/30 lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                to="/admin/missions"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                시뮬레이션 목록으로 돌아가기
              </Link>
              <h1 className="mt-3 text-xl font-bold text-primary sm:text-2xl">
                {mission
                  ? mission.status === "expert_submitted" || mission.status === "review_pending"
                    ? "현직자 제출 시뮬레이션 검토"
                    : "시뮬레이션 수정"
                  : "새 시뮬레이션 추가"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                새 탭에서 넓게 열어 편하게 내용을 수정할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {mission &&
                (mission.status === "expert_submitted" || mission.status === "review_pending") && (
                  <Button variant="outline" onClick={approveAndPublish} disabled={saving}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    승인 후 공개
                  </Button>
                )}
              <Button variant="outline" onClick={() => navigate({ to: "/admin/missions" })}>
                취소
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                style={{ backgroundColor: "#008f8f" }}
                className="text-white hover:opacity-90"
              >
                저장
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-6">
            <section className="grid gap-3">
              <h3 className="text-base font-bold text-primary">기본정보</h3>
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
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-brand"
                  checked={form.is_expert_authored}
                  onChange={(e) => setForm({ ...form, is_expert_authored: e.target.checked })}
                />
                <div>
                  <div className="font-medium text-primary">현직자 제작 시뮬레이션으로 표시</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    체크하면 사용자에게 보라색 "현직자" 뱃지로 표시됩니다.
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
                <section className="grid gap-3">
                  <h3 className="text-base font-bold text-primary">시뮬레이션 내용</h3>
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
                    <MaterialBlocksEditor
                      value={form.material_blocks}
                      onChange={(next) => setForm({ ...form, material_blocks: next })}
                    />
                  </div>
                </section>

                <section className="grid gap-3">
                  <h3 className="text-base font-bold text-primary">제출 항목</h3>
                  <Separator />
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
                            { id: `q${form.questions.length + 1}`, label: "", guide: "" },
                          ],
                        })
                      }
                    >
                      제출 항목 추가
                    </Button>
                  </div>
                  {form.questions.map((q, i) => (
                    <div
                      key={i}
                      className="grid gap-2 rounded-xl border border-border bg-background p-3"
                    >
                      <Input
                        value={q.label}
                        onChange={(e) => {
                          const next = [...form.questions];
                          next[i] = { ...next[i], label: e.target.value };
                          setForm({ ...form, questions: next });
                        }}
                        placeholder="제출 항목 제목"
                      />
                      <Textarea
                        rows={2}
                        value={q.guide ?? ""}
                        onChange={(e) => {
                          const next = [...form.questions];
                          next[i] = { ...next[i], guide: e.target.value };
                          setForm({ ...form, questions: next });
                        }}
                        placeholder="작성 가이드"
                      />
                    </div>
                  ))}
                </section>
              </>
            ) : (
              <>
                <section className="grid gap-3">
                  <h3 className="text-base font-bold text-primary">도입 페이지</h3>
                  <Separator />
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
                  <h3 className="text-base font-bold text-primary">단계형 위저드</h3>
                  <Separator />
                  <WizardStepsEditor
                    value={form.wizard_steps}
                    onChange={(next) => setForm({ ...form, wizard_steps: next })}
                  />
                </section>
              </>
            )}

            <section className="grid gap-3">
              <h3 className="text-base font-bold text-primary">모범 답안</h3>
              <Separator />
              <RichTextEditor
                value={form.sample_answer}
                onChange={(next) => setForm({ ...form, sample_answer: next })}
                placeholder={
                  "문항별 모범 답안과 핵심 포인트를 자유롭게 작성하세요.\n\n예)\n1. 문제 정의\n- ..."
                }
                minHeightClassName="min-h-[320px]"
              />
            </section>

            <section className="grid gap-3">
              <h3 className="text-base font-bold text-primary">풀서비스 추가 콘텐츠</h3>
              <Separator />
              <div className="grid gap-2">
                <Label>현직자 코멘트</Label>
                <RichTextEditor
                  value={form.expert_comment_html}
                  onChange={(next) => setForm({ ...form, expert_comment_html: next })}
                  placeholder="직무에서 보는 포인트, 현업과의 연결점, 취업 어필 포인트를 자유롭게 작성하세요."
                  minHeightClassName="min-h-[240px]"
                />
              </div>
              <div className="grid gap-2">
                <Label>관련 오프라인 활동 추천</Label>
                <RichTextEditor
                  value={form.offline_activity_html}
                  onChange={(next) => setForm({ ...form, offline_activity_html: next })}
                  placeholder="추천 활동, 행사, 네트워킹, 스터디, 탐방 포인트 등을 자유롭게 작성하세요."
                  minHeightClassName="min-h-[240px]"
                />
              </div>
            </section>

            <section className="grid gap-3">
              <h3 className="text-base font-bold text-primary">이런 분께 추천해요</h3>
              <Separator />
              <Input
                value={form.recommended_for}
                onChange={(e) => setForm({ ...form, recommended_for: e.target.value })}
                placeholder="예: 반도체 공정기술에 관심 있는 분"
              />
            </section>

            <section className="grid gap-3">
              <h3 className="text-base font-bold text-primary">현직자 정보</h3>
              <Separator />
              <div className="grid gap-2">
                <Label>이름</Label>
                <Input
                  value={form.author_name}
                  onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>현직 역할</Label>
                <Input
                  value={form.author_role}
                  onChange={(e) => setForm({ ...form, author_role: e.target.value })}
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
                <p className="text-[11px] text-muted-foreground">
                  현재 표시: {experienceLabel(form.years_experience) ?? "선택 안 됨"}
                </p>
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

            <section className="grid gap-3">
              <h3 className="text-base font-bold text-primary">측정 역량</h3>
              <Separator />
              {(() => {
                const selected = splitCommas(form.submitted_competencies_text);
                const toggle = (id: string) => {
                  const next = selected.includes(id)
                    ? selected.filter((x) => x !== id)
                    : [...selected, id];
                  setForm({ ...form, submitted_competencies_text: next.join(", ") });
                };
                return (
                  <div className="space-y-4">
                    {COMPETENCY_GROUPS.map((group) => (
                      <div key={group.name} className="grid gap-2">
                        <div className="text-sm font-semibold text-primary">{group.name}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.competencies.map(({ id }) => {
                            const active = selected.includes(id);
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => toggle(id)}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                  active
                                    ? "border-brand bg-brand text-white"
                                    : "border-border bg-background text-foreground/70 hover:border-brand/40"
                                }`}
                              >
                                {getCompetencyName(id)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
