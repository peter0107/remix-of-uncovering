import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ExpertSimulationCard } from "@/components/ExpertSimulationCard";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useAuth } from "@/hooks/use-auth";
import { DOMAIN_CATEGORIES } from "@/lib/domain-categories";
import {
  createExpertSimulation,
  deleteExpertSimulation,
  EXPERT_COMPANY_TYPES,
  EXPERT_EXPERIENCE_BANDS,
  getAdminExpertSimulations,
  setExpertSimulationVisibility,
  updateExpertSimulation,
  type AdminExpertSimulation,
} from "@/lib/expert-simulations.functions";
import type {
  AdminSimulationStep,
  SelectionMode,
  SimulationFormat,
} from "@/lib/simulations.functions";

export const Route = createFileRoute("/admin/expert-simulations")({
  head: () => ({ meta: [{ title: "Beginner - 현직자 시뮬레이션 관리" }] }),
  component: AdminExpertSimulations,
});

type ExpertSimulationForm = {
  title: string;
  roleLabel: string;
  description: string;
  domain: string;
  estimatedMinutes: string;
  simulationFormat: SimulationFormat;
  selectionMode: SelectionMode;
  singleAnswerQuestion: string;
  taskPrompt: string;
  sharedSituation: string;
  sharedMaterials: string;
  steps: AdminSimulationStep[];
  nickname: string;
  companyType: (typeof EXPERT_COMPANY_TYPES)[number];
  experienceBand: (typeof EXPERT_EXPERIENCE_BANDS)[number];
  jobTitle: string;
  cardBackgroundColor: string;
  cardTextColor: string;
  modelAnswer: string;
  aiFeedback: string;
};

function createStep(): AdminSimulationStep {
  return {
    id: `step-${crypto.randomUUID()}`,
    title: "",
    durationMin: 15,
    difficulty: 1,
    situation: "",
    materials: "",
    hint: "",
    completionMessage: "",
    prompts: [{ id: `prompt-${crypto.randomUUID()}`, label: "", body: "" }],
  };
}

function createEmptyForm(): ExpertSimulationForm {
  return {
    title: "",
    roleLabel: "",
    description: "",
    domain: DOMAIN_CATEGORIES[0],
    estimatedMinutes: "60",
    simulationFormat: "single",
    selectionMode: "separated",
    singleAnswerQuestion: "",
    taskPrompt: "",
    sharedSituation: "",
    sharedMaterials: "",
    steps: [],
    nickname: "",
    companyType: EXPERT_COMPANY_TYPES[0],
    experienceBand: EXPERT_EXPERIENCE_BANDS[0],
    jobTitle: "",
    cardBackgroundColor: "#18181b",
    cardTextColor: "#ffffff",
    modelAnswer: "",
    aiFeedback: "",
  };
}

function formFromSimulation(simulation: AdminExpertSimulation): ExpertSimulationForm {
  return {
    title: simulation.title,
    roleLabel: simulation.roleLabel,
    description: simulation.description,
    domain: DOMAIN_CATEGORIES.includes(simulation.domain as (typeof DOMAIN_CATEGORIES)[number])
      ? simulation.domain
      : DOMAIN_CATEGORIES[0],
    estimatedMinutes: simulation.estimatedMinutes ? String(simulation.estimatedMinutes) : "",
    simulationFormat: simulation.simulationFormat,
    selectionMode: simulation.selectionMode,
    singleAnswerQuestion: simulation.singleAnswerQuestion,
    taskPrompt: simulation.taskPrompt,
    sharedSituation: simulation.sharedSituation,
    sharedMaterials: simulation.sharedMaterials,
    steps: simulation.steps.map((step) => ({
      ...step,
      prompts:
        step.prompts.slice(0, 1).length > 0
          ? step.prompts.slice(0, 1)
          : [{ id: `prompt-${crypto.randomUUID()}`, label: "", body: "" }],
    })),
    nickname: simulation.nickname,
    companyType: simulation.companyType,
    experienceBand: simulation.experienceBand,
    jobTitle: simulation.jobTitle,
    cardBackgroundColor: simulation.cardBackgroundColor,
    cardTextColor: simulation.cardTextColor,
    modelAnswer: simulation.modelAnswer,
    aiFeedback: simulation.aiFeedback,
  };
}

function hasValidSteps(steps: AdminSimulationStep[]) {
  return (
    steps.length > 0 &&
    steps.every((step) => step.title.trim() && step.prompts.length === 1)
  );
}

function prepareSteps(steps: AdminSimulationStep[]) {
  return steps.map((step) => ({
    ...step,
    title: step.title.trim(),
    prompts: step.prompts.slice(0, 1).map((prompt) => ({
      ...prompt,
      label: step.title.trim(),
      body: prompt.body.trim(),
    })),
  }));
}

type StepEditorPanel = "situation" | "materials" | "questions" | "modelAnswer";

function AdminExpertSimulations() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [simulations, setSimulations] = useState<AdminExpertSimulation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stepEditorPanel, setStepEditorPanel] = useState<StepEditorPanel>("situation");
  const [form, setForm] = useState<ExpertSimulationForm>(createEmptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);

  const selected = useMemo(
    () => simulations.find((simulation) => simulation.id === selectedId) ?? null,
    [selectedId, simulations],
  );

  const load = useCallback(
    async (preferredId?: string | null) => {
      setLoading(true);
      try {
        const next = await getAdminExpertSimulations();
        setSimulations(next);
        setSelectedId((current) => {
          const requested = preferredId ?? current;
          return requested && next.some((simulation) => simulation.id === requested)
            ? requested
            : (next[0]?.id ?? null);
        });
        const nextSelected = preferredId
          ? next.find((simulation) => simulation.id === preferredId)
          : undefined;
        if (nextSelected) setForm(formFromSimulation(nextSelected));
        else if (!selectedId && next[0]) setForm(formFromSimulation(next[0]));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "현직자 시뮬레이션을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedId],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/admin/expert-simulations" } });
      return;
    }
    if (loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;
    void load();
  }, [authLoading, load, navigate, user]);

  const selectSimulation = (simulation: AdminExpertSimulation) => {
    setSelectedId(simulation.id);
    setForm(formFromSimulation(simulation));
    setStepEditorPanel("situation");
  };

  const startNew = () => {
    setSelectedId(null);
    setForm(createEmptyForm());
    setStepEditorPanel("situation");
  };

  const updateForm = <K extends keyof ExpertSimulationForm>(
    key: K,
    value: ExpertSimulationForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.simulationFormat === "selection" && !hasValidSteps(form.steps)) {
      toast.error("단계와 답변 질문을 입력해주세요.");
      return;
    }

    const estimatedMinutes = form.estimatedMinutes.trim() ? Number(form.estimatedMinutes) : null;
    if (
      estimatedMinutes !== null &&
      (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0)
    ) {
      toast.error("예상 소요 시간을 확인해주세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        roleLabel: form.roleLabel,
        description: form.description,
        domain: form.domain as (typeof DOMAIN_CATEGORIES)[number],
        estimatedMinutes,
        simulationFormat: form.simulationFormat,
        selectionMode: form.selectionMode,
        singleAnswerQuestion: form.singleAnswerQuestion,
        taskPrompt: form.taskPrompt,
        sharedSituation: form.sharedSituation,
        sharedMaterials: form.sharedMaterials,
        steps: prepareSteps(form.steps),
        nickname: form.nickname,
        companyType: form.companyType,
        experienceBand: form.experienceBand,
        jobTitle: form.jobTitle,
        cardBackgroundColor: form.cardBackgroundColor,
        cardTextColor: form.cardTextColor,
        modelAnswer: form.modelAnswer,
        aiFeedback: form.aiFeedback,
      };
      let nextId = selectedId;
      if (selectedId) {
        await updateExpertSimulation({ data: { id: selectedId, ...payload } });
      } else {
        const result = await createExpertSimulation({ data: payload });
        nextId = result.id;
      }
      toast.success(
        selectedId ? "현직자 시뮬레이션을 수정했습니다." : "현직자 시뮬레이션을 추가했습니다.",
      );
      await load(nextId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (simulation: AdminExpertSimulation) => {
    setActioningId(simulation.id);
    setSimulations((current) =>
      current.map((item) =>
        item.id === simulation.id ? { ...item, isPublic: !item.isPublic } : item,
      ),
    );
    try {
      await setExpertSimulationVisibility({
        data: { id: simulation.id, isPublic: !simulation.isPublic },
      });
    } catch (error) {
      setSimulations((current) =>
        current.map((item) =>
          item.id === simulation.id ? { ...item, isPublic: simulation.isPublic } : item,
        ),
      );
      toast.error(error instanceof Error ? error.message : "공개 상태를 저장하지 못했습니다.");
    } finally {
      setActioningId(null);
    }
  };

  const remove = async (simulation: AdminExpertSimulation) => {
    if (!window.confirm(`'${simulation.title}' 시뮬레이션을 삭제할까요?`)) return;
    setActioningId(simulation.id);
    try {
      await deleteExpertSimulation({ data: { id: simulation.id } });
      const remaining = simulations.filter((item) => item.id !== simulation.id);
      setSimulations(remaining);
      if (selectedId === simulation.id) {
        const next = remaining[0] ?? null;
        setSelectedId(next?.id ?? null);
        setForm(next ? formFromSimulation(next) : createEmptyForm());
      }
      toast.success("현직자 시뮬레이션을 삭제했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제하지 못했습니다.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">현직자 시뮬레이션 관리</h1>
        </div>
        <Link to="/expert-simulations" className="text-sm text-neutral-600 hover:text-neutral-900">
          유저 화면 보기
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-neutral-500">
          현직자 시뮬레이션을 불러오는 중입니다.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex h-[38rem] flex-col overflow-hidden rounded-md border border-neutral-200 xl:sticky xl:top-6 xl:self-start">
            <div className="border-b border-neutral-200 p-3">
              <button
                type="button"
                onClick={startNew}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800"
              >
                <Plus className="h-3.5 w-3.5" /> 현직자 시뮬레이션 추가
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
              {simulations.map((simulation) => {
                const isSelected = selectedId === simulation.id;
                const preview = isSelected ? form : simulation;
                const previewMinutes = isSelected
                  ? form.estimatedMinutes.trim()
                    ? Number(form.estimatedMinutes) || null
                    : null
                  : simulation.estimatedMinutes;

                return (
                  <div
                    key={simulation.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectSimulation(simulation)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") selectSimulation(simulation);
                    }}
                    className={isSelected ? "rounded-md ring-2 ring-neutral-900" : "rounded-md"}
                  >
                    <ExpertSimulationCard
                      compact
                      nickname={preview.nickname || "현직자"}
                      companyType={preview.companyType}
                      experienceBand={preview.experienceBand}
                      jobTitle={preview.jobTitle || "직무명"}
                      roleLabel={preview.roleLabel || "카드에 표시할 직무"}
                      title={preview.title || "시뮬레이션 제목"}
                      description={preview.description}
                      estimatedMinutes={previewMinutes}
                      backgroundColor={preview.cardBackgroundColor}
                      textColor={preview.cardTextColor}
                      topRight={
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void remove(simulation);
                          }}
                          disabled={actioningId === simulation.id}
                          aria-label={`${simulation.title} 삭제`}
                          className="grid h-7 w-7 place-items-center rounded-md border border-black/10 bg-white/70 text-current hover:bg-white disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      }
                      bottomRight={
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void toggleVisibility(simulation);
                          }}
                          disabled={actioningId === simulation.id}
                          aria-pressed={simulation.isPublic}
                          className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-1.5 pr-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            simulation.isPublic
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-200 bg-white text-neutral-500"
                          }`}
                        >
                          <span
                            className={`h-3 w-3 rounded-full transition-colors ${
                              simulation.isPublic ? "bg-white" : "bg-neutral-300"
                            }`}
                          />
                          {simulation.isPublic ? "공개" : "비공개"}
                        </button>
                      }
                    />
                  </div>
                );
              })}
              {simulations.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-neutral-500">
                  등록된 시뮬레이션이 없습니다.
                </p>
              )}
            </div>
          </aside>

          <section className="min-w-0 rounded-md border border-neutral-200">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-4">
              <h2 className="text-sm font-semibold text-neutral-900">
                {selectedId ? "현직자 시뮬레이션 수정" : "현직자 시뮬레이션 추가"}
              </h2>
              {selectedId && (
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `/simulation/${selectedId}?preview=1`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 text-xs font-medium hover:bg-neutral-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> 미리보기
                </button>
              )}
            </div>

            <form onSubmit={submit} className="grid gap-5 p-5">
              <Field
                label="시뮬레이션 제목"
                value={form.title}
                onChange={(value) => updateForm("title", value)}
                required
              />

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="현직자 닉네임"
                  value={form.nickname}
                  onChange={(value) => updateForm("nickname", value)}
                  required
                />
                <SelectField
                  label="기업 유형"
                  value={form.companyType}
                  onChange={(value) =>
                    updateForm("companyType", value as ExpertSimulationForm["companyType"])
                  }
                  options={EXPERT_COMPANY_TYPES}
                />
                <SelectField
                  label="경력"
                  value={form.experienceBand}
                  onChange={(value) =>
                    updateForm("experienceBand", value as ExpertSimulationForm["experienceBand"])
                  }
                  options={EXPERT_EXPERIENCE_BANDS}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="직무명"
                  value={form.jobTitle}
                  onChange={(value) => updateForm("jobTitle", value)}
                  required
                />
                <Field
                  label="카드에 표시할 직무"
                  value={form.roleLabel}
                  onChange={(value) => updateForm("roleLabel", value)}
                  required
                />
                <SelectField
                  label="도메인"
                  value={form.domain}
                  onChange={(value) => updateForm("domain", value)}
                  options={DOMAIN_CATEGORIES}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="예상 소요 시간"
                  type="number"
                  value={form.estimatedMinutes}
                  onChange={(value) => updateForm("estimatedMinutes", value)}
                />
                <ColorField
                  label="배경색"
                  value={form.cardBackgroundColor}
                  onChange={(value) => updateForm("cardBackgroundColor", value)}
                />
                <ColorField
                  label="글자색"
                  value={form.cardTextColor}
                  onChange={(value) => updateForm("cardTextColor", value)}
                />
              </div>

              <TextAreaField
                label="간단 설명"
                value={form.description}
                onChange={(value) => updateForm("description", value)}
              />

              <div>
                <p className="text-xs font-medium text-neutral-600">시뮬레이션 형식</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["single", "separated", "common"] as const).map((format) => {
                    const selectedFormat =
                      format === "single"
                        ? form.simulationFormat === "single"
                        : form.simulationFormat === "selection" && form.selectionMode === format;
                    return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => {
                        updateForm("simulationFormat", format === "single" ? "single" : "selection");
                        if (format !== "single") {
                          updateForm("selectionMode", format);
                          setStepEditorPanel("situation");
                        }
                      }}
                      className={`h-8 rounded-md border px-3 text-xs font-semibold transition-colors ${
                        selectedFormat
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-500 hover:text-neutral-900"
                      }`}
                    >
                      {format === "single" ? "단일형" : format === "separated" ? "선택형(분리)" : "선택형(공통)"}
                    </button>
                    );
                  })}
                </div>
              </div>

              {form.simulationFormat === "selection" && form.selectionMode === "common" && (
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["situation", "상황 안내"],
                      ["materials", "제공 자료"],
                      ["questions", "단계별 질문"],
                      ["modelAnswer", "현직자 모범답안"],
                    ] as const
                  ).map(([panel, label]) => (
                    <button
                      key={panel}
                      type="button"
                      aria-pressed={stepEditorPanel === panel}
                      onClick={() => setStepEditorPanel(panel)}
                      className={`h-8 rounded-md border px-3 text-xs font-semibold transition-colors ${
                        stepEditorPanel === panel
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-500 hover:text-neutral-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {form.simulationFormat === "single" ? (
                <>
                  <RichTextEditor
                    label="과제 본문"
                    value={form.taskPrompt}
                    onChange={(value) => updateForm("taskPrompt", value)}
                    minHeight="16rem"
                  />
                  <RichTextEditor
                    label="답변 질문"
                    value={form.singleAnswerQuestion}
                    onChange={(value) => updateForm("singleAnswerQuestion", value)}
                    minHeight="12rem"
                  />
                </>
              ) : form.selectionMode === "common" ? (
                <>
                  {stepEditorPanel === "situation" && (
                    <RichTextEditor
                      label="상황 안내"
                      value={form.sharedSituation}
                      onChange={(value) => updateForm("sharedSituation", value)}
                    />
                  )}
                  {stepEditorPanel === "materials" && (
                    <RichTextEditor
                      label="제공 자료"
                      value={form.sharedMaterials}
                      onChange={(value) => updateForm("sharedMaterials", value)}
                      minHeight="12rem"
                    />
                  )}
                  {stepEditorPanel === "questions" && (
                    <ExpertStepEditor
                      steps={form.steps}
                      onChange={(steps) => updateForm("steps", steps)}
                      activePanel="questions"
                    />
                  )}
                  {stepEditorPanel === "modelAnswer" && (
                    <RichTextEditor
                      label="현직자 모범답안"
                      value={form.modelAnswer}
                      onChange={(value) => updateForm("modelAnswer", value)}
                      minHeight="16rem"
                    />
                  )}
                </>
              ) : (
                <ExpertStepEditor
                  steps={form.steps}
                  onChange={(steps) => updateForm("steps", steps)}
                  activePanel="situation"
                  showAll
                  modelAnswer={form.modelAnswer}
                  onModelAnswerChange={(value) => updateForm("modelAnswer", value)}
                />
              )}

              {form.simulationFormat === "single" && (
                <RichTextEditor
                  label="현직자 모범답안"
                  value={form.modelAnswer}
                  onChange={(value) => updateForm("modelAnswer", value)}
                  minHeight="16rem"
                />
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => (selected ? selectSimulation(selected) : startNew())}
                  className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50"
                >
                  초기화
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !form.title.trim() ||
                    !form.nickname.trim() ||
                    !form.roleLabel.trim() ||
                    !form.jobTitle.trim() ||
                    (form.simulationFormat === "single"
                      ? !form.taskPrompt.trim() || !form.singleAnswerQuestion.trim()
                      : !hasValidSteps(form.steps))
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />{" "}
                  {saving ? "저장 중..." : selectedId ? "수정 저장" : "시뮬레이션 추가"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function ExpertStepEditor({
  steps,
  onChange,
  activePanel,
  showAll = false,
  modelAnswer,
  onModelAnswerChange,
}: {
  steps: AdminSimulationStep[];
  onChange: (steps: AdminSimulationStep[]) => void;
  activePanel: StepEditorPanel;
  showAll?: boolean;
  modelAnswer?: string;
  onModelAnswerChange?: (value: string) => void;
}) {
  const [activeStepIndex, setActiveStepIndex] = useState<number | "modelAnswer">(0);
  useEffect(() => {
    setActiveStepIndex((current) =>
      typeof current === "number" ? Math.min(current, Math.max(steps.length - 1, 0)) : current,
    );
  }, [steps.length]);
  const updateStep = (index: number, patch: Partial<AdminSimulationStep>) =>
    onChange(steps.map((step, current) => (current === index ? { ...step, ...patch } : step)));
  const updatePrompt = (stepIndex: number, patch: { label?: string; body?: string }) =>
    onChange(
      steps.map((step, current) =>
        current === stepIndex
          ? {
              ...step,
              prompts: step.prompts.slice(0, 1).map((prompt) => ({ ...prompt, ...patch })),
            }
          : step,
      ),
    );
  const move = <T,>(items: T[], index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return items;
    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  };

  return (
    <section className="border-t border-neutral-200 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">단계별 시뮬레이션 구성</h3>
        <button
          type="button"
          onClick={() => onChange([...steps, createStep()])}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-50"
        >
          <Plus className="h-3.5 w-3.5" /> 단계 추가
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {(steps.length > 0 || onModelAnswerChange) && (
          <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-4">
            {steps.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveStepIndex(index)}
                aria-pressed={activeStepIndex === index}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                  activeStepIndex === index
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {index + 1}단계
              </button>
            ))}
            {onModelAnswerChange && (
              <button
                type="button"
                onClick={() => setActiveStepIndex("modelAnswer")}
                aria-pressed={activeStepIndex === "modelAnswer"}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                  activeStepIndex === "modelAnswer"
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                현직자 모범답안
              </button>
            )}
          </div>
        )}
        {activeStepIndex === "modelAnswer" && onModelAnswerChange ? (
          <RichTextEditor
            label="현직자 모범답안"
            value={modelAnswer ?? ""}
            onChange={onModelAnswerChange}
            minHeight="16rem"
          />
        ) : (
          steps.map((step, stepIndex) =>
            stepIndex !== activeStepIndex ? null : (
          <div key={step.id} className="border-t border-neutral-200 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{stepIndex + 1}단계</p>
              <div className="flex items-center gap-1">
                <IconButton
                  label="위로 이동"
                  disabled={stepIndex === 0}
                  onClick={() => onChange(move(steps, stepIndex, -1))}
                >
                  <ChevronUp className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="아래로 이동"
                  disabled={stepIndex === steps.length - 1}
                  onClick={() => onChange(move(steps, stepIndex, 1))}
                >
                  <ChevronDown className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="단계 삭제"
                  onClick={() => onChange(steps.filter((_, index) => index !== stepIndex))}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field
                label="단계 제목"
                value={step.title}
                onChange={(value) => updateStep(stepIndex, { title: value })}
                required
              />
              <Field
                label="소요 시간(분)"
                type="number"
                value={step.durationMin ? String(step.durationMin) : ""}
                onChange={(value) =>
                  updateStep(stepIndex, { durationMin: value ? Number(value) : undefined })
                }
              />
              <SelectField
                label="난이도"
                value={String(step.difficulty ?? 1)}
                onChange={(value) => updateStep(stepIndex, { difficulty: Number(value) })}
                options={["1", "2", "3", "4", "5"]}
              />
            </div>
            {(showAll || activePanel === "situation") && (
              <div className="mt-4 grid gap-4">
                <RichTextEditor
                  label="상황 안내"
                  value={step.situation ?? ""}
                  onChange={(value) => updateStep(stepIndex, { situation: value })}
                />
                <RichTextEditor
                  label="힌트"
                  value={step.hint ?? ""}
                  onChange={(value) => updateStep(stepIndex, { hint: value })}
                />
              </div>
            )}
            {(showAll || activePanel === "materials") && (
              <div className="mt-4">
                <RichTextEditor
                  label="제공 자료"
                  value={step.materials ?? ""}
                  onChange={(value) => updateStep(stepIndex, { materials: value })}
                  minHeight="12rem"
                />
              </div>
            )}
            {(showAll || activePanel === "questions") && (
              <div className="mt-4 border-t border-neutral-200 pt-4">
                <p className="text-xs font-semibold">답변 질문</p>
                <div className="mt-3">
                  <div className="grid gap-3">
                    <RichTextEditor
                      label="질문 설명"
                      value={step.prompts[0]?.body ?? ""}
                      onChange={(value) => updatePrompt(stepIndex, { body: value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
            ),
          )
        )}
      </div>
    </section>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-14 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6">
        <Link to="/admin" className="text-sm font-semibold tracking-tight hover:text-neutral-600">
          Beginner <span className="ml-2 text-xs font-normal text-neutral-500">Admin</span>
        </Link>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          기업 페이지
        </Link>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-medium text-neutral-600">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-700"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block text-xs font-medium text-neutral-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-700"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-neutral-600">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-24 w-full resize-y rounded-md border border-neutral-300 bg-white p-3 text-sm text-neutral-900 outline-none focus:border-neutral-700"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-neutral-600">
      {label}
      <span className="mt-2 flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
        />
        <input
          value={value}
          onChange={(event) =>
            /^#[0-9a-fA-F]{0,6}$/.test(event.target.value) && onChange(event.target.value)
          }
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </span>
    </label>
  );
}
