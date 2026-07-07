// 직무 시뮬레이션 과제(task_prompt)를 스텝 위저드로 자동 분할하는 파서.
//
// 모든 미션은 동일 템플릿을 따른다:
//   0. 개요 / 1. 상황 제시 / 2. 배경 설명 / 3. 제공 자료
//   4. 제출 보고서  ← "#### N) 제목" 형태의 작성 질문 N개
//   5. 최종 제출 양식 (복붙용)  ← 위저드에서는 불필요하므로 제외
//
// "제출 보고서" 앞까지를 배경(자료)으로, 질문들을 3~4개 스텝으로 묶는다.
// 템플릿을 벗어나 질문을 2개 미만으로 파싱하면 null → 기존 단일 화면으로 폴백.

export type SimQuestion = {
  id: string; // "q1" ...
  num: number;
  title: string;
  /** 작성 질문 + 포함할 내용 + 초심자용 힌트 등 질문 본문 (마크다운) */
  bodyMarkdown: string;
};

export type SimStep = {
  title: string;
  questions: SimQuestion[];
};

export type ParsedSimulation = {
  /** 제출 보고서 이전의 모든 내용 (상황·배경·자료) */
  background: string;
  steps: SimStep[];
  questionCount: number;
};

const REPORT_HEADING = /^#{1,4}\s*\d+\.\s*제출\s*보고서/;
const FINAL_HEADING = /^#{1,4}\s*\d+\.\s*최종\s*제출/;
// "#### 3) 원인 가설" 은 매칭, "#### **초심자용 힌트 3)**" 은 hashes 뒤가 숫자가 아니라 비매칭.
const QUESTION_HEADING = /^#{2,4}\s*(\d+)\)\s*(.+)$/;

/** 위저드 목표 스텝 수 (질문이 이보다 적으면 질문 수만큼) */
const TARGET_STEPS = 4;

export function parseSimulationSteps(
  taskPrompt: string | null | undefined,
): ParsedSimulation | null {
  if (!taskPrompt) return null;

  const lines = taskPrompt.replace(/\r\n/g, "\n").split("\n");

  const reportIdx = lines.findIndex((line) => REPORT_HEADING.test(line));
  if (reportIdx === -1) return null;

  let endIdx = lines.findIndex((line, i) => i > reportIdx && FINAL_HEADING.test(line));
  if (endIdx === -1) endIdx = lines.length;

  const background = lines.slice(0, reportIdx).join("\n").trim();
  const reportLines = lines.slice(reportIdx + 1, endIdx);

  const questions: SimQuestion[] = [];
  let current: SimQuestion | null = null;

  for (const line of reportLines) {
    const match = line.match(QUESTION_HEADING);
    if (match) {
      if (current) questions.push(current);
      const num = Number(match[1]);
      current = {
        id: `q${num}`,
        num,
        title: match[2].replace(/\*/g, "").trim(),
        bodyMarkdown: "",
      };
    } else if (current) {
      current.bodyMarkdown += `${line}\n`;
    }
  }
  if (current) questions.push(current);

  for (const question of questions) {
    // 다음 질문 앞의 구분선(---)이 본문 끝에 붙어 오므로 제거
    question.bodyMarkdown = question.bodyMarkdown.replace(/\n?-{3,}\s*$/g, "").trim();
  }

  if (questions.length < 2) return null;

  const targetSteps = Math.min(TARGET_STEPS, questions.length);
  const perStep = Math.ceil(questions.length / targetSteps);
  const steps: SimStep[] = [];
  for (let i = 0; i < questions.length; i += perStep) {
    const group = questions.slice(i, i + perStep);
    steps.push({
      title: group.map((q) => q.title).join(" · "),
      questions: group,
    });
  }

  return { background, steps, questionCount: questions.length };
}

/** 스텝별 답을 기업 화면용 평문 합본으로 만든다 (biz는 whitespace-pre-line 렌더). */
export function buildResponseText(
  parsed: ParsedSimulation,
  answers: Record<string, string>,
): string {
  return parsed.steps
    .flatMap((step) => step.questions)
    .map((q) => `【${q.num}) ${q.title}】\n${(answers[q.id] ?? "").trim()}`)
    .join("\n\n");
}

/** 스텝별 답을 구조화 저장 (submissions.response_json). */
export function buildResponseJson(
  parsed: ParsedSimulation,
  answers: Record<string, string>,
): {
  format: "step_wizard_v1";
  answers: { id: string; num: number; title: string; answer: string }[];
} {
  return {
    format: "step_wizard_v1",
    answers: parsed.steps
      .flatMap((step) => step.questions)
      .map((q) => ({
        id: q.id,
        num: q.num,
        title: q.title,
        answer: (answers[q.id] ?? "").trim(),
      })),
  };
}

/** 모든 질문에 답이 채워졌는지 */
export function allAnswered(parsed: ParsedSimulation, answers: Record<string, string>): boolean {
  return parsed.steps
    .flatMap((step) => step.questions)
    .every((q) => (answers[q.id] ?? "").trim().length > 0);
}

/** 특정 스텝의 질문이 모두 채워졌는지 */
export function stepAnswered(step: SimStep, answers: Record<string, string>): boolean {
  return step.questions.every((q) => (answers[q.id] ?? "").trim().length > 0);
}
