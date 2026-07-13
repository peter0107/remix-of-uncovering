import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { getAdminInquiries, type AdminInquiries } from "@/lib/inquiries.functions";

export const Route = createFileRoute("/admin/inquiries")({
  head: () => ({
    meta: [
      { title: "Beginner - 가입 신청·커피챗" },
      { name: "description", content: "기업 서비스 가입 신청과 커피챗 예약을 확인합니다." },
    ],
  }),
  component: AdminInquiries,
});

type Tab = "applications" | "coffeeChats";

const EMPTY: AdminInquiries = { applications: [], bookings: [] };

function AdminInquiries() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminInquiries>(EMPTY);
  const [tab, setTab] = useState<Tab>("applications");
  const [isLoading, setIsLoading] = useState(true);
  const loadedUserIdRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAdminInquiries();
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "신청 내역을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      navigate({ to: "/login", search: { redirect: "/admin/inquiries" } });
      return;
    }
    if (loadedUserIdRef.current === userId) return;
    loadedUserIdRef.current = userId;
    void load();
  }, [authLoading, userId, navigate, load]);

  const applications = data.applications;
  const bookings = data.bookings;

  return (
    <AdminShell>
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">가입 신청·커피챗</h1>
          <p className="mt-2 text-sm text-neutral-500">
            기업 서비스 가입 신청과 커피챗 예약을 확인합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      </div>

      <div className="mt-6 flex gap-6 border-b border-neutral-200">
        <TabButton active={tab === "applications"} onClick={() => setTab("applications")}>
          가입 신청 <TabCount>{applications.length}</TabCount>
        </TabButton>
        <TabButton active={tab === "coffeeChats"} onClick={() => setTab("coffeeChats")}>
          커피챗 예약 <TabCount>{bookings.length}</TabCount>
        </TabButton>
      </div>

      {authLoading || isLoading ? (
        <div className="py-16 text-center text-sm text-neutral-500">
          신청 내역을 불러오는 중입니다...
        </div>
      ) : tab === "applications" ? (
        applications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-6 space-y-3">
            {applications.map((item) => (
              <div key={item.id} className="rounded-md border border-neutral-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900">{item.companyName}</p>
                  <div className="flex items-center gap-2">
                    {item.wantsIntroMeeting && (
                      <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
                        미팅 희망
                      </span>
                    )}
                    <span className="text-xs text-neutral-400">{item.createdAt}</span>
                  </div>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-neutral-600 sm:grid-cols-2">
                  <p>
                    담당자: {item.contactName}
                    {item.contactTitle ? ` (${item.contactTitle})` : ""}
                  </p>
                  <p>이메일: {item.email}</p>
                  <p>전화: {item.phone}</p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 space-y-3">
          {bookings.map((item) => (
            <div key={item.id} className="rounded-md border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-900">{item.slotLabel}</p>
                <span className="text-xs text-neutral-400">접수 {item.createdAt}</span>
              </div>
              <div className="mt-2 grid gap-1 text-sm text-neutral-600 sm:grid-cols-2">
                <p>이름: {item.name}</p>
                <p>기업명: {item.companyName}</p>
                <p>이메일: {item.email}</p>
                <p>전화: {item.phone}</p>
              </div>
              {item.hiringConcern && (
                <p className="mt-3 whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
                  {item.hiringConcern}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors ${
        active
          ? "border-neutral-900 text-neutral-900"
          : "border-transparent text-neutral-500 hover:text-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

function TabCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-md border border-dashed border-neutral-300 px-5 py-16 text-center text-sm text-neutral-500">
      아직 접수된 신청이 없습니다.
    </div>
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
