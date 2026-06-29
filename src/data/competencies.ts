export type CompetencyGroup = {
  id: string;
  name: string;
  competencies: { id: string; name: string }[];
};

export const COMPETENCY_GROUPS: CompetencyGroup[] = [
  {
    id: "A",
    name: "분석·추론 역량",
    competencies: [
      { id: "A1", name: "문제인식·정의 역량" },
      { id: "A2", name: "정보수집·검증 역량" },
      { id: "A3", name: "원인분석·구조화 역량" },
      { id: "A4", name: "통계기초 역량" },
      { id: "A5", name: "자료분포해석 역량" },
      { id: "A6", name: "확률·추론 역량" },
      { id: "A7", name: "도표해석 역량" },
    ],
  },
  {
    id: "B",
    name: "의사결정 역량",
    competencies: [
      { id: "B1", name: "대안탐색·발굴 역량" },
      { id: "B2", name: "대안비교·평가 역량" },
      { id: "B3", name: "실행가능성검토 역량" },
      { id: "B4", name: "의사결정기준설정 역량" },
      { id: "B5", name: "의사결정실행·검토 역량" },
      { id: "B6", name: "성찰·피드백 역량" },
    ],
  },
  {
    id: "C",
    name: "수리·수치 역량",
    competencies: [
      { id: "C1", name: "수치연산 역량" },
      { id: "C2", name: "어림값추정 역량" },
      { id: "C3", name: "단위환산 역량" },
      { id: "C4", name: "도표작성·시각화 역량" },
    ],
  },
  {
    id: "D",
    name: "실행·운영 역량",
    competencies: [
      { id: "D1", name: "시간관리 역량" },
      { id: "D2", name: "역할이해·조율 역량" },
      { id: "D3", name: "협업문제해결 역량" },
      { id: "D4", name: "안전보건실천 역량" },
    ],
  },
  {
    id: "E",
    name: "디지털·AI 역량",
    competencies: [
      { id: "E1", name: "디지털도구활용 역량" },
      { id: "E2", name: "디지털정보처리 역량" },
      { id: "E3", name: "디지털문제해결 역량" },
      { id: "E4", name: "AI기술이해 역량" },
      { id: "E5", name: "AI도구선택·적용 역량" },
      { id: "E6", name: "AI활용문제해결 역량" },
      { id: "E7", name: "디지털윤리·책임 역량" },
    ],
  },
  {
    id: "F",
    name: "소통·표현 역량",
    competencies: [
      { id: "F1", name: "문서이해 역량" },
      { id: "F2", name: "문서작성·표현 역량" },
      { id: "F3", name: "경청 역량" },
      { id: "F4", name: "의사표현 역량" },
      { id: "F5", name: "대인소통 역량" },
      { id: "F6", name: "외국어소통 역량" },
    ],
  },
  {
    id: "G",
    name: "리더십·갈등관리 역량",
    competencies: [
      { id: "G1", name: "자기리더십 역량" },
      { id: "G2", name: "동료·팀리더십 역량" },
      { id: "G3", name: "갈등관리 역량" },
    ],
  },
  {
    id: "H",
    name: "자기개발·성장 역량",
    competencies: [
      { id: "H1", name: "자기이해 역량" },
      { id: "H2", name: "경력개발계획 역량" },
      { id: "H3", name: "변화적응·자기주도학습 역량" },
      { id: "H4", name: "지속적자기개발 역량" },
    ],
  },
  {
    id: "I",
    name: "직업윤리·태도 역량",
    competencies: [
      { id: "I1", name: "성실·책임 역량" },
      { id: "I2", name: "공정의식 역량" },
      { id: "I3", name: "존중·협력 역량" },
      { id: "I4", name: "준법성 역량" },
      { id: "I5", name: "안전보건의식 역량" },
    ],
  },
];

export const ALL_COMPETENCIES = COMPETENCY_GROUPS.flatMap((g) => g.competencies);

export function getCompetencyName(id: string): string {
  return ALL_COMPETENCIES.find((c) => c.id === id)?.name ?? id;
}
