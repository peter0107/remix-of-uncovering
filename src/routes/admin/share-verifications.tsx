import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ImageIcon, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listOrders, type Order, updateOrder } from "@/lib/orders";
import { resolveJobName } from "@/lib/jobLookup";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/share-verifications")({
  head: () => ({ meta: [{ title: "공유 인증 관리 — beginner" }] }),
  component: AdminShareVerificationsPage,
});

type VerificationItem = {
  order: Order;
  jobName: string;
  nickname?: string;
  previewUrl?: string;
};

const REJECTION_MESSAGE = "다른 사진으로 재시도 해주세요!";

function formatDate(value?: number) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function statusBadge(status: Order["shareVerificationStatus"]) {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">승인 완료</Badge>;
    case "rejected":
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">거절됨</Badge>;
    case "pending":
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">검토 대기</Badge>;
    default:
      return <Badge variant="outline">미제출</Badge>;
  }
}

function AdminShareVerificationsPage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const orders = (await listOrders()).filter(
        (order) =>
          order.shareVerificationStatus !== "none" || Boolean(order.shareVerificationImagePath),
      );

      const [jobEntries, profileMap, previewMap] = await Promise.all([
        Promise.all(
          Array.from(new Set(orders.map((order) => order.jobSlug))).map(async (slug) => [
            slug,
            await resolveJobName(slug),
          ]),
        ),
        (async () => {
          const userIds = Array.from(
            new Set(orders.map((order) => order.userId).filter((value): value is string => Boolean(value))),
          );
          if (userIds.length === 0) return {} as Record<string, string>;
          const { data, error } = await supabase
            .from("profiles")
            .select("id,nickname")
            .in("id", userIds);
          if (error) throw error;
          return Object.fromEntries((data ?? []).map((profile) => [profile.id, profile.nickname ?? ""]));
        })(),
        (async () => {
          const entries = await Promise.all(
            orders.map(async (order) => {
              if (!order.shareVerificationImagePath) return [order.id, ""] as const;
              const { data, error } = await supabase.storage
                .from("mission-submissions")
                .createSignedUrl(order.shareVerificationImagePath, 60 * 60);
              if (error) {
                console.error("share preview error", error);
                return [order.id, ""] as const;
              }
              return [order.id, data.signedUrl] as const;
            }),
          );
          return Object.fromEntries(entries);
        })(),
      ]);

      const jobMap = Object.fromEntries(jobEntries);
      setItems(
        orders
          .sort((a, b) => {
            const aTime = a.shareVerificationSubmittedAt ?? a.createdAt;
            const bTime = b.shareVerificationSubmittedAt ?? b.createdAt;
            return bTime - aTime;
          })
          .map((order) => ({
            order,
            jobName: jobMap[order.jobSlug] ?? order.jobSlug,
            nickname: order.userId ? profileMap[order.userId] : "",
            previewUrl: previewMap[order.id] || "",
          })),
      );
    } catch (error) {
      toast.error((error as Error).message || "공유 인증 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`admin-share-verifications-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pendingCount = useMemo(
    () => items.filter((item) => item.order.shareVerificationStatus === "pending").length,
    [items],
  );

  async function handleApprove(order: Order) {
    setActingId(order.id);
    try {
      await updateOrder(order.id, {
        shareVerificationStatus: "approved",
        shareVerificationReviewedAt: Date.now(),
        shareVerificationRejectionNote: null,
      });
      toast.success("공유 인증을 승인했어요.");
      await refresh();
    } catch (error) {
      toast.error((error as Error).message || "승인 처리에 실패했어요.");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(order: Order) {
    setActingId(order.id);
    try {
      await updateOrder(order.id, {
        shareVerificationStatus: "rejected",
        shareVerificationReviewedAt: Date.now(),
        shareVerificationRejectionNote: REJECTION_MESSAGE,
      });
      toast.success("공유 인증을 거절 처리했어요.");
      await refresh();
    } catch (error) {
      toast.error((error as Error).message || "거절 처리에 실패했어요.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="block min-h-screen bg-secondary/30 lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-primary sm:text-2xl">공유 인증 관리</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                캡쳐 인증 이미지를 확인하고 풀서비스 오픈 여부를 결정할 수 있어요.
              </p>
            </div>
            <Badge className="bg-brand-soft text-brand hover:bg-brand-soft">
              대기 {pendingCount}건
            </Badge>
          </div>

          {loading ? (
            <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
              공유 인증 목록을 불러오는 중입니다.
            </Card>
          ) : items.length === 0 ? (
            <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
              아직 들어온 공유 인증이 없습니다.
            </Card>
          ) : (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {items.map(({ order, jobName, nickname, previewUrl }) => {
                const isPending = order.shareVerificationStatus === "pending";
                const acting = actingId === order.id;

                return (
                  <Card key={order.id} className="overflow-hidden">
                    <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
                      <div className="border-b border-border bg-muted/30 lg:border-b-0 lg:border-r">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="공유 인증 캡쳐"
                            className="h-full min-h-[260px] w-full object-cover"
                          />
                        ) : (
                          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-muted-foreground">
                            <ImageIcon className="h-8 w-8" />
                            <span className="text-sm">미리보기를 불러올 수 없어요</span>
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold text-primary">{jobName}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {nickname ? `${nickname} · ` : ""}
                              {order.email}
                            </div>
                          </div>
                          {statusBadge(order.shareVerificationStatus)}
                        </div>

                        <dl className="mt-4 space-y-2 text-sm">
                          <div className="flex gap-2">
                            <dt className="w-24 shrink-0 text-muted-foreground">주문 ID</dt>
                            <dd className="font-mono text-xs text-foreground">{order.id}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-24 shrink-0 text-muted-foreground">보낸 시간</dt>
                            <dd>{formatDate(order.shareVerificationSubmittedAt)}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-24 shrink-0 text-muted-foreground">검토 시간</dt>
                            <dd>{formatDate(order.shareVerificationReviewedAt)}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-24 shrink-0 text-muted-foreground">파일명</dt>
                            <dd className="break-all">
                              {order.shareVerificationImageName || "이름 없음"}
                            </dd>
                          </div>
                        </dl>

                        {order.shareVerificationRejectionNote ? (
                          <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                            {order.shareVerificationRejectionNote}
                          </div>
                        ) : null}

                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            disabled={!isPending || acting}
                            onClick={() => handleApprove(order)}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            확인
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!isPending || acting}
                            onClick={() => handleReject(order)}
                            className="border-orange-300 text-orange-700 hover:bg-orange-50"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            거절
                          </Button>
                          {isPending ? (
                            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-700">
                              <Clock3 className="h-3.5 w-3.5" />
                              검토 대기 중
                            </div>
                          ) : null}
                          {order.shareVerificationStatus === "rejected" ? (
                            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-700">
                              <RotateCcw className="h-3.5 w-3.5" />
                              재인증 대기
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
