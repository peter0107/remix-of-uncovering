export type Product = {
  id: "single" | "compare" | "feedback" | "summary" | "upgrade" | "upgrade_feedback";
  name: string;
  price: number;
  tagline: string;
  includes: string[];
  cta: string;
  recommended?: boolean;
  expertQuestions?: number;
};

export const UPGRADE_PRICE = 5000;

export function getExpertQuestionCount(productId: string): number {
  if (productId === "compare") return 1;
  if (productId === "feedback") return 2;
  return 0;
}

export const EXPERT_QUESTION_MAX_LENGTH = 50;

// 가격 구성 (productId는 DB 호환성을 위해 유지)
// single   → 직무 체험 (4,900)
// compare  → 직무 적합 분석 (9,900)
// feedback → 현직자 상세 피드백 (29,900)
// summary  → 내 진로 탐색 요약 해제 (4,900) — 체험과 별개 결제
export const PRODUCTS: Product[] = [
  {
    id: "single",
    name: "직무 체험",
    price: 4900,
    tagline: "가볍게 직무 시뮬레이션을 체험하고 내 역량 점수를 확인합니다.",
    includes: [
      "직무 체험",
      "역량 결과 (AI 점수)",
    ],
    cta: "직무 체험 시작하기",
  },
  {
    id: "compare",
    name: "현직자 검수 리포트",
    price: 9900,
    tagline: "분석 리포트로 내 강점과 보완점을 확인합니다. 현직자가 검수를 진행합니다.",
    includes: [
      "직무 체험",
      "역량 결과 (AI 분석 리포트)",
      "강점 / 보완점",
      "이후 행동 추천",
      "현직자 짧은 코멘트",
      "내 진로 탐색 요약 자동 오픈",
    ],
    cta: "현직자 검수 리포트로 시작하기",
    recommended: true,
  },
  {
    id: "feedback",
    name: "현직자 답안 리뷰",
    price: 19900,
    tagline: "리포트에 더해 현직자의 상세 피드백과 AI 실무 활용 관점까지 제공됩니다.",
    includes: [
      "직무 체험",

      "역량 결과 (AI 분석 리포트)",
      "강점 / 보완점",
      "이후 행동 추천",
      "현직자 상세 피드백",
      "AI 실무 활용 관점",
      "내 진로 탐색 요약 자동 오픈",
    ],
    cta: "현직자 답안 리뷰 받기",
  },
  {
    id: "summary",
    name: "내 진로 탐색 요약 열기",
    price: 4900,
    tagline: "지금까지 체험한 결과로 추천 직무 요약을 즉시 열어봅니다.",
    includes: [
      "내 진로 탐색 요약 즉시 열림",
      "추천 직무 1위 + 근거 충분도",
      "잘 맞는 / 보완 / 추가 확인 역량",
    ],
    cta: "4,900원 결제하고 요약 열기",
  },
  {
    id: "upgrade",
    name: "직무역량 분석 리포트로 업그레이드",
    price: UPGRADE_PRICE,
    tagline: "역량 점수에 더해 현업과의 연결점, 강점·보완점, 다음 활동 추천 결과를 확인할 수 있어요. 현직자의 검수가 보장됩니다.",
    includes: [
      "현업과의 연결점",
      "강점 / 보완점",
      "이후 행동 추천",
      "현직자 짧은 코멘트",
      "내 진로 탐색 요약 자동 오픈",
    ],
    cta: "5,000원 추가 결제하고 리포트 보기",
  },
  {
    id: "upgrade_feedback",
    name: "현직자 답안 리뷰로 업그레이드",
    price: 10000,
    tagline: "현직자의 상세 피드백과 AI 실무 활용 관점까지 확인할 수 있어요.",
    includes: [
      "현직자 상세 피드백",
      "답안별 코멘트",
      "AI 실무 활용 관점",
    ],
    cta: "10,000원 추가 결제하고 상세 피드백 받기",

  },
];

// 비교표용 항목 (옵션 선택 다이얼로그/가격 페이지)
export type CompareFeature = {
  key: string;
  label: string;
  // single | compare | feedback 순
  values: [string, string, string];
};

export const COMPARE_FEATURES: CompareFeature[] = [
  { key: "mission",   label: "시뮬레이션 제공",          values: ["O", "O", "O"] },
  { key: "score",     label: "Ai 역량 점수",          values: ["O", "O", "O"] },
  { key: "analysis",  label: "직무 역량 분석\n(강점/보완점,\n다음 활동 추천 포함)", values: ["X", "O", "O"] },
  { key: "expert",    label: "현직자 검수",        values: ["X", "O", "O"] },
  { key: "detail",    label: "현직자 상세 피드백", values: ["X", "X", "O"] },
  { key: "comment",   label: "답안별 코멘트",      values: ["X", "X", "O"] },
  { key: "ai_use",    label: "실무 AI 활용 관점",  values: ["X", "X", "O"] },
  { key: "summary",   label: "내 진로탐색 요약",   values: ["자동 오픈", "자동 오픈", "자동 오픈"] },
  { key: "expert_q",  label: "현직자에게\n추가 질문",   values: ["X", "1개", "2개"] },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export const formatKRW = (n: number) => `₩${n.toLocaleString("ko-KR")}`;
