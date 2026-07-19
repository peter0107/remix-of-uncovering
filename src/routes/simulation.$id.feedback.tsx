import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BotMessageSquare, ChevronLeft, FileCheck2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  getCompanySimulationFeedback,
  type CompanySimulationFeedback,
} from "@/lib/simulations.functions";

export const Route = createFileRoute("/simulation/$id/feedback")({
  validateSearch: z.object({ submission: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "시뮬레이션 평가 — Beginner" }] }),
  component: CompanySimulationFeedbackPage,
});

function CompanySimulationFeedbackPage() {
  const { id } = Route.useParams();
  const { submission } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [feedback, setFeedback] = useState<CompanySimulationFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: `/simulation/${id}/feedback` } });
      return;
    }

    void getCompanySimulationFeedback({ data: { simulationId: id, submissionId: submission } })
      .then(setFeedback)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "평가 결과를 불러오지 못했습니다."),
      );
  }, [authLoading, id, navigate, submission, user]);

  if (authLoading || (!feedback && !error)) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-sm text-zinc-500">불러오는 중입니다.</main>;
  }

  if (error || !feedback) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-sm text-zinc-500">{error || "평가 결과를 불러오지 못했습니다."}</p>
        <Link to="/my" className="mt-5 inline-block text-sm underline">
          마이페이지로 돌아가기
        </Link>
      </main>
    );
  }

  const review = feedback.aiReview;
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <Link
        to="/my"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" /> 마이페이지
      </Link>

      <div className="mt-5 border-b border-zinc-200 pb-6">
        <p className="text-sm font-semibold text-zinc-900">{feedback.simulation.companyName}</p>
        <p className="mt-1 text-xs text-zinc-500">{feedback.simulation.roleLabel}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">
          {feedback.simulation.title}
        </h1>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <section className="min-w-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-zinc-700" />
            <h2 className="text-lg font-semibold">제출 답변</h2>
          </div>
          <div className="mt-4 space-y-5 text-sm leading-6 text-zinc-700">
            {feedback.submission.responseAnswers.map((answer) => (
              <section key={answer.id || answer.label} className="border-b border-zinc-200 pb-5 last:border-0">
                <h3 className="font-semibold text-zinc-900">{answer.label}</h3>
                <p className="mt-2 whitespace-pre-wrap">{answer.answer}</p>
              </section>
            ))}
            {feedback.submission.responseText && (
              <p className="whitespace-pre-wrap">{feedback.submission.responseText}</p>
            )}
          </div>
        </section>

        <aside className="min-w-0 border-l border-zinc-200 pl-0 lg:pl-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-zinc-700" />
            <h2 className="text-lg font-semibold">AI 평가</h2>
          </div>
          {review ? (
            <div className="mt-4 space-y-7 text-sm leading-6 text-zinc-700">
              <ReviewBlock
                title={`시뮬레이션 결과물 ${review.simulation.score}점`}
                summary={review.simulation.summary}
                strengths={review.simulation.strengths}
                improvements={review.simulation.concerns}
                improvementLabel="보완"
              />
              <ReviewBlock
                title={`AI 활용 능력 ${review.aiUtilization.score}점`}
                summary={review.aiUtilization.summary}
                strengths={review.aiUtilization.strengths}
                improvements={review.aiUtilization.improvements}
                improvementLabel="보완"
              />
              {review.interviewQuestions.length > 0 && (
                <section>
                  <h3 className="font-semibold text-zinc-900">면접 질문</h3>
                  <div className="mt-2 space-y-3">
                    {review.interviewQuestions.map((question, index) => (
                      <div key={`${question.question}-${index}`}>
                        <p className="font-medium text-zinc-900">{question.question}</p>
                        <p className="mt-1 text-xs text-zinc-500">{question.intent}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">AI 평가 결과가 아직 없습니다.</p>
          )}

          <div className="mt-7 border-t border-zinc-200 pt-4">
            <div className="flex items-center gap-2">
              <BotMessageSquare className="h-4 w-4 text-zinc-700" />
              <h3 className="text-sm font-semibold">AI 대화 기록</h3>
            </div>
            <div className="mt-3 space-y-3">
              {feedback.submission.aiChatLog.length > 0 ? (
                feedback.submission.aiChatLog.map((message, index) => (
                  <div key={`${message.at}-${index}`} className="text-sm leading-6 text-zinc-700">
                    <span className="font-semibold">{message.role === "user" ? "나" : "AI"}</span>
                    <p className="mt-1 whitespace-pre-wrap text-zinc-600">{message.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">AI 대화 기록이 없습니다.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-10 border-t border-zinc-200 pt-6">
        <Link to="/my">
          <Button variant="outline" className="rounded-md">
            마이페이지로 돌아가기
          </Button>
        </Link>
      </div>
    </main>
  );
}

function ReviewBlock({
  title,
  summary,
  strengths,
  improvements,
  improvementLabel,
}: {
  title: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  improvementLabel: string;
}) {
  return (
    <section>
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2">{summary}</p>
      {strengths.length > 0 && <p className="mt-2 text-xs text-zinc-500">강점: {strengths.join(" · ")}</p>}
      {improvements.length > 0 && (
        <p className="mt-1 text-xs text-zinc-500">
          {improvementLabel}: {improvements.join(" · ")}
        </p>
      )}
    </section>
  );
}
