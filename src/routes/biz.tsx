import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { getApplicantsByCompanyCode } from "@/lib/applicants.functions";

export const Route = createFileRoute("/biz")({
  head: () => ({
    meta: [
      { title: "Beginner - 기업 코드 입력" },
      {
        name: "description",
        content: "기업에 부여된 코드를 입력하고 지원자 검토를 시작하세요.",
      },
    ],
  }),
  component: BizIndex,
});

function BizIndex() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      setError("코드를 정확히 입력해주세요.");
      return;
    }
    setError(null);
    setIsChecking(true);
    try {
      await getApplicantsByCompanyCode({ data: { code: trimmed } });
      await navigate({ to: "/biz/review", search: { code: trimmed } });
    } catch {
      setError("유효하지 않은 기업 코드입니다.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="flex h-14 items-center border-b border-neutral-200 px-6">
        <a href="/biz" className="text-sm font-semibold tracking-tight">
          Beginner
        </a>
        <span className="ml-1 text-xs font-light text-neutral-500">biz</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight">기업 코드 입력</h1>
          <p className="mt-2 text-sm text-neutral-500">
            지원자 검토를 시작하려면 기업에 부여된 코드를 입력하세요.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="code" className="block text-xs font-medium text-neutral-700">
                기업 코드
              </label>
              <input
                id="code"
                type="text"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="예: BGNR-2024-A"
                className="mt-2 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900"
              />
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isChecking}
              className="h-10 w-full rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChecking ? "확인 중..." : "입장하기"}
            </button>
          </form>

          <p className="mt-6 text-xs text-neutral-400">
            코드가 없으신가요? 담당자에게 문의해주세요.
          </p>
        </div>
      </main>
    </div>
  );
}
