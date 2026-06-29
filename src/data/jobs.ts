export type JobStatus = "available" | "preparing";

export type Question = { id: string; label: string; placeholder?: string };

export type Job = {
  slug: string;
  name: string;
  tagline: string;
  duration: string;
  competencies: string[];
  reportIncluded: boolean;
  price: number;
  status: JobStatus;
  description: string;
  missionTitle: string;
  missionSummary: string;
  steps: string[];
  situation: string;
  data: string[];
  questions: Question[];
  difficulty?: string;
  recommendedFor?: string;
};

export const JOBS: Job[] = [
  {
    slug: "product-designer",
    name: "프로덕트 디자인",
    tagline: "문제 정의부터 개선 방향 제안까지, 제품 전 과정을 체험합니다.",
    duration: "20~30분",
    competencies: [
      "문제 정의",
      "사용자 관점",
      "데이터 해석",
      "우선순위 판단",
      "해결안 구체화",
      "협업 커뮤니케이션",
    ],
    reportIncluded: true,
    price: 9900,
    status: "available",
    description:
      "프로덕트 디자이너는 단순히 UI 화면을 만드는 사람이 아니라, 문제 정의부터 사용자 경험 설계, 개발 협업, 배포 후 성과 확인까지 제품 전 과정에 관여하는 직무입니다.",
    missionTitle: "회원가입 완료율 감소 원인 분석 및 개선 방향 제안",
    missionSummary:
      "사용자 불편 상황과 간단한 서비스 지표를 보고, 문제를 정의하고 개선 방향을 제안합니다.",
    steps: [
      "상황 이해",
      "문제 정의",
      "개선 방향 제안",
      "우선순위 판단",
      "추가 확인 데이터 제안",
    ],
    situation:
      "최근 2주간 회원가입 완료율이 감소했습니다. 사용자 피드백에서는 가입 과정이 길고, 입력해야 할 정보가 많다는 불만이 반복되고 있습니다. 제공된 지표와 피드백을 보고, 가장 먼저 해결해야 할 문제와 개선 방향을 제안해주세요.",
    data: [
      "회원가입 완료율: 최근 2주간 감소",
      "이탈이 가장 많은 단계: 개인정보 입력 단계",
      "사용자 피드백: \"가입 과정이 너무 길다\"",
      "사용자 피드백: \"필수 입력 항목이 많다\"",
      "사용자 피드백: \"왜 이 정보를 입력해야 하는지 모르겠다\"",
    ],
    questions: [
      { id: "q1", label: "이 상황에서 핵심 문제는 무엇이라고 생각하나요?" },
      { id: "q2", label: "가장 먼저 개선해야 할 지점은 무엇인가요?" },
      { id: "q3", label: "그렇게 판단한 이유는 무엇인가요?" },
      { id: "q4", label: "추가로 확인하고 싶은 데이터는 무엇인가요?" },
      { id: "q5", label: "개선안을 실행했을 때 어떤 지표를 확인해야 하나요?" },
    ],
  },
  {
    slug: "uiux-design",
    name: "UIUX 디자인",
    tagline: "사용자 흐름과 화면 설계를 통해 문제를 풀어봅니다.",
    duration: "20~30분",
    competencies: [
      "사용자 흐름 설계",
      "정보 구조",
      "시각 위계",
      "인터랙션 판단",
      "협업 커뮤니케이션",
    ],
    reportIncluded: true,
    price: 9900,
    status: "available",
    description:
      "UIUX 디자이너는 사용자가 서비스를 사용하는 흐름과 화면을 설계해, 사용자가 더 쉽게 목적을 달성할 수 있도록 돕는 직무입니다.",
    missionTitle: "예약 취소율이 높은 화면 흐름 개선",
    missionSummary:
      "예약 화면에서 취소 이탈이 잦은 흐름을 진단하고 개선 방향을 제안합니다.",
    steps: ["상황 이해", "문제 정의", "흐름 개선", "화면 우선순위", "검증 방법 제안"],
    situation:
      "예약 페이지에서 결제 직전 단계 이탈률이 높습니다. 사용자들은 \"옵션 선택이 헷갈린다\", \"내가 무엇을 결제하는지 모르겠다\"고 답합니다.",
    data: [
      "결제 직전 이탈률: 평균 대비 1.6배",
      "옵션 선택 화면 평균 체류 시간: 12초",
      "사용자 피드백: \"가격이 어디서 바뀌는지 모르겠다\"",
    ],
    questions: [
      { id: "q1", label: "사용자가 가장 헷갈려 하는 지점은 어디라고 보나요?" },
      { id: "q2", label: "어떤 흐름을 먼저 개선하시겠어요?" },
      { id: "q3", label: "그 판단의 근거는 무엇인가요?" },
      { id: "q4", label: "개선 후 어떤 지표를 보면 효과를 알 수 있나요?" },
      { id: "q5", label: "추가로 확인하고 싶은 사용자 데이터는 무엇인가요?" },
    ],
  },
  {
    slug: "semiconductor-process",
    name: "반도체 공정기술",
    tagline: "수율 변동 데이터를 보고 원인을 추정해봅니다.",
    duration: "25~35분",
    competencies: [
      "데이터 해석",
      "원인 가설 수립",
      "우선순위 판단",
      "검증 계획",
      "협업 커뮤니케이션",
    ],
    reportIncluded: true,
    price: 9900,
    status: "available",
    description:
      "반도체 공정기술 직무는 공정에서 발생하는 이상 신호와 수율 변동을 데이터 기반으로 분석하고, 개선 방향을 제안합니다.",
    missionTitle: "특정 공정 단계에서의 수율 저하 원인 추정",
    missionSummary:
      "공정 데이터와 변경 이력을 보고 수율 저하의 가능 원인을 좁히고 검증 계획을 제안합니다.",
    steps: ["데이터 확인", "원인 가설", "우선순위", "검증 계획", "협업 메시지"],
    situation:
      "지난 주부터 특정 공정 단계의 수율이 평균 대비 3% 하락했습니다. 동일 시점에 장비 점검과 원자재 변경이 있었습니다.",
    data: [
      "공정 단계 A 수율: -3%",
      "동일 시점 장비 B 정기 점검 진행",
      "동일 시점 원자재 공급사 변경",
    ],
    questions: [
      { id: "q1", label: "가장 의심되는 원인은 무엇인가요?" },
      { id: "q2", label: "원인을 좁히기 위해 무엇부터 확인하시겠어요?" },
      { id: "q3", label: "그 판단의 근거는 무엇인가요?" },
      { id: "q4", label: "추가로 확보하고 싶은 데이터는 무엇인가요?" },
      { id: "q5", label: "관련 부서에 어떤 메시지로 공유하시겠어요?" },
    ],
  },
  {
    slug: "data-analytics",
    name: "데이터 분석",
    tagline: "지표 정의와 인사이트 도출을 체험합니다.",
    duration: "20~30분",
    competencies: ["지표 정의", "데이터 해석", "가설 수립", "커뮤니케이션"],
    reportIncluded: true,
    price: 9900,
    status: "preparing",
    description: "준비 중인 직무입니다.",
    missionTitle: "",
    missionSummary: "",
    steps: [],
    situation: "",
    data: [],
    questions: [],
  },
  {
    slug: "pharma-qc",
    name: "제약 품질관리(QC)",
    tagline: "품질 이슈 분석과 보고 흐름을 체험합니다.",
    duration: "20~30분",
    competencies: ["품질 데이터 해석", "원인 가설", "보고 커뮤니케이션"],
    reportIncluded: true,
    price: 9900,
    status: "preparing",
    description: "준비 중인 직무입니다.",
    missionTitle: "",
    missionSummary: "",
    steps: [],
    situation: "",
    data: [],
    questions: [],
  },
  {
    slug: "service-pm",
    name: "서비스기획/PM",
    tagline: "기획 우선순위와 의사결정을 체험합니다.",
    duration: "20~30분",
    competencies: ["문제 정의", "우선순위 판단", "협업 커뮤니케이션"],
    reportIncluded: true,
    price: 9900,
    status: "preparing",
    description: "준비 중인 직무입니다.",
    missionTitle: "",
    missionSummary: "",
    steps: [],
    situation: "",
    data: [],
    questions: [],
  },
  {
    slug: "bx-brand-design",
    name: "BX/브랜드디자인",
    tagline: "브랜드 톤과 메시지 설계를 체험합니다.",
    duration: "20~30분",
    competencies: ["브랜드 톤 정의", "메시지 설계", "시각 일관성"],
    reportIncluded: true,
    price: 9900,
    status: "preparing",
    description: "준비 중인 직무입니다.",
    missionTitle: "",
    missionSummary: "",
    steps: [],
    situation: "",
    data: [],
    questions: [],
  },
];

export function getJob(slug: string): Job | undefined {
  return JOBS.find((j) => j.slug === slug);
}

export const AVAILABLE_JOBS = JOBS.filter((j) => j.status === "available");
export const PREPARING_JOBS = JOBS.filter((j) => j.status === "preparing");
