import { createFileRoute, Link, useNavigate, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import { toast } from "sonner";
import {
  allAnswered,
  buildResponseJson,
  buildResponseText,
  parseSimulationSteps,
  stepAnswered,
  type ParsedSimulation,
} from "@/lib/simulation-steps";

export const Route = createFileRoute("/simulation/$id")({
  head: () => ({ meta: [{ title: "시뮬레이션 — Beginner" }] }),
  component: SimulationDetailPage,
});

const LOW_TIME_THRESHOLD_SEC = 5 * 60; // 5분 이하 남으면 빨간색 경고

function formatRemaining(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type SimulationDetail = {
  id: string;
  title: string;
  task_prompt: string | null;
  estimated_minutes: number | null;
  company_name: string;
};

function SimulationDetailPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  // 시뮬레이션 진행 중(제출 전)일 때만 이탈을 차단
  const inProgress = Boolean(sim && !submittedAt);

  // 인앱 라우터 이동 차단 + 브라우저 새로고침/닫기 경고
  const blocker = useBlocker({
    shouldBlockFn: () => inProgress,
    enableBeforeUnload: inProgress,
    withResolver: true,
  });

  // 남은 시간 카운트다운 (예상 소요 시간 기준)
  useEffect(() => {
    if (!sim?.estimated_minutes || submittedAt) {
      setRemainingSec(null);
      return;
    }
    const totalSec = sim.estimated_minutes * 60;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      setRemainingSec(Math.max(0, totalSec - elapsed));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [sim?.estimated_minutes, submittedAt, startedAt]);

  const parsed: ParsedSimulation | null = useMemo(
    () => parseSimulationSteps(sim?.task_prompt),
    [sim?.task_prompt],
  );
  const draftKey = `sim-draft-${id}`;

  useEffect(() => {
    if (authLoading) return;

    supabase
      .from("job_simulations")
      .select("id, title, task_prompt, estimated_minutes, companies(name)")
      .eq("id", id)
      .eq("is_public", true)
      .is("deleted_at", null)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const row = data as unknown as {
            id: string;
            title: string;
            task_prompt: string | null;
            estimated_minutes: number | null;
            companies: { name: string } | null;
          };
          setSim({
            id: row.id,
            title: row.title,
            task_prompt: row.task_prompt,
            estimated_minutes: row.estimated_minutes,
            company_name: row.companies?.name ?? "",
          });
        }
        setLoading(false);
      });
  }, [id, user, authLoading, navigate]);

  // 위저드 임시저장 복원 (이탈 방지)
  useEffect(() => {
    if (!parsed || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw) as { answers?: Record<string, string>; stepIdx?: number };
        if (saved.answers) setAnswers(saved.answers);
        if (typeof saved.stepIdx === "number") {
          setStepIdx(Math.min(Math.max(saved.stepIdx, 0), parsed.steps.length - 1));
        }
      }
    } catch {
      // 무시
    }
  }, [parsed, draftKey]);

  // 위저드 임시저장
  useEffect(() => {
    if (!parsed || typeof window === "undefined" || submittedAt) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ answers, stepIdx }));
    } catch {
      // 무시
    }
  }, [answers, stepIdx, parsed, draftKey, submittedAt]);

  const setAnswer = (qid: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [qid]: value }));

  const handleSubmit = async () => {
    if (!sim) return;

    let response_text: string;
    let response_json: ReturnType<typeof buildResponseJson> | null = null;

    if (parsed) {
      if (!allAnswered(parsed, answers)) {
        toast.error("모든 항목에 답변을 작성해주세요.");
        return;
      }
      response_text = buildResponseText(parsed, answers);
      response_json = buildResponseJson(parsed, answers);
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
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-zinc-900" />
        <h1 className="mt-4 text-xl font-bold text-zinc-900">제출이 완료됐어요</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {applicationSent
            ? `${sim.company_name}에 답안이 전달돼요. 관심이 있으면 먼저 연락드릴 수 있어요.`
            : "지원하기를 누르면 이력서와 시뮬레이션 답안이 기업 담당자 화면에 표시돼요."}
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <Button
            className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
            disabled={applying || applicationSent}
            onClick={handleApply}
          >
            {applicationSent ? "지원 완료" : applying ? "지원 중..." : "지원하기"}
          </Button>
          <Link to="/simulations">
            <Button variant="outline" className="w-full rounded-xl">
              다른 시뮬레이션 더 보기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const header = (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <Building2 className="h-3.5 w-3.5" />
        {sim.company_name}
      </div>
      <h1 className="mt-1 text-2xl font-bold text-zinc-900">{sim.title}</h1>
      {sim.estimated_minutes && (
        <div className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
          <Clock className="h-3.5 w-3.5" />약 {sim.estimated_minutes}분
          {parsed && <span className="text-zinc-300">· 스텝별로 나눠서 진행돼요</span>}
        </div>
      )}
    </div>
  );

  const consentBlock = (
    <div className="mt-6 shrink-0 rounded-2xl border border-zinc-200 p-5">
      <p className="text-sm font-semibold text-zinc-900">
        이 답안을 {sim.company_name}에 전송하는 것에 동의하시나요?
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        동의하면 답안 원문이 기업 담당자에게 그대로 전달돼요. 동의하지 않아도 제출 자체는 되고,
        마이페이지 이력에는 남아요.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setConsent(true)}
          className={cn(
            "flex-1 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all",
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
            "flex-1 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all",
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
      <AlertDialogContent>
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

  const timerBadge = remainingSec !== null && (
    <div
      className={cn(
        "mb-4 flex shrink-0 items-center justify-between rounded-xl border px-4 py-3 transition-colors",
        remainingSec <= LOW_TIME_THRESHOLD_SEC
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-zinc-200 bg-zinc-50 text-zinc-700",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Clock className="h-3.5 w-3.5" />
        남은 시간
      </div>
      <div className="flex items-center gap-1.5">
        {remainingSec <= LOW_TIME_THRESHOLD_SEC && <AlertTriangle className="h-4 w-4" />}
        <span className="font-mono text-lg font-bold tabular-nums">
          {formatRemaining(remainingSec)}
        </span>
      </div>
    </div>
  );

  // ---------- 스텝 위저드 ----------
  if (parsed) {
    const step = parsed.steps[stepIdx];
    const isLast = stepIdx === parsed.steps.length - 1;
    const canAdvance = stepAnswered(step, answers);

    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        {blockerDialog}
        {header}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* 왼쪽: 과제 배경·자료 (모든 스텝에서 참고) */}
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            <details open className="group">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-zinc-400">
                과제 배경·자료 <span className="text-zinc-300 group-open:hidden">펼치기</span>
              </summary>
              <Card className="mt-3 p-6">
                <div className="prose prose-sm prose-zinc max-w-none prose-table:text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.background}</ReactMarkdown>
                </div>
              </Card>
            </details>
          </div>

          {/* 오른쪽: 현재 스텝 질문 */}
          <div className="flex flex-col">
            {timerBadge}
            {/* 진행바 */}
            <div className="flex gap-1.5">
              {parsed.steps.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < stepIdx ? "bg-zinc-900" : i === stepIdx ? "bg-zinc-900/50" : "bg-zinc-200",
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Step {stepIdx + 1} / {parsed.steps.length}
            </p>

            {/* 질문들 */}
            <div className="mt-4 flex flex-col gap-8">
              {step.questions.map((q) => (
                <div key={q.id}>
                  <h2 className="text-base font-bold text-zinc-900">
                    {q.num}. {q.title}
                  </h2>
                  {q.bodyMarkdown && (
                    <div className="prose prose-sm prose-zinc mt-2 max-w-none prose-table:text-sm prose-headings:text-sm prose-headings:font-semibold">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.bodyMarkdown}</ReactMarkdown>
                    </div>
                  )}
                  <Textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="여기에 답안을 작성해주세요"
                    className="mt-3 min-h-40 resize-none"
                  />
                </div>
              ))}
            </div>

            {/* 마지막 스텝: 동의 */}
            {isLast && consentBlock}

            {/* 네비게이션 */}
            <div className="mt-8 flex gap-2">
              {stepIdx > 0 && (
                <Button
                  variant="outline"
                  className="rounded-xl"
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
                  className="flex-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
                >
                  {submitting ? "제출 중..." : "제출하기"}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (!canAdvance) {
                      toast.error("이 스텝의 답변을 먼저 작성해주세요.");
                      return;
                    }
                    setStepIdx((i) => i + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={!canAdvance}
                  size="lg"
                  className="flex-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
                >
                  다음 스텝 →
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

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 왼쪽: 과제 내용 */}
        <div>
          {header}
          <Card className="mt-6 p-6">
            <div className="prose prose-sm sm:prose-base prose-zinc max-w-none prose-table:text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{sim.task_prompt ?? ""}</ReactMarkdown>
            </div>
          </Card>
        </div>

        {/* 오른쪽: 제출 관련 */}
        <div className="flex flex-col lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
          {timerBadge}
          <div className="flex min-h-0 flex-1 flex-col">
            <label htmlFor="response" className="text-sm font-medium text-zinc-700">
              답안 작성
            </label>
            <Textarea
              id="response"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="여기에 답안을 작성해주세요"
              className="mt-2 min-h-40 flex-1 resize-none"
            />
          </div>

          {consentBlock}

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="mt-6 w-full shrink-0 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
          >
            {submitting ? "제출 중..." : "제출하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
