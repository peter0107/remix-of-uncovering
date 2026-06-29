import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Paperclip } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listOrders, saveEvaluation, saveAnswers, type Order } from "@/lib/orders";
import { resolveJobName } from "@/lib/jobLookup";
import { getMission, type Mission } from "@/lib/missions";
import { getCompetencyName, ALL_COMPETENCIES } from "@/data/competencies";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/AdminSidebar";
import { supabase } from "@/integrations/supabase/client";

const FINAL_KEY = "__final__";
const MAX_FILE_MB = 50;
const EXPERT_Q_PREFIX = "__expert_q_";
const expertQKey = (i: number) => `${EXPERT_Q_PREFIX}${i}__`;
type SubmissionFile = { url: string; name: string; path: string; size?: number };

function parseSubmissionFile(order: Order | undefined | null): SubmissionFile | null {
  const raw = order?.answers?.[FINAL_KEY];
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as SubmissionFile;
    return f?.url ? f : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/admin/feedback")({
  head: () => ({ meta: [{ title: "제출 답변 — beginner" }] }),
  component: AdminFeedback,
});


const linesToArr = (s: string) =>
  s.split("\n").map((x) => x.trim()).filter(Boolean);

function AdminFeedback() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [missionIntro, setMissionIntro] = useState("");
  const [fitNarrative, setFitNarrative] = useState("");
  const [fitPointsText, setFitPointsText] = useState("");
  const [strengthsText, setStrengthsText] = useState("");
  const [improveText, setImproveText] = useState("");
  const [nextActions, setNextActions] = useState<{ label: string; url: string }[]>([]);
  const [jobNames, setJobNames] = useState<Record<string, string>>({});
  const [mission, setMission] = useState<Mission | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expertAnswers, setExpertAnswers] = useState<string[]>([]);
  const [expertSaving, setExpertSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const seenSubmittedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    async function refresh() {
      const all = await listOrders();
      const o = all.filter((x) => x.answers);

      // notify on newly-submitted orders
      const submittedIds = new Set(
        o.filter((x) => x.submittedAt).map((x) => x.id),
      );
      if (seenSubmittedRef.current === null) {
        seenSubmittedRef.current = submittedIds;
      } else {
        const prev = seenSubmittedRef.current;
        const fresh = o.filter((x) => x.submittedAt && !prev.has(x.id));
        for (const x of fresh) {
          const name = await resolveJobName(x.jobSlug);
          toast.success(`새 제출이 도착했습니다 — ${name}`, {
            description: `${x.email} · ${x.id}`,
          });
        }
        seenSubmittedRef.current = submittedIds;
      }

      setOrders(o);
      setSelected((prev) => prev ?? o[0]?.id ?? null);
      const slugs = Array.from(new Set(o.map((x) => x.jobSlug)));
      const entries = await Promise.all(
        slugs.map(async (s) => [s, await resolveJobName(s)] as const),
      );
      setJobNames(Object.fromEntries(entries));
    }
    refresh();
    const ch = supabase
      .channel(`admin-feedback-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const order = orders.find((o) => o.id === selected);
  const jobName = order ? jobNames[order.jobSlug] ?? order.jobSlug : "";

  useEffect(() => {
    if (order?.missionId) getMission(order.missionId).then(setMission);
    else setMission(null);
  }, [order]);

  // Hydrate form when order changes
  useEffect(() => {
    if (!order) return;
    setScores(order.competencyScores ?? {});
    setComment(order.expertComment ?? "");
    setMissionIntro(order.missionIntro ?? "");
    setFitNarrative(order.fitNarrative ?? "");
    setFitPointsText((order.fitPoints ?? []).join("\n"));
    setStrengthsText((order.strengths ?? []).join("\n"));
    setImproveText((order.improvements ?? []).join("\n"));
    setNextActions(
      (order.nextActions ?? []).map((line) => {
        const i = line.indexOf("|");
        if (i === -1) return { label: line.trim(), url: "" };
        const label = line.slice(0, i).trim();
        const url = line.slice(i + 1).trim();
        // strip leading internal paths — external only going forward
        return { label, url: url.startsWith("/") ? "" : url };
      }),
    );
    const expertKeys = Object.keys(order.answers ?? {})
      .filter((k) => k.startsWith(EXPERT_Q_PREFIX))
      .sort((a, b) => {
        const ai = Number(a.replace(EXPERT_Q_PREFIX, "").replace(/_+$/, ""));
        const bi = Number(b.replace(EXPERT_Q_PREFIX, "").replace(/_+$/, ""));
        return ai - bi;
      });
    setExpertAnswers(expertKeys.map((k) => order.answers?.[k] ?? ""));
  }, [order?.id]);

  async function refreshOrders() {
    const all = await listOrders();
    setOrders(all.filter((x) => x.answers));
  }

  async function handleUploadFile(picked: File) {
    if (!order) return;
    if (picked.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`파일은 최대 ${MAX_FILE_MB}MB까지 업로드할 수 있어요`);
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const adminId = auth.user?.id ?? "admin";
      const safeName = picked.name.replace(/[^\w.\-]+/g, "_");
      const path = `${adminId}/${order.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("mission-submissions")
        .upload(path, picked, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("mission-submissions")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr) throw sErr;
      const nextFile = { url: signed.signedUrl, name: picked.name, path, size: picked.size };
      const prev = parseSubmissionFile(order);
      const nextAnswers: Record<string, string> = { ...(order.answers ?? {}), [FINAL_KEY]: JSON.stringify(nextFile) };
      await saveAnswers(order.id, nextAnswers);
      if (prev?.path && prev.path !== path) {
        try { await supabase.storage.from("mission-submissions").remove([prev.path]); } catch { /* ignore */ }
      }
      toast.success("제출 파일이 업데이트되었습니다");
      await refreshOrders();
    } catch (e) {
      toast.error((e as Error).message || "업로드에 실패했습니다");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteFile() {
    if (!order) return;
    const prev = parseSubmissionFile(order);
    if (!prev) return;
    if (!confirm("제출 파일을 삭제할까요?")) return;
    try {
      const nextAnswers = { ...(order.answers ?? {}) };
      delete nextAnswers[FINAL_KEY];
      await saveAnswers(order.id, nextAnswers);
      try { await supabase.storage.from("mission-submissions").remove([prev.path]); } catch { /* ignore */ }
      toast.success("제출 파일이 삭제되었습니다");
      await refreshOrders();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleSaveExpertAnswers() {
    if (!order) return;
    setExpertSaving(true);
    try {
      const nextAnswers: Record<string, string> = { ...(order.answers ?? {}) };
      expertAnswers.forEach((v, i) => { nextAnswers[expertQKey(i)] = v; });
      await saveAnswers(order.id, nextAnswers);
      toast.success("답변이 저장되었습니다");
      await refreshOrders();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExpertSaving(false);
    }
  }


  const competencyIds = useMemo(() => {
    const ids = mission?.submitted_competencies ?? [];
    if (ids.length > 0) return ids;
    // fallback when mission has no selected competencies
    return ALL_COMPETENCIES.slice(0, 6).map((c) => c.id);
  }, [mission]);

  async function handleSave() {
    if (!order) return;
    setSaving(true);
    try {
      await saveEvaluation(order.id, {
        competencyScores: scores,
        strengths: linesToArr(strengthsText),
        improvements: linesToArr(improveText),
        nextActions: nextActions
          .map((a) => ({ label: a.label.trim(), url: a.url.trim() }))
          .filter((a) => a.label || a.url)
          .map((a) => (a.url ? `${a.label || a.url} | ${a.url}` : a.label)),
        expertComment: comment,
        missionIntro: missionIntro,
        fitNarrative: fitNarrative,
        fitPoints: linesToArr(fitPointsText),
      });
      toast.success("저장되었습니다. 리포트에 반영됩니다.");
      // refresh local order
      const refreshed = await listOrders();
      setOrders(refreshed.filter((x) => x.answers));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="block min-h-screen bg-secondary/30 lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 md:grid-cols-[260px_1fr]">
          <aside>
            <div className="text-xs font-medium text-muted-foreground">제출 답변 목록</div>
            <div className="mt-2 space-y-2">
              {orders.length === 0 && (
                <Card className="p-4 text-xs text-muted-foreground">제출된 답변이 없습니다.</Card>
              )}
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  className={`w-full rounded-md border p-3 text-left transition-colors ${
                    o.id === selected ? "border-brand bg-brand-soft" : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <div className="text-sm font-medium text-primary">{jobNames[o.jobSlug] ?? o.jobSlug}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{o.email}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{o.id}</div>
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-5">
            {!order ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                왼쪽에서 답변을 선택하세요.
              </Card>
            ) : (
              <>
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-primary">제출 파일 — {jobName}</div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.hwp,.hwpx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadFile(f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? "업로드 중..." : parseSubmissionFile(order) ? "파일 교체" : "파일 업로드"}
                      </Button>
                      {parseSubmissionFile(order) && (
                        <Button type="button" variant="outline" size="sm" onClick={handleDeleteFile}>
                          삭제
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    {(() => {
                      const file = parseSubmissionFile(order);
                      if (!file) {
                        return (
                          <p className="rounded bg-muted p-4 text-sm text-muted-foreground">
                            아직 제출된 파일이 없습니다. 위 "파일 업로드" 버튼으로 관리자가 직접 추가할 수 있어요.
                          </p>
                        );
                      }
                      return (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start justify-between gap-3 rounded-md border border-border bg-secondary/40 p-4 transition-colors hover:bg-secondary/60"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
                              <FileText className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 truncate text-sm font-medium text-brand">
                                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </div>
                              {file.size != null && (
                                <div className="mt-0.5 text-[11px] text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                              )}
                              {order.submittedAt && (
                                <div className="mt-0.5 text-[11px] text-muted-foreground">
                                  제출일 {new Date(order.submittedAt).toLocaleString("ko-KR")}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">열기 ↗</span>
                        </a>
                      );
                    })()}
                  </div>
                </Card>

                {expertAnswers.length > 0 && (
                  <Card className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-primary">현직자 질문 답변</div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={expertSaving}
                        onClick={handleSaveExpertAnswers}
                      >
                        {expertSaving ? "저장 중..." : "답변 저장"}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      사용자가 제출한 답변을 관리자가 직접 입력/수정할 수 있습니다.
                    </p>
                    <div className="mt-3 space-y-3">
                      {expertAnswers.map((v, i) => (
                        <div key={i}>
                          <Label className="text-xs text-muted-foreground">질문 {i + 1}</Label>
                          <Textarea
                            rows={4}
                            value={v}
                            onChange={(e) => {
                              const nv = e.target.value;
                              setExpertAnswers((arr) => arr.map((x, idx) => (idx === i ? nv : x)));
                            }}
                            className="mt-1"
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}


                <Card className="p-5">
                  <div className="text-sm font-semibold text-primary">평가 역량 체크</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    시뮬레이션에 선택된 역량에 대해 0~100 점수를 입력하세요. 결과 리포트에 그대로 반영됩니다.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {competencyIds.map((cid) => (
                      <div key={cid} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
                        <Label className="text-sm">{getCompetencyName(cid)}</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={Number.isFinite(scores[cid]) ? scores[cid] : ""}
                            onChange={(e) => {
                              const v = e.target.value === "" ? NaN : Math.max(0, Math.min(100, Number(e.target.value)));
                              setScores((s) => ({ ...s, [cid]: v }));
                            }}
                            className="h-9 w-20 text-right"
                            placeholder="0-100"
                          />
                          <span className="text-xs text-muted-foreground">/100</span>
                        </div>
                      </div>
                    ))}
                    {competencyIds.length === 0 && (
                      <div className="text-xs text-muted-foreground">선택된 역량이 없습니다.</div>
                    )}
                  </div>
                </Card>

                <Card className="space-y-4 p-5">
                  <div className="text-sm font-semibold text-primary">AI 결과물 분석</div>
                  <p className="text-xs text-muted-foreground">
                    풀서비스의 "AI 결과물 분석" 카드에 반영될 강점과 보완 포인트를 입력하세요.
                  </p>
                  <div>
                    <Label>강점 (줄바꿈으로 여러 개 입력)</Label>
                    <Textarea
                      rows={4}
                      value={strengthsText}
                      onChange={(e) => setStrengthsText(e.target.value)}
                      className="mt-2"
                      placeholder={"문제 정의가 명확함\n핵심 데이터에서 이상 패턴을 잘 짚어냄"}
                    />
                  </div>
                  <div>
                    <Label>보완하면 좋은 점 (줄바꿈으로 여러 개 입력)</Label>
                    <Textarea
                      rows={4}
                      value={improveText}
                      onChange={(e) => setImproveText(e.target.value)}
                      className="mt-2"
                      placeholder={"원인 가설 간 우선순위 기준을 더 분명히 적으면 좋아요\n생산/품질 리스크 비교를 조금 더 구조적으로 정리하면 좋아요"}
                    />
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    {saving ? "저장 중..." : "저장 (리포트에 반영)"}
                  </Button>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
