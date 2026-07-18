import { createFileRoute, Link, useNavigate, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  X,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { RichTextContent } from "@/components/RichTextEditor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { chatWithSimulationAssistant } from "@/lib/ai-chat.functions";
import { toast } from "sonner";
import {
  allAnswered,
  buildResponseJson,
  buildResponseText,
  buildWizardModel,
  stepAnswered,
  type WizardModel,
  type WizardStep,
} from "@/lib/simulation-steps";
import { getAdminSimulationPreview } from "@/lib/simulations.functions";

export const Route = createFileRoute("/simulation/$id")({
  head: () => ({ meta: [{ title: "시뮬레이션 — Beginner" }] }),
  validateSearch: z.object({
    preview: z
      .union([z.literal("1"), z.literal(1), z.literal(true)])
      .optional()
      .transform((v) => (v == null ? undefined : ("1" as const))),
  }),
  component: SimulationDetailPage,
});

type SimulationDetail = {
  id: string;
  title: string;
  simulation_source: "company" | "expert";
  expert_nickname: string | null;
  simulation_format: "single" | "selection";
  single_answer_question: string | null;
  task_prompt: string | null;
  steps: unknown;
  estimated_minutes: number | null;
  company_name: string;
};

const MAX_ANSWER_LENGTH = 1000;

function AnswerTextarea({
  id,
  value,
  onChange,
  className = "",
  containerClassName = "",
  ariaLabelledby,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  containerClassName?: string;
  ariaLabelledby?: string;
}) {
  return (
    <div className={`relative min-h-0 ${containerClassName}`}>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, MAX_ANSWER_LENGTH))}
        aria-labelledby={ariaLabelledby}
        maxLength={MAX_ANSWER_LENGTH}
        placeholder="여기에 답안을 작성해주세요"
        className={`min-h-40 resize-none pb-8 ${className}`}
      />
      <span className="pointer-events-none absolute bottom-2 right-3 bg-background/90 px-1 text-[11px] tabular-nums text-zinc-400">
        {value.length.toLocaleString()} / {MAX_ANSWER_LENGTH.toLocaleString()}자
      </span>
    </div>
  );
}

/** 왼쪽 자료 섹션 (라벨 + 마크다운 카드) */
function MaterialSection({ label, markdown }: { label: string; markdown: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500">{label}</p>
      <Card className="mt-2 p-5 pt-3">
        <RichTextContent
          value={markdown.trimStart()}
          className="prose prose-sm prose-zinc max-w-none prose-table:text-sm [&>*:first-child]:!mt-0"
        />
      </Card>
    </div>
  );
}

function StepMeta({ step }: { step: WizardStep }) {
  const hasMeta = step.durationMin != null || step.difficulty != null;
  if (!hasMeta) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
      {step.durationMin != null && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />약 {step.durationMin}분
        </span>
      )}
      {step.difficulty != null && (
        <span className="text-zinc-700">
          {"★".repeat(Math.max(0, Math.min(5, step.difficulty)))}
          <span className="text-zinc-200">
            {"★".repeat(Math.max(0, 5 - Math.min(5, step.difficulty)))}
          </span>
        </span>
      )}
    </div>
  );
}

function SimulationDetailPage() {
  const { id } = Route.useParams();
  const { preview } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isPreview = preview === "1";

  const [sim, setSim] = useState<SimulationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [applicationSent, setApplicationSent] = useState(false);
  const [startedAt] = useState(() => new Date());

  // AI 어시스트 대화 (제출 시 함께 저장돼 기업 담당자 화면에도 노출됨)
  type ChatMessage = { role: "user" | "assistant"; content: string; at: string };
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSending, setChatSending] = useState(false);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    const now = new Date().toISOString();
    const userMsg: ChatMessage = { role: "user", content: text, at: now };
    const history = [...chatMessages, userMsg];
    setChatMessages(history);
    setChatInput("");
    setChatSending(true);
    try {
      const { reply } = await chatWithSimulationAssistant({
        data: {
          simulationId: id,
          messages: history.map(({ role, content }) => ({ role, content })),
        },
      });
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, at: new Date().toISOString() },
      ]);
    } catch (error) {
      // 실패 시 방금 추가한 질문을 되돌리고 입력값을 복원해 재시도할 수 있게 한다.
      setChatMessages((prev) => prev.filter((m) => m !== userMsg));
      setChatInput(text);
      toast.error(
        error instanceof Error
          ? error.message
          : "AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setChatSending(false);
    }
  };

  // 시뮬레이션 진행 중(제출 전)일 때만 이탈을 차단
  const inProgress = Boolean(sim && !submittedAt && !isPreview);

  // 인앱 라우터 이동 차단 + 브라우저 새로고침/닫기 경고
  const blocker = useBlocker({
    shouldBlockFn: () => inProgress,
    enableBeforeUnload: inProgress,
    withResolver: true,
  });

  const model: WizardModel | null = useMemo(
    () =>
      sim?.simulation_format === "selection" ? buildWizardModel(sim.task_prompt, sim.steps) : null,
    [sim?.simulation_format, sim?.task_prompt, sim?.steps],
  );
  const draftKey = `sim-draft-${id}`;

  useEffect(() => {
    if (authLoading) return;

    async function loadSimulation() {
      try {
        if (isPreview) {
          const data = await getAdminSimulationPreview({ data: { id } });
          setSim({
            id: data.id,
            title: data.title,
            simulation_source: data.simulationSource,
            expert_nickname: data.expertNickname || null,
            simulation_format: data.simulationFormat,
            single_answer_question: data.singleAnswerQuestion,
            task_prompt: data.taskPrompt,
            steps: data.steps,
            estimated_minutes: data.estimatedMinutes,
            company_name: data.companyName,
          });
          return;
        }

        const { data } = await supabase
          .from("job_simulations")
          .select(
            "id, title, simulation_source, expert_nickname, simulation_format, single_answer_question, task_prompt, steps, estimated_minutes, companies(name)",
          )
          .eq("id", id)
          .eq("is_public", true)
          .is("deleted_at", null)
          .maybeSingle();

        if (!data) return;
        const row = data as unknown as {
          id: string;
          title: string;
          simulation_source: "company" | "expert" | null;
          expert_nickname: string | null;
          simulation_format: "single" | "selection" | null;
          single_answer_question: string | null;
          task_prompt: string | null;
          steps: unknown;
          estimated_minutes: number | null;
          companies: { name: string } | null;
        };
        setSim({
          id: row.id,
          title: row.title,
          simulation_source: row.simulation_source === "expert" ? "expert" : "company",
          expert_nickname: row.expert_nickname,
          simulation_format: row.simulation_format === "selection" ? "selection" : "single",
          single_answer_question: row.single_answer_question,
          task_prompt: row.task_prompt,
          steps: row.steps,
          estimated_minutes: row.estimated_minutes,
          company_name:
            row.simulation_source === "expert"
              ? row.expert_nickname || "현직자"
              : (row.companies?.name ?? ""),
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "시뮬레이션을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    void loadSimulation();
  }, [id, isPreview, user, authLoading]);

  // 위저드 임시저장 복원 (이탈 방지)
  useEffect(() => {
    if (!model || typeof window === "undefined" || isPreview) return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw) as { answers?: Record<string, string>; stepIdx?: number };
        if (saved.answers) setAnswers(saved.answers);
        if (typeof saved.stepIdx === "number") {
          setStepIdx(Math.min(Math.max(saved.stepIdx, 0), model.steps.length - 1));
        }
      }
    } catch {
      // 무시
    }
  }, [model, draftKey, isPreview]);

  // 위저드 임시저장
  useEffect(() => {
    if (!model || typeof window === "undefined" || submittedAt || isPreview) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ answers, stepIdx }));
    } catch {
      // 무시
    }
  }, [answers, stepIdx, model, draftKey, submittedAt, isPreview]);

  const setAnswer = (qid: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [qid]: value }));

  const handleSubmit = async () => {
    if (!sim) return;
    if (isPreview) {
      toast("미리보기에서는 답안을 제출할 수 없습니다.");
      return;
    }

    let response_text: string;
    let response_json: ReturnType<typeof buildResponseJson> | null = null;

    if (model) {
      if (!allAnswered(model, answers)) {
        toast.error("모든 항목에 답변을 작성해주세요.");
        return;
      }
      response_text = buildResponseText(model, answers);
      response_json = buildResponseJson(model, answers);
    } else {
      if (!responseText.trim()) {
        toast.error("답안을 작성해주세요.");
        return;
      }
      response_text = responseText;
    }

    if (consent === null) {
      toast.error("답안 전송 동의 여부를 선택해주세요.");
      return;
    }
    if (!user) {
      toast.error("제출하려면 로그인이 필요해요.");
      navigate({ to: "/login", search: { redirect: `/simulation/${id}` } });
      return;
    }

    setSubmitting(true);
    const now = new Date();
    const { data: submission, error } = await supabase
      .from("submissions")
      .insert({
        job_seeker_id: user.id,
        job_simulation_id: sim.id,
        response_text,
        started_at: startedAt.toISOString(),
        submitted_at: now.toISOString(),
        duration_sec: Math.round((now.getTime() - startedAt.getTime()) / 1000),
        answer_transmission_consent: consent,
        ai_chat_log: chatMessages,
        ...(response_json ? { response_json } : {}),
      })
      .select("id")
      .single();
    setSubmitting(false);

    if (error) {
      toast.error("제출 중 오류가 발생했어요. 다시 시도해 주세요.");
      return;
    }
    if (!submission) {
      toast.error("제출 확인 중 오류가 발생했어요. 다시 시도해 주세요.");
      return;
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        // 무시
      }
    }
    setSubmittedId(submission.id);
    setApplicationSent(consent === true);
    setSubmittedAt(now);
  };

  const handleApply = async () => {
    if (!sim) return;
    if (!user) {
      toast.error("지원하려면 로그인이 필요해요.");
      navigate({ to: "/login", search: { redirect: `/simulation/${id}` } });
      return;
    }

    setApplying(true);

    let targetSubmissionId = submittedId;
    if (!targetSubmissionId) {
      const { data: latestSubmission, error: findError } = await supabase
        .from("submissions")
        .select("id")
        .eq("job_seeker_id", user.id)
        .eq("job_simulation_id", sim.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError || !latestSubmission) {
        setApplying(false);
        toast.error("먼저 시뮬레이션 답안을 제출해주세요.");
        return;
      }
      targetSubmissionId = latestSubmission.id;
      setSubmittedId(latestSubmission.id);
    }

    const { error } = await supabase
      .from("submissions")
      .update({ answer_transmission_consent: true })
      .eq("id", targetSubmissionId)
      .eq("job_seeker_id", user.id);

    setApplying(false);

    if (error) {
      toast.error("지원 처리 중 오류가 발생했어요. 다시 시도해 주세요.");
      return;
    }

    setApplicationSent(true);
    toast.success(`${sim.company_name}에 지원했어요. 기업 화면에서 확인할 수 있습니다.`);
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    );
  }

  if (!sim) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-zinc-500">시뮬레이션을 찾을 수 없어요.</p>
        <Link to="/simulations" className="mt-4 inline-block text-sm text-zinc-700 underline">
          추천 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  if (submittedAt) {
    const isExpertSimulation = sim.simulation_source === "expert";
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-zinc-900" />
        <h1 className="mt-4 text-xl font-bold text-zinc-900">제출이 완료됐어요</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {isExpertSimulation
            ? "현직자 모범답안과 AI 활용 기록을 확인할 수 있어요."
            : applicationSent
              ? `${sim.company_name}에 답안이 전달돼요. 관심이 있으면 먼저 연락드릴 수 있어요.`
              : "지원하기를 누르면 이력서와 시뮬레이션 답안이 기업 담당자 화면에 표시돼요."}
        </p>
        <div className="mt-8 flex flex-col gap-2">
          {isExpertSimulation ? (
            <Link
              to="/expert-simulation/$id/feedback"
              params={{ id: sim.id }}
              search={submittedId ? { submission: submittedId } : {}}
            >
              <Button className="w-full rounded-md bg-zinc-900 text-white hover:bg-zinc-700">
                현직자 피드백 보기
              </Button>
            </Link>
          ) : (
            <Button
              className="rounded-md bg-zinc-900 text-white hover:bg-zinc-700"
              disabled={applying || applicationSent}
              onClick={handleApply}
            >
              {applicationSent ? "지원 완료" : applying ? "지원 중..." : "지원하기"}
            </Button>
          )}
          <Link to="/simulations">
            <Button variant="outline" className="w-full rounded-md">
              다른 시뮬레이션 더 보기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isExpertSimulation = sim.simulation_source === "expert";
  const header = (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        {isExpertSimulation ? (
          <UserRound className="h-3.5 w-3.5" />
        ) : (
          <Building2 className="h-3.5 w-3.5" />
        )}
        {sim.company_name}
      </div>
      <h1 className="mt-1 text-2xl font-bold text-zinc-900">{sim.title}</h1>
      {sim.estimated_minutes && (
        <div className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
          <Clock className="h-3.5 w-3.5" />약 {sim.estimated_minutes}분
          {model && <span className="text-zinc-300">· 단계별로 나눠서 진행돼요</span>}
        </div>
      )}
    </div>
  );

  const consentBlock = (
    <div className="mt-6 shrink-0 rounded-md border border-zinc-200 p-5">
      <p className="text-sm font-semibold text-zinc-900">
        {isExpertSimulation
          ? "이 답안과 AI 활용 기록을 피드백 화면에 저장할까요?"
          : `이 답안을 ${sim.company_name}에 전송하는 것에 동의하시나요?`}
      </p>
      {!isExpertSimulation && (
        <p className="mt-1 text-xs text-zinc-400">
          동의하면 답안 원문이 기업 담당자에게 그대로 전달돼요. 동의하지 않아도 제출 자체는 되고,
          마이페이지 이력에는 남아요.
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setConsent(true)}
          className={cn(
            "flex-1 rounded-md border-2 px-4 py-3 text-left text-sm transition-colors",
            consent === true
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400",
          )}
        >
          네, 전송할게요
        </button>
        <button
          type="button"
          onClick={() => setConsent(false)}
          className={cn(
            "flex-1 rounded-md border-2 px-4 py-3 text-left text-sm transition-colors",
            consent === false
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400",
          )}
        >
          아니요, 이번엔 비공개로 할게요
        </button>
      </div>
    </div>
  );

  const blockerDialog = (
    <AlertDialog open={blocker.status === "blocked"}>
      <AlertDialogContent className="data-[state=closed]:!animate-none data-[state=open]:!animate-none">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            지금 나가시겠어요?
          </AlertDialogTitle>
          <AlertDialogDescription>
            진행 중인 시뮬레이션을 나가면 <b>응시 기록이 남아요.</b> 작성 중인 답안은 저장되지
            않으니, 마저 작성하고 제출하는 걸 권해요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset?.()}>계속 진행하기</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => blocker.proceed?.()}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            기록 남기고 나가기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const aiPanel = (
    <>
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md border border-zinc-900 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          aria-label="AI 어시스트 열기"
        >
          <MessageCircle className="h-5 w-5" />
          <span>AI에게 질문</span>
        </button>
      )}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">AI 어시스트</p>
                <p className="text-[11px] text-zinc-400">
                  대화 내용은 제출 시 담당자에게 함께 전달돼요
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {chatMessages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-xs text-zinc-400">
                <MessageCircle className="mb-2 h-8 w-8 text-zinc-300" />
                과제 이해가 어렵거나 접근 방법이 막힐 때<br />
                편하게 물어보세요.
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm leading-relaxed",
                    m.role === "user" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatSending && (
              <div className="flex justify-start">
                <div className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
                  생각 중…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendChat();
            }}
            className="flex items-end gap-2 border-t border-zinc-100 bg-white p-3"
          >
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value.slice(0, MAX_ANSWER_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendChat();
                }
              }}
              placeholder="AI에게 질문하기…"
              maxLength={MAX_ANSWER_LENGTH}
              rows={1}
              className="min-h-9 flex-1 resize-none rounded-md text-sm"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!chatInput.trim() || chatSending}
              className="h-9 w-9 shrink-0 rounded-md bg-zinc-900 text-white hover:bg-zinc-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );

  // ---------- 스텝 위저드 ----------
  if (model) {
    const step = model.steps[stepIdx];
    const isLast = stepIdx === model.steps.length - 1;
    const canAdvance = stepAnswered(step, answers);
    const showCompletion = canAdvance && step.completionMessage;

    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        {blockerDialog}
        {aiPanel}
        {header}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* 왼쪽: 이 단계의 자료 (단계마다 다름) */}
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            <div className="flex flex-col gap-5">
              {step.situation && <MaterialSection label="상황 안내" markdown={step.situation} />}
              {step.materials && <MaterialSection label="제공 자료" markdown={step.materials} />}
              {/* 자동 분할(폴백): 전 단계 공통 배경 */}
              {model.sharedBackground && (
                <MaterialSection label="과제 배경·자료" markdown={model.sharedBackground} />
              )}
            </div>
          </div>

          {/* 오른쪽: 현재 스텝 질문 */}
          <div className="flex flex-col">
            {/* 진행바 */}
            <div className="flex gap-1.5">
              {model.steps.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-sm transition-colors",
                    i < stepIdx ? "bg-zinc-900" : i === stepIdx ? "bg-zinc-900/50" : "bg-zinc-200",
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Step {stepIdx + 1} / {model.steps.length}
            </p>

            {/* 저작 스텝: 단계 제목 + 메타 */}
            {model.authored && (
              <div className="mt-3">
                <h2 className="text-lg font-bold text-zinc-900">{step.title}</h2>
                <StepMeta step={step} />
              </div>
            )}

            {/* 질문들 */}
            <div className="mt-5 flex flex-col gap-8">
              {step.prompts.map((p) => (
                <div key={p.id}>
                  <h3 className="text-base font-bold text-zinc-900">{p.label}</h3>
                  {p.bodyMarkdown && (
                    <div className="prose prose-sm prose-zinc mt-2 max-w-none prose-table:text-sm prose-headings:text-sm prose-headings:font-semibold">
                      <RichTextContent value={p.bodyMarkdown} />
                    </div>
                  )}
                  <AnswerTextarea
                    value={answers[p.id] ?? ""}
                    onChange={(value) => setAnswer(p.id, value)}
                    containerClassName="mt-3"
                  />
                </div>
              ))}
            </div>

            {/* 초심자용 힌트 */}
            {step.hint && (
              <details className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-700">
                  초심자용 힌트 보기
                </summary>
                <div className="prose prose-sm prose-zinc mt-3 max-w-none prose-table:text-sm">
                  <RichTextContent value={step.hint} />
                </div>
              </details>
            )}

            {/* 단계 완료 메시지 */}
            {showCompletion && (
              <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <div className="prose prose-sm prose-emerald max-w-none">
                  <RichTextContent value={step.completionMessage as string} />
                </div>
              </div>
            )}

            {/* 마지막 스텝: 동의 */}
            {isLast && consentBlock}

            {/* 네비게이션 */}
            <div className="mt-8 flex gap-2">
              {stepIdx > 0 && (
                <Button
                  variant="outline"
                  className="rounded-md"
                  onClick={() => {
                    setStepIdx((i) => i - 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  이전
                </Button>
              )}
              {isLast ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  size="lg"
                  className="flex-1 rounded-md bg-zinc-900 text-white hover:bg-zinc-700"
                >
                  {submitting ? "제출 중..." : "제출하기"}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (!canAdvance) {
                      toast.error("이 단계의 답변을 먼저 작성해주세요.");
                      return;
                    }
                    setStepIdx((i) => i + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={!canAdvance}
                  size="lg"
                  className="flex-1 rounded-md bg-zinc-900 text-white hover:bg-zinc-700"
                >
                  다음 단계 →
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 폴백: 단일 화면 (템플릿을 벗어난 과제) ----------
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {blockerDialog}
      {aiPanel}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 왼쪽: 과제 내용 */}
        <div>
          {header}
          <Card className="mt-6 p-6">
            <div className="prose prose-sm sm:prose-base prose-zinc max-w-none prose-table:text-sm">
              <RichTextContent value={sim.task_prompt ?? ""} />
            </div>
          </Card>
        </div>

        {/* 오른쪽: 제출 관련 */}
        <div className="flex flex-col">
          <div className="flex flex-col">
            <div id="response-question" className="shrink-0">
              <p className="text-sm font-medium text-zinc-700">제출 질문</p>
              <Card className="mt-2 p-4">
                <div className="prose prose-sm prose-zinc max-w-none prose-table:text-sm">
                  <RichTextContent value={sim.single_answer_question?.trim() || "답안 작성"} />
                </div>
              </Card>
            </div>
            <AnswerTextarea
              id="response"
              value={responseText}
              onChange={setResponseText}
              ariaLabelledby="response-question"
              className="min-h-64"
              containerClassName="mt-4"
            />
          </div>

          {consentBlock}

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="mt-6 w-full shrink-0 rounded-md bg-zinc-900 text-white hover:bg-zinc-700"
          >
            {submitting ? "제출 중..." : "제출하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
