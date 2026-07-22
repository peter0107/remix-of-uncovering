import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  Inbox,
  SlidersHorizontal,
  UserRound,
  Wand2,
} from "lucide-react";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/BrandLogo";

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
  const isAdminHome = pathname.replace(/\/+$/, "") === "/admin";

  useEffect(() => {
    if (!isAdminHome) return;
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/admin" } });
    }
  }, [authLoading, user, navigate, isAdminHome]);

  if (!isAdminHome) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-14 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6">
        <div className="flex items-center gap-2">
          <BrandLogo className="h-5 w-auto" />
          <span className="text-xs text-neutral-500">Admin</span>
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
            시뮬레이션, 제출 결과물, AI 평가 기준을 관리합니다.
          </p>
        </div>

        {authLoading && (
          <div className="py-16 text-center text-sm text-neutral-500">
            관리자 정보를 확인 중입니다...
          </div>
        )}

        {!authLoading && user && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
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

            <Link
              to="/admin/expert-simulations"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">
                    현직자 시뮬레이션 관리
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    현직자 제시 카드와 모범답안을 관리합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>

            <Link
              to="/admin/simulation-generator"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">
                    JD 시뮬레이션 생성기
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    채용공고를 붙여넣어 직무 시뮬레이션 초안을 생성합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>

            <Link
              to="/admin/submissions"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-100 text-neutral-900">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">제출된 답변</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    유저 결과물과 AI 대화 로그를 확인합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>

            <Link
              to="/admin/ai-prompts"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-100 text-neutral-900">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">
                    AI 프롬프트 설정
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Claude 지원자 평가 기준을 수정합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>

            <Link
              to="/admin/inquiries"
              className="group rounded-md border border-neutral-200 p-5 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-neutral-100 text-neutral-900">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-neutral-900">
                    가입 신청·커피챗
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    기업 서비스 가입 신청과 커피챗 예약을 확인합니다.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
