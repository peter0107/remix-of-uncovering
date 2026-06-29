import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, FileText, Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoginRequiredSubmitDialog } from "@/components/LoginRequiredSubmitDialog";
import { createOrder, getOrder, saveAnswers, submitOrder, type Order } from "@/lib/orders";
import { getMission, type Mission, type MaterialBlock } from "@/lib/missions";
import { resolveJobName } from "@/lib/jobLookup";
import {
  getGuestMissionDraft,
  isGuestOrderId,
  removeGuestMissionDraft,
  updateGuestMissionDraftAnswers,
} from "@/lib/guest-mission-draft";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { MaterialBlocksView } from "@/components/MaterialBlocksView";
import { ParagraphText } from "@/components/ParagraphText";
import { Textarea } from "@/components/ui/textarea";
import { getExpertQuestionCount, EXPERT_QUESTION_MAX_LENGTH } from "@/data/products";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { WizardMissionRunner } from "@/components/WizardMissionRunner";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";

export const Route = createFileRoute("/mission/$orderId")({
  head: () => ({ meta: [{ title: "시뮬레이션 진행 — beginner" }] }),
  component: MissionPage,
});

const FINAL_KEY = "__final__";
const EXPERT_Q_PREFIX = "__expert_q_";
const expertQKey = (i: number) => `${EXPERT_Q_PREFIX}${i}__`;
const MAX_FILE_MB = 50;
const ACCEPT_HINT = "PDF, DOCX, HWP";
const ACCEPT_ATTR = ".pdf,.doc,.docx,.hwp,.hwpx";

type SubmissionFile = { url: string; name: string; path: string; size?: number };

function MissionPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [file, setFile] = useState<SubmissionFile | null>(null);
  const [pendingGuestFile, setPendingGuestFile] = useState<File | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [jobName, setJobName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expertQuestions, setExpertQuestions] = useState<string[]>([]);
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);
  const isMobile = useIsMobile();
  const guestMode = isGuestOrderId(orderId);
  const redirectTo =
    typeof window === "undefined" ? `/mission/${orderId}` : window.location.pathname + window.location.search;

  const expertCount = order ? getExpertQuestionCount(order.productId) : 0;

  useEffect(() => {
    setLoading(true);
    (async () => {
      let activeOrder: Order | null = null;

      if (guestMode) {
        const draft = getGuestMissionDraft(orderId);
        if (!draft) {
          toast.error("임시 시뮬레이션 정보를 찾을 수 없습니다.");
          navigate({ to: "/" });
          return;
        }

        activeOrder = {
          id: draft.id,
          userId: null,
          email: "",
          jobSlug: draft.jobSlug,
          missionId: draft.missionId,
          productId: draft.productId,
          status: "in_progress",
          createdAt: draft.createdAt,
          answers: draft.answers,
          feedbackRequested: false,
        };
      } else {
        const fetchedOrder = await getOrder(orderId);
        if (!fetchedOrder) {
          navigate({ to: "/" });
          return;
        }
        if (fetchedOrder.status === "payment_pending") {
          toast.info("결제 확인 후 시뮬레이션이 열립니다.");
          navigate({ to: "/my" });
          return;
        }
        activeOrder = fetchedOrder;
      }

      setOrder(activeOrder);
      const stored = activeOrder.answers?.[FINAL_KEY];
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as SubmissionFile;
          if (parsed?.url) setFile(parsed);
        } catch {
          /* legacy */
        }
      }
      const count = getExpertQuestionCount(activeOrder.productId);
      if (count > 0) {
        setExpertQuestions(
          Array.from({ length: count }, (_, i) => activeOrder?.answers?.[expertQKey(i)] ?? ""),
        );
      }
      const [name, m] = await Promise.all([
        resolveJobName(activeOrder.jobSlug),
        activeOrder.missionId ? getMission(activeOrder.missionId) : Promise.resolve(null),
      ]);
      setJobName(name);
      setMission(m);
      setLoading(false);
    })().catch((e) => {
      toast.error((e as Error).message || "주문을 불러오지 못했어요");
      setLoading(false);
    });
  }, [orderId, navigate]);

  if (loading || !order) return <MissionSkeleton />;

  if (!mission) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center text-sm text-muted-foreground">
        <div>
          <p>이 주문에 연결된 시뮬레이션을 찾을 수 없습니다.</p>
          <Link to="/my" className="mt-3 inline-block text-brand underline">
            마이페이지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (mission.content_mode === "step_wizard") {
    return <WizardMissionRunner order={order} mission={mission} jobName={jobName} />;
  }

  const questions = mission.questions ?? [];
  const materialBlocks = mission.material_blocks ?? [];

  const buildAnswers = (
    nextFile: SubmissionFile | null = file,
    nextExpert: string[] = expertQuestions,
  ): Record<string, string> => {
    const answers: Record<string, string> = {};
    if (nextFile) {
      answers[FINAL_KEY] = JSON.stringify(nextFile);
    }
    nextExpert.forEach((v, i) => {
      answers[expertQKey(i)] = v;
    });
    return answers;
  };

  const persist = async (next: SubmissionFile | null) => {
    const answers = buildAnswers(next, expertQuestions);
    if (guestMode) {
      updateGuestMissionDraftAnswers(orderId, answers);
      setOrder((current) => (current ? { ...current, answers } : current));
      return;
    }
    await saveAnswers(orderId, answers);
  };

  const persistExpert = async (next: string[]) => {
    const answers = buildAnswers(file, next);
    if (guestMode) {
      updateGuestMissionDraftAnswers(orderId, answers);
      setOrder((current) => (current ? { ...current, answers } : current));
      return;
    }
    await saveAnswers(orderId, answers);
  };

  const uploadSubmissionFile = async (
    picked: File,
    targetOrderId: string,
    userId: string,
  ): Promise<SubmissionFile> => {
    const safeName = picked.name.replace(/[^\w.-]+/g, "_");
    const path = `${userId}/${targetOrderId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("mission-submissions")
      .upload(path, picked, { upsert: true });
    if (upErr) throw upErr;
    const { data: signed, error: sErr } = await supabase.storage
      .from("mission-submissions")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (sErr) throw sErr;
    return {
      url: signed.signedUrl,
      name: picked.name,
      path,
      size: picked.size,
    };
  };

  const handleFile = async (picked: File) => {
    if (picked.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`파일은 최대 ${MAX_FILE_MB}MB까지 업로드할 수 있어요`);
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setPendingGuestFile(picked);
        setFile(null);
        toast.success("파일이 준비되었습니다");
        return;
      }

      const next = await uploadSubmissionFile(picked, orderId, userId);
      setFile(next);
      setPendingGuestFile(null);
      await persist(next);
      toast.success("파일이 업로드되었습니다");
    } catch (e) {
      toast.error((e as Error).message || "업로드에 실패했습니다");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async () => {
    if (pendingGuestFile) {
      setPendingGuestFile(null);
      return;
    }
    if (!file) return;
    try {
      await supabase.storage.from("mission-submissions").remove([file.path]);
    } catch {
      /* ignore */
    }
    setFile(null);
    await persist(null);
  };

  const onSubmit = async () => {
    if (submitting) return;
    if (!file && !pendingGuestFile) {
      toast.error("제출 파일을 업로드해주세요");
      return;
    }

    if (guestMode) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoginRequiredOpen(true);
        return;
      }
    }

    setSubmitting(true);
    try {
      let submitOrderId = orderId;
      let nextFile = file;

      if (guestMode && order) {
        const createdOrder = await createOrder({
          email: "",
          jobSlug: order.jobSlug,
          productId: order.productId,
          missionId: order.missionId,
          status: "in_progress",
        });

        submitOrderId = createdOrder.id;

        if (!nextFile && pendingGuestFile) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("로그인이 필요합니다.");
          nextFile = await uploadSubmissionFile(pendingGuestFile, submitOrderId, user.id);
        }

        removeGuestMissionDraft(orderId);
      }

      await submitOrder(submitOrderId, buildAnswers(nextFile, expertQuestions));
      posthog.capture("mission_submitted", {
        order_id: submitOrderId,
        job_name: jobName,
        mission_id: order?.missionId,
        mission_title: mission.title,
        product_id: order?.productId,
      });
      toast.success("제출이 완료되었습니다");
      navigate({ to: "/sample-answer/$orderId", params: { orderId: submitOrderId } });
    } catch (e) {
      posthog.captureException(e);
      toast.error((e as Error).message || "제출에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const missionTitle = mission.summary_title || mission.title;
  const missionSummary =
    mission.summary_description ||
    mission.description ||
    "제공된 자료를 바탕으로 핵심 문제와 개선 방향을 제안해보세요.";

  return (
    <div className="min-h-screen bg-secondary/20 pb-28 lg:pb-0">
      {submitting && <LoadingOverlay message="제출 중..." />}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-xs text-muted-foreground md:px-6">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link to="/experiences" className="hover:text-foreground">
              직무 체험
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-foreground">{jobName}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="bg-brand-soft text-brand">
            {jobName}
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            예상 소요 {mission.duration_min}분
          </Badge>
        </div>
        <h1 className="mt-3 font-bold leading-tight tracking-tight text-primary md:mt-4 md:text-3xl lg:text-4xl text-3xl">
          {missionTitle}
        </h1>
        <p className="mt-2 leading-loose text-muted-foreground md:text-base text-base">
          {missionSummary}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* 좌측: 브리프 + 제공 자료 */}
          <div className="min-w-0 space-y-6">
            <BriefCard situation={mission.situation} description={mission.description} />

            {materialBlocks.length > 0 && <MaterialsPanel blocks={materialBlocks} />}
          </div>

          {/* 우측: 제출 항목 + 파일 업로드 */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden p-5">
              <div className="font-bold text-primary text-base">리포트에 포함할 항목</div>
              {questions.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">등록된 제출 항목이 없습니다.</p>
              ) : (
                <Accordion
                  type="single"
                  collapsible
                  defaultValue={isMobile ? undefined : questions[0]?.id}
                  className="mt-3"
                >
                  {questions.map((q, i) => (
                    <AccordionItem key={q.id} value={q.id} className="border-border">
                      <AccordionTrigger className="py-3 text-left text-sm hover:no-underline">
                        <span className="flex items-center gap-2">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-brand text-[11px] font-semibold text-brand">
                            {i + 1}
                          </span>
                          <span className="text-foreground text-sm font-normal">{q.label}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pl-7 text-xs text-muted-foreground">
                        {q.guide?.trim() ? (
                          <ParagraphText text={q.guide} className="text-xs leading-relaxed" />
                        ) : (
                          "작성 가이드가 등록되어 있지 않습니다."
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </Card>

            <Card className="p-5">
              <div className="font-bold text-primary text-base">최종 제출</div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-secondary/60 px-3 py-1.5 text-[11px] text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                형식: {ACCEPT_HINT}
              </div>

              {file || pendingGuestFile ? (
                <div className="mt-4 rounded-md border border-border bg-secondary/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {file ? (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 truncate text-xs font-medium text-brand hover:underline"
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 truncate text-xs font-medium text-brand">
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{pendingGuestFile?.name}</span>
                        </div>
                      )}
                      {(file?.size ?? pendingGuestFile?.size) != null && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {(((file?.size ?? pendingGuestFile?.size) as number) / 1024 / 1024).toFixed(2)} MB
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="파일 삭제"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <Dropzone
                  uploading={uploading}
                  dragOver={dragOver}
                  setDragOver={setDragOver}
                  onFile={handleFile}
                />
              )}

              {expertCount > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <div className="text-sm font-semibold text-primary">
                    현직자에게 추가 질문 ({expertCount}개)
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    한 질문 당 최대 {EXPERT_QUESTION_MAX_LENGTH}자까지 작성 가능합니다.
                  </p>
                  <div className="mt-3 space-y-3">
                    {Array.from({ length: expertCount }).map((_, i) => {
                      const v = expertQuestions[i] ?? "";
                      return (
                        <div key={i}>
                          <label className="text-xs font-medium text-foreground">
                            질문 {i + 1}
                          </label>
                          <Textarea
                            value={v}
                            maxLength={EXPERT_QUESTION_MAX_LENGTH}
                            onChange={(e) => {
                              const next = [...expertQuestions];
                              next[i] = e.target.value.slice(0, EXPERT_QUESTION_MAX_LENGTH);
                              while (next.length < expertCount) next.push("");
                              setExpertQuestions(next);
                            }}
                            onBlur={() => persistExpert(expertQuestions)}
                            placeholder="현직자에게 묻고 싶은 질문을 입력하세요"
                            className="mt-1 min-h-[64px] resize-none text-sm"
                          />
                          <div className="mt-1 text-right text-[10px] text-muted-foreground">
                            {v.length}/{EXPERT_QUESTION_MAX_LENGTH}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                onClick={onSubmit}
                disabled={submitting || uploading || !file}
                style={{ backgroundColor: "#008f8f" }}
                className="mt-4 hidden w-full text-white hover:opacity-90 lg:flex"
                size="lg"
              >
                {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {submitting ? "제출 중..." : "제출하기"}
              </Button>
            </Card>
          </aside>
        </div>

        {/* 모바일 하단 고정 제출 바 */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1 text-xs">
              {file || pendingGuestFile ? (
                <div className="flex items-center gap-1.5 text-foreground">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-brand" />
                  <span className="truncate font-medium">{file?.name ?? pendingGuestFile?.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">파일을 업로드해주세요</span>
              )}
            </div>
            <Button
              onClick={onSubmit}
              disabled={submitting || uploading || !file}
              style={{ backgroundColor: "#008f8f" }}
              className="shrink-0 text-white hover:opacity-90"
              size="default"
            >
              {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {submitting ? "제출 중..." : "제출하기"}
            </Button>
          </div>
        </div>
      </div>

      <LoginRequiredSubmitDialog
        open={loginRequiredOpen}
        onOpenChange={setLoginRequiredOpen}
        redirectTo={redirectTo}
      />
    </div>
  );
}

function BriefCard({
  situation,
  description,
}: {
  situation: string | null;
  description: string | null;
}) {
  const body = situation || description;
  if (!body) return null;
  return (
    <Card className="flex gap-4 p-5">
      <div className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand md:grid">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="font-bold text-primary text-base">내용</div>
        <ParagraphText text={body} className="mt-2 text-sm text-foreground/90" />
      </div>
    </Card>
  );
}

function MaterialsPanel({ blocks }: { blocks: MaterialBlock[] }) {
  const sorted = useMemo(
    () => [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [blocks],
  );
  const groups = useMemo(() => {
    const images = sorted.filter((b) => b.type === "image");
    const tables = sorted.filter((b) => b.type === "table");
    const others = sorted.filter((b) => b.type !== "image" && b.type !== "table");
    return { images, tables, others };
  }, [sorted]);

  const tabs: { key: string; label: string; blocks: MaterialBlock[] }[] = [
    { key: "all", label: "전체 보기", blocks: sorted },
    ...(groups.images.length ? [{ key: "image", label: "화면", blocks: groups.images }] : []),
    ...(groups.tables.length ? [{ key: "table", label: "표", blocks: groups.tables }] : []),
    ...(groups.others.length ? [{ key: "etc", label: "기타", blocks: groups.others }] : []),
  ];

  return (
    <section>
      <h2 className="mb-3 text-base font-bold text-primary">제공 자료</h2>
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="h-auto bg-transparent p-0">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm text-muted-foreground data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand data-[state=active]:shadow-none"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            <MaterialBlocksView blocks={t.blocks} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function Dropzone({
  uploading,
  dragOver,
  setDragOver,
  onFile,
}: {
  uploading: boolean;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={`mt-4 grid cursor-pointer place-items-center rounded-md border-2 border-dashed px-4 py-8 text-center transition ${
        dragOver
          ? "border-brand bg-brand-soft/40"
          : "border-border bg-secondary/30 hover:bg-secondary/50"
      }`}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      ) : (
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
      )}
      <div className="mt-2 text-xs font-medium text-foreground">
        {uploading ? "업로드 중..." : "파일을 드래그하거나 클릭해 업로드"}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">최대 {MAX_FILE_MB}MB</div>
    </div>
  );
}

function MissionSkeleton() {
  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="border-b border-border bg-background">
        <div className="mx-auto h-10 max-w-6xl px-6" />
      </header>
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-28" />
        </div>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="p-6">
            <Skeleton className="h-5 w-24" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-9/12" />
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-5 w-28" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
