import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  Bot,
  Camera,
  CheckCircle2,
  FileText,
  Link2,
  ListChecks,
  MapPinned,
  MessageSquareQuote,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextContent } from "@/components/RichTextContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  getOrder,
  type Order,
  type ShareVerificationStatus,
  updateOrder,
} from "@/lib/orders";
import { getMission, type Mission } from "@/lib/missions";
import { resolveJobName } from "@/lib/jobLookup";
import { normalizeRichTextHtml, plainTextToRichTextHtml } from "@/lib/rich-text";

export const Route = createFileRoute("/sample-answer/$orderId")({
  head: () => ({ meta: [{ title: "모범 답안 — beginner" }] }),
  component: SampleAnswerPage,
});

type FullServiceTab = "sample_answer" | "expert_comment" | "offline_recommendations" | "ai_analysis";

const FULL_SERVICE_TABS: {
  id: FullServiceTab;
  title: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    id: "sample_answer",
    title: "현직자 모범답안",
    description: "현직자가 작성한 풀이와 핵심 흐름을 바로 볼 수 있어요.",
    icon: <Sparkles className="h-5 w-5 text-brand" />,
  },
  {
    id: "expert_comment",
    title: "현직자 코멘트",
    description: "미션과 현업의 연결점, 취업 준비에 도움이 되는 말들이 준비되어 있어요.",
    icon: <MessageSquareQuote className="h-5 w-5 text-brand" />,
  },
  {
    id: "offline_recommendations",
    title: "관련 오프라인 활동 추천",
    description: "실제 감각을 더 키울 수 있는 활동과 경험 방향을 모아드려요.",
    icon: <MapPinned className="h-5 w-5 text-brand" />,
  },
  {
    id: "ai_analysis",
    title: "AI 결과물 분석",
    description: "강점, 보완 포인트, 다음 액션을 한 번에 확인할 수 있어요.",
    icon: <Bot className="h-5 w-5 text-brand" />,
  },
];

function summarizeAiAnalysis(
  fitNarrativeHtml: string,
  strengths: string[],
  improvements: string[],
) {
  const fitNarrativeText = fitNarrativeHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (fitNarrativeText) {
    return fitNarrativeText.length > 110
      ? `${fitNarrativeText.slice(0, 110).trim()}...`
      : fitNarrativeText;
  }

  const lines = [
    ...strengths.map((item) => `강점: ${item}`),
    ...improvements.map((item) => `보완: ${item}`),
  ].filter(Boolean);

  if (lines.length === 0) {
    return "AI 결과물 분석 내용이 아직 준비되지 않았어요. 준비되면 알림으로 띄워드릴게요.";
  }

  const summary = lines.slice(0, 2).join(" / ");
  return summary.length > 110 ? `${summary.slice(0, 110).trim()}...` : summary;
}

function InstagramBadgeIcon() {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400 text-white shadow-sm">
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current" strokeWidth="2">
        <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17.4" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

function NaverBlogBadgeIcon() {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#03c75a] text-white shadow-sm">
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
        <path d="M5 5h10.8A3.2 3.2 0 0 1 19 8.2V19H8.2A3.2 3.2 0 0 1 5 15.8V5Z" />
        <path d="M9 9.2h2.1l3.2 4.3V9.2H16V16h-2l-3.3-4.4V16H9V9.2Z" fill="white" />
      </svg>
    </div>
  );
}

function KakaoBadgeIcon() {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fae100] text-[#381e1f] shadow-sm">
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
        <path d="M12 5c-4.7 0-8.5 2.8-8.5 6.2 0 2.2 1.6 4.1 4.1 5.2l-.8 3.1c-.1.3.2.5.5.3l3.7-2.5h1c4.7 0 8.5-2.8 8.5-6.2S16.7 5 12 5Z" />
      </svg>
    </div>
  );
}

function LinkCopyBadgeIcon() {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-sm">
      <Link2 className="h-6 w-6" />
    </div>
  );
}

function ShareChannelButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background px-3 py-4 text-center transition-colors hover:border-brand/40 hover:bg-brand-soft/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      <span className="text-xs font-semibold text-primary">{label}</span>
    </button>
  );
}

function formatShareBanner(status: ShareVerificationStatus | undefined) {
  if (status === "rejected") {
    return {
      wrapperClass: "border-orange-200 bg-gradient-to-br from-orange-50 via-orange-50 to-background",
      buttonClass: "bg-orange-500 text-white hover:bg-orange-600",
      title: "공유 인증이 반려되었어요",
      description: "다른 사진으로 재시도 해주세요!",
      buttonLabel: "공유 및 재인증하기",
    };
  }

  if (status === "pending") {
    return {
      wrapperClass: "border-sky-200 bg-gradient-to-br from-sky-50 via-sky-50 to-background",
      buttonClass: "bg-sky-500 text-white hover:bg-sky-600",
      title: "공유 인증 확인 중",
      description: "관리자가 확인 중이에요. 승인되면 풀서비스가 자동으로 열립니다.",
      buttonLabel: "인증 확인 중",
    };
  }

  return {
    wrapperClass: "border-brand/20 bg-gradient-to-br from-brand/10 via-brand-soft/30 to-background",
    buttonClass: "bg-[#008f8f] text-white hover:opacity-90",
    title: "풀서비스 이용하기",
    description: "공유 인증하고 모든 기능을 이용해보세요!",
    buttonLabel: "공유 및 인증하기",
  };
}

function SampleAnswerPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [jobName, setJobName] = useState("");
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [captureFile, setCaptureFile] = useState<File | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [captureSubmitting, setCaptureSubmitting] = useState(false);
  const [activeFullServiceTab, setActiveFullServiceTab] = useState<FullServiceTab>("sample_answer");
  const captureInputRef = useRef<HTMLInputElement>(null);
  const aiAnalysisReadyRef = useRef<boolean | null>(null);

  const loadPage = async (preserveLoading = false) => {
    if (!preserveLoading) setLoading(true);
    const nextOrder = await getOrder(orderId);
    if (!nextOrder) {
      navigate({ to: "/my" });
      return;
    }

    const [name, nextMission] = await Promise.all([
      resolveJobName(nextOrder.jobSlug),
      nextOrder.missionId ? getMission(nextOrder.missionId) : Promise.resolve(null),
    ]);

    setOrder(nextOrder);
    setJobName(name);
    setMission(nextMission);
    if (!preserveLoading) setLoading(false);
  };

  useEffect(() => {
    loadPage().catch((error) => {
      toast.error((error as Error).message || "불러오지 못했어요");
      setLoading(false);
    });
  }, [orderId, navigate]);

  useEffect(() => {
    const channel = supabase
      .channel(`sample-answer-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => {
          loadPage(true).catch((error) => {
            console.error("sample answer refresh error", error);
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    if (order?.shareVerificationStatus === "approved") {
      setActiveFullServiceTab("sample_answer");
    }
  }, [order?.shareVerificationStatus]);

  const title = mission?.summary_title || mission?.title || "시뮬레이션";
  const sampleAnswerHtml =
    normalizeRichTextHtml(mission?.sample_answer) ??
    plainTextToRichTextHtml(mission?.sample_answer) ??
    "";
  const previewUrl =
    typeof window !== "undefined" && order?.missionId
      ? `${window.location.origin}/experiences/${order.jobSlug}/missions/${order.missionId}`
      : typeof window !== "undefined"
        ? window.location.origin
        : "https://beginner.today";
  const shareText = `지금 바로 현직자가 만든 ${jobName || "직무"} 실제 업무를 무료로 체험해보세요!\n${previewUrl}`;
  const shareBanner = formatShareBanner(order?.shareVerificationStatus);
  const strengths = order?.strengths ?? [];
  const improvements = order?.improvements ?? [];
  const isApproved = order?.shareVerificationStatus === "approved";
  const isPending = order?.shareVerificationStatus === "pending";
  const expertCommentHtml =
    normalizeRichTextHtml(mission?.expert_comment_html) ??
    plainTextToRichTextHtml(mission?.expert_comment_html) ??
    "";
  const offlineActivityHtml =
    normalizeRichTextHtml(mission?.offline_activity_html) ??
    plainTextToRichTextHtml(mission?.offline_activity_html) ??
    "";
  const fitNarrativeHtml =
    normalizeRichTextHtml(order?.fitNarrative) ??
    plainTextToRichTextHtml(order?.fitNarrative) ??
    "";
  const isAiAnalysisReady =
    Boolean(fitNarrativeHtml) || strengths.length > 0 || improvements.length > 0;
  const aiAnalysisCardTitle = isAiAnalysisReady
    ? "Ai 결과물 분석(제공됨)"
    : "Ai 결과물 분석(준비중)";
  const aiAnalysisCardDescription = summarizeAiAnalysis(
    fitNarrativeHtml,
    strengths,
    improvements,
  );
  const fullServiceTabs = FULL_SERVICE_TABS.map((item) =>
    item.id === "ai_analysis"
      ? {
          ...item,
          title: aiAnalysisCardTitle,
          description: aiAnalysisCardDescription,
        }
      : item,
  );
  const activeFullService = fullServiceTabs.find((item) => item.id === activeFullServiceTab);

  useEffect(() => {
    if (!isApproved) {
      aiAnalysisReadyRef.current = isAiAnalysisReady;
      return;
    }

    if (aiAnalysisReadyRef.current === null) {
      aiAnalysisReadyRef.current = isAiAnalysisReady;
      return;
    }

    if (!aiAnalysisReadyRef.current && isAiAnalysisReady) {
      toast.success("AI 결과물 분석이 준비되었어요. 카드에서 바로 확인해보세요.");
    }

    aiAnalysisReadyRef.current = isAiAnalysisReady;
  }, [isApproved, isAiAnalysisReady]);

  if (loading || !order) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const copyShareText = async () => {
    await navigator.clipboard.writeText(shareText);
  };

  const handleInstagramShare = async () => {
    setShareBusy(true);
    try {
      await copyShareText();
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      toast.success("공유 문구와 링크를 복사했고 인스타그램을 열었어요.");
    } catch {
      toast.error("인스타그램 공유 준비 중 문제가 생겼어요.");
    } finally {
      setShareBusy(false);
    }
  };

  const handleNaverBlogShare = () => {
    const naverUrl = `https://share.naver.com/web/shareView?url=${encodeURIComponent(previewUrl)}&title=${encodeURIComponent(
      `지금 바로 현직자가 만든 ${jobName || "직무"} 실제 업무를 무료로 체험해보세요!`,
    )}`;
    window.open(naverUrl, "_blank", "noopener,noreferrer");
  };

  const handleKakaoShare = async () => {
    setShareBusy(true);
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({
          title: "beginner 직무 체험",
          text: shareText,
        });
        toast.success("공유 메뉴를 열었어요. 카카오톡을 선택해보세요.");
        return;
      }

      await copyShareText();
      window.open("https://sharer.kakao.com/", "_blank", "noopener,noreferrer");
      toast.success("공유 문구와 링크를 복사했고 카카오 공유 페이지를 열었어요.");
    } catch {
      toast.error("카카오톡 공유 준비 중 문제가 생겼어요.");
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopyShare = async () => {
    setShareBusy(true);
    try {
      await copyShareText();
      toast.success("공유 문구와 링크를 복사했어요.");
    } catch {
      toast.error("링크 복사 중 문제가 생겼어요.");
    } finally {
      setShareBusy(false);
    }
  };

  const handleCapturePick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    setCaptureFile(picked);
    toast.success("캡쳐 파일을 선택했어요. 제출 버튼으로 인증을 보내주세요.");
  };

  const handleCaptureSubmit = async () => {
    if (!captureFile) {
      toast.error("캡쳐 이미지를 먼저 선택해주세요.");
      return;
    }

    setCaptureSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("로그인이 필요합니다.");

      const safeName = captureFile.name.replace(/[^\w.-]+/g, "_");
      const path = `${userId}/${order.id}/share-verification/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("mission-submissions")
        .upload(path, captureFile, { upsert: true });
      if (uploadError) throw uploadError;

      await updateOrder(order.id, {
        shareVerificationStatus: "pending",
        shareVerificationImagePath: path,
        shareVerificationImageName: captureFile.name,
        shareVerificationSubmittedAt: Date.now(),
        shareVerificationReviewedAt: null,
        shareVerificationRejectionNote: null,
      });

      if (
        order.shareVerificationImagePath &&
        order.shareVerificationImagePath !== path
      ) {
        try {
          await supabase.storage
            .from("mission-submissions")
            .remove([order.shareVerificationImagePath]);
        } catch {
          // ignore old proof cleanup
        }
      }

      setCaptureFile(null);
      if (captureInputRef.current) captureInputRef.current.value = "";
      setShareDialogOpen(false);
      await loadPage(true);
      toast.success("공유 인증을 제출했어요. 확인 후 풀서비스가 열립니다.");
    } catch (error) {
      toast.error((error as Error).message || "공유 인증 제출에 실패했어요.");
    } finally {
      setCaptureSubmitting(false);
    }
  };

  const renderFullServiceContent = () => {
    if (activeFullServiceTab === "sample_answer") {
      return sampleAnswerHtml ? (
        <RichTextContent html={sampleAnswerHtml} className="mt-4" />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">현직자 모범 답안이 곧 공개됩니다.</p>
      );
    }

    if (activeFullServiceTab === "expert_comment") {
      return (
        <div className="mt-4 space-y-6">
          {expertCommentHtml ? (
            <RichTextContent html={expertCommentHtml} />
          ) : (
            <p className="text-sm text-muted-foreground">
              현직자 코멘트가 아직 등록되지 않았어요.
            </p>
          )}
        </div>
      );
    }

    if (activeFullServiceTab === "offline_recommendations") {
      return (
        <div className="mt-4 space-y-4">
          {offlineActivityHtml ? (
            <RichTextContent html={offlineActivityHtml} />
          ) : (
            <p className="text-sm text-muted-foreground">
              관련 오프라인 활동 추천이 아직 등록되지 않았어요.
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-6">
        {fitNarrativeHtml ? (
          <section>
            <h3 className="text-base font-semibold text-primary">종합 분석</h3>
            <RichTextContent html={fitNarrativeHtml} className="mt-3" />
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <h4 className="text-sm font-semibold text-emerald-800">강점</h4>
            {strengths.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-emerald-900">
                {strengths.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-emerald-800/80">아직 정리된 강점이 없어요.</p>
            )}
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <h4 className="text-sm font-semibold text-orange-800">보완 포인트</h4>
            {improvements.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-orange-900">
                {improvements.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-orange-800/80">아직 정리된 보완 포인트가 없어요.</p>
            )}
          </div>
        </section>

        {!fitNarrativeHtml && strengths.length === 0 && improvements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            AI 결과물 분석 내용이 아직 준비되지 않았어요. 준비되면 알림으로 띄워드릴게요.
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-secondary/20 pb-20">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link
            to="/my"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            마이페이지로 돌아가기
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 md:py-10">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="bg-brand text-brand-foreground hover:bg-brand">
            <Sparkles className="mr-1 h-3 w-3" />
            모범 답안
          </Badge>
          {jobName && (
            <Badge variant="secondary" className="bg-brand-soft text-brand">
              {jobName}
            </Badge>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-tight text-primary md:text-3xl">
          {title} — 모범 답안
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          현직자가 작성한 정답 풀이입니다. 내 답안과 비교하며 핵심 포인트를 확인해보세요.
        </p>

        {!isApproved ? (
          <Card className={`mt-6 overflow-hidden p-6 ${shareBanner.wrapperClass}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-brand-foreground">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-primary">{shareBanner.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{shareBanner.description}</p>
                  {order.shareVerificationRejectionNote ? (
                    <p className="mt-2 text-sm font-medium text-orange-700">
                      {order.shareVerificationRejectionNote}
                    </p>
                  ) : null}
                </div>
              </div>

              <Button
                type="button"
                onClick={() => !isPending && setShareDialogOpen(true)}
                disabled={isPending}
                className={`shrink-0 ${shareBanner.buttonClass}`}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {shareBanner.buttonLabel}
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/90 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <MessageSquareQuote className="h-4 w-4 text-brand" />
                  현직자 코멘트
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground/85">
                  <li>직무에서 필요한 역량</li>
                  <li>시뮬레이션과 현업의 연결점</li>
                  <li>취업 어필 포인트</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-background/90 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <MapPinned className="h-4 w-4 text-brand" />
                  관련 오프라인 활동 추천
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                  실제 직무 감각을 더 키울 수 있는 체험, 행사, 네트워킹 활동을 추천해드려요.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/90 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Bot className="h-4 w-4 text-brand" />
                  AI 결과물 분석
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                  제출한 결과물을 기준으로 강점과 보완 포인트를 더 깊게 분석해드려요.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <Card className="mt-6 overflow-hidden border-brand/20 bg-gradient-to-br from-brand/10 via-brand-soft/30 to-background p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-brand-foreground">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary">풀서비스 이용중</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    원하는 카드를 눌러 현직자 콘텐츠와 분석 결과를 확인해보세요.
                  </p>
                </div>
              </div>
            </Card>

            <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              {fullServiceTabs.map((item) => {
                const active = item.id === activeFullServiceTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveFullServiceTab(item.id)}
                    aria-label={item.title}
                    className={`flex h-20 items-center justify-center rounded-2xl border p-1.5 transition-all sm:h-auto sm:items-start sm:justify-start sm:rounded-3xl sm:p-4 sm:text-left lg:p-5 ${
                      active
                        ? "border-brand bg-brand-soft/40 shadow-sm"
                        : "border-border bg-background hover:border-brand/30 hover:bg-brand-soft/15"
                    }`}
                  >
                    <div className="flex w-full items-center justify-center sm:block">
                      <div className="flex items-center justify-center sm:justify-start sm:gap-2 text-base font-semibold text-primary">
                        {item.icon}
                        <span className="hidden sm:inline">{item.title}</span>
                      </div>
                      <p className="mt-3 hidden text-sm leading-relaxed text-muted-foreground sm:block">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Card className="mt-6 p-6">
              <div className="flex items-center gap-2">
                {activeFullService?.icon}
                <h2 className="text-lg font-bold text-primary">
                  {activeFullService?.title || "풀서비스"}
                </h2>
              </div>
              {renderFullServiceContent()}
            </Card>
          </>
        )}

        {!isApproved ? (
          <>
            <Card className="mt-6 p-6">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-brand" />
                <h2 className="text-lg font-bold text-primary">핵심 채점 포인트</h2>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-foreground/90">
                {[
                  "문제 정의가 명확하고, 데이터/근거를 바탕으로 가설을 세웠는가",
                  "현실적인 제약(시간·비용·리소스)을 고려한 우선순위가 드러나는가",
                  "제안한 솔루션이 측정 가능한 성과 지표와 연결되는가",
                  "리스크와 대응 방안을 함께 제시했는가",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {sampleAnswerHtml ? (
              <Card className="mt-6 p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand" />
                  <h2 className="text-lg font-bold text-primary">현직자 모범 답안</h2>
                </div>
                <RichTextContent html={sampleAnswerHtml} className="mt-4" />
              </Card>
            ) : (
              <Card className="mt-6 p-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand" />
                  <h2 className="text-lg font-bold text-primary">모범 답안 준비 중</h2>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  현직자 모범 답안이 곧 공개됩니다. 잠시만 기다려주세요.
                </p>
              </Card>
            )}
          </>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link to="/my">
            <Button variant="outline">마이페이지로</Button>
          </Link>
          <Link to="/experiences">
            <Button style={{ backgroundColor: "#008f8f" }} className="text-white hover:opacity-90">
              다른 직무 체험하기
            </Button>
          </Link>
        </div>
      </div>

      <Dialog
        open={shareDialogOpen}
        onOpenChange={(open) => {
          setShareDialogOpen(open);
          if (!open) {
            setCaptureFile(null);
            if (captureInputRef.current) captureInputRef.current.value = "";
          }
        }}
      >
        <DialogContent className="max-w-lg overflow-hidden rounded-2xl p-0">
          <div className="bg-gradient-to-br from-brand/10 via-brand-soft/30 to-background p-6">
            <DialogTitle className="text-xl font-bold text-primary">공유 인증하기</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              친구에게 공유하고 인증 완료 시 풀서비스를 이용할 수 있어요.
            </DialogDescription>

            {order.shareVerificationStatus === "rejected" ? (
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                다른 사진으로 재시도 해주세요!
              </div>
            ) : null}

            <div className="mt-5 grid gap-3">
              <div className="grid grid-cols-4 gap-3">
                <ShareChannelButton
                  label="인스타그램"
                  onClick={handleInstagramShare}
                  disabled={shareBusy}
                  icon={<InstagramBadgeIcon />}
                />
                <ShareChannelButton
                  label="네이버블로그"
                  onClick={handleNaverBlogShare}
                  icon={<NaverBlogBadgeIcon />}
                />
                <ShareChannelButton
                  label="카카오톡"
                  onClick={handleKakaoShare}
                  disabled={shareBusy}
                  icon={<KakaoBadgeIcon />}
                />
                <ShareChannelButton
                  label="링크 복사"
                  onClick={handleCopyShare}
                  disabled={shareBusy}
                  icon={<LinkCopyBadgeIcon />}
                />
              </div>

              <button
                type="button"
                onClick={() => captureInputRef.current?.click()}
                className="rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:border-brand/40 hover:bg-brand-soft/20"
              >
                <div className="flex items-center gap-2 text-base font-semibold text-primary">
                  <Camera className="h-4 w-4 text-brand" />
                  공유 인증하기
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  공유한 화면을 캡쳐해서 업로드해주세요. 인증 확인 후 전체 서비스가 오픈됩니다. (5분
                  이내 소요)
                </p>
                <div className="mt-3 text-xs text-brand">
                  {captureFile ? `선택된 파일: ${captureFile.name}` : "캡쳐 이미지 선택"}
                </div>
              </button>

              {captureFile ? (
                <Button
                  type="button"
                  onClick={handleCaptureSubmit}
                  disabled={captureSubmitting}
                  className="bg-[#008f8f] text-white hover:opacity-90"
                >
                  {captureSubmitting ? "제출 중..." : "제출하기"}
                </Button>
              ) : null}
            </div>

            <input
              ref={captureInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCapturePick}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
