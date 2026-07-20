import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Clock3, Menu, X } from "lucide-react";
import { useState } from "react";

import { AccountMenu } from "@/components/AccountMenu";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beginner - 현직자가 제시한 업무를 직접 경험하는 직무 시뮬레이션" },
      {
        name: "description",
        content:
          "현직자가 제시한 실제 업무를 시뮬레이션으로 경험하고, 나에게 맞는 직무를 확인해보세요.",
      },
    ],
  }),
  component: Index,
});

function Brand() {
  return (
    <span className="landing-brand" aria-label="Beginner 홈">
      <span className="landing-brand-mark" aria-hidden="true">
        <span>B</span>
      </span>
      <span>Beginner</span>
    </span>
  );
}

function AssignmentPreview() {
  return (
    <figure className="landing-assignment" aria-label="현직자 제시 시뮬레이션 예시">
      <figcaption className="landing-assignment-meta">
        <span>브랜드 디자이너</span>
        <span>스타트업 · 6~10년차</span>
      </figcaption>
      <div className="landing-assignment-body">
        <p className="landing-assignment-label">현직자 제시 업무</p>
        <h2>브랜드 첫 화면의 방향을 제안해보세요.</h2>
        <p>
          업무의 맥락을 읽고, 어떤 기준으로 판단할지 답안으로 정리합니다.
        </p>
        <div className="landing-assignment-foot">
          <span>
            <Clock3 aria-hidden="true" /> 약 25분
          </span>
          <Link to="/expert-simulations">
            과제 보기 <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </figure>
  );
}

function RolePreview() {
  return (
    <div className="landing-proof" aria-label="관심 직무 선택 예시">
      <p>관심 직무</p>
      <ul>
        <li>기획·전략</li>
        <li className="is-selected">
          디자인 <Check aria-hidden="true" />
        </li>
        <li>AI·개발·데이터</li>
      </ul>
    </div>
  );
}

function TaskPreview() {
  return (
    <div className="landing-proof" aria-label="시뮬레이션 답안 작성 예시">
      <div className="landing-proof-meta">
        <span>브랜드 디자이너</span>
        <span>
          <Clock3 aria-hidden="true" /> 25분
        </span>
      </div>
      <p className="landing-proof-question">
        첫 화면에서 가장 먼저 보여줄 메시지를 정리해 주세요.
      </p>
      <div className="landing-answer-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ResultPreview() {
  return (
    <div className="landing-proof" aria-label="작성 결과 저장 예시">
      <p>완료한 시뮬레이션</p>
      <div className="landing-result-row">
        <Check aria-hidden="true" />
        <div>
          <strong>브랜드 디자이너</strong>
          <span>작성한 답안을 다시 확인할 수 있어요.</span>
        </div>
      </div>
      <div className="landing-result-row">
        <Check aria-hidden="true" />
        <div>
          <strong>채용 제안 받아보기</strong>
          <span>동의한 경우에만 기업에 공유돼요.</span>
        </div>
      </div>
    </div>
  );
}

const FLOW = [
  {
    title: "관심 있는 일을 찾습니다.",
    description:
      "직무군과 직무명을 기준으로, 현직자가 제시한 업무를 찾아봅니다.",
    preview: <RolePreview />,
  },
  {
    title: "실제 업무를 풀어봅니다.",
    description:
      "문제를 푸는 순서와 판단의 기준을 따라가며, 내가 이 일을 어떻게 풀어가는지 확인합니다.",
    preview: <TaskPreview />,
  },
  {
    title: "결과를 남깁니다.",
    description:
      "제출한 답안은 내 이력에 저장됩니다. 공유에 동의한 경우에는 채용 제안에도 활용할 수 있어요.",
    preview: <ResultPreview />,
  },
];

function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-shell landing-header-inner">
          <Link to="/" aria-label="Beginner 홈">
            <Brand />
          </Link>

          <nav className="landing-desktop-nav" aria-label="주요 메뉴">
            <a href="#how-it-works">서비스 소개</a>
            <Link to="/simulations">기업 시뮬레이션</Link>
            <Link to="/expert-simulations">현직자 제시</Link>
            <Link to="/biz">기업용</Link>
          </nav>

          <div className="landing-desktop-actions">
            {user ? (
              <AccountMenu />
            ) : (
              <>
                <Link to="/login" search={{ redirect: "/" }} className="landing-login-link">
                  로그인
                </Link>
                <Link to="/start" className="landing-start-link">
                  시작하기
                </Link>
              </>
            )}
          </div>

          <div className="landing-mobile-actions">
            {user && <AccountMenu />}
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={isMenuOpen}
              className="landing-mobile-menu-button"
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <nav className="landing-mobile-nav" aria-label="모바일 주요 메뉴">
            <a href="#how-it-works" onClick={() => setIsMenuOpen(false)}>
              서비스 소개
            </a>
            <Link to="/simulations" onClick={() => setIsMenuOpen(false)}>
              기업 시뮬레이션
            </Link>
            <Link to="/expert-simulations" onClick={() => setIsMenuOpen(false)}>
              현직자 제시
            </Link>
            <Link to="/biz" onClick={() => setIsMenuOpen(false)}>
              기업용
            </Link>
            {!user && (
              <div className="landing-mobile-auth">
                <Link to="/login" search={{ redirect: "/" }} onClick={() => setIsMenuOpen(false)}>
                  로그인
                </Link>
                <Link to="/start" onClick={() => setIsMenuOpen(false)}>
                  시작하기
                </Link>
              </div>
            )}
          </nav>
        )}
      </header>

      <main>
        <section className="landing-marquee" aria-labelledby="landing-title">
          <div className="landing-shell landing-marquee-inner">
            <h1 id="landing-title">
              지원 전에,
              <br />
              그 일을 먼저
              <br />
              풀어봅니다.
            </h1>
          </div>
        </section>

        <section id="how-it-works" className="landing-introduction">
          <div className="landing-shell">
            <div className="landing-introduction-layout">
              <header className="landing-introduction-copy">
                <h2>직무가 아니라,<br />실제 업무를 먼저 봅니다.</h2>
                <p>
                  현직자가 만든 과제를 통해, 관심 있는 일이 나와 맞는지 직접 확인합니다.
                </p>
                <div className="landing-hero-actions">
                  <Link to="/expert-simulations" className="landing-primary-action">
                    현직자 제시 보기 <ArrowRight aria-hidden="true" />
                  </Link>
                  <Link to="/simulations" className="landing-secondary-action">
                    기업 시뮬레이션 보기
                  </Link>
                </div>
              </header>
              <AssignmentPreview />
            </div>
          </div>
        </section>

        <section className="landing-workflow">
          <div className="landing-shell">
            <header className="landing-section-heading">
              <h2>관심 있는 일을 고르고, 답안을 남깁니다.</h2>
              <p>
                관심 직무를 고르고, 현직자가 제시한 과제를 풀고, 결과를 내 이력에 남깁니다.
              </p>
            </header>

            <ol className="landing-flow-list">
              {FLOW.map((step, index) => (
                <li key={step.title} className="landing-flow-row">
                  <div className="landing-flow-copy">
                    <span aria-hidden="true">0{index + 1}</span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                  {step.preview}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-closing">
          <div className="landing-shell landing-closing-inner">
            <p>관심 있는 직무부터 살펴보세요.</p>
            <Link to="/expert-simulations">
              현직자 제시 업무 보기 <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-shell landing-footer-inner">
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
