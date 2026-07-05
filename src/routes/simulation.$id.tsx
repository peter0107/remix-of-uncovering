import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/simulation/$id")({
  head: () => ({ meta: [{ title: "시뮬레이션 — Beginner" }] }),
  component: SimulationDetailPage,
});

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
  const [consent, setConsent] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [startedAt] = useState(() => new Date());

  useEffect(() => {
    if (authLoading) return;

    supabase
      .from("job_simulations")
      .select("id, title, task_prompt, estimated_minutes, companies(name)")
      .eq("id", id)
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

  const handleSubmit = async () => {
    if (!sim) return;
    if (!responseText.trim()) {
      toast.error("답안을 작성해주세요.");
      return;
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
    const { error } = await supabase.from("submissions").insert({
      job_seeker_id: user.id,
      job_simulation_id: sim.id,
      response_text: responseText,
      started_at: startedAt.toISOString(),
      submitted_at: now.toISOString(),
      duration_sec: Math.round((now.getTime() - startedAt.getTime()) / 1000),
      answer_transmission_consent: consent,
    });
    setSubmitting(false);

    if (error) {
      toast.error("제출 중 오류가 발생했어요. 다시 시도해 주세요.");
      return;
    }
    setSubmittedAt(now);
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
          {consent
            ? `${sim.company_name}에 답안이 전달돼요. 관심이 있으면 먼저 연락드릴 수 있어요.`
            : "이번 답안은 기업에 전달되지 않아요. 마이페이지에는 기록으로 남아요."}
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <Button
            className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
            onClick={() =>
              toast.info("groupby 채용 페이지 연동은 준비 중이에요.")
            }
          >
            지원하기
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* 왼쪽: 과제 내용 */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Building2 className="h-3.5 w-3.5" />
            {sim.company_name}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">{sim.title}</h1>
          {sim.estimated_minutes && (
            <div className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5" />
              약 {sim.estimated_minutes}분
            </div>
          )}

          <Card className="mt-6 p-6">
            <div className="prose prose-sm sm:prose-base prose-zinc max-w-none prose-table:text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {sim.task_prompt ?? ""}
              </ReactMarkdown>
            </div>
          </Card>
        </div>

        {/* 오른쪽: 제출 관련 */}
        <div className="flex flex-col lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
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

          <div className="mt-6 shrink-0 rounded-2xl border border-zinc-200 p-5">
            <p className="text-sm font-semibold text-zinc-900">
              이 답안을 {sim.company_name}에 전송하는 것에 동의하시나요?
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              동의하면 답안 원문이 기업 담당자에게 그대로 전달돼요. 동의하지 않아도 제출
              자체는 되고, 마이페이지 이력에는 남아요.
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
