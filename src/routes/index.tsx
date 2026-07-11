import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Clock3, Menu, Search, Sparkles, User, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "uncovering - 직접 일해보고 확인하는 직무 시뮬레이션" },
      {
        name: "description",
        content:
          "관심 직무의 실제 업무 시뮬레이션을 체험하고, 답안을 기업에 전송해 채용 제안을 받아보세요.",
      },
    ],
  }),
  component: Index,
});

function Brand() {
  return (
    <span className="inline-flex items-center gap-2" aria-label="uncovering 홈">
      <span className="grid h-7 w-7 place-items-center rounded-full border-[3px] border-[#2B5CE7] border-t-transparent text-[10px] font-extrabold tracking-[-0.12em] text-[#171C26] [transform:rotate(18deg)]">
        <span className="[transform:rotate(-18deg)]">uN</span>
      </span>
      <span className="text-[17px] font-extrabold tracking-[-0.03em] text-[#171C26]">
        uncovering
      </span>
    </span>
  );
}

function ProfilePreview() {
  return (
    <div className="w-full rounded-2xl border border-[#E7EAF0] bg-[#F7F8FA] p-5">
      <p className="text-xs font-semibold text-[#6B7280]">프로필 등록</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-[#D9DEE8] bg-white px-3 py-1.5 text-xs text-[#4B5563]">
          마케팅
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#2B5CE7] px-3 py-1.5 text-xs font-semibold text-white">
          기획/PM <Check className="h-3 w-3" />
        </span>
        <span className="rounded-full border border-[#D9DEE8] bg-white px-3 py-1.5 text-xs text-[#4B5563]">
          디자인
        </span>
        <span className="rounded-full border border-[#D9DEE8] bg-white px-3 py-1.5 text-xs text-[#4B5563]">
          개발
        </span>
      </div>
      <div className="mt-3 flex h-10 items-center gap-2 rounded-md border border-[#D9DEE8] bg-white px-3 text-xs text-[#9CA3AF]">
        <Search className="h-3.5 w-3.5" />
        관심 기업을 검색하세요
      </div>
    </div>
  );
}

function SimulationPreview() {
  return (
    <div className="w-full rounded-2xl border border-[#E7EAF0] bg-[#F7F8FA] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-[#2B5CE7]">기획/PM 시뮬레이션</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#D9DEE8] bg-white px-2 py-1 text-[11px] text-[#6B7280]">
          <Clock3 className="h-3 w-3" /> 50분
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-[#171C26]">
        Q. 신규 기능의 요구사항 정의서를 작성해 주세요
      </p>
      <div className="mt-3 h-14 rounded-md border border-[#D9DEE8] bg-white p-3 text-xs text-[#9CA3AF]">
        답안을 입력하세요...
      </div>
      <span className="mt-3 ml-auto flex w-fit rounded-md bg-[#171C26] px-3 py-2 text-xs font-semibold text-white">
        제출하기
      </span>
    </div>
  );
}

function OfferPreview() {
  return (
    <div className="w-full space-y-2 rounded-2xl border border-[#E7EAF0] bg-[#F7F8FA] p-5">
      <div className="flex items-center gap-3 rounded-md border border-[#D9DEE8] bg-white p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#EAF0FF] text-xs font-extrabold text-[#2B5CE7]">
          A
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[#171C26]">
            A사에서 채용 제안이 도착했어요
          </p>
          <p className="mt-1 truncate text-[11px] text-[#6B7280]">
            기획/PM 시뮬레이션 답안을 확인했어요
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-md border border-[#D9DEE8] bg-white p-3 opacity-60">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#F1F3F6] text-xs font-extrabold text-[#6B7280]">
          B
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[#171C26]">
            B사가 내 프로필을 조회했어요
          </p>
          <p className="mt-1 text-[11px] text-[#6B7280]">방금 전</p>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    number: "STEP 1",
    title: "관심 직무·기업 등록",
    description:
      "학력, 관심 직무, 관심 기업, 근무 선호를 입력하면 나에게 맞는 시뮬레이션이 준비돼요.",
    preview: <ProfilePreview />,
  },
  {
    number: "STEP 2",
    title: "맞춤 시뮬레이션 수행",
    description:
      "실제 업무 상황을 기반으로 만들어진 과제를 수행하고 답안을 작성해요. 체험하며 역량도 함께 쌓여요.",
    preview: <SimulationPreview />,
  },
  {
    number: "STEP 3",
    title: "채용 제안 받아보기",
    description:
      "동의하면 내 답안이 관심 기업에 전달되고, 역량을 확인한 기업에게 채용 제안을 받아요.",
    preview: <OfferPreview />,
  },
];

function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white text-[#171C26]">
      <header className="sticky top-0 z-40 border-b border-[#EEF0F4] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between px-5 sm:px-8">
          <Link to="/" aria-label="uncovering 홈">
            <Brand />
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-[#4B5563] md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-[#171C26]">
              서비스 소개
            </a>
            <Link to="/simulations" className="transition-colors hover:text-[#171C26]">
              시뮬레이션
            </Link>
            <Link to="/biz" className="transition-colors hover:text-[#171C26]">
              기업용
            </Link>
            {user ? (
              <Link
                to="/my"
                aria-label="프로필"
                className="grid h-9 w-9 place-items-center rounded-full border border-[#D9DEE8] bg-white text-[#171C26] transition-colors hover:bg-[#F7F8FA]"
              >
                <User className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" search={{ redirect: "/" }} className="font-semibold text-[#171C26]">
                  로그인
                </Link>
                <Link
                  to="/start"
                  className="rounded-md bg-[#2B5CE7] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2149BD]"
                >
                  시작하기
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="grid h-9 w-9 place-items-center text-[#4B5563] md:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {isMenuOpen && (
          <nav className="border-t border-[#EEF0F4] bg-white px-5 py-4 md:hidden">
            <div className="mx-auto grid max-w-[1160px] gap-1">
              <a
                href="#how-it-works"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-[#4B5563] hover:bg-[#F7F8FA]"
              >
                서비스 소개
              </a>
              <Link
                to="/simulations"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-[#4B5563] hover:bg-[#F7F8FA]"
              >
                시뮬레이션
              </Link>
              <Link
                to="/biz"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-[#4B5563] hover:bg-[#F7F8FA]"
              >
                기업용
              </Link>
              {user ? (
                <Link
                  to="/my"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-semibold text-[#171C26] hover:bg-[#F7F8FA]"
                >
                  프로필
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    search={{ redirect: "/" }}
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-semibold text-[#171C26] hover:bg-[#F7F8FA]"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/start"
                    onClick={() => setIsMenuOpen(false)}
                    className="mt-2 rounded-md bg-[#2B5CE7] px-3 py-2.5 text-center text-sm font-bold text-white"
                  >
                    시작하기
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main>
        <section className="mx-auto max-w-[1160px] px-5 pb-16 pt-20 text-center sm:px-8 sm:pb-20 sm:pt-28">
          <p className="text-sm font-medium text-[#6B7280] sm:text-base">
            "이 직무... 나랑 맞을까?"
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.18] tracking-[-0.045em] text-[#171C26] sm:text-6xl">
            고민만 하지 말고,
            <br />
            직접 일해보고 확인하세요
          </h1>
          <p className="mt-6 text-base leading-7 text-[#4B5563] sm:text-lg">
            현직자가 하는 실제 업무를 시뮬레이션으로 체험하고
            <br className="hidden sm:block" />내 직무 적합도를 확인해요
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/start"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#2B5CE7] px-6 text-sm font-bold text-white transition-colors hover:bg-[#2149BD] sm:text-base"
            >
              무료로 시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/simulations"
              className="inline-flex h-12 items-center justify-center rounded-md border border-[#D9DEE8] bg-white px-6 text-sm font-semibold text-[#171C26] transition-colors hover:bg-[#F7F8FA] sm:text-base"
            >
              시뮬레이션 둘러보기
            </Link>
          </div>
        </section>

        <section className="border-b border-[#EEF0F4]">
          <div className="mx-auto grid max-w-[760px] grid-cols-3 gap-3 px-5 pb-16 text-center sm:gap-12 sm:px-8 sm:pb-20">
            {[
              ["120+", "직무 시뮬레이션"],
              ["80+", "참여 기업"],
              ["1,400+", "전달된 채용 제안"],
            ].map(([value, label]) => (
              <div key={value}>
                <p className="text-xl font-extrabold tracking-[-0.04em] text-[#2B5CE7] sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-[11px] text-[#6B7280] sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-[1000px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="text-center">
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#2B5CE7]">HOW IT WORKS</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#171C26] sm:text-4xl">
              세 단계면 충분해요
            </h2>
          </div>

          <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-24">
            {STEPS.map((step, index) => (
              <article
                key={step.number}
                className="grid items-center gap-8 md:grid-cols-2 md:gap-16"
              >
                <div className={index % 2 === 1 ? "md:order-2" : ""}>
                  <p className="text-xs font-extrabold tracking-[0.14em] text-[#2B5CE7]">
                    {step.number}
                  </p>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.035em] text-[#171C26] sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-md text-base leading-7 text-[#4B5563]">
                    {step.description}
                  </p>
                </div>
                <div className={`flex justify-center ${index % 2 === 1 ? "md:order-1" : ""}`}>
                  {step.preview}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1160px] px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="flex flex-col items-center rounded-lg bg-[#171C26] px-6 py-14 text-center sm:px-12 sm:py-16">
            <Sparkles className="h-5 w-5 text-[#83A4FF]" />
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl">
              첫 시뮬레이션, 지금 무료로 시작해보세요
            </h2>
            <p className="mt-3 text-sm text-[#B2BAC8] sm:text-base">
              가입 후 3분이면 첫 과제를 받아볼 수 있어요.
            </p>
            <Link
              to="/start"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-md bg-[#2B5CE7] px-6 text-sm font-bold text-white transition-colors hover:bg-[#3E6DEE] sm:text-base"
            >
              시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#EEF0F4]">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-5 px-5 py-7 text-xs text-[#9CA3AF] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Brand />
            <span>© 2026</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="#faq" className="hover:text-[#4B5563]">
              자주 묻는 질문
            </a>
            <a href="#terms" className="hover:text-[#4B5563]">
              이용약관
            </a>
            <a href="#privacy" className="hover:text-[#4B5563]">
              개인정보처리방침
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
