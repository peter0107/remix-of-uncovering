import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, FileEdit, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beginner - 실제 업무로 나에게 맞는 회사 찾기" },
      {
        name: "description",
        content:
          "관심 직무의 실제 업무 시뮬레이션을 체험하고, 답안을 기업에 전송해 발견되어보세요.",
      },
    ],
  }),
  component: Index,
});

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

const STEPS = [
  {
    icon: FileEdit,
    title: "관심 직무·기업 등록",
    desc: "학력, 관심 직무, 관심 기업, 근무 선호를 알려주세요.",
  },
  {
    icon: Sparkles,
    title: "맞춤 시뮬레이션 수행",
    desc: "실제 업무 기반 과제를 직접 수행하고 답안을 작성해요.",
  },
  {
    icon: Compass,
    title: "기업에게 발견되기",
    desc: "동의하면 답안이 기업에 전달되고, 관심 있는 기업이 먼저 연락할 수 있어요.",
  },
];

function Index() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-20 text-center sm:pt-28">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500">
          <Sparkles className="h-3.5 w-3.5" />
          현업 기반 직무 시뮬레이션
        </span>
        <h1 className="mt-6 text-3xl font-bold leading-tight text-zinc-900 sm:text-5xl">
          나에게 맞는 직무,
          <br />
          직접 경험하고 확인하세요
        </h1>
        <p className="mt-5 text-base leading-relaxed text-zinc-500 sm:text-lg">
          실제 업무 상황을 바탕으로 구성된 시뮬레이션을 통해
          <br className="hidden sm:block" />
          업무 역량과 직무 적합도를 확인할 수 있어요.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/simulations">
            <Button
              size="lg"
              className="rounded-xl bg-zinc-900 px-8 text-white hover:bg-zinc-700"
            >
              시작하기
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                {i + 1}
              </div>
              <step.icon className="mt-4 h-6 w-6 text-zinc-400" />
              <h3 className="mt-3 font-semibold text-zinc-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <h2 className="text-center text-xl font-bold text-zinc-900 sm:text-2xl">
            자주 묻는 질문
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger className="text-base text-zinc-900">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-zinc-500">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
