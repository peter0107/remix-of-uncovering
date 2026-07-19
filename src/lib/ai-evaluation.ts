export const COMPANY_AI_REVIEW_TOOL_NAME = "record_ai_review";

export const COMPANY_AI_REVIEW_TOOL = {
  name: COMPANY_AI_REVIEW_TOOL_NAME,
  description: "지원자의 시뮬레이션 결과물, AI 활용 기록, 면접 질문 추천을 정해진 평가 형식으로 기록합니다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["simulation", "aiUtilization", "interviewQuestions"],
    properties: {
      simulation: {
        type: "object",
        additionalProperties: false,
        required: ["score", "summary", "strengths", "concerns"],
        properties: {
          score: { type: "integer", minimum: 0, maximum: 100 },
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" }, maxItems: 20 },
          concerns: { type: "array", items: { type: "string" }, maxItems: 20 },
        },
      },
      aiUtilization: {
        type: "object",
        additionalProperties: false,
        required: ["score", "summary", "strengths", "improvements"],
        properties: {
          score: { type: "integer", minimum: 0, maximum: 100 },
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" }, maxItems: 20 },
          improvements: { type: "array", items: { type: "string" }, maxItems: 20 },
        },
      },
      interviewQuestions: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "question", "intent"],
          properties: {
            category: { type: "string", enum: ["시뮬레이션 결과물", "AI 활용"] },
            question: { type: "string" },
            intent: { type: "string" },
          },
        },
      },
    },
  },
} as const;

export function getClaudeAiReviewInput(payload: Record<string, unknown>): unknown {
  const content = Array.isArray(payload.content) ? payload.content : [];
  const toolUse = content.find(
    (part) =>
      typeof part === "object" &&
      part !== null &&
      (part as { type?: unknown }).type === "tool_use" &&
      (part as { name?: unknown }).name === COMPANY_AI_REVIEW_TOOL_NAME,
  ) as { input?: unknown } | undefined;

  if (!toolUse?.input || typeof toolUse.input !== "object" || Array.isArray(toolUse.input)) {
    throw new Error("AI 평가 결과 형식이 올바르지 않습니다.");
  }

  return toolUse.input;
}
