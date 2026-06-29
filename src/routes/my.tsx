import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText, ClipboardList, Compass, Info, ArrowRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { listOrders, type Order } from "@/lib/orders";
import { resolveJobName } from "@/lib/jobLookup";
import { getProduct, formatKRW } from "@/data/products";
import { useAuth } from "@/hooks/use-auth";
import { getCareerSummary, type CareerSummary } from "@/lib/summary.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "마이페이지 — beginner" }] }),
  component: MyPage,
});

function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const childMatches = useChildMatches();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [jobNames, setJobNames] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<CareerSummary | null>(null);
  const [showUpsellDialog, setShowUpsellDialog] = useState(false);
  const fetchSummary = useServerFn(getCareerSummary);

  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    listOrders()
      .then(async (o) => {
        setOrders(o);
        const slugs = Array.from(new Set(o.map((x) => x.jobSlug)));
        const entries = await Promise.all(
          slugs.map(async (s) => [s, await resolveJobName(s)] as const),
        );
        setJobNames(Object.fromEntries(entries));
      })
      .catch((e) => toast.error((e as Error).message || "데이터를 불러오지 못했어요"))
      .finally(() => setOrdersLoading(false));
    fetchSummary()
      .then((s) => setSummary(s))
      .catch(() => setSummary({ locked: true, hasExperience: false }));
  }, [user, fetchSummary]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`orders-user-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newRow = payload.new as { id?: string; status?: string } | null;
          const oldRow = payload.old as { id?: string; status?: string } | null;
          setOrders((prev) => {
            if (payload.eventType === "DELETE" && oldRow?.id) {
              return prev.filter((o) => o.id !== oldRow.id);
            }
            if (!newRow?.id) return prev;
            // 상태 변화 알림: 결제 확인 중 → 시뮬레이션 진행 중
            const before = prev.find((o) => o.id === newRow.id);
            if (before?.status === "payment_pending" && newRow.status === "in_progress") {
              toast.success("결제가 확인되어 시뮬레이션이 열렸습니다!", {
                description: "지금 바로 시작해보세요.",
              });
            }
            // 새로고침으로 최신 상태 반영
            listOrders()
              .then(setOrders)
              .catch(() => {});
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 체험 주문(시뮬레이션 결제)과 요약 별도 결제(summary)는 분리
  const experienceOrders = useMemo(() => orders.filter((o) => o.productId !== "summary"), [orders]);
  const completedOrders = useMemo(
    () =>
      experienceOrders.filter((o) =>
        ["submitted", "report_pending", "report_ready", "feedback_ready"].includes(o.status),
      ),
    [experienceOrders],
  );
  // 잠금 해제 / 추천 데이터는 서버(getCareerSummary)에서만 내려옴.
  // 권한 없는 사용자는 summary.locked === true 이며 top 데이터는 존재하지 않음.
  const summaryUnlocked = summary?.locked === false;
  const top = summary && summary.locked === false ? summary.top : null;
  const highOkCount = summary && summary.locked === false ? summary.highOkCount : 0;
  const inProgressOrders = useMemo(
    () =>
      experienceOrders.filter((o) => o.status === "in_progress" || o.status === "payment_pending"),
    [experienceOrders],
  );

  const nickname = (user?.user_metadata as Record<string, unknown> | undefined)?.nickname as
    | string
    | undefined;
  const displayName = nickname || user?.email?.split("@")[0] || "회원";

  if (authLoading) return <MyPageSkeleton />;
  if (childMatches.length > 0) return <Outlet />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-primary">로그인이 필요합니다</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            마이페이지는 로그인 후 이용할 수 있습니다.
          </p>
          <Link to="/login" search={{ redirect: "/my" }}>
            <Button className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90">
              로그인하러 가기
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="text-2xl font-bold text-primary md:text-4xl">마이페이지</h1>
      <p className="mt-3 font-semibold text-foreground">안녕하세요, {displayName}님! 👋</p>
      <p className="mt-1 text-sm text-muted-foreground">
        지금까지의 체험 결과를 바탕으로 추천 직무와 결과 리포트를 확인해보세요.
      </p>

      {/* 진로 탐색 요약 */}
      <Card className="mt-6 overflow-hidden">
        <div className="relative grid grid-cols-1 gap-6 p-6 md:p-8">
          <div>
            <div className="font-bold text-primary text-xl">내 진로 탐색 요약</div>
            <p className="mt-1 max-w-md text-muted-foreground text-sm">
              여러 시뮬레이션에서 확인된 역량을 바탕으로 현재 가장 잘 맞는 직무예요.
            </p>

            {summary === null ? (
              <div className="mt-6 space-y-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : top ? (
              <>
                <div className="mt-6 flex flex-wrap items-center gap-6">
                  <ScoreCircle score={top.finalScore} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xl font-bold text-primary">{top.name}</span>
                      <Badge variant="secondary" className="bg-brand-soft text-brand text-base">
                        1위
                      </Badge>
                    </div>
                    <div className="mt-3 text-muted-foreground text-sm">근거 충분도</div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="font-semibold text-foreground text-2xl">
                        {top.evidenceCount}{" "}
                        <span className="text-xs text-muted-foreground">/{top.evidenceTotal}</span>
                      </span>
                      <div className="flex gap-1">
                        {Array.from({ length: top.evidenceTotal }).map((_, i) => (
                          <span
                            key={i}
                            className={`h-2.5 w-2.5 rounded-full ${i < top.evidenceCount ? "bg-brand" : "bg-muted"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-border bg-secondary/30 p-4 sm:grid-cols-3">
                  <ChipGroup
                    title="잘 맞는 역량"
                    items={top.goodFits.slice(0, 3).map((c) => c.name.replace(" 역량", ""))}
                    tone="brand"
                  />
                  <ChipGroup
                    title="보완이 필요한 역량"
                    items={top.weakPoints.slice(0, 2).map((c) => c.name.replace(" 역량", ""))}
                    tone="orange"
                  />
                  <ChipGroup
                    title="추가 확인 필요 역량"
                    items={top.missingPoints.slice(0, 2).map((c) => c.name.replace(" 역량", ""))}
                    tone="muted"
                  />
                </div>

                {completedOrders.length < 3 && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-soft/50 p-3 text-sm">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">3번 이상</span> 진행하면
                      정확도가 높아져요.
                    </p>
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <Link to="/my/recommendations">
                    <Button className="bg-brand text-brand-foreground hover:bg-brand/90 text-sm">
                      추천 직무 전체 보기 →
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-6">
                  <ScoreCircle score={null} />
                  <div>
                    <div className="text-2xl font-bold text-muted-foreground">-</div>
                    <div className="mt-3 text-muted-foreground text-sm">근거 충분도</div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="font-semibold text-muted-foreground text-2xl">
                        - <span className="text-xs text-muted-foreground">/6</span>
                      </span>
                      <div className="flex gap-1">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <span key={i} className="h-2.5 w-2.5 rounded-full bg-muted" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-border bg-secondary/30 p-4 sm:grid-cols-3">
                  <ChipGroup title="잘 맞는 역량" items={[]} tone="brand" />
                  <ChipGroup title="보완이 필요한 역량" items={[]} tone="orange" />
                  <ChipGroup title="추가 확인 필요 역량" items={[]} tone="muted" />
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-soft/50 p-3 text-sm">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <p className="text-muted-foreground">
                    아직 완료한 체험이 없어요. 직무 체험을 진행하면 결과가 여기에 표시됩니다.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Link to="/experiences">
                    <Button className="bg-brand text-brand-foreground hover:bg-brand/90 text-sm">
                      직무 체험 시작하기 →
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 3 column overview */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 완료한 체험 */}
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-primary">완료한 체험</div>
            <Link to="/my/reports" className="text-xs text-muted-foreground hover:text-brand">
              전체 보기 ›
            </Link>
          </div>
          <div className="mt-4 flex-1">
            {completedOrders.length === 0 ? (
              <EmptyMini icon={<FileText className="h-8 w-8" />} text="완료한 체험이 없어요." />
            ) : (
              <ul className="space-y-3">
                {completedOrders.slice(0, 3).map((o) => {
                  const name = jobNames[o.jobSlug] ?? o.jobSlug;
                  const date = new Date(o.submittedAt ?? o.createdAt).toLocaleDateString("ko-KR");
                  const score =
                    o.competencyScores && Object.keys(o.competencyScores).length > 0
                      ? Math.round(
                          Object.values(o.competencyScores).reduce((a, b) => a + Number(b), 0) /
                            Object.keys(o.competencyScores).length,
                        )
                      : null;
                  return (
                    <li key={o.id}>
                      <Link
                        to="/sample-answer/$orderId"
                        params={{ orderId: o.id }}
                        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                          <FileText className="h-5 w-5 text-brand" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {name}
                          </div>
                          <div className="text-xs text-muted-foreground">완료일 {date}</div>
                        </div>
                        {score !== null && (
                          <div className="shrink-0 text-right">
                            <span className="text-lg font-bold text-brand">{score}</span>
                            <span className="text-xs text-muted-foreground">점</span>
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Link to="/my/reports" className="mt-4">
            <Button variant="outline" size="sm" className="w-full">
              전체 리포트 결과 보기
            </Button>
          </Link>
        </Card>

        {/* 진행 중인 체험 */}
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-primary">진행 중인 체험</div>
            <Link to="/experiences" className="text-xs text-muted-foreground hover:text-brand">
              전체 보기 ›
            </Link>
          </div>
          <div className="mt-4 flex-1">
            {inProgressOrders.length === 0 ? (
              <EmptyMini
                icon={<Search className="h-8 w-8" />}
                text="진행 중인 체험이 없어요. 새로운 직무 체험을 시작해보세요!"
              />
            ) : (
              (() => {
                const o = inProgressOrders[0];
                const name = jobNames[o.jobSlug] ?? o.jobSlug;
                const product = getProduct(o.productId);
                const isPending = o.status === "payment_pending";
                const Inner = (
                  <div className="flex items-center gap-3 rounded-lg hover:bg-secondary/40">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft">
                      <ClipboardList className="h-5 w-5 text-brand" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">{name}</div>
                      <div className="truncate text-xs text-muted-foreground">{product?.name}</div>
                    </div>
                    {isPending ? (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                        결제 확인 중
                      </Badge>
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
                return isPending ? (
                  <div className="block cursor-not-allowed opacity-90">{Inner}</div>
                ) : (
                  <Link to="/mission/$orderId" params={{ orderId: o.id }} className="block">
                    {Inner}
                  </Link>
                );
              })()
            )}
          </div>
          {inProgressOrders.length === 0 ? (
            <Link to="/experiences" className="mt-4">
              <Button size="sm" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
                직무 체험 시작하기
              </Button>
            </Link>
          ) : inProgressOrders[0].status === "payment_pending" ? (
            <Button size="sm" disabled className="mt-4 w-full bg-muted text-muted-foreground">
              결제 확인 후 자동으로 열립니다
            </Button>
          ) : (
            <Link
              to="/mission/$orderId"
              params={{ orderId: inProgressOrders[0].id }}
              className="mt-4"
            >
              <Button size="sm" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
                바로 이어하기
              </Button>
            </Link>
          )}
        </Card>

        {/* 나의 활동 요약 */}
        <Card className="p-5">
          <div className="font-semibold text-primary">나의 활동 요약</div>
          <ul className="mt-4 divide-y text-sm">
            <SummaryRow
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              label="완료한 리포트"
              value={`${completedOrders.length}건`}
            />
            <SummaryRow
              icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
              label="진행 중인 체험"
              value={`${inProgressOrders.length}건`}
            />
            <SummaryRow
              icon={<Compass className="h-4 w-4 text-muted-foreground" />}
              label="추천 직무"
              value={`${highOkCount}개`}
              to="/my/recommendations"
            />
            <SummaryRow
              icon={<Info className="h-4 w-4 text-muted-foreground" />}
              label="구매 내역"
              value={`${orders.length}건`}
            />
          </ul>
        </Card>
      </div>

      {/* 구매 내역 */}
      <div className="mt-8 md:mt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-primary">구매 내역</h2>
        </div>

        <div className="mt-4 space-y-3 md:hidden">
          {ordersLoading ? (
            [1, 2].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-40" />
              </Card>
            ))
          ) : orders.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              아직 구매 내역이 없습니다.
            </Card>
          ) : (
            orders.map((o) => {
              const name = jobNames[o.jobSlug] ?? o.jobSlug;
              const product = getProduct(o.productId);
              const date = new Date(o.createdAt).toLocaleDateString("ko-KR");
              const isUsed = o.status === "report_ready" || o.status === "feedback_ready";
              return (
                <Card key={o.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-primary">
                        {product?.name}
                      </div>
                      {name && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{name}</div>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        o.status === "payment_pending"
                          ? "border-amber-500/40 text-amber-600"
                          : isUsed
                            ? "border-muted-foreground/30 text-muted-foreground"
                            : "border-brand/40 text-brand"
                      }
                    >
                      {o.status === "payment_pending"
                        ? "결제 확인 중"
                        : isUsed
                          ? "이용 완료"
                          : "결제 완료"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{date}</span>
                    <span className="font-medium text-foreground">
                      {formatKRW(product?.price ?? 0)}
                    </span>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <Card className="mt-4 hidden overflow-hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-6 py-3 font-medium">구매일</th>
                <th className="px-6 py-3 font-medium">상품명</th>
                <th className="px-6 py-3 font-medium">금액</th>
                <th className="px-6 py-3 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    아직 구매 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const name = jobNames[o.jobSlug] ?? o.jobSlug;
                  const product = getProduct(o.productId);
                  const date = new Date(o.createdAt).toLocaleDateString("ko-KR");
                  const isUsed = o.status === "report_ready" || o.status === "feedback_ready";
                  return (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="px-6 py-4 text-foreground">{date}</td>
                      <td className="px-6 py-4 text-foreground">
                        {product?.name}
                        {name && <span className="text-muted-foreground"> · {name}</span>}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {formatKRW(product?.price ?? 0)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={
                            o.status === "payment_pending"
                              ? "border-amber-500/40 text-amber-600"
                              : isUsed
                                ? "border-muted-foreground/30 text-muted-foreground"
                                : "border-brand/40 text-brand"
                          }
                        >
                          {o.status === "payment_pending"
                            ? "결제 확인 중"
                            : isUsed
                              ? "이용 완료"
                              : "결제 완료"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Dialog open={showUpsellDialog} onOpenChange={setShowUpsellDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>추천 직무 전체보기는 잠겨 있어요</DialogTitle>
            <DialogDescription className="pt-2">
              진로 탐색 요약을 열면 추천 직무 전체 리스트도 함께 확인할 수 있어요.
              <br />
              4,900원 별도 결제, 또는 직무 적합 분석(9,900원) 이상 체험 시 자동으로 열립니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Link to="/experiences" onClick={() => setShowUpsellDialog(false)}>
              <Button variant="outline" className="w-full sm:w-auto">
                직무 체험 시작하기
              </Button>
            </Link>
            <Link
              to="/checkout"
              search={{ product: "summary" }}
              onClick={() => setShowUpsellDialog(false)}
            >
              <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto">
                4,900원 결제하고 열기
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScoreCircle({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle cx="50" cy="50" r="44" className="fill-none stroke-muted" strokeWidth="8" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xs text-muted-foreground">추천 점수</div>
          <div className="font-bold text-muted-foreground leading-none text-3xl">-</div>
        </div>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="44" className="fill-none stroke-muted" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="44"
          className="fill-none stroke-brand"
          strokeWidth="8"
          strokeDasharray={`${(pct / 100) * 276.46} 276.46`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xs text-muted-foreground">추천 점수</div>
        <div className="font-bold text-brand leading-none text-3xl">{score}</div>
        <div className="text-[10px] text-muted-foreground">/100</div>
      </div>
    </div>
  );
}

function ChipGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "brand" | "orange" | "muted";
}) {
  const cls =
    tone === "brand"
      ? "bg-brand-soft text-brand"
      : tone === "orange"
        ? "bg-orange-50 text-orange-700"
        : "bg-muted text-muted-foreground";
  return (
    <div>
      <div className="font-medium text-muted-foreground text-sm">{title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          items.map((it) => (
            <span key={it} className={`rounded-md px-2 py-1 text-sm ${cls} font-medium`}>
              {it}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </>
  );
  if (to) {
    return (
      <li>
        <Link
          to={to}
          className="-mx-2 flex items-center justify-between rounded-md px-2 py-3 transition-colors hover:bg-secondary/50"
        >
          {body}
        </Link>
      </li>
    );
  }
  return <li className="flex items-center justify-between py-3">{body}</li>;
}

function EmptyMini({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <div className="opacity-50">{icon}</div>
      <p className="text-xs">{text}</p>
    </div>
  );
}

function MyPageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-72" />
      <Skeleton className="mt-6 h-64" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}
