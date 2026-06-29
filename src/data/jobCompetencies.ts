// 각 직무가 요구하는 6개 세부 역량 (competencies.ts의 ID 사용)
// 매핑 없는 직무는 DEFAULT_COMPETENCIES 사용
export const JOB_REQUIRED_COMPETENCIES: Record<string, string[]> = {
  "product-designer": ["A1", "A7", "B2", "B3", "B6", "E1"],
  "uiux-design": ["A1", "A7", "B1", "B2", "B3", "B6"],
  "service-pm": ["A1", "B1", "B2", "B3", "F2", "F4"],
  "data-analytics": ["A1", "A7", "A2", "A3", "A4", "A5"],
  "bx-brand-design": ["A1", "B1", "F2", "F4", "H1", "I3"],
  "semiconductor-process": ["A3", "A4", "A5", "C1", "D4", "I5"],
  "pharma-qc": ["A2", "A3", "A4", "C1", "D4", "I5"],
};

export const DEFAULT_COMPETENCIES = ["A1", "A2", "A3", "B1", "B2", "F2"];

export function getRequiredCompetencies(slug: string): string[] {
  return JOB_REQUIRED_COMPETENCIES[slug] ?? DEFAULT_COMPETENCIES;
}
