import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AccountMenu } from "@/components/AccountMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { ExpertSimulationCard } from "@/components/ExpertSimulationCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beginner - 현직자가 제시한 업무를 직접 경험하는 직무 시뮬레이션" },
      {
        name: "description",
        content: "현직자가 자신의 업무로 직접 만든 과제를, 지원 전에 먼저 풀어보세요.",
      },
    ],
  }),
  component: Index,
});

function Brand() {
  return <BrandLogo className="reference-brand" />;
}

type FeaturedExpertSimulation = {
  id: string;
  title: string;
  roleLabel: string;
  description: string;
  estimatedMinutes: number | null;
  nickname: string;
  companyType: string;
  experienceBand: string;
  jobTitle: string;
  backgroundColor: string;
  textColor: string;
};

function Header({
  isMenuOpen,
  onMenuToggle,
  onMenuClose,
}: {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
}) {
  const { user } = useAuth();

  return (
    <header className="reference-header">
      <div className="reference-shell reference-header-inner">
        <Link to="/" onClick={onMenuClose}>
          <Brand />
        </Link>

        <nav className="reference-desktop-nav" aria-label="주요 메뉴">
          <a href="#service">서비스 소개</a>
          <Link to="/simulations">기업 시뮬레이션</Link>
          <Link to="/expert-simulations">현직자 제시</Link>
          <Link to="/biz">기업용</Link>
        </nav>

        <div className="reference-desktop-actions">
          {user ? (
            <AccountMenu />
          ) : (
            <>
              <Link to="/login" search={{ redirect: "/" }}>
                로그인
              </Link>
              <Link to="/start" className="reference-start-link">
                시작하기
              </Link>
            </>
          )}
        </div>

        <div className="reference-mobile-actions">
          {user && <AccountMenu />}
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav className="reference-mobile-nav" aria-label="모바일 주요 메뉴">
          <a href="#service" onClick={onMenuClose}>
            서비스 소개
          </a>
          <Link to="/simulations" onClick={onMenuClose}>
            기업 시뮬레이션
          </Link>
          <Link to="/expert-simulations" onClick={onMenuClose}>
            현직자 제시
          </Link>
          <Link to="/biz" onClick={onMenuClose}>
            기업용
          </Link>
          {!user && (
            <div className="reference-mobile-auth">
              <Link to="/login" search={{ redirect: "/" }} onClick={onMenuClose}>
                로그인
              </Link>
              <Link to="/start" onClick={onMenuClose}>
                시작하기
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}

function ExpertCard({
  title,
  children,
  dark = false,
}: {
  title: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <article className={`reference-expert-card${dark ? " is-dark" : ""}`}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function FeaturedExpertSimulations() {
  const [simulations, setSimulations] = useState<FeaturedExpertSimulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFeaturedSimulations() {
      const { data, error } = await supabase
        .from("job_simulations")
        .select(
          "id, title, role_label, job_family, description, estimated_minutes, expert_nickname, expert_company_type, expert_experience_band, expert_job_title, card_background_color, card_text_color",
        )
        .eq("simulation_source", "expert")
        .eq("is_public", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error) {
        setSimulations(
          (data ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            roleLabel: row.role_label || row.job_family || row.title,
            description: row.description || "",
            estimatedMinutes: row.estimated_minutes,
            nickname: row.expert_nickname || "현직자",
            companyType: row.expert_company_type || "",
            experienceBand: row.expert_experience_band || "",
            jobTitle: row.expert_job_title || row.role_label || "",
            backgroundColor: row.card_background_color || "#18181b",
            textColor: row.card_text_color || "#ffffff",
          })),
        );
      }

      setIsLoading(false);
    }

    void loadFeaturedSimulations();
  }, []);

  return (
    <section className="reference-featured" aria-labelledby="featured-simulations-title">
      <div className="reference-shell">
        <div className="reference-featured-heading">
          <h2 id="featured-simulations-title">추천 시뮬레이션</h2>
          <Link to="/expert-simulations">전체 보기 <ArrowRight aria-hidden="true" /></Link>
        </div>

        <div className="reference-featured-track">
          {isLoading &&
            Array.from({ length: 5 }, (_, index) => (
              <div className="reference-featured-skeleton" key={index}>
                <Skeleton className="h-[35%] w-full" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}

          {!isLoading &&
            simulations.map((simulation) => (
              <Link
                key={simulation.id}
                to="/simulation/$id"
                params={{ id: simulation.id }}
                className="reference-featured-card"
              >
                <ExpertSimulationCard
                  nickname={simulation.nickname}
                  companyType={simulation.companyType}
                  experienceBand={simulation.experienceBand}
                  jobTitle={simulation.jobTitle}
                  roleLabel={simulation.roleLabel}
                  title={simulation.title}
                  description={simulation.description}
                  estimatedMinutes={simulation.estimatedMinutes}
                  backgroundColor={simulation.backgroundColor}
                  textColor={simulation.textColor}
                  compact
                  className="h-full"
                />
              </Link>
            ))}
        </div>
      </div>
    </section>
  );
}

function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".reference-reveal"));

    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.06 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="reference-home">
      <div className="reference-intro-surface">
        <span className="reference-hero-glow reference-hero-glow-one" aria-hidden="true" />
        <span className="reference-hero-glow reference-hero-glow-two" aria-hidden="true" />
        <span className="reference-hero-shape reference-hero-shape-one" aria-hidden="true" />
        <span className="reference-hero-shape reference-hero-shape-two" aria-hidden="true" />
        <span className="reference-hero-shape reference-hero-shape-three" aria-hidden="true" />
        <Header
          isMenuOpen={isMenuOpen}
          onMenuToggle={() => setIsMenuOpen((open) => !open)}
          onMenuClose={closeMenu}
        />
        <section className="reference-hero" aria-labelledby="reference-home-title">
          <div className="reference-shell reference-hero-copy">
            <h1 id="reference-home-title">
              직무가 고민될 때,
              <br />
              <em>직접 경험</em>해보세요
            </h1>
            <Link to="/expert-simulations" className="reference-hero-action">
              무료로 시작하기 <ArrowRight aria-hidden="true" />
            </Link>
            <p className="reference-hero-caption">
              가입 후 3분이면 첫 과제가 도착해요 · 현직자 시뮬레이션 120+
            </p>
          </div>
        </section>
      </div>

      <main>
        <FeaturedExpertSimulations />

        <section id="service" className="reference-expert-section reference-reveal">
          <div className="reference-shell">
            <header className="reference-section-intro">
              <span>현직자 시뮬레이션</span>
              <h2>실무자가 제시한 과제를 해결해 보세요</h2>
              <p>그 일을 실제로 하는 사람이 어떤 상황에서 무엇을 고민하는지 먼저 경험해볼 수 있어요.</p>
            </header>

            <div className="reference-expert-grid">
              <ExpertCard title="원하는 직무 시뮬레이션 탐색">
                <p>각 분야 현직자가 자기 업무에서 다루는 상황과 자료로 과제를 만들어요.</p>
              </ExpertCard>

              <ExpertCard title="현직자 답안과 비교">
                <p>과제를 마치면 그 현직자가 쓴 답안을 보며 같은 상황을 어떻게 판단했는지 비교할 수 있어요.</p>
              </ExpertCard>

              <ExpertCard title="AI 활용 능력도 함께 확인" dark>
                <p>과제를 푸는 동안 AI 도구를 활용하고, 결과물에서 AI를 실무에 어떻게 녹여 쓰는지 확인할 수 있어요.</p>
              </ExpertCard>
            </div>
          </div>
        </section>

        <section className="reference-audience reference-reveal">
          <div className="reference-shell reference-audience-layout">
            <div>
              <span>이런 분에게</span>
              <h2>
                입사하기 전에,
                <br />
                그 업무를 먼저 경험해보세요
              </h2>
              <p>어떤 직무가 나에게 맞는지 아직 확신이 없거나,&nbsp;
관심 있는 직무가 실제로 어떤 일을 하는지 궁금한 취업준비생에게 딱 맞아요.</p>
            </div>
            <ul>
              <li><Check aria-hidden="true" /> 어떤 직무가 맞는지 <strong>확신이 없는</strong> 취업준비생</li>
              <li><Check aria-hidden="true" /> 관심 직무의 <strong>실제 일하는 방식</strong>이 궁금한 사람</li>
              <li><Check aria-hidden="true" /> 지원 전에 <strong>그 일 자체를 먼저 경험</strong>해보고 싶은 사람</li>
            </ul>
          </div>
        </section>

        <section className="reference-cta reference-reveal">
          <div className="reference-shell reference-cta-inner">
            <h2>첫 과제, 지금 무료로 받아보세요</h2>
            <p>현직자가 제시한 업무를 직접 경험해보세요.</p>
            <Link to="/expert-simulations">
              무료로 시작하기 <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="reference-footer reference-reveal">
        <div className="reference-shell">
          <span>© 2026 Beginner. All rights reserved.</span>
          <nav aria-label="하단 메뉴">
            <a href="#faq">자주 묻는 질문</a>
            <a href="#terms">이용약관</a>
            <a href="#privacy">개인정보처리방침</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
