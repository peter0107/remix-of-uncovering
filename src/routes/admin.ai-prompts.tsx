import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { COMPANY_AI_PROMPT_DEFAULTS } from "@/lib/ai-prompt.defaults";
import { useAuth } from "@/hooks/use-auth";
import {
  getAdminAiPromptSettings,
  saveAdminAiPromptSettings,
  type AdminAiPromptSetting,
} from "@/lib/simulations.functions";

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
  const [settings, setSettings] = useState<AdminAiPromptSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const loadedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  const loadPrompt = useCallback(async () => {
    setIsLoading(true);
    try {
      const promptSettings = await getAdminAiPromptSettings();
      setSettings(promptSettings);
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

  const updatePrompt = (key: AdminAiPromptSetting["key"], prompt: string) => {
    setSettings((current) =>
      current.map((setting) => (setting.key === key ? { ...setting, prompt } : setting)),
    );
  };

  const resetPrompt = (key: AdminAiPromptSetting["key"]) => {
    setSettings((current) =>
      current.map((setting) =>
        setting.key === key
          ? { ...setting, prompt: COMPANY_AI_PROMPT_DEFAULTS[key].prompt }
          : setting,
      ),
    );
  };

  const savePrompts = async () => {
    if (settings.some((setting) => !setting.prompt.trim())) {
      toast.error("모든 프롬프트 내용을 입력해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      await saveAdminAiPromptSettings({
        data: {
          settings: settings.map((setting) => ({
            key: setting.key,
            prompt: setting.prompt,
          })),
        },
      });
      const savedAt = new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date());
      setSettings((current) => current.map((setting) => ({ ...setting, updatedAt: savedAt })));
      toast.success("AI 프롬프트를 저장했습니다.");
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
          기업 페이지의 AI 평가 팝업에 사용할 Claude 지침을 기능별로 관리합니다.
        </p>
      </div>

      {authLoading || isLoading ? (
        <div className="py-16 text-center text-sm text-neutral-500">
          AI 프롬프트를 불러오는 중입니다...
        </div>
      ) : (
        <section className="mt-6 max-w-none">
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            {settings.map((setting) => (
              <div key={setting.key} className="flex min-w-0 flex-col border-t border-neutral-200 pt-4">
                <div className="pb-4">
                  <div className="flex items-start gap-3">
                    <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                    <div>
                      <h2 className="text-base font-semibold">{setting.label}</h2>
                      <p className="mt-1 text-sm text-neutral-500">{setting.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col">
                  <label htmlFor={`ai-prompt-${setting.key}`} className="text-sm font-medium">
                    프롬프트 지침
                  </label>
                  <textarea
                    id={`ai-prompt-${setting.key}`}
                    value={setting.prompt}
                    onChange={(event) => updatePrompt(setting.key, event.target.value)}
                    className="mt-2 min-h-[300px] w-full flex-1 resize-y rounded-md border border-neutral-300 bg-white p-4 font-mono text-sm leading-6 text-neutral-900 outline-none focus:border-neutral-900"
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-neutral-500">
                      {setting.updatedAt
                        ? `마지막 저장 ${setting.updatedAt}`
                        : "기본 프롬프트 사용 중"}
                    </p>
                    <button
                      type="button"
                      onClick={() => resetPrompt(setting.key)}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> 기본값으로 되돌리기
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={savePrompts}
              disabled={isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {isSaving ? "저장 중" : "전체 저장"}
            </button>
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
