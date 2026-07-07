import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, BriefcaseBusiness, ListChecks } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  getAdminCompanySimulations,
  type AdminCompanySimulation,
} from "@/lib/simulations.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Beginner - 관리자" },
      { name: "description", content: "Beginner 관리자 홈입니다." },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const [simulations, setSimulations] = useState<AdminCompanySimulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const isAdminHome = pathname.replace(/\/+$/, "") === "/admin";
  const userId = user?.id ?? null;

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminCompanySimulations();
      setSimulations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "관리자 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminHome) return;
    if (authLoading) return;
    if (!userId) {
      navigate({ to: "/login", search: { redirect: "/admin" } });
      return;
    }
    if (loadedUserIdRef.current === userId) return;
    loadedUserIdRef.current = userId;
    void loadDashboard();
  }, [authLoading, userId, navigate, loadDashboard, isAdminHome]);

  if (!isAdminHome) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-14 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6">
        <div>
          <span className="text-sm font-semibold tracking-tight">Beginner</span>
          <span className="ml-2 text-xs text-neutral-500">Admin</span>
        </div>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          기업 페이지
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="border-b border-neutral-200 pb-6">
          <p className="text-xs font-medium text-neutral-500">관리자 홈</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">운영 관리</h1>
          <p className="mt-2 text-sm text-neutral-500">
            기업별 직무 시뮬레이션 입력 화면으로 이동합니다.
          </p>
        </div>

        {(authLoading || isLoading) && (
          <div className="py-16 text-center text-sm text-neutral-500">
            관리자 정보를 확인 중입니다...
          </div>
        )}

        {!authLoading && !isLoading && error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!authLoading && !isLoading && !error && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link
              to="/admin/simulations"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">
                    직무 시뮬레이션 관리
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    기업 코드별 직무 시뮬레이션을 등록하고 관리합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>

            <section className="rounded-md border border-neutral-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-100 text-neutral-900">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">등록 현황</h2>
                  <p className="mt-2 text-sm text-neutral-500">
                    등록된 직무 시뮬레이션 {simulations.length}건
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
