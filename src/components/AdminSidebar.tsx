import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListChecks,
  UserCheck,
  Inbox,
  Menu,
  Briefcase,
  BadgeCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type Item = {
  to:
    | "/admin"
    | "/admin/missions"
    | "/admin/jobs"
    | "/admin/feedback"
    | "/admin/requests"
    | "/admin/share-verifications";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const ITEMS: Item[] = [
  { to: "/admin", label: "대시보드", icon: LayoutDashboard, exact: true },
  { to: "/admin/missions", label: "시뮬레이션 관리", icon: ListChecks },
  { to: "/admin/jobs", label: "직무 관리", icon: Briefcase },
  { to: "/admin/requests", label: "직무 요청", icon: Inbox },
  { to: "/admin/share-verifications", label: "공유 인증", icon: BadgeCheck },
  { to: "/admin/feedback", label: "제출 답변", icon: UserCheck },
];

function NavList({
  pathname,
  pendingCount,
  submittedCount,
  verificationCount,
  onNavigate,
}: {
  pathname: string;
  pendingCount: number;
  submittedCount: number;
  verificationCount: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="px-3 pb-10 space-y-1">
      {ITEMS.map((it) => {
        const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
        const Icon = it.icon;
        const badgeCount =
          it.to === "/admin/missions"
            ? pendingCount
            : it.to === "/admin/feedback"
              ? submittedCount
              : it.to === "/admin/share-verifications"
                ? verificationCount
                : 0;
        const showBadge = badgeCount > 0;
        return (
          <Link key={it.to} to={it.to} onClick={onNavigate}>
            <span
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
                active
                  ? "bg-brand-soft/60 font-semibold text-brand"
                  : "text-foreground/75 hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{it.label}</span>
              {showBadge && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {badgeCount}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [pendingCount, setPendingCount] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [verificationCount, setVerificationCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMissions() {
      const { count } = await supabase
        .from("missions")
        .select("id", { count: "exact", head: true })
        .in("status", ["review_pending", "expert_submitted"]);
      if (!cancelled) setPendingCount(count ?? 0);
    }
    async function loadSubmitted() {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted");
      if (!cancelled) setSubmittedCount(count ?? 0);
    }
    async function loadVerifications() {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("share_verification_status", "pending");
      if (!cancelled) setVerificationCount(count ?? 0);
    }
    loadMissions();
    loadSubmitted();
    loadVerifications();

    const ch = supabase
      .channel(`admin-sidebar-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, () => loadMissions())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadSubmitted())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadVerifications())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [pathname]);

  const currentLabel = ITEMS.find((it) => (it.exact ? pathname === it.to : pathname.startsWith(it.to)))?.label ?? "관리자";

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background px-3 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="px-5 py-5 font-bold text-primary text-base flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-brand" />
              관리자 대시보드
            </SheetTitle>
            <NavList
              pathname={pathname}
              pendingCount={pendingCount}
              submittedCount={submittedCount}
              verificationCount={verificationCount}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold text-primary">{currentLabel}</span>
        {pendingCount > 0 && (
          <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            검토 {pendingCount}
          </span>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-background lg:block">
        <Link to="/admin" className="flex items-center gap-2 px-5 py-5 font-bold text-primary text-base">
          <LayoutDashboard className="h-4 w-4 text-brand" />
          관리자 대시보드
        </Link>
        <NavList
          pathname={pathname}
          pendingCount={pendingCount}
          submittedCount={submittedCount}
          verificationCount={verificationCount}
        />
      </aside>
    </>
  );
}
