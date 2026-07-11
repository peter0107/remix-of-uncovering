import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RotateCcw, Save, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DEFAULT_COMPANY_SIMULATION_AI_REVIEW_PROMPT } from "@/lib/ai-prompt.defaults";
import { useAuth } from "@/hooks/use-auth";
import { getAdminAiPromptSetting, saveAdminAiPromptSetting } from "@/lib/simulations.functions";

export const Route = createFileRoute("/admin/ai-prompts")({
  head: () => ({
    meta: [
      { title: "Beginner - AI 프롬프트 설정" },
      { name: "description", content: "Claude 시뮬레이션 AI 평가 프롬프트를 관리합니다." },
    ],
  }),
  component: AdminAiPrompts,
});

function AdminAiPrompts() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const loadedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  const loadPrompt = useCallback(async () => {
    setIsLoading(true);
    try {
      const setting = await getAdminAiPromptSetting();
      setPrompt(setting.prompt);
      setUpdatedAt(setting.updatedAt);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 프롬프트를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      navigate({ to: "/login", search: { redirect: "/admin/ai-prompts" } });
      return;
    }
    if (loadedUserIdRef.current === userId) return;
    loadedUserIdRef.current = userId;
    void loadPrompt();
  }, [authLoading, userId, navigate, loadPrompt]);

  const savePrompt = async () => {
    if (!prompt.trim()) {
      toast.error("프롬프트 내용을 입력해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      await saveAdminAiPromptSetting({ data: { prompt } });
      setUpdatedAt(
        new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(
          new Date(),
        ),
      );
      toast.success("AI 평가 프롬프트를 저장했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 프롬프트를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell>
      <div className="border-b border-neutral-200 pb-6">
        <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">AI 프롬프트 설정</h1>
        <p className="mt-2 text-sm text-neutral-500">
          기업 페이지의 시뮬레이션 결과물과 AI 활용 평가에 사용할 Claude 지침을 관리합니다.
        </p>
      </div>

      {authLoading || isLoading ? (
        <div className="py-16 text-center text-sm text-neutral-500">
          AI 프롬프트를 불러오는 중입니다...
        </div>
      ) : (
        <section className="mt-6 max-w-4xl rounded-md border border-neutral-200">
          <div className="border-b border-neutral-200 p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">시뮬레이션 AI 평가 프롬프트</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  시뮬레이션 결과물과 AI 어시스트 대화 로그는 평가 실행 시 자동으로 뒤에 전달됩니다.
                </p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <label htmlFor="applicant-review-prompt" className="text-sm font-medium">
              평가 지침
            </label>
            <textarea
              id="applicant-review-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="mt-2 min-h-[420px] w-full resize-y rounded-md border border-neutral-300 bg-white p-4 font-mono text-sm leading-6 text-neutral-900 outline-none focus:border-neutral-900"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-neutral-500">
                {updatedAt ? `마지막 저장 ${updatedAt}` : "기본 프롬프트 사용 중"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrompt(DEFAULT_COMPANY_SIMULATION_AI_REVIEW_PROMPT)}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> 기본값으로 되돌리기
                </button>
                <button
                  type="button"
                  onClick={savePrompt}
                  disabled={isSaving}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> {isSaving ? "저장 중" : "저장"}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </AdminShell>
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
