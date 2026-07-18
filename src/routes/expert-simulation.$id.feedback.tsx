import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BotMessageSquare, ChevronLeft, FileCheck2 } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { RichTextContent } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  getExpertSimulationFeedback,
  type ExpertSimulationFeedback,
} from "@/lib/expert-simulations.functions";

export const Route = createFileRoute("/expert-simulation/$id/feedback")({
  validateSearch: z.object({ submission: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "현직자 피드백 — Beginner" }] }),
  component: ExpertSimulationFeedbackPage,
});

function ExpertSimulationFeedbackPage() {
  const { id } = Route.useParams();
  const { submission } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [feedback, setFeedback] = useState<ExpertSimulationFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: `/expert-simulation/${id}/feedback` } });
      return;
    }

    void getExpertSimulationFeedback({ data: { simulationId: id, submissionId: submission } })
      .then(setFeedback)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "피드백을 불러오지 못했습니다."),
      );
  }, [authLoading, id, navigate, submission, user]);

  if (authLoading || (!feedback && !error)) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-sm text-zinc-500">불러오는 중입니다.</main>
    );
  }

  if (error || !feedback) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-sm text-zinc-500">{error || "피드백을 불러오지 못했습니다."}</p>
        <Link to="/expert-simulations" className="mt-5 inline-block text-sm underline">
          현직자 시뮬레이션으로 돌아가기
        </Link>
      </main>
    );
  }

  const userQuestions = feedback.submission.aiChatLog.filter(
    (message) => message.role === "user",
  ).length;
  const expertMeta = [
    feedback.simulation.companyType,
    feedback.simulation.experienceBand,
    feedback.simulation.jobTitle,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <Link
        to="/simulation/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" /> 시뮬레이션으로 돌아가기
      </Link>

      <div className="mt-5 border-b border-zinc-200 pb-6">
        <p className="text-sm font-semibold text-zinc-900">{feedback.simulation.nickname}</p>
        <p className="mt-1 text-xs text-zinc-500">{expertMeta}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">
          {feedback.simulation.title}
        </h1>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <section className="min-w-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-zinc-700" />
            <h2 className="text-lg font-semibold">현직자 모범답안</h2>
          </div>
          {feedback.simulation.modelAnswer ? (
            <div className="prose prose-zinc mt-4 max-w-none text-sm prose-headings:tracking-tight prose-table:text-sm">
              <RichTextContent value={feedback.simulation.modelAnswer} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">등록된 모범답안이 없습니다.</p>
          )}
        </section>

        <section className="min-w-0 border-l border-zinc-200 pl-0 lg:pl-8">
          <div className="flex items-center gap-2">
            <BotMessageSquare className="h-5 w-5 text-zinc-700" />
            <h2 className="text-lg font-semibold">AI 활용 능력</h2>
          </div>
          <p className="mt-3 text-sm text-zinc-600">AI 질문 {userQuestions}회</p>
          {feedback.simulation.aiFeedback && (
            <div className="prose prose-sm prose-zinc mt-5 max-w-none prose-table:text-sm">
              <RichTextContent value={feedback.simulation.aiFeedback} />
            </div>
          )}
          <div className="mt-6 border-t border-zinc-200 pt-4">
            <p className="text-sm font-semibold">AI 대화 기록</p>
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
        </section>
      </div>

      <div className="mt-10 border-t border-zinc-200 pt-6">
        <Link to="/expert-simulations">
          <Button variant="outline" className="rounded-md">
            다른 현직자 시뮬레이션 보기
          </Button>
        </Link>
      </div>
    </main>
  );
}
