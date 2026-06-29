import {
  Lightbulb,
  Scale,
  Users,
  Calculator,
  Megaphone,
  Code2,
  Palette,
  Truck,
  Car,
  Handshake,
  Headphones,
  Landmark,
  UtensilsCrossed,
  ShoppingBag,
  Wrench,
  Factory,
  GraduationCap,
  Building2,
  Stethoscope,
  Film,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";

export type JobCategory = {
  id: string;
  name: string;
  icon: LucideIcon;
};

export const JOB_CATEGORIES: JobCategory[] = [
  { id: "planning", name: "기획·전략", icon: Lightbulb },
  { id: "legal", name: "법무·사무·총무", icon: Scale },
  { id: "hr", name: "인사·HR", icon: Users },
  { id: "accounting", name: "회계·세무", icon: Calculator },
  { id: "marketing", name: "마케팅·광고·MD", icon: Megaphone },
  { id: "dev", name: "AI·개발·데이터", icon: Code2 },
  { id: "design", name: "디자인", icon: Palette },
  { id: "logistics", name: "물류·무역", icon: Truck },
  { id: "transport", name: "운전·운송·배송", icon: Car },
  { id: "sales", name: "영업", icon: Handshake },
  { id: "cs", name: "고객상담·TM", icon: Headphones },
  { id: "finance", name: "금융·보험", icon: Landmark },
  { id: "food", name: "식·음료", icon: UtensilsCrossed },
  { id: "retail", name: "고객서비스·리테일", icon: ShoppingBag },
  { id: "engineering", name: "엔지니어링·설계", icon: Wrench },
  { id: "manufacturing", name: "제조·생산", icon: Factory },
  { id: "education", name: "교육", icon: GraduationCap },
  { id: "construction", name: "건축·시설", icon: Building2 },
  { id: "medical", name: "의료·바이오", icon: Stethoscope },
  { id: "media", name: "미디어·문화·스포츠", icon: Film },
  { id: "public", name: "공공·복지", icon: HeartHandshake },
];

export type CategoryJob = {
  slug?: string;
  name: string;
  description: string;
  tags: string[];
  duration: string;
  status: "available" | "preparing";
};

export const CATEGORY_JOBS: Record<string, CategoryJob[]> = {
  design: [
    {
      slug: "product-designer",
      name: "프로덕트 디자이너",
      description: "문제 정의부터 개선 방향 제안까지,\n제품 전 과정을 경험합니다.",
      tags: ["문제 정의", "사용자 관점", "데이터 해석"],
      duration: "20~30분",
      status: "available",
    },
    {
      slug: "uiux-design",
      name: "UIUX 디자인",
      description: "사용자 흐름과 화면 설계를 통해\n문제를 풀어봅니다.",
      tags: ["사용자 흐름 설계", "정보 구조", "인터랙션 디자인"],
      duration: "20~30분",
      status: "available",
    },
    {
      slug: "bx-brand-design",
      name: "BX / 브랜드디자인",
      description: "브랜드 톤과 메시지\n설계를 체험합니다.",
      tags: ["브랜드 톤 정의", "메시지 설계", "시각 일관성"],
      duration: "20~30분",
      status: "preparing",
    },
  ],
  dev: [
    {
      name: "프론트엔드 개발",
      description: "사용자에게 보이는 UI를\n구현하고 상호작용을 만듭니다.",
      tags: ["HTML/CSS", "JavaScript", "React"],
      duration: "20~30분",
      status: "preparing",
    },
    {
      name: "백엔드 개발",
      description: "안정적이고 확장 가능한\n서버와 API를 설계합니다.",
      tags: ["API 설계", "데이터베이스", "서버 개발"],
      duration: "20~30분",
      status: "preparing",
    },
    {
      name: "앱개발",
      description: "모바일 환경에 최적화된\n앱 서비스를 개발합니다.",
      tags: ["Android", "iOS", "모바일 UI/UX"],
      duration: "20~30분",
      status: "preparing",
    },
    {
      slug: "data-analytics",
      name: "데이터 분석",
      description: "데이터를 분석해 인사이트를 도출하고\n의사결정을 지원합니다.",
      tags: ["데이터 분석", "SQL", "시각화"],
      duration: "20~30분",
      status: "preparing",
    },
    {
      name: "QA / 테스트",
      description: "서비스 품질을 검증하고\n문제를 발견·개선합니다.",
      tags: ["테스트 설계", "버그 리포트", "품질 관리"],
      duration: "20~30분",
      status: "preparing",
    },
  ],
  planning: [
    {
      slug: "service-pm",
      name: "서비스기획 / PM",
      description: "서비스의 방향을 설정하고,\n사용자 가치를 정의합니다.",
      tags: ["서비스 전략", "요구사항 정의", "우선순위 설정"],
      duration: "20~30분",
      status: "preparing",
    },
  ],
  manufacturing: [
    {
      slug: "semiconductor-process",
      name: "반도체 공정기술",
      description: "수율 변동 데이터를 보고\n원인을 추정해봅니다.",
      tags: ["데이터 해석", "원인 가설 수립", "검증 계획"],
      duration: "25~35분",
      status: "available",
    },
  ],
  medical: [
    {
      slug: "pharma-qc",
      name: "제약 품질관리(QC)",
      description: "품질 이슈 분석과\n보고 흐름을 체험합니다.",
      tags: ["품질 데이터 해석", "원인 가설", "보고 커뮤니케이션"],
      duration: "20~30분",
      status: "preparing",
    },
  ],
};

// 산업군 (시뮬레이션 필터용)
export type Industry = { id: string; name: string };

export const INDUSTRIES: Industry[] = [
  { id: "all", name: "전체" },
  { id: "it", name: "IT·정보통신" },
  { id: "finance", name: "금융·은행" },
  { id: "retail", name: "판매·유통" },
  { id: "manufacturing", name: "제조·생산" },
  { id: "service", name: "서비스" },
  { id: "media", name: "미디어·광고" },
  { id: "medical", name: "의료·제약" },
];

export type MissionType = "official" | "expert";

export type Mission = {
  id: string;
  title: string;
  description: string;
  industries: string[]; // industry ids
  duration: string;
  reportIncluded: boolean;
  authorName: string;
  authorRole: string;
  authorInitial: string;
  authorColor: string; // tailwind bg class
  type: MissionType;
  badge?: "popular" | "new";
};

// 직무 slug → 시뮬레이션 목록
export const JOB_MISSIONS: Record<string, Mission[]> = {
  "product-designer": [
    {
      id: "m1",
      title: "회원가입 완료율 감소 원인 분석",
      description: "데이터를 기반으로 가입 과정의 문제를 진단하고 개선 방향을 도출해요.",
      industries: ["it", "service"],
      duration: "예상 25분",
      reportIncluded: true,
      authorName: "김현준",
      authorRole: "현 프로덕트 디자이너",
      authorInitial: "김",
      authorColor: "bg-purple-200 text-purple-700",
      type: "expert",
      badge: "popular",
    },
    {
      id: "m3",
      title: "프로젝트 상세페이지 탐색 경험 개선",
      description: "상세페이지의 정보 구조와 탐색 흐름을 분석하고 개선안을 제시해요.",
      industries: ["it", "retail"],
      duration: "예상 25분",
      reportIncluded: true,
      authorName: "Beginner 공식",
      authorRole: "",
      authorInitial: "b",
      authorColor: "bg-foreground text-background",
      type: "official",
    },
  ],
};
