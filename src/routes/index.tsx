//hihihihihi

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  MessageSquare,
  Sparkles,
  Target,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadarChart } from "@/components/RadarChart";
import { useAuth } from "@/hooks/use-auth";
import { listCustomJobs, type CustomJob } from "@/lib/customJobs";
import { supabase } from "@/integrations/supabase/client";
import heroIllustration from "@/assets/hero-illustration.png";
import expertHero from "@/assets/expert-hero.png";

export const Route = createFileRoute("/")({
  component: Index,
});

const FLOW = [
  { n: 1, title: "직무 선택", desc: "관심 있는 직무를 선택하세요." },
  { n: 2, title: "시뮬레이션 수행", desc: "실제 업무 기반 시뮬레이션을 체험해 보세요." },
  { n: 3, title: "결과 확인", desc: "나의 강점과 적합도, 성장 가이드를 확인합니다." },
];

const POPULAR = [
  { slug: "product-designer", name: "프로덕트 디자인", count: "120,430명 체험", fit: "추천 92%" },
  { slug: "uiux-design", name: "UIUX 디자인", count: "98,210명 체험", fit: "추천 90%" },
  { slug: "data-analytics", name: "데이터 분석", count: "87,645명 체험", fit: "추천 88%" },
  { slug: "service-pm", name: "서비스기획 / PM", count: "76,018명 체험", fit: "추천 87%" },
];

const FAQ = [
  {
    q: "시뮬레이션은 어떻게 생성되나요?",
    a: "현직자의 인터뷰 내용을 바탕으로 현직자와 검수 후 실제 현업에서 발생하는 상황으로 제시됩니다.",
  },
  {
    q: "한 직무 체험은 얼마나 걸리나요?",
    a: "직무에 따라 평균 30~35분이며, 중간 저장이 가능합니다.",
  },
  {
    q: "현직자 피드백은 어떻게 받나요?",
    a: "체험 후 현직자 피드백 상품을 추가하면 제출 답변에 대한 코멘트를 받을 수 있습니다.",
  },
];

function Index() {
  const { user } = useAuth();
  const startButton = (
    <Button
      size="lg"
      style={{ backgroundColor: "#008f8f" }}
      className="w-full sm:w-[220px] border-input text-white shadow-sm hover:opacity-90 text-base border-0"
    >
      직무 체험 시작하기
      <ArrowRight className="ml-1 h-4 w-4" />
    </Button>
  );
  return (
    <div>
      {/* Hero Carousel */}
      <HeroCarousel user={user} startButton={startButton} />

      {/* Job preview - moved to top */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-10 sm:px-6 sm:pt-12 sm:pb-12">
        <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary md:text-3xl">제공 중인 직무</h2>
            <p className="mt-2 text-sm text-muted-foreground">지금 바로 시작할 수 있는 직무 체험입니다.</p>
          </div>
          <Link to="/experiences" className="text-sm font-medium text-brand">
            전체 직무 보기 →
          </Link>
        </div>
        <JobsSlider user={user} />
      </section>

      {/* Flow */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 md:pt-[48px] bg-[#f2fcfc]">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl font-bold text-primary md:text-3xl">직무 체험은 이렇게 진행돼요</h2>
        </div>
        <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {FLOW.map((s, i) => (
            <div key={s.n} className="contents">
              <Card className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-base font-bold text-brand">
                    {s.n}
                  </div>
                  <div className="font-semibold text-primary text-base">{s.title}</div>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{s.desc}</div>
              </Card>
              {i < FLOW.length - 1 && (
                <div className="hidden items-center justify-center md:flex">
                  <ArrowRight className="h-5 w-5 text-brand" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Report preview */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl font-bold text-primary md:text-3xl">결과 리포트로 내 강점과 보완점을 한눈에</h2>
          <p className="mt-2 text-sm text-muted-foreground">직무별 핵심 역량을 기준으로 진단해요.</p>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="grid md:grid-cols-2">
            <div className="flex items-center justify-center p-5 sm:p-8">
              <div className="w-full max-w-[320px]">
                <RadarChart
                  data={[
                    { name: "문제 정의", score: 80 },
                    { name: "사용자 관점", score: 92 },
                    { name: "데이터 해석", score: 70 },
                    { name: "우선순위 판단", score: 92 },
                    { name: "실행력", score: 82 },
                    { name: "커뮤니케이션", score: 82 },
                  ]}
                />
              </div>
            </div>
            <div className="relative bg-muted/30 p-5 sm:p-8">
              <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm sm:right-6 sm:top-6">
                <Lock className="h-3.5 w-3.5" /> 프리미엄 리포트
              </div>
              <div className="space-y-5 pt-10 blur-[3px] select-none" aria-hidden>
                {[80, 65, 90, 55, 75, 70].map((w, i) => (
                  <div key={i}>
                    <div className="mb-2 h-2 w-24 rounded bg-muted-foreground/30" />
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand/70" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-lg">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="text-base font-bold text-primary">프리미엄 리포트 잠금</div>
                <p className="text-xs text-muted-foreground">전체 결과는 리포트에서 확인할 수 있어요.</p>
                <Link to="/report/sample">
                  <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                    예시 리포트 보기
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>일부 상세 분석은 체험 완료 후 또는 프리미엄 업그레이드 시 확인할 수 있습니다.</span>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <h2 className="text-2xl font-bold text-primary md:text-3xl">자주 묻는 질문</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map((f) => (
            <Card key={f.q} className="p-5">
              <div className="flex items-start gap-2 font-semibold text-primary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {f.q}
              </div>
              <p className="mt-2 pl-6 text-sm text-muted-foreground">{f.a}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 md:pb-16">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-brand-soft/60 p-5 text-center md:flex-row md:gap-6 md:p-8 md:text-left">
          <img src={heroIllustration} alt="직무 체험을 권유하는 일러스트" className="h-24 w-auto md:h-36" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-primary md:text-2xl">지금, 나에게 딱 맞는 직무를 경험해보세요</h3>
            <p className="mt-2 text-sm text-muted-foreground">작은 경험이 커리어의 방향을 바꿉니다.</p>
          </div>
          <Link to="/experiences" className="w-full md:w-auto">
            <Button
              size="lg"
              style={{ backgroundColor: "#008f8f" }}
              className="w-full text-white hover:opacity-90 md:w-auto"
            >
              직무 체험 시작하기 <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function JobsSlider({ user }: { user: ReturnType<typeof useAuth>["user"] }) {
  const [jobs, setJobs] = useState<CustomJob[]>([]);
  const [missionCounts, setMissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([
      listCustomJobs().catch(() => [] as CustomJob[]),
      supabase
        .from("missions")
        .select("job_slug,created_at")
        .eq("status", "published")
        .then(({ data }) => (data ?? []) as { job_slug: string; created_at: string }[]),
    ])
      .then(([allJobs, missions]) => {
        const available = allJobs.filter((r) => r.status === "available");

        const latestBySlug: Record<string, string> = {};
        missions.forEach((m) => {
          if (!latestBySlug[m.job_slug] || m.created_at > latestBySlug[m.job_slug]) {
            latestBySlug[m.job_slug] = m.created_at;
          }
        });

        const sorted = [...available].sort((a, b) => {
          const aDate = latestBySlug[a.slug];
          const bDate = latestBySlug[b.slug];
          if (aDate && bDate) return bDate.localeCompare(aDate);
          if (aDate) return -1;
          if (bDate) return 1;
          return 0;
        });

        setJobs(sorted);

        const counts: Record<string, number> = {};
        missions.forEach((m) => {
          counts[m.job_slug] = (counts[m.job_slug] ?? 0) + 1;
        });
        setMissionCounts(counts);
      })
      .finally(() => setLoading(false));
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.9, 320);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        현재 제공 중인 직무가 없습니다.
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {jobs.map((job) => {
          const card = (
            <Card className="flex h-full w-[280px] shrink-0 snap-start flex-col gap-3 p-5 transition-shadow hover:shadow-md sm:w-[320px]">
              <div>
                <h3 className="text-lg font-semibold text-primary">{job.name}</h3>
                {job.description && (
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                    {job.description}
                  </p>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> 20~30분
                </span>
                <span className="font-semibold text-brand">{missionCounts[job.slug] ?? 0}개 체험 가능</span>
              </div>
            </Card>
          );
          return (
            <div key={job.id} className="snap-start">
              <Link to="/experiences/$slug" params={{ slug: job.slug }} className="block h-full">
                {card}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type HeroCarouselProps = {
  user: ReturnType<typeof useAuth>["user"];
  startButton: React.ReactNode;
};

function HeroCarousel({ user, startButton }: HeroCarouselProps) {
  // Render order: [slide1, slide2, slide1-clone] for infinite left-only loop
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const slides = 2;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance: 5s on slide 1, 10s on slide 2, then loop to clone
  useEffect(() => {
    if (paused) return;
    if (index >= 2) return;
    const delay = index === 0 ? 5000 : 7000;
    timeoutRef.current = setTimeout(() => {
      setAnimate(true);
      setIndex((i) => i + 1);
    }, delay);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [paused, index]);

  // After arriving at the clone (index 2), snap back to 0 without animation
  const handleTransitionEnd = () => {
    if (index === 2) {
      setAnimate(false);
      setIndex(0);
      // Re-enable animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimate(true));
      });
    }
  };

  const activeDot = index === 1 ? 1 : 0;

  const goTo = (i: number) => {
    setAnimate(true);
    setIndex(i);
  };

  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setPaused(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    const delta = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setPaused(false);
    const threshold = 50;
    if (Math.abs(delta) < threshold) return;
    const current = activeDot;
    if (delta < 0) {
      goTo(current === 0 ? 1 : 0);
    } else {
      goTo(current === 0 ? 1 : 0);
    }
  };

  return (
    <section
      className="relative overflow-hidden bg-brand-soft/40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={`flex w-full ${animate ? "transition-transform duration-500 ease-out" : ""}`}
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Slide 1 */}
        <div className="w-full shrink-0">
          <div className="mx-auto grid max-w-6xl items-end gap-6 px-4 pt-10 pb-0 sm:gap-8 sm:pt-14 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10 md:pt-[32px] md:pb-[24px]">
            <div className="md:min-h-[360px] flex flex-col justify-center">
              <Badge className="mb-4 bg-brand-soft text-brand hover:bg-brand-soft self-start sm:mb-5">
                현업 기반 직무 시뮬레이션
              </Badge>
              <h1 className="font-bold leading-tight tracking-tight text-primary sm:text-3xl md:text-5xl text-center sm:text-left text-4xl">
                나에게 맞는 직무,
                <br />
                직접 경험하고 확인하세요
              </h1>
              <p className="mt-4 text-muted-foreground sm:mt-5 sm:text-base md:text-lg text-base text-center sm:text-left">
                실제 업무 상황을 바탕으로 구성된 시뮬레이션을 통해
                <br />
                업무 역량과 직무 적합도를 확인할 수 있어요.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                <Link to="/experiences" className="w-full sm:w-auto">
                  {startButton}
                </Link>
                <Link to="/report/sample" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-[220px]">
                    결과 리포트 예시 보기
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative flex h-[200px] items-end justify-center sm:h-[280px] md:h-[240px] md:items-center lg:h-[360px]">
              <div className="absolute inset-0 -z-10 mx-auto my-auto h-56 w-56 rounded-full bg-brand/10 blur-3xl sm:h-64 sm:w-64 md:h-72 md:w-72" />
              <img
                src={heroIllustration}
                alt="직무를 탐색하는 사용자 일러스트"
                width={1024}
                height={1024}
                className="mx-auto h-full w-auto max-w-md object-contain shadow-none"
              />
            </div>
          </div>
        </div>

        {/* Slide 2 */}
        <div className="w-full shrink-0">
          <div className="mx-auto grid max-w-6xl items-end gap-6 px-4 pt-10 pb-0 sm:gap-8 sm:pt-14 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10 md:pt-[32px] md:pb-[24px]">
            <div className="md:min-h-[360px] flex flex-col justify-center">
              <Badge className="mb-4 bg-brand-soft text-brand hover:bg-brand-soft self-start sm:mb-5">
                현직자 시뮬레이션 제안
              </Badge>
              <h1 className="font-bold leading-tight tracking-tight text-primary sm:text-3xl md:text-5xl text-center sm:text-left text-4xl">
                현직자라면, 업무 경험을
                <br />
                자산으로 만들어보세요
              </h1>
              <p className="mt-4 text-muted-foreground sm:mt-5 sm:text-base md:text-lg text-base text-center sm:text-left">
                주니어와 취준생이 직무를 이해할 수 있도록
                <br />
                실제 업무 상황을 입력하고 수익을 받아보세요.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                <Link to="/submit-mission" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    style={{ backgroundColor: "#008f8f" }}
                    className="w-full sm:w-[220px] border-input text-white shadow-sm hover:opacity-90 text-base border-0"
                  >
                    내 경험 공유하기
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative flex h-[200px] items-end justify-center sm:h-[280px] md:h-[240px] md:items-center lg:h-[360px]">
              <div className="absolute inset-0 -z-10 mx-auto my-auto h-56 w-56 rounded-full bg-brand/10 blur-3xl sm:h-64 sm:w-64 md:h-72 md:w-72" />
              <img
                src={expertHero}
                alt="현직자가 시뮬레이션을 제안하는 일러스트"
                width={1024}
                height={1024}
                loading="lazy"
                className="mx-auto h-full w-auto max-w-md object-contain shadow-none"
              />
            </div>
          </div>
        </div>

        {/* Slide 1 clone (for seamless infinite left scroll) */}
        <div className="w-full shrink-0" aria-hidden="true">
          <div className="mx-auto grid max-w-6xl items-end gap-6 px-4 pt-10 pb-0 sm:gap-8 sm:pt-14 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10 md:pt-[32px] md:pb-[24px]">
            <div className="md:min-h-[360px] flex flex-col justify-center">
              <Badge className="mb-4 bg-brand-soft text-brand hover:bg-brand-soft self-start sm:mb-5">
                현업 기반 직무 시뮬레이션
              </Badge>
              <h1 className="font-bold leading-tight tracking-tight text-primary sm:text-3xl md:text-5xl text-center sm:text-left text-4xl">
                나에게 맞는 직무,
                <br />
                직접 경험하고 확인하세요
              </h1>
              <p className="mt-4 text-muted-foreground sm:mt-5 sm:text-base md:text-lg text-base text-center sm:text-left">
                실제 업무 상황을 바탕으로 구성된 시뮬레이션을 통해
                <br />
                업무 역량과 직무 적합도를 확인할 수 있어요.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                <Link to="/experiences" className="w-full sm:w-auto">
                  {startButton}
                </Link>
                <Link to="/report/sample" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-[220px]">
                    결과 리포트 예시 보기
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative flex h-[200px] items-end justify-center sm:h-[280px] md:h-[240px] md:items-center lg:h-[360px]">
              <div className="absolute inset-0 -z-10 mx-auto my-auto h-56 w-56 rounded-full bg-brand/10 blur-3xl sm:h-64 sm:w-64 md:h-72 md:w-72" />
              <img
                src={heroIllustration}
                alt=""
                width={1024}
                height={1024}
                className="mx-auto h-full w-auto max-w-md object-contain shadow-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-background/60 px-2.5 py-1.5 backdrop-blur">
          {Array.from({ length: slides }).map((_, i) => (
            <button
              key={i}
              aria-label={`슬라이드 ${i + 1}로 이동`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === activeDot ? "w-6 bg-brand" : "w-2 bg-brand/30 hover:bg-brand/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
