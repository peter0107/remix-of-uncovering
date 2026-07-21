import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AccountMenu } from "@/components/AccountMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";

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

function SourceFlow() {
  return (
    <section className="reference-flow" aria-label="이용 흐름">
      <div className="reference-flow-steps">
        {[
          ["1", "탐색"],
          ["2", "체험"],
          ["3", "결과 확인"],
        ].map(([number, label], index) => (
          <div className="reference-flow-step" key={label}>
            {index > 0 && <span className="reference-flow-line" aria-hidden="true" />}
            <span>{number}</span>
            <b>{label}</b>
          </div>
        ))}
      </div>
      <p>관심 직무를 등록하고, 현직자가 만든 실제 업무 과제를 수행해봐요.<br />내가 낸 답과 모범 답안이 어떤 부분이 다른지 확인도 해봐요.</p>
    </section>
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

function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="reference-home">
      <Header
        isMenuOpen={isMenuOpen}
        onMenuToggle={() => setIsMenuOpen((open) => !open)}
        onMenuClose={closeMenu}
      />

      <main>
        <section className="reference-hero" aria-labelledby="reference-home-title">
          <div className="reference-shell reference-hero-copy">
            <p>"이 직무... 나랑 맞을까?"</p>
            <h1 id="reference-home-title">
              고민 대신,
              <br />
              <em>직접 경험해보세요</em>
            </h1>
            <span>현직자가 자신의 업무로 직접 만든 과제를, 지원 전에 먼저 풀어보세요</span>
            <Link to="/expert-simulations" className="reference-hero-action">
              무료로 시작하기 <ArrowRight aria-hidden="true" />
            </Link>
            <small>가입 후 3분이면 첫 과제가 도착해요 · 현직자 시뮬레이션 120+</small>
          </div>

          <div className="reference-logo-strip" aria-label="참여 기업 예시">
            <div>
              {Array.from({ length: 4 }).flatMap((_, i) =>
                ["LOGO A", "B컴퍼니", "Ccorp", "디랩스", "EVERY", "에프원", "Gwork", "한올"].map(
                  (name) => <b key={`${name}-${i}`}>{name}</b>,
                ),
              )}
            </div>
          </div>

        </section>

        <div className="reference-shell">
          <SourceFlow />
        </div>

        <section id="service" className="reference-expert-section">
          <div className="reference-shell">
            <header className="reference-section-intro">
              <span>현직자 시뮬레이션</span>
              <h2>
                진짜 실무자가 낸 진짜 과제를,
                <br />
                지원 전에 먼저 풀어보세요
              </h2>
              <p>
                스타트업부터 대기업까지,&nbsp;
                <br />
                지금 실제로 일하고 있는&nbsp;현직자가 자신의 업무를 바탕으로 직접 만든 과제입니다.
              </p>
            </header>

            <div className="reference-expert-grid">
              <ExpertCard title="직군이 아니라, 실무자 기준">
                <p>
                  CRM 마케터, UI/UX 디자이너, 반도체 공정 엔지니어, 브랜드 디자이너. 현직자가 매일 마주치는 상황과 자료를 그대로 가져와 과제로 만들어요.
                </p>
                <div className="reference-tags">
                  <span>CRM 마케터</span>
                  <span>UI/UX 디자이너</span>
                  <span>공정 엔지니어</span>
                </div>
              </ExpertCard>

              <ExpertCard title="실무의 순서 그대로, 3단계">
                <p>실무에서 실제로 밟는 순서를 그대로 따라가요.</p>
                <ol className="reference-mini-steps">
                  <li><span>1</span>상황 파악</li>
                  <li><span>2</span>실행안 설계</li>
                  <li><span>3</span>결과 해석 · 다음 판단</li>
                </ol>
              </ExpertCard>

              <ExpertCard title="현직자의 모범답안과 비교">
                <p>
                  다 풀고 나면 그 현직자가 직접 쓴 모범답안을 볼 수 있어요. 정답 맞히기가 아니라, <strong>"현직자는 이 상황에서 어떻게 판단했는가"</strong>를 비교하며 감각을 키우는 게 목적이에요.
                </p>
                <div className="reference-quote">
                  <span>현</span>
                  <p>"저라면 이탈률보다 첫 결제 코호트를 먼저 봤을 거예요" - 7년차 CRM 마케터</p>
                </div>
              </ExpertCard>

              <ExpertCard title="AI를 얼마나 잘 쓰는지도, 역량" dark>
                <p>
                  과제를 푸는 동안 AI 도구를 자유롭게 활용하세요. AI로 결과물의 질과 속도를 끌어올리는 것도 요즘 실무의 핵심 역량. 그 활용 능력이 결과물 안에 자연스럽게 드러나고, 기업은 답안에서 <strong>지원자가 AI를 실무에 어떻게 녹여 쓰는지</strong>까지 확인해요.
                </p>
                <div className="reference-ai-note">
                  <span>AI</span>
                  <p>AI 활용 내역이 답안과 함께 평가에 반영돼요</p>
                </div>
              </ExpertCard>
            </div>
          </div>
        </section>

        <section className="reference-audience">
          <div className="reference-shell reference-audience-layout">
            <div>
              <span>이런 분에게</span>
              <h2>
                입사하기 전에,
                <br />
                그 일을 먼저 경험해보세요
              </h2>
              <p>어떤 직무가 나에게 맞는지 아직 확신이 없거나,&nbsp;<br />관심 있는 직무가 실제로는 어떤지 궁금한 취업준비생에게 알맞아요.</p>
            </div>
            <ul>
              <li><Check aria-hidden="true" /> 어떤 직무가 맞는지 <strong>확신이 없는</strong> 취업준비생</li>
              <li><Check aria-hidden="true" /> 관심 직무의 <strong>실제 일하는 방식</strong>이 궁금한 사람</li>
              <li><Check aria-hidden="true" /> 지원 전에 <strong>그 일 자체를 먼저 경험</strong>해보고 싶은 사람</li>
            </ul>
          </div>
        </section>

        <section className="reference-cta">
          <div className="reference-shell reference-cta-inner">
            <h2>진로 탐색, 이제는 미룰 때가 아닙니다.</h2>
            <p>지금 바로 가입해서 내가 원하는 직무를 경험해보세요!</p>
            <Link to="/expert-simulations">
              무료로 시작하기 <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="reference-footer">
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
