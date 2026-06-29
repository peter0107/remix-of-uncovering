import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/AdminSidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/requests")({
  head: () => ({ meta: [{ title: "직무 요청 — 관리자" }] }),
  component: RequestsPage,
});

type RequestRow = {
  id: string;
  job_name: string;
  category_name: string | null;
  status: string;
  created_at: string;
};

function RequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mission_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("불러오기 실패");
    setRows((data as RequestRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`admin-requests-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mission_requests" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "new" ? "reviewed" : "new";
    const { error } = await supabase
      .from("mission_requests")
      .update({ status: next })
      .eq("id", id);
    if (error) {
      toast.error("업데이트 실패");
      return;
    }
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const { error } = await supabase.from("mission_requests").delete().eq("id", id);
    if (error) {
      toast.error("삭제 실패");
      return;
    }
    refresh();
  };

  return (
    <div className="block min-h-screen bg-secondary/30 lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <h1 className="text-xl font-bold text-primary sm:text-2xl">직무 체험 요청</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            사용자가 요청한 희망 직무 목록입니다.
          </p>
          <Card className="mt-4 hidden overflow-x-auto p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>요청일</TableHead>
                  <TableHead>희망 직무</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-32 text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      불러오는 중...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      아직 요청이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell className="font-medium">{r.job_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.category_name || "—"}
                    </TableCell>
                    <TableCell>
                      {r.status === "new" ? (
                        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">신규</Badge>
                      ) : (
                        <Badge variant="secondary">확인됨</Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(r.id, r.status)}>
                        {r.status === "new" ? "확인" : "되돌리기"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {loading && (
              <Card className="p-6 text-center text-sm text-muted-foreground">불러오는 중...</Card>
            )}
            {!loading && rows.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">아직 요청이 없습니다.</Card>
            )}
            {rows.map((r) => (
              <Card key={r.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-primary">{r.job_name}</div>
                    <div className="text-xs text-muted-foreground">{r.category_name || "—"}</div>
                  </div>
                  {r.status === "new" ? (
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">신규</Badge>
                  ) : (
                    <Badge variant="secondary">확인됨</Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("ko-KR")}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => toggleStatus(r.id, r.status)}>
                    {r.status === "new" ? "확인" : "되돌리기"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    삭제
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
