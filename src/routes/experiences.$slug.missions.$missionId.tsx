import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  BarChart3,
  Users,
  Pencil,
  Loader2,
  ListChecks,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextContent } from "@/components/RichTextContent";
import { ParagraphText } from "@/components/ParagraphText";
import { MaterialBlocksView } from "@/components/MaterialBlocksView";
import { getMission, type Mission, DIFFICULTY_LABEL } from "@/lib/missions";
import { resolveJobName } from "@/lib/jobLookup";
import { createOrder } from "@/lib/orders";
import { createGuestMissionDraft } from "@/lib/guest-mission-draft";
import { missionWizardIntroHtml } from "@/lib/rich-text";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PREVIEW_TABS = [
  { id: "brief", label: "시뮬레이션 내용" },
  { id: "materials", label: "제공 자료" },
] as const;

export const Route = createFileRoute("/experiences/$slug/missions/$missionId")({
  component: MissionOverviewPage,
});

function MissionOverviewPage() {
  const { slug, missionId } = Route.useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [jobName, setJobName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof PREVIEW_TABS)[number]["id"]>("brief");
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const draft = createGuestMissionDraft({
          jobSlug: slug,
          missionId,
          productId: "compare",
        });
        navigate({ to: "/mission/$orderId", params: { orderId: draft.id } });
        return;
      }

      const order = await createOrder({
        email: "",
        jobSlug: slug,
        productId: "compare",
        missionId,
        status: "in_progress",
      });
      navigate({ to: "/mission/$orderId", params: { orderId: order.id } });
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(msg || "시뮬레이션을 시작할 수 없습니다");
      setStarting(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getMission(missionId), resolveJobName(slug)])
      .then(([m, name]) => {
        setMission(m);
        setJobName(name);
      })
      .catch((e) => {
        toast.error((e as Error).message || "시뮬레이션을 불러오지 못했어요");
      })
      .finally(() => setLoading(false));
  }, [missionId, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <p className="text-sm text-muted-foreground">시뮬레이션을 찾을 수 없습니다.</p>
          <Link
            to="/experiences/$slug"
            params={{ slug }}
            className="mt-3 inline-block text-sm text-brand underline"
          >
            시뮬레이션 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const previewTitle = mission.summary_title || mission.title;
  const previewDescription =
    mission.summary_description ||
    mission.description ||
    "제공되는 자료를 보고 핵심 문제와 개선 방향을 제안해보세요.";
  const duration = `${mission.duration_min}분`;
  const difficulty = DIFFICULTY_LABEL[mission.difficulty] ?? "보통";
  const recommendedFor = mission.recommended_for || `${jobName}에 관심 있는 분`;
  const isWizard = mission.content_mode === "step_wizard";
  const introHtml = missionWizardIntroHtml(mission);

  return (
    <div className="min-h-screen bg-secondary/30 pb-28">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-10">
        <Link
          to="/experiences/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          시뮬레이션 목록으로 돌아가기
        </Link>

        {/* Header */}
        <div className="mt-6 flex items-start gap-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-brand-soft/60">
            <Pencil className="h-9 w-9 text-brand" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-brand text-sm">{jobName}</div>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-primary md:text-3xl">
              {previewTitle}
            </h1>
            <p className="mt-2 text-sm text-foreground/70 md:text-[15px]">{previewDescription}</p>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <MetaItem
            icon={<Clock className="h-5 w-5 text-brand" strokeWidth={1.8} />}
            label="예상 소요 시간"
            value={duration}
          />
          <MetaItem
            icon={<BarChart3 className="h-5 w-5 text-brand" strokeWidth={1.8} />}
            label="난이도"
            value={difficulty}
          />
          <MetaItem
            icon={<Users className="h-5 w-5 text-brand" strokeWidth={1.8} />}
            label="이런 분께 추천해요"
            value={recommendedFor}
          />
        </div>

        {isWizard ? (
          <>
            {introHtml && (
              <section className="mt-7 rounded-2xl border border-border bg-background p-5 md:p-6">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-brand" />
                  <h2 className="text-base font-bold text-primary md:text-lg">
                    시뮬레이션에서 다루는 내용
                  </h2>
                </div>
                <div className="mt-4">
                  <RichTextContent html={introHtml} />
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            {/* 시뮬레이션 단계 */}
            {mission.mission_steps.length > 0 && (
              <section className="mt-7 rounded-2xl border border-border bg-background p-5 md:p-6">
                <h2 className="text-base font-bold text-primary md:text-lg">시뮬레이션 단계</h2>
                <ol className="mt-3 grid gap-2 md:grid-cols-2">
                  {mission.mission_steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* 시뮬레이션 미리보기 */}
            <section className="mt-5 rounded-2xl border border-border bg-background p-5 md:p-6">
              <h2 className="text-base font-bold text-primary md:text-lg">시뮬레이션 미리보기</h2>

              <div className="mt-3 flex gap-6 border-b border-border">
                {PREVIEW_TABS.map((t) => {
                  const active = t.id === tab;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`-mb-px border-b-2 pb-2.5 text-sm transition-colors ${
                        active
                          ? "border-brand font-bold text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative mt-5 overflow-hidden rounded-xl border border-border bg-background">
                <div
                  className={`overflow-hidden p-5 md:p-6 ${
                    tab === "brief" ? "max-h-[260px]" : "max-h-[440px]"
                  }`}
                >
                  {tab === "brief" ? (
                    <BriefPreview mission={mission} />
                  ) : (
                    <MaterialsPreview mission={mission} />
                  )}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/95 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-5 grid place-items-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-foreground/85 px-4 py-2.5 text-center text-sm font-medium text-background shadow-lg">
                    <Lock className="h-4 w-4" />
                    {mission.locked_preview_text || "시뮬레이션 시작하기를 눌러 전체 내용을 확인해보세요."}
                  </div>
                </div>
              </div>
              {mission.preview_notice && (
                <p className="mt-3 text-xs text-muted-foreground">{mission.preview_notice}</p>
              )}
            </section>
          </>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-3.5">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={starting}
            style={{ backgroundColor: "#008f8f" }}
            className="shrink-0 px-6 text-white hover:opacity-90 md:px-10"
          >
            {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {starting ? "준비 중..." : "시뮬레이션 시작하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-bold text-primary text-base">{value}</div>
      </div>
    </div>
  );
}

function BriefPreview({ mission }: { mission: Mission }) {
  const body = mission.situation || mission.description;
  if (!body) {
    return <p className="text-sm text-muted-foreground">등록된 시뮬레이션 내용이 없습니다.</p>;
  }
  return (
    <div>
      <div className="text-sm font-bold text-primary">내용</div>
      <ParagraphText text={body} className="mt-2 text-sm leading-relaxed text-foreground/90" />
    </div>
  );
}

function MaterialsPreview({ mission }: { mission: Mission }) {
  const blocks = mission.material_blocks ?? [];
  if (blocks.length === 0) {
    return <p className="text-sm text-muted-foreground">제공 자료가 등록되지 않았습니다.</p>;
  }
  const sorted = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  // 첫 번째 블록만 노출, 나머지는 페이드로 가려짐
  const firstOnly = sorted.slice(0, 1);
  const remaining = sorted.length - firstOnly.length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold text-primary">제공 자료</div>
        {remaining > 0 && (
          <div className="text-[11px] text-muted-foreground">외 {remaining}개 자료 더보기</div>
        )}
      </div>
      <MaterialBlocksView blocks={firstOnly} />
    </div>
  );
}
