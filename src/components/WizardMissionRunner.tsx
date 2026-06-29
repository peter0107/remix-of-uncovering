import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Paperclip,
  UploadCloud,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { LoginRequiredSubmitDialog } from "@/components/LoginRequiredSubmitDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { ParagraphText } from "@/components/ParagraphText";
import { RichTextContent } from "@/components/RichTextContent";
import {
  isGuestOrderId,
  removeGuestMissionDraft,
  updateGuestMissionDraftAnswers,
} from "@/lib/guest-mission-draft";
import { type Mission, type WizardPrompt, type WizardStep } from "@/lib/missions";
import { createOrder, saveAnswers, submitOrder, type Order } from "@/lib/orders";
import { wizardStepBodyHtml } from "@/lib/rich-text";
import { toast } from "sonner";

const FINAL_KEY = "__final__";
const MAX_FILE_MB = 50;
const ACCEPT_HINT = "PDF, DOCX, HWP";
const ACCEPT_ATTR = ".pdf,.doc,.docx,.hwp,.hwpx";

type SubmissionFile = { url: string; name: string; path: string; size?: number };

type Props = {
  order: Order;
  mission: Mission;
  jobName: string;
};

export function WizardMissionRunner({ order, mission, jobName }: Props) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingGuestFile, setPendingGuestFile] = useState<File | null>(null);
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);
  const steps = useMemo(() => mission.wizard_steps ?? [], [mission.wizard_steps]);
  const pageLabels = useMemo(
    () => [...steps.map((step) => step.title || "단계"), "최종 제출"],
    [steps],
  );
  const guestMode = isGuestOrderId(order.id);
  const redirectTo =
    typeof window === "undefined" ? `/mission/${order.id}` : window.location.pathname + window.location.search;

  const preservedAnswersRef = useRef<Record<string, string>>(
    Object.fromEntries(Object.entries(order.answers ?? {}).filter(([key]) => key !== FINAL_KEY)),
  );
  const [file, setFile] = useState<SubmissionFile | null>(() => {
    const stored = order.answers?.[FINAL_KEY];
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as SubmissionFile;
      return parsed?.url ? parsed : null;
    } catch {
      return null;
    }
  });
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      const answers = buildAnswers(preservedAnswersRef.current, file);

      const savePromise = guestMode
        ? Promise.resolve(updateGuestMissionDraftAnswers(order.id, answers))
        : saveAnswers(order.id, answers);

      savePromise
        .then(() => setSaveState("saved"))
        .catch((e) => {
          setSaveState("idle");
          toast.error((e as Error).message || "자동 저장에 실패했습니다");
        });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [file, guestMode, order.id]);

  const totalPages = steps.length + 1;
  const isReview = currentIndex === totalPages - 1;
  const currentStep = !isReview ? steps[currentIndex] : null;
  const progress = ((currentIndex + 1) / totalPages) * 100;

  const goNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const goPrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const uploadSubmissionFile = async (
    picked: File,
    targetOrderId: string,
    userId: string,
  ): Promise<SubmissionFile> => {
    const safeName = picked.name.replace(/[^\w.-]+/g, "_");
    const path = `${userId}/${targetOrderId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("mission-submissions")
      .upload(path, picked, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: signed, error: signedError } = await supabase.storage
      .from("mission-submissions")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedError) throw signedError;

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
    setSaveState("saving");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setPendingGuestFile(picked);
        setFile(null);
        setSaveState("idle");
        toast.success("보고서 파일이 준비되었습니다");
        return;
      }

      const nextFile = await uploadSubmissionFile(picked, order.id, userId);

      setFile(nextFile);
      setPendingGuestFile(null);

      if (guestMode) {
        updateGuestMissionDraftAnswers(order.id, buildAnswers(preservedAnswersRef.current, nextFile));
      } else {
        await saveAnswers(order.id, buildAnswers(preservedAnswersRef.current, nextFile));
      }
      setSaveState("saved");
      toast.success("보고서 파일이 업로드되었습니다");
    } catch (e) {
      setSaveState("idle");
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
    setSaveState("saving");
    try {
      if (guestMode) {
        updateGuestMissionDraftAnswers(order.id, buildAnswers(preservedAnswersRef.current, null));
      } else {
        await saveAnswers(order.id, buildAnswers(preservedAnswersRef.current, null));
      }
      setSaveState("saved");
    } catch (e) {
      setSaveState("idle");
      toast.error((e as Error).message || "파일 상태를 저장하지 못했습니다");
    }
  };

  const onSubmit = async () => {
    if (!file && !pendingGuestFile) {
      toast.error("보고서 파일을 업로드해주세요.");
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
      let submitOrderId = order.id;
      let nextFile = file;

      if (guestMode) {
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

        removeGuestMissionDraft(order.id);
      }

      await submitOrder(submitOrderId, buildAnswers(preservedAnswersRef.current, nextFile));
      toast.success("보고서가 제출되었습니다");
      navigate({ to: "/sample-answer/$orderId", params: { orderId: submitOrderId } });
    } catch (e) {
      toast.error((e as Error).message || "제출에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/20 pb-28">
      {submitting && <LoadingOverlay message="제출 중..." />}
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                to="/experiences"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                직무 체험
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-primary">{mission.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-brand-soft text-brand">
                  {jobName}
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  총 {mission.duration_min}분
                </Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {saveState === "saving"
                ? "자동 저장 중..."
                : saveState === "saved"
                  ? "자동 저장됨"
                  : ""}
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-brand transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 -mx-1 flex overflow-x-auto px-1 pb-1">
              {pageLabels.map((label, index) => {
                const active = index === currentIndex;
                return (
                  <button
                    key={`${label}-${index}`}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`mr-2 shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-background text-foreground/70 hover:border-brand/40"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        {isReview ? (
          <ReviewPage
            mission={mission}
            file={file}
            pendingGuestFile={pendingGuestFile}
            uploading={uploading}
            dragOver={dragOver}
            setDragOver={setDragOver}
            onFile={handleFile}
            onRemoveFile={removeFile}
            onBack={goPrev}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        ) : currentStep ? (
          <StepPage
            index={currentIndex}
            step={currentStep}
            file={file}
            pendingGuestFile={pendingGuestFile}
            uploading={uploading}
            dragOver={dragOver}
            setDragOver={setDragOver}
            onFile={handleFile}
            onRemoveFile={removeFile}
          />
        ) : null}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0 || submitting}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            이전
          </Button>
          <div className="text-center text-xs text-muted-foreground">
            {currentIndex + 1} / {totalPages}
          </div>
          {isReview ? (
            <Button
              onClick={onSubmit}
              disabled={submitting || uploading || (!file && !pendingGuestFile)}
              style={{ backgroundColor: "#008f8f" }}
              className="text-white hover:opacity-90"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "제출 중..." : "보고서 제출하기"}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              style={{ backgroundColor: "#008f8f" }}
              className="text-white hover:opacity-90"
            >
              다음
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
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

function StepPage({
  index,
  step,
  file,
  pendingGuestFile,
  uploading,
  dragOver,
  setDragOver,
  onFile,
  onRemoveFile,
}: {
  index: number;
  step: WizardStep;
  file: SubmissionFile | null;
  pendingGuestFile: File | null;
  uploading: boolean;
  dragOver: boolean;
  setDragOver: (next: boolean) => void;
  onFile: (file: File) => void;
  onRemoveFile: () => void;
}) {
  const bodyHtml = wizardStepBodyHtml(step);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-brand">Step {index + 1}</div>
              <h2 className="mt-1 text-2xl font-bold text-primary">{step.title}</h2>
            </div>
            <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {step.duration_min}분
            </div>
          </div>
          {bodyHtml && (
            <div className="mt-5 border-t border-border pt-5">
              <RichTextContent html={bodyHtml} />
            </div>
          )}
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <ReportChecklistCard prompts={step.prompts} />
        <ReportUploadCard
          file={file}
          pendingGuestFile={pendingGuestFile}
          uploading={uploading}
          dragOver={dragOver}
          setDragOver={setDragOver}
          onFile={onFile}
          onRemoveFile={onRemoveFile}
        />
      </aside>
    </div>
  );
}

function ReportChecklistCard({ prompts }: { prompts: WizardPrompt[] }) {
  return (
    <Card className="p-5">
      <div className="text-base font-bold text-primary">보고서에 포함할 항목</div>
      {prompts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          이 단계에는 별도로 안내된 보고서 항목이 없습니다.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {prompts.map((prompt, promptIndex) => (
            <div key={prompt.id} className="rounded-xl border border-border bg-secondary/10 p-4">
              <div className="flex items-start gap-2">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-brand text-[11px] font-semibold text-brand">
                  {promptIndex + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-primary">{prompt.label}</div>
                  {prompt.guide?.trim() && (
                    <ParagraphText
                      text={prompt.guide}
                      className="mt-1 text-xs text-muted-foreground"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ReportUploadCard({
  file,
  pendingGuestFile,
  uploading,
  dragOver,
  setDragOver,
  onFile,
  onRemoveFile,
}: {
  file: SubmissionFile | null;
  pendingGuestFile: File | null;
  uploading: boolean;
  dragOver: boolean;
  setDragOver: (next: boolean) => void;
  onFile: (file: File) => void;
  onRemoveFile: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="text-base font-bold text-primary">보고서 업로드</div>
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
              onClick={onRemoveFile}
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
          onFile={onFile}
        />
      )}
    </Card>
  );
}

function ReviewPage({
  mission,
  file,
  pendingGuestFile,
  uploading,
  dragOver,
  setDragOver,
  onFile,
  onRemoveFile,
  onBack,
  onSubmit,
  submitting,
}: {
  mission: Mission;
  file: SubmissionFile | null;
  pendingGuestFile: File | null;
  uploading: boolean;
  dragOver: boolean;
  setDragOver: (next: boolean) => void;
  onFile: (file: File) => void;
  onRemoveFile: () => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-6">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-bold text-primary">최종 검토</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Step별 체크 항목을 한 번 더 확인하고, 최종 보고서 파일을 업로드한 뒤 제출하세요.
        </p>
      </Card>

      <ReportUploadCard
        file={file}
        pendingGuestFile={pendingGuestFile}
        uploading={uploading}
        dragOver={dragOver}
        setDragOver={setDragOver}
        onFile={onFile}
        onRemoveFile={onRemoveFile}
      />

      {mission.wizard_steps.map((step, stepIndex) => (
        <Card key={step.id} className="p-5">
          <div className="text-sm font-semibold text-brand">Step {stepIndex + 1}</div>
          <div className="mt-1 text-lg font-bold text-primary">{step.title}</div>
          {step.prompts.length > 0 ? (
            <div className="mt-4 space-y-4">
              {step.prompts.map((prompt, promptIndex) => (
                <div
                  key={prompt.id}
                  className="rounded-lg border border-border bg-secondary/10 p-4"
                >
                  <div className="flex items-start gap-2">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-brand text-[11px] font-semibold text-brand">
                      {promptIndex + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-primary">{prompt.label}</div>
                      {prompt.guide?.trim() && (
                        <ParagraphText
                          text={prompt.guide}
                          className="mt-1 text-xs text-muted-foreground"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              이 단계에는 별도 포함 항목이 없습니다.
            </p>
          )}
        </Card>
      ))}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          이전 단계로
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitting || uploading || (!file && !pendingGuestFile)}
          style={{ backgroundColor: "#008f8f" }}
          className="text-white hover:opacity-90"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? "제출 중..." : "보고서 제출하기"}
        </Button>
      </div>
    </div>
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
  setDragOver: (next: boolean) => void;
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
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) onFile(droppedFile);
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
          const pickedFile = e.target.files?.[0];
          if (pickedFile) onFile(pickedFile);
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
      <div className="mt-1 text-[11px] text-muted-foreground">
        형식: {ACCEPT_HINT} · 최대 {MAX_FILE_MB}MB
      </div>
    </div>
  );
}

function buildAnswers(preservedAnswers: Record<string, string>, file: SubmissionFile | null) {
  const next = { ...preservedAnswers };
  if (file) {
    next[FINAL_KEY] = JSON.stringify(file);
  } else {
    delete next[FINAL_KEY];
  }
  return next;
}
