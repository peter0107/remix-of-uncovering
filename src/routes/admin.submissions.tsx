import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BotMessageSquare, FileText, Pencil, RefreshCw, Save, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  evaluateAdminSubmissionWithAi,
  getAdminSubmissionAnswers,
  updateAdminSubmissionAiReview,
  type AdminSubmissionAiReview,
  type AdminSubmissionAnswer,
} from "@/lib/simulations.functions";

export const Route = createFileRoute("/admin/submissions")({
  head: () => ({
    meta: [
      { title: "Beginner - 제출된 답변" },
      { name: "description", content: "유저의 제출 결과물과 AI 대화 로그를 확인합니다." },
    ],
  }),
  component: AdminSubmissions,
});

function AdminSubmissions() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<AdminSubmissionAnswer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  const selected = useMemo(
    () => submissions.find((submission) => submission.id === selectedId) ?? submissions[0] ?? null,
    [submissions, selectedId],
  );

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminSubmissionAnswers();
      setSubmissions(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "제출 답변을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      navigate({ to: "/login", search: { redirect: "/admin/submissions" } });
      return;
    }
    if (loadedUserIdRef.current === userId) return;
    loadedUserIdRef.current = userId;
    void loadSubmissions();
  }, [authLoading, userId, navigate, loadSubmissions]);

  const saveReview = useCallback((submissionId: string, review: AdminSubmissionAiReview) => {
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === submissionId ? { ...submission, aiReview: review } : submission,
      ),
    );
  }, []);

  const evaluateSubmission = useCallback(
    async (submissionId: string) => {
      if (evaluatingId) return;
      setEvaluatingId(submissionId);
      try {
        const review = await evaluateAdminSubmissionWithAi({ data: { submissionId } });
        saveReview(submissionId, review);
        toast.success("AI 평가를 저장했습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "AI 평가를 생성하지 못했습니다.");
      } finally {
        setEvaluatingId(null);
      }
    },
    [evaluatingId, saveReview],
  );

  const updateReview = useCallback(
    async (submissionId: string, analysis: Omit<AdminSubmissionAiReview, "updatedAt">) => {
      const review = await updateAdminSubmissionAiReview({ data: { submissionId, analysis } });
      saveReview(submissionId, review);
    },
    [saveReview],
  );

  return (
    <AdminShell>
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">제출된 답변</h1>
          <p className="mt-2 text-sm text-neutral-500">유저 결과물과 AI 대화 로그를 확인합니다.</p>
        </div>
        <button
          type="button"
          onClick={loadSubmissions}
          disabled={isLoading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      </div>

      {authLoading || isLoading ? (
        <div className="py-16 text-center text-sm text-neutral-500">
          제출 답변을 불러오는 중입니다...
        </div>
      ) : submissions.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-neutral-300 px-5 py-16 text-center text-sm text-neutral-500">
          아직 제출된 답변이 없습니다.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-md border border-neutral-200">
            <div className="border-b border-neutral-200 px-4 py-3">
              <p className="text-sm font-semibold">제출 목록</p>
              <p className="mt-1 text-xs text-neutral-500">총 {submissions.length}건</p>
            </div>
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto p-2">
              {submissions.map((submission) => (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => setSelectedId(submission.id)}
                  className={`w-full rounded-md px-3 py-3 text-left transition-colors ${
                    selected?.id === submission.id
                      ? "bg-neutral-900 text-white"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <p className="truncate text-sm font-semibold">{submission.applicantName}</p>
                  <p
                    className={`mt-1 truncate text-xs ${selected?.id === submission.id ? "text-neutral-300" : "text-neutral-500"}`}
                  >
                    {submission.companyName} · {submission.roleLabel}
                  </p>
                  <p
                    className={`mt-2 text-xs ${selected?.id === submission.id ? "text-neutral-400" : "text-neutral-400"}`}
                  >
                    {submission.submittedAt}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          {selected && (
            <SubmissionDetail
              submission={selected}
              isEvaluating={evaluatingId === selected.id}
              onEvaluate={evaluateSubmission}
              onSaveReview={updateReview}
            />
          )}
        </div>
      )}
    </AdminShell>
  );
}

function SubmissionDetail({
  submission,
  isEvaluating,
  onEvaluate,
  onSaveReview,
}: {
  submission: AdminSubmissionAnswer;
  isEvaluating: boolean;
  onEvaluate: (submissionId: string) => Promise<void>;
  onSaveReview: (
    submissionId: string,
    analysis: Omit<AdminSubmissionAiReview, "updatedAt">,
  ) => Promise<void>;
}) {
  const duration = submission.durationSeconds
    ? `${Math.max(1, Math.round(submission.durationSeconds / 60))}분`
    : "-";
  const [isAiReviewOpen, setIsAiReviewOpen] = useState(false);

  const openAiReview = () => {
    setIsAiReviewOpen(true);
    if (!submission.aiReview) void onEvaluate(submission.id);
  };

  return (
    <section className="min-w-0 rounded-md border border-neutral-200">
      <div className="border-b border-neutral-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              {submission.companyName} · {submission.companyCode}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {submission.applicantName}
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              {submission.applicantEmail || "이메일 미입력"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openAiReview}
              disabled={isEvaluating}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isEvaluating ? "AI 평가 중" : submission.aiReview ? "AI 평가 보기" : "AI 평가"}
            </button>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${submission.isSharedWithCompany ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}
            >
              {submission.isSharedWithCompany ? "기업 공유" : "개인 제출"}
            </span>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500">직무</dt>
            <dd className="mt-1 font-medium">{submission.roleLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">시뮬레이션</dt>
            <dd className="mt-1 font-medium">{submission.simulationTitle}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">제출 / 소요 시간</dt>
            <dd className="mt-1 font-medium">
              {submission.submittedAt} · {duration}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-2">
        <section>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold">결과물</h3>
          </div>
          <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            {submission.responseAnswers.length > 0 ? (
              <div className="space-y-5">
                {submission.responseAnswers.map((answer, index) => (
                  <div key={`${answer.id}-${index}`}>
                    <p className="text-sm font-semibold">{answer.label}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                      {answer.answer || "답변 없음"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                {submission.responseText || "답변 없음"}
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2">
            <BotMessageSquare className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold">AI 대화 로그</h3>
          </div>
          <div className="mt-3 max-h-[560px] space-y-3 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-4">
            {submission.aiChatLog.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">
                기록된 AI 대화가 없습니다.
              </p>
            ) : (
              submission.aiChatLog.map((message, index) => (
                <div
                  key={`${message.at}-${index}`}
                  className={`rounded-md p-3 ${message.role === "assistant" ? "bg-white" : "bg-neutral-200"}`}
                >
                  <p className="text-xs font-medium text-neutral-500">
                    {message.role === "assistant" ? "AI" : "유저"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                    {message.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <AiReviewDialog
        submission={submission}
        isEvaluating={isEvaluating}
        onEvaluate={onEvaluate}
        onSave={onSaveReview}
        isOpen={isAiReviewOpen}
        onClose={() => setIsAiReviewOpen(false)}
      />
    </section>
  );
}

type EditableReview = Omit<AdminSubmissionAiReview, "updatedAt">;

function reviewToForm(review: AdminSubmissionAiReview): EditableReview {
  return {
    simulation: { ...review.simulation },
    aiUtilization: { ...review.aiUtilization },
    interviewQuestions: review.interviewQuestions.map((question) => ({ ...question })),
  };
}

function AiReviewDialog({
  submission,
  isEvaluating,
  onEvaluate,
  onSave,
  isOpen,
  onClose,
}: {
  submission: AdminSubmissionAnswer;
  isEvaluating: boolean;
  onEvaluate: (submissionId: string) => Promise<void>;
  onSave: (submissionId: string, analysis: EditableReview) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<EditableReview | null>(
    submission.aiReview ? reviewToForm(submission.aiReview) : null,
  );

  useEffect(() => {
    setIsEditing(false);
    setDraft(submission.aiReview ? reviewToForm(submission.aiReview) : null);
  }, [submission.id, submission.aiReview]);

  const startEvaluation = async () => {
    await onEvaluate(submission.id);
  };

  const save = async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      await onSave(submission.id, draft);
      setIsEditing(false);
      toast.success("AI 평가를 수정했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 평가 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const review = submission.aiReview;
  const changeDraft = (next: EditableReview) => setDraft(next);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-md border border-neutral-200 bg-white p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">AI 평가</h3>
          <div className="flex items-center gap-2">
            {review ? (
              <>
              <button
                type="button"
                onClick={() => void startEvaluation()}
                disabled={isEvaluating}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isEvaluating ? "animate-spin" : ""}`} />
                {isEvaluating ? "평가 중..." : "다시 평가"}
              </button>
              </>
            ) : (
              <button
              type="button"
              onClick={() => void startEvaluation()}
              disabled={isEvaluating}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isEvaluating ? "평가 중..." : "AI 평가하기"}
              </button>
            )}
            <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="AI 평가 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 border-t border-neutral-200 pt-5">
          {isEvaluating ? (
            <p className="py-8 text-center text-sm text-neutral-500">AI 평가를 생성하고 있습니다.</p>
          ) : review && draft ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-neutral-500">최근 평가 {review.updatedAt}</p>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(reviewToForm(review));
                    setIsEditing((current) => !current);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  {isEditing ? "수정 취소" : "수정"}
                </button>
              </div>

              <div className="mt-5 divide-y divide-neutral-200 border-y border-neutral-200">
                <ReviewCategory
                  title="시뮬레이션 결과물 평가"
                  score={draft.simulation.score}
                  summary={draft.simulation.summary}
                  strengths={draft.simulation.strengths}
                  secondaryLabel="확인할 점"
                  secondaryItems={draft.simulation.concerns}
                  isEditing={isEditing}
                  onChange={(next) =>
                    changeDraft({
                      ...draft,
                      simulation: {
                        score: next.score,
                        summary: next.summary,
                        strengths: next.strengths,
                        concerns: next.secondaryItems,
                      },
                    })
                  }
                />
                <ReviewCategory
                  title="AI 활용 능력 평가"
                  score={draft.aiUtilization.score}
                  summary={draft.aiUtilization.summary}
                  strengths={draft.aiUtilization.strengths}
                  secondaryLabel="보완할 점"
                  secondaryItems={draft.aiUtilization.improvements}
                  isEditing={isEditing}
                  onChange={(next) =>
                    changeDraft({
                      ...draft,
                      aiUtilization: {
                        score: next.score,
                        summary: next.summary,
                        strengths: next.strengths,
                        improvements: next.secondaryItems,
                      },
                    })
                  }
                />
                <InterviewQuestions
                  questions={draft.interviewQuestions}
                  isEditing={isEditing}
                  onChange={(interviewQuestions) => changeDraft({ ...draft, interviewQuestions })}
                />
              </div>

              {isEditing && (
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(reviewToForm(review));
                      setIsEditing(false);
                    }}
                    className="h-8 rounded-md border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={isSaving}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isSaving ? "저장 중..." : "저장"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-neutral-500">AI 평가 결과가 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
}

type ReviewCategoryValue = {
  score: number;
  summary: string;
  strengths: string[];
  secondaryItems: string[];
};

function ReviewCategory({
  title,
  score,
  summary,
  strengths,
  secondaryLabel,
  secondaryItems,
  isEditing,
  onChange,
}: {
  title: string;
  score: number;
  summary: string;
  strengths: string[];
  secondaryLabel: string;
  secondaryItems: string[];
  isEditing: boolean;
  onChange: (value: ReviewCategoryValue) => void;
}) {
  const update = (patch: Partial<ReviewCategoryValue>) =>
    onChange({
      score,
      summary,
      strengths,
      secondaryItems,
      ...patch,
    });

  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        {isEditing ? (
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            점수
            <input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(event) => update({ score: Number(event.target.value) || 0 })}
              className="h-8 w-16 rounded-md border border-neutral-300 px-2 text-sm text-neutral-900 outline-none focus:border-neutral-700"
            />
          </label>
        ) : (
          <p className="text-sm font-semibold tabular-nums">{score}점</p>
        )}
      </div>
      {isEditing ? (
        <div className="mt-3 grid gap-3">
          <textarea
            value={summary}
            onChange={(event) => update({ summary: event.target.value })}
            className="min-h-20 w-full resize-y rounded-md border border-neutral-300 p-2.5 text-sm leading-6 outline-none focus:border-neutral-700"
          />
          <textarea
            value={strengths.join("\n")}
            onChange={(event) =>
              update({ strengths: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })
            }
            placeholder="강점 한 줄씩 입력"
            className="min-h-20 w-full resize-y rounded-md border border-neutral-300 p-2.5 text-sm leading-6 outline-none focus:border-neutral-700"
          />
          <textarea
            value={secondaryItems.join("\n")}
            onChange={(event) =>
              update({ secondaryItems: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })
            }
            placeholder={`${secondaryLabel} 한 줄씩 입력`}
            className="min-h-20 w-full resize-y rounded-md border border-neutral-300 p-2.5 text-sm leading-6 outline-none focus:border-neutral-700"
          />
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-neutral-700">{summary}</p>
          {strengths.length > 0 && <p className="mt-2 text-xs leading-5 text-neutral-500">강점: {strengths.join(" · ")}</p>}
          {secondaryItems.length > 0 && <p className="mt-1 text-xs leading-5 text-neutral-500">{secondaryLabel}: {secondaryItems.join(" · ")}</p>}
        </>
      )}
    </section>
  );
}

function InterviewQuestions({
  questions,
  isEditing,
  onChange,
}: {
  questions: EditableReview["interviewQuestions"];
  isEditing: boolean;
  onChange: (questions: EditableReview["interviewQuestions"]) => void;
}) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <h4 className="text-sm font-semibold">면접 질문 추천</h4>
      <div className="mt-3 grid gap-3">
        {questions.map((item, index) => (
          <div key={`${item.category}-${index}`} className="border-l-2 border-neutral-300 pl-3">
            {isEditing ? (
              <div className="grid gap-2">
                <select
                  value={item.category}
                  onChange={(event) =>
                    onChange(
                      questions.map((question, questionIndex) =>
                        questionIndex === index
                          ? { ...question, category: event.target.value as typeof question.category }
                          : question,
                      ),
                    )
                  }
                  className="h-8 w-fit rounded-md border border-neutral-300 bg-white px-2 text-xs outline-none focus:border-neutral-700"
                >
                  <option value="시뮬레이션 결과물">시뮬레이션 결과물</option>
                  <option value="AI 활용">AI 활용</option>
                </select>
                <textarea
                  value={item.question}
                  onChange={(event) =>
                    onChange(questions.map((question, questionIndex) => questionIndex === index ? { ...question, question: event.target.value } : question))
                  }
                  className="min-h-16 w-full resize-y rounded-md border border-neutral-300 p-2.5 text-sm outline-none focus:border-neutral-700"
                />
                <textarea
                  value={item.intent}
                  onChange={(event) =>
                    onChange(questions.map((question, questionIndex) => questionIndex === index ? { ...question, intent: event.target.value } : question))
                  }
                  className="min-h-14 w-full resize-y rounded-md border border-neutral-300 p-2.5 text-xs outline-none focus:border-neutral-700"
                />
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-neutral-500">{item.category}</p>
                <p className="mt-1 text-sm leading-6 text-neutral-800">{item.question}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">{item.intent}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-14 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6">
        <Link to="/admin" className="text-sm font-semibold tracking-tight">
          Beginner <span className="ml-1 text-xs font-normal text-neutral-500">Admin</span>
        </Link>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          기업 페이지
        </Link>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
