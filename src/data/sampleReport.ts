export type Grade = "상" | "중상" | "중" | "보완 필요";

export type Competency = { name: string; grade: Grade; note: string };

export const SAMPLE_REPORT = {
  jobName: "프로덕트 디자이너",
  missionIntro:
    "이 시뮬레이션은 실제 프로덕트 디자이너가 신규 기능 기획 초기에 마주하는 의사결정 상황을 압축한 시나리오입니다. 사용자 불편을 문제로 정의하고, 데이터 단서를 해석해 우선순위를 잡고, 개선안을 실행 단위까지 좁히는 과정을 짧게 체험하게 됩니다.\n",
  summary:
    "사용자 관점에서 문제를 명확히 정의하는 강점이 보입니다. 데이터 해석과 협업 커뮤니케이션을 보완하면 실제 업무에서 더 큰 성과로 이어질 수 있습니다.",
  competencies: [
    { name: "문제 정의", grade: "중상", note: "핵심 문제를 짚어내는 흐름이 좋습니다." },
    { name: "사용자 관점", grade: "상", note: "사용자 입장에서의 해석이 잘 드러납니다." },
    { name: "데이터 해석", grade: "중", note: "지표를 더 구체적으로 연결해보면 좋습니다." },
    { name: "우선순위 판단", grade: "중상", note: "근거 기반으로 우선순위를 잡고 있습니다." },
    { name: "해결안 구체화", grade: "중", note: "개선안의 실행 단위까지 좁혀보세요." },
    { name: "협업 커뮤니케이션", grade: "보완 필요", note: "전달 대상과 톤을 명확히 하면 좋습니다." },
  ] satisfies Competency[],
  strengths: [
    "사용자의 불편을 빠르게 핵심 문제로 정리합니다.",
    "왜 그렇게 판단했는지 근거를 제시합니다.",
  ],
  improvements: [
    "지표와 가설을 1:1로 연결해 설명하면 설득력이 높아집니다.",
    "개선안을 실행 단위(화면/카피/순서)로 더 구체화하면 좋습니다.",
  ],
  fitNarrative:
    "현업에서는 PRD 작성 전 단계의 '문제 정렬' 회의에서 이 흐름이 그대로 반복됩니다. 같은 데이터를 보고도 누구는 화면을, 누구는 카피를, 누구는 플로우를 바꾸자고 합니다. 이 시뮬레이션을 통해 본인이 어느 지점에서 강하고 어디서 흔들리는지 확인하면, 실제 협업에서 어떤 역할을 맡을 때 가장 빠르게 기여할 수 있을지 감을 잡을 수 있습니다.",
  fitPoints: [
    "사용자 관점이 자연스러워 PM/디자인 협업에 강점이 있습니다.",
    "문제 정의 흐름이 안정적이어서 초기 단계 제품에 잘 맞습니다.",
  ],
  learningPath: [
    "프로덕트 메트릭 기초 (활성/리텐션/퍼널)",
    "사용자 인터뷰 정리 프레임",
    "PRD 한 장 작성 연습",
  ],
  nextActions: [
    "KT cloud TECH UP 프로덕트 디자인 과정 지원 검토하기 | https://www.allforyoung.com/posts/81247",
    "코드잇 스프린트 프로덕트 디자인 부트캠프 지원 검토하기 | https://www.allforyoung.com/posts/81374",
    "여행 동행 매칭 앱 UI/UX 디자이너 팀 프로젝트 지원하기 | https://www.inflearn.com/projects/1808232/2026%EB%85%84-%EB%9F%B0%EC%B9%AD-%EB%AA%A9%ED%91%9C-%EC%97%AC%ED%96%89-%EB%8F%99%ED%96%89-%EB%A7%A4%EC%B9%AD-%EC%95%B1-ui-ux-%EB%94%94%EC%9E%90%EC%9D%B4%EB%84%88-%EB%AA%A8%EC%A7%91",
    "생성형 AI·데이터 활용 프로덕트 디자인/기획 부트캠프 확인하기 | https://www.softwarecampus.co.kr/lectures/780",
  ],
};
