import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Share2, Star, ThumbsUp, Sparkles, Lock, MessageSquare, ExternalLink, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import { RadarChart } from "@/components/RadarChart";
import { getOrder, type Order } from "@/lib/orders";
import { getMission, type Mission } from "@/lib/missions";
import { resolveJobName } from "@/lib/jobLookup";
import { getCompetencyName, ALL_COMPETENCIES } from "@/data/competencies";

import { SAMPLE_REPORT, type Grade } from "@/data/sampleReport";
import { toast } from "sonner";

export const Route = createFileRoute("/report/$orderId")({
  head: () => ({ meta: [{ title: "결과 리포트 — beginner" }] }),
  component: ReportPage,
});




function gradeFromScore(s: number): Grade {
  if (s >= 90) return "상";
  if (s >= 80) return "중상";
  if (s >= 65) return "중";
  return "보완 필요";
}

function letterGrade(s: number): string {
  if (s >= 90) return "A";
  if (s >= 80) return "B";
  if (s >= 70) return "C";
  return "D";
}

function fmtDate(t: number | undefined) {
  if (!t) return "-";
  const d = new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// Parse "라벨 | URL" or just "라벨". URL is optional.
function parseActionLine(line: string): { label: string; url?: string } {
  const idx = line.indexOf("|");
  if (idx === -1) return { label: line.trim() };
  const label = line.slice(0, idx).trim();
  const url = line.slice(idx + 1).trim();
  return { label: label || url, url: url || undefined };
}

function ReportPage() {
  const { orderId } = Route.useParams();
  const isSample = orderId === "sample";
  const [loading, setLoading] = useState(!isSample);
  const [order, setOrder] = useState<Order | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [jobName, setJobName] = useState<string>("");

  useEffect(() => {
    if (isSample) return;
    setLoading(true);
    (async () => {
      const o = await getOrder(orderId);
      if (!o) {
        setLoading(false);
        return;
      }
      setOrder(o);
      const [name, m] = await Promise.all([
        resolveJobName(o.jobSlug),
        o.missionId ? getMission(o.missionId) : Promise.resolve(null),
      ]);
      setJobName(name);
      setMission(m);
      setLoading(false);
    })().catch((e) => {
      toast.error((e as Error).message || "리포트를 불러오지 못했어요");
      setLoading(false);
    });
  }, [orderId, isSample]);

  const hasAdminScores = !!order?.competencyScores && Object.keys(order.competencyScores).length > 0;
  const isReportReady = isSample || hasAdminScores;

  const competencyScores = useMemo(() => {
    if (isSample) {
      return SAMPLE_REPORT.competencies.map((c) => {
        const s = c.grade === "상" ? 92 : c.grade === "중상" ? 84 : c.grade === "중" ? 72 : 55;
        return { id: c.name, name: c.name, score: s, grade: c.grade };
      });
    }
    const adminScores = order?.competencyScores ?? {};
    const ids = mission?.submitted_competencies ?? [];
    const list = ids.length > 0
      ? ids.map((id) => ({ id, name: getCompetencyName(id) }))
      : ALL_COMPETENCIES.slice(0, 6).map((c) => ({ id: c.id, name: c.name }));
    return list.map((c) => {
      const adminVal = adminScores[c.id];
      const s = Number.isFinite(adminVal) ? Math.max(0, Math.min(100, Number(adminVal))) : 0;
      return { id: c.id, name: c.name, score: s, grade: gradeFromScore(s) };
    });
  }, [isSample, mission, order]);

  const overall = useMemo(() => {
    if (competencyScores.length === 0) return 0;
    return Math.round(
      competencyScores.reduce((a, c) => a + c.score, 0) / competencyScores.length,
    );
  }, [competencyScores]);

  const strengths = useMemo(
    () => (isSample ? SAMPLE_REPORT.strengths : (order?.strengths ?? [])),
    [isSample, order],
  );
  const improvements = useMemo(
    () => (isSample ? SAMPLE_REPORT.improvements : (order?.improvements ?? [])),
    [isSample, order],
  );
  const nextActions = useMemo(
    () => (isSample ? SAMPLE_REPORT.nextActions : (order?.nextActions ?? [])),
    [isSample, order],
  );
  const hasExpertComment = !isSample && !!order?.expertComment?.trim();
  // 결제 등급
  // single(4,900)   → 시뮬레이션 + AI 점수만
  // compare(9,900)  → 강점/보완/추천활동 + 현직자 짧은 코멘트
  // feedback(29,900)→ 강점/보완/추천활동 + 현직자 상세 피드백 + AI 실무 활용 관점
  const rawTier = isSample ? "feedback" : (order?.productId ?? "single");
  const tier: "single" | "compare" | "feedback" =
    rawTier === "compare" || rawTier === "feedback" ? rawTier : "single";
  const showAnalysis = tier !== "single"; // 강점/보완/추천활동
  const showExpertSection = tier === "compare" || tier === "feedback"; // 코멘트 영역
  const expertLabel = tier === "feedback" ? "현직자 상세 피드백" : "현직자 코멘트";

  if (loading) return <ReportSkeleton />;

  if (!isSample && !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-primary">리포트를 찾을 수 없어요</h1>
          <Link to="/my/reports" className="mt-6 inline-block">
            <Button variant="outline">완료한 리포트로</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!isReportReady) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-primary">리포트 준비 중입니다</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            현직자 검수 및 AI 역량 점수 산정이 완료되면 리포트를 확인할 수 있어요.
            보통 1~2일 이내에 준비됩니다.
          </p>
          <Link to="/my/reports" className="mt-6 inline-block">
            <Button variant="outline">완료한 리포트로</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const title = isSample
    ? SAMPLE_REPORT.jobName
    : jobName || mission?.title || "결과 리포트";
  const missionTitle = isSample ? null : mission?.title;
  const completedAt = isSample ? Date.now() : (order?.submittedAt ?? order?.createdAt);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link to={isSample ? "/" : "/my/reports"} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> 이전
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-md">
            <Download className="h-4 w-4" /> 다운로드
          </Button>
          <Button variant="outline" size="sm" className="rounded-md">
            <Share2 className="h-4 w-4" /> 공유
          </Button>
        </div>
      </div>

      {/* Header card */}
      <Card className="mt-5 p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">{title}</h1>
            {missionTitle && (
              <div className="mt-1 text-xs text-muted-foreground">
                {missionTitle}
              </div>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              시뮬레이션 완료일 {fmtDate(completedAt)}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-muted-foreground">종합 점수</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-primary">{overall}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-2xl font-bold text-brand">
              {letterGrade(overall)}
            </div>
          </div>
        </div>
      </Card>

      {/* 시뮬레이션 소개 */}
      {(() => {
        const intro = isSample ? SAMPLE_REPORT.missionIntro : order?.missionIntro;
        if (!intro?.trim()) return null;
        return (
          <Card className="mt-5 p-6">
            <div className="flex items-center gap-2 font-bold text-primary text-base">
              <BookOpen className="h-4 w-4 text-brand" /> 시뮬레이션 소개
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {intro}
            </p>
          </Card>
        );
      })()}

      {/* Competencies + Radar */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">

        <Card className="p-6">
          <div className="font-bold text-primary text-base">
            역량 요약 <span className="text-muted-foreground">({competencyScores.length}개)</span>
          </div>
          <ul className="mt-5 space-y-4">
            {competencyScores.map((c) => (
              <li key={c.id}>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-foreground">{c.name}</div>
                  <div className="text-sm font-bold text-foreground">{c.score}</div>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-brand" style={{ width: `${c.score}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="font-bold text-primary text-base">역량 분포</div>
          <div className="mt-2">
            <RadarChart
              data={competencyScores.map((c) => ({ name: c.name, score: c.score }))}
            />
          </div>
        </Card>
      </div>

      {/* 현업과의 연결점 + 이하 섹션들 (single 결제자는 블러+잠금) */}
      {(() => {
        const fitNarrative = isSample
          ? SAMPLE_REPORT.fitNarrative
          : (order?.fitNarrative && order.fitNarrative.trim().length > 0
              ? order.fitNarrative
              : `현업에서는 PRD 작성 전 단계의 '문제 정렬' 회의에서 이 흐름이 그대로 반복됩니다. 같은 데이터를 보고도 누구는 화면을, 누구는 카피를, 누구는 플로우를 바꾸자고 합니다. 이 시뮬레이션을 통해 본인이 어느 지점에서 강하고 어디서 흔들리는지 확인하면, 실제 협업에서 어떤 역할을 맡을 때 가장 빠르게 기여할 수 있을지 감을 잡을 수 있습니다.`);
        const fitPoints = isSample
          ? SAMPLE_REPORT.fitPoints
          : (order?.fitPoints && order.fitPoints.length > 0
              ? order.fitPoints
              : [
                  `${title} 직무에서 자주 마주치는 의사결정 흐름과 본 시뮬레이션의 사고 과정이 직접 연결됩니다.`,
                  "실무자가 일하는 방식의 한 조각을 직접 체험한 결과이므로, 현업의 협업 맥락에서 본인의 강점을 가늠해볼 수 있어요.",
                ]);

        const FitPointsCard = (
          <Card className="p-6">
            <div className="flex items-center gap-2 font-bold text-primary text-base">
              <Sparkles className="h-4 w-4 text-brand" /> 현업과의 연결점
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {fitNarrative}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-foreground/80">
              {fitPoints.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brand">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Card>
        );

        const AnalysisBlocks = (
          <>
            {FitPointsCard}
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Card className="p-6">
                <div className="flex items-center gap-2 font-bold text-primary text-base">
                  <ThumbsUp className="h-4 w-4 text-brand" /> 강점
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                  {strengths.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="text-brand">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-2 font-bold text-primary text-base">
                  <Sparkles className="h-4 w-4 text-rose-500" /> 보완하면 좋은 점
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                  {improvements.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="text-rose-400">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <Card className="mt-5 p-6">
              <div className="flex items-center gap-2 font-bold text-primary text-base">
                <Star className="h-4 w-4 text-brand" /> 추천 활동
              </div>
              <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                {nextActions.map((a) => {
                  const line = a.trim();
                  const idx = line.indexOf("|");
                  const label = (idx === -1 ? line : line.slice(0, idx).trim()) || line;
                  const raw = idx === -1 ? "" : line.slice(idx + 1).trim();
                  let href = "";
                  if (raw && !raw.startsWith("/")) {
                    href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                  }
                  return (
                    <li key={a} className="flex gap-2">
                      <span className="text-brand">•</span>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand underline-offset-2 hover:underline"
                        >
                          <span>{label}</span>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <span>{label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
            {showExpertSection && hasExpertComment && (
              <Card className="mt-5 p-6">
                <div className="flex items-center gap-2 font-bold text-primary text-base">
                  <MessageSquare className="h-4 w-4 text-brand" /> {expertLabel}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">
                  {order?.expertComment}
                </p>
              </Card>
            )}
          </>
        );

        // 샘플 또는 compare/feedback 결제자: 그대로 노출
        if (isSample || tier !== "single") {
          return <div className="mt-5">{AnalysisBlocks}</div>;
        }

        // single 결제자: 현업과의 연결점부터 블러 + 잠금 오버레이
        return (
          <div className="relative mt-5">
            <div className="pointer-events-none select-none blur-sm" aria-hidden="true">
              {FitPointsCard}
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Card className="p-6">
                  <div className="flex items-center gap-2 font-bold text-primary text-base">
                    <ThumbsUp className="h-4 w-4 text-brand" /> 강점
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                    <li>● ●●●● ●●●●● ●●●●●● ●●●● ●●●●●●● ●●●●● ●●●●●●●● ●●●●</li>
                    <li>● ●●●●● ●●●●●●● ●●●● ●●●●●● ●●●●● ●●●● ●●●●●● ●●●●●●</li>
                    <li>● ●●●● ●●●●●● ●●●●● ●●●●●●● ●●●● ●●●●● ●●●●●●● ●●●●</li>
                  </ul>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center gap-2 font-bold text-primary text-base">
                    <Sparkles className="h-4 w-4 text-rose-500" /> 보완하면 좋은 점
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                    <li>● ●●●●● ●●●●●●● ●●●● ●●●●●● ●●●●● ●●●● ●●●●●● ●●●●●●</li>
                    <li>● ●●●● ●●●●●● ●●●●● ●●●●●●● ●●●● ●●●●● ●●●●●●● ●●●●</li>
                  </ul>
                </Card>
              </div>
              <Card className="mt-5 p-6">
                <div className="flex items-center gap-2 font-bold text-primary text-base">
                  <Star className="h-4 w-4 text-brand" /> 추천 활동
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                  <li>● ●●●●●● ●●●●● ●●●● ●●●●●●● ●●●●● ●●●●●●●● ●●●●●●</li>
                  <li>● ●●●● ●●●●● ●●●●●● ●●●●● ●●●● ●●●●●●● ●●●●●●● ●●●●</li>
                </ul>
              </Card>
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-start justify-center p-4 pt-16">
              <Card className="w-full max-w-md border-brand/30 bg-background/95 p-6 text-center shadow-xl backdrop-blur-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="mt-4 text-base font-bold text-primary">
                  직무역량 분석 리포트로 업그레이드
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  역량 점수에 더해 현업과의 연결점, 강점·보완점, 다음 활동 추천 결과를 확인할 수 있어요. 현직자의 검수가 보장됩니다.
                </p>
                <Button asChild className="mt-5 w-full bg-brand text-brand-foreground hover:bg-brand/90">
                  <Link
                    to="/checkout"
                    search={{
                      product: "upgrade" as const,
                      order: order?.id,
                    }}
                  >
                    5,000원 추가 결제하고 리포트 보기
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="mt-2 w-full text-muted-foreground hover:text-foreground">
                  <Link to="/my/reports">나중에 보기</Link>
                </Button>
              </Card>
            </div>
          </div>
        );
      })()}


      {/* compare(9,900) 결제자: 상세 피드백 블러 프리뷰 + 업셀 */}
      {!isSample && tier === "compare" && (
        <div className="relative mt-5">
          <div className="pointer-events-none select-none blur-sm" aria-hidden="true">
            <Card className="p-6">
              <div className="flex items-center gap-2 font-bold text-primary text-base">
                <MessageSquare className="h-4 w-4 text-brand" /> 현직자 상세 피드백
              </div>
              <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                <li>● ●●●● ●●●●● ●●●●●● ●●●● ●●●●●●● ●●●●● ●●●●●●●● ●●●●● ●●●●●● ●●●●●</li>
                <li>● ●●●●● ●●●●●●● ●●●● ●●●●●● ●●●●● ●●●● ●●●●●● ●●●●●● ●●●●● ●●●●●●</li>
                <li>● ●●●● ●●●●●● ●●●●● ●●●●●●● ●●●● ●●●●● ●●●●●●● ●●●● ●●●●● ●●●●●●</li>
                <li>● ●●●●● ●●●●●●● ●●●● ●●●●●● ●●●●● ●●●● ●●●●●● ●●●●●● ●●●●● ●●●●</li>
              </ul>
            </Card>
            <Card className="mt-5 p-6">
              <div className="flex items-center gap-2 font-bold text-primary text-base">
                <Sparkles className="h-4 w-4 text-brand" /> AI 실무 활용 관점
              </div>
              <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                <li>● ●●●● ●●●●● ●●●●●● ●●●● ●●●●●●● ●●●●● ●●●●●●●● ●●●●●</li>
                <li>● ●●●●● ●●●●●●● ●●●● ●●●●●● ●●●●● ●●●● ●●●●●● ●●●●●●</li>
              </ul>
            </Card>
          </div>

          {/* Lock overlay */}
          <div className="absolute inset-0 flex items-start justify-center p-4 pt-16">
            <Card className="w-full max-w-md border-brand/30 bg-background/95 p-6 text-center shadow-xl backdrop-blur-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Lock className="h-5 w-5" />
              </div>
              <div className="mt-4 text-base font-bold text-primary">
                현직자 답안 리뷰로 업그레이드
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                현직자의 상세 피드백과 AI 실무 활용 관점까지 확인할 수 있어요.
              </p>
              <Button asChild className="mt-5 w-full bg-brand text-brand-foreground hover:bg-brand/90">
                <Link
                  to="/checkout"
                  search={{
                    product: "upgrade_feedback" as const,
                    order: order?.id,
                  }}
                >
                  10,000원 추가 결제하고 상세 피드백 받기
                </Link>
              </Button>
              <Button asChild variant="ghost" className="mt-2 w-full text-muted-foreground hover:text-foreground">
                <Link to="/my/reports">나중에 보기</Link>
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* feedback(29,900) 결제자: 현직자 커피챗 안내 */}
      {!isSample && tier === "feedback" && (
        <Card className="mt-5 border-brand/20 bg-brand-soft/30 p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-primary">
                현직자와 커피챗 나누기
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                리포트를 검수한 현직자와 1:1로 대화하며 진로 고민, 포트폴리오 방향, 실무 궁금증을 더 깊이 풀어볼 수 있어요. 시간·금액·진행 방식은 현직자와 직접 조율합니다.
              </p>
              <a
                href="mailto:contact@beginner.kr?subject=현직자%20커피챗%20문의"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
              >
                <MessageSquare className="h-4 w-4" />
                커피챗 신청하기
              </a>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-5 h-28 w-full" />
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
