import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listOrders, type Order } from "@/lib/orders";
import { resolveJobName } from "@/lib/jobLookup";
import { getMission, type Mission } from "@/lib/missions";
import { JOB_CATEGORIES } from "@/data/jobCategories";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/my/reports")({
  head: () => ({ meta: [{ title: "완료한 리포트 — beginner" }] }),
  component: ReportsPage,
});

const COMPLETED_STATUSES = new Set([
  "submitted",
  "report_pending",
  "report_ready",
  "feedback_ready",
]);

function categoryLabel(id?: string | null) {
  if (!id) return "";
  return JOB_CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

function fmtDate(iso: number | string | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobNames, setJobNames] = useState<Record<string, string>>({});
  const [missions, setMissions] = useState<Record<string, Mission | null>>({});

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listOrders()
      .then(async (all) => {
        const completed = all.filter((o) => COMPLETED_STATUSES.has(o.status));
        setOrders(completed);
        setLoading(false);
        const slugs = Array.from(new Set(completed.map((x) => x.jobSlug)));
        const [nameEntries, missionEntries] = await Promise.all([
          Promise.all(slugs.map(async (s) => [s, await resolveJobName(s)] as const)),
          Promise.all(
            completed
              .filter((o) => o.missionId)
              .map(async (o) => [o.missionId!, await getMission(o.missionId!)] as const),
          ),
        ]);
        setJobNames(Object.fromEntries(nameEntries));
        setMissions(Object.fromEntries(missionEntries));
      })
      .catch((e) => toast.error((e as Error).message || "리포트를 불러오지 못했어요"))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-primary">로그인이 필요합니다</h1>
          <Link to="/login" search={{ redirect: "/my/reports" }}>
            <Button className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90">
              로그인하러 가기
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-14">
      <Link to="/my" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand">
        <ArrowLeft className="h-4 w-4" />
        <span>마이페이지</span>
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-primary md:text-4xl">완료한 리포트</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        지금까지 완료한 직무 체험 시뮬레이션의 결과를 확인할 수 있습니다.
      </p>

      {/* Mobile card list */}
      <div className="mt-6 space-y-3 md:hidden">
        {loading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-3 w-32" />
              <Skeleton className="mt-3 h-8 w-full" />
            </Card>
          ))
        ) : orders.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            아직 완료한 시뮬레이션이 없습니다.{" "}
            <Link to="/experiences" className="text-brand underline">
              직무 체험 시작하기
            </Link>
          </Card>
        ) : (
          orders.map((o) => {
            const mission = o.missionId ? missions[o.missionId] : null;
            const missionTitle = mission?.title ?? jobNames[o.jobSlug] ?? o.jobSlug;
            const jobName = jobNames[o.jobSlug] ?? o.jobSlug;
            const hasScores = !!o.competencyScores && Object.keys(o.competencyScores).length > 0;
            const score = hasScores
              ? Math.round(
                  Object.values(o.competencyScores!).reduce((a, b) => a + Number(b), 0) /
                    Object.keys(o.competencyScores!).length,
                )
              : null;
            const ready = hasScores;
            return (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 font-bold text-primary text-base">
                    {missionTitle}
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 rounded-full px-3 ${ready ? "border-brand/40 text-brand" : "border-muted-foreground/30 text-muted-foreground"}`}
                  >
                    {ready ? "완료" : "준비 중"}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{jobName}</span>
                  <span>{fmtDate(o.submittedAt ?? o.createdAt)}</span>
                </div>
                {score !== null && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    점수 <span className="font-bold text-brand">{score}점</span>
                  </div>
                )}
                <Button
                  asChild={ready}
                  disabled={!ready}
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full rounded-md"
                >
                  {ready ? (
                    <Link to="/report/$orderId" params={{ orderId: o.id }}>
                      리포트 보기
                    </Link>
                  ) : (
                    <span>리포트 준비 중</span>
                  )}
                </Button>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <Card className="mt-8 hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-6 py-4 font-medium">시뮬레이션명</th>
                <th className="px-6 py-4 font-medium">직무</th>
                <th className="px-6 py-4 font-medium">완료일</th>
                <th className="px-6 py-4 font-medium">점수</th>
                <th className="px-6 py-4 font-medium">상태</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-6 py-5"><Skeleton className="h-5 w-40" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-4 w-10" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-6 w-12 rounded-full" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-8 w-12" /></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    아직 완료한 시뮬레이션이 없습니다.{" "}
                    <Link to="/experiences" className="text-brand underline">
                      직무 체험 시작하기
                    </Link>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const mission = o.missionId ? missions[o.missionId] : null;
                  const missionTitle = mission?.title ?? jobNames[o.jobSlug] ?? o.jobSlug;
                  const jobName = jobNames[o.jobSlug] ?? o.jobSlug;
                  const hasScores = !!o.competencyScores && Object.keys(o.competencyScores).length > 0;
                  const score = hasScores
                    ? Math.round(
                        Object.values(o.competencyScores!).reduce((a, b) => a + Number(b), 0) /
                          Object.keys(o.competencyScores!).length,
                      )
                    : null;
                  const ready = hasScores;
                  return (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="px-6 py-5 font-bold text-primary">{missionTitle}</td>
                      <td className="px-6 py-5 text-foreground/80">{jobName}</td>
                      <td className="px-6 py-5 text-foreground/80">
                        {fmtDate(o.submittedAt ?? o.createdAt)}
                      </td>
                      <td className="px-6 py-5">
                        {score !== null ? (
                          <span className="font-bold text-brand">
                            {score}<span className="ml-0.5 text-xs font-normal text-muted-foreground">점</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <Badge
                          variant="outline"
                          className={`rounded-full px-3 ${ready ? "border-brand/40 text-brand" : "border-muted-foreground/30 text-muted-foreground"}`}
                        >
                          {ready ? "완료" : "준비 중"}
                        </Badge>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Button
                          asChild={ready}
                          disabled={!ready}
                          size="sm"
                          variant="outline"
                          className="rounded-md"
                        >
                          {ready ? (
                            <Link to="/report/$orderId" params={{ orderId: o.id }}>
                              보기
                            </Link>
                          ) : (
                            <span>준비 중</span>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
