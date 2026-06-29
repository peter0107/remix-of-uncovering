//hiho

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listOrders, updateOrder, STATUS_LABEL, type Order, type OrderStatus } from "@/lib/orders";
import { resolveJobName } from "@/lib/jobLookup";
import { getMission, type Mission } from "@/lib/missions";
import { getProduct, getExpertQuestionCount } from "@/data/products";
import { getJob } from "@/data/jobs";
import { supabase } from "@/integrations/supabase/client";

function resolveQuestions(order: Order | null, mission: Mission | null): { id: string; label: string }[] {
  if (mission?.questions?.length) return mission.questions;
  if (order) {
    const job = getJob(order.jobSlug);
    if (job?.questions?.length) return job.questions;
    if (order.answers) {
      return Object.keys(order.answers)
        .filter((id) => !id.startsWith("__"))
        .map((id) => ({ id, label: id }));
    }
  }
  return [];
}

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "관리자 — beginner" }] }),
  component: AdminPage,
});

const STATUSES: OrderStatus[] = [
  "payment_pending",
  "in_progress",
  "submitted",
  "report_pending",
  "report_ready",
  "feedback_ready",
];

function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [jobNames, setJobNames] = useState<Record<string, string>>({});
  const [viewingMission, setViewingMission] = useState<Mission | null>(null);
  const refresh = () => {
    listOrders().then(async (o) => {
      setOrders(o);
      const slugs = Array.from(new Set(o.map((x) => x.jobSlug)));
      const entries = await Promise.all(slugs.map(async (s) => [s, await resolveJobName(s)] as const));
      setJobNames(Object.fromEntries(entries));
    });
  };
  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`admin-orders-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);
  useEffect(() => {
    if (viewing?.missionId) {
      getMission(viewing.missionId).then(setViewingMission);
    } else {
      setViewingMission(null);
    }
  }, [viewing]);
  void useMemo;

  return (
    <div className="block min-h-screen bg-secondary/30 lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <h1 className="text-xl font-bold text-primary sm:text-2xl">주문 목록</h1>
          <Card className="mt-4 hidden overflow-x-auto p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>주문ID</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>직무</TableHead>
                  <TableHead>상품</TableHead>
                  <TableHead>제출 답변</TableHead>
                  <TableHead>리포트 상태</TableHead>
                  <TableHead>피드백</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      주문이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id}</TableCell>
                    <TableCell>{o.email}</TableCell>
                    <TableCell>{jobNames[o.jobSlug] ?? o.jobSlug}</TableCell>
                    <TableCell>{getProduct(o.productId)?.name}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setViewing(o)} disabled={!o.answers}>
                        보기
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        onValueChange={async (v) => {
                          await updateOrder(o.id, { status: v as OrderStatus });
                          refresh();
                        }}
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {o.feedbackRequested ? (
                        <Badge className="bg-brand-soft text-brand hover:bg-brand-soft">신청</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {orders.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">주문이 없습니다.</Card>
            )}
            {orders.map((o) => (
              <Card key={o.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-primary truncate">{o.email}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{o.id}</div>
                  </div>
                  {o.feedbackRequested && (
                    <Badge className="bg-brand-soft text-brand hover:bg-brand-soft">피드백</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {jobNames[o.jobSlug] ?? o.jobSlug} · {getProduct(o.productId)?.name}
                </div>
                <Select
                  value={o.status}
                  onValueChange={async (v) => {
                    await updateOrder(o.id, { status: v as OrderStatus });
                    refresh();
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setViewing(o)}
                  disabled={!o.answers}
                >
                  답변 보기
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-2xl">
          <DialogHeader>
            <DialogTitle>제출 답변 — {viewing?.id}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto">
              {resolveQuestions(viewing, viewingMission).map((q, i) => (
                <div key={q.id}>
                  <div className="text-xs font-bold text-brand">Q{i + 1}</div>
                  <div className="text-sm font-medium text-primary">{q.label}</div>
                  <p className="mt-1 whitespace-pre-wrap rounded bg-muted p-3 text-sm">
                    {viewing.answers?.[q.id] || "—"}
                  </p>
                </div>
              ))}
              {(() => {
                const count = getExpertQuestionCount(viewing.productId);
                if (count === 0) return null;
                return (
                  <div className="border-t border-border pt-4">
                    <div className="text-sm font-bold text-primary">현직자에게 추가 질문 ({count}개)</div>
                    <div className="mt-2 space-y-3">
                      {Array.from({ length: count }).map((_, i) => {
                        const key = `__expert_q_${i}__`;
                        return (
                          <div key={key}>
                            <div className="text-xs font-medium text-muted-foreground">질문 {i + 1}</div>
                            <p className="mt-1 whitespace-pre-wrap rounded bg-muted p-3 text-sm">
                              {viewing.answers?.[key] || "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
