import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { DOMAIN_CATEGORIES } from "@/lib/domain-categories";
import type { AdminSimulationStep } from "@/lib/simulations.functions";

// ============================================================
// 권한 검증 (이 파일 전용 — simulations.functions.ts와 동일 패턴)
// ============================================================
function createPublicServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Backend is not configured");
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getBearerToken(): string {
  const request = getRequest();
  const authHeader = request?.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) throw new Error("로그인이 필요합니다.");
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("로그인이 필요합니다.");
  return token;
}

async function assertAdmin() {
  const token = getBearerToken();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) throw new Error("ADMIN_EMAILS 환경변수가 필요합니다.");

  const supabase = createPublicServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !adminEmails.includes(email)) {
    throw new Error("관리자 권한이 없습니다.");
  }
}

// ============================================================
// 입력 / 출력 타입
// ============================================================
const generateInputSchema = z.object({
  companyName: z.string().trim().min(1).max(100),
  roleName: z.string().trim().min(1).max(100),
  domain: z.enum(DOMAIN_CATEGORIES),
  sources: z
    .array(
      z.object({
        platform: z.string().trim().min(1).max(40),
        jd: z.string().trim().min(1).max(20000),
      }),
    )
    .min(1)
    .max(8),
  note: z.string().trim().max(2000).optional().default(""),
});

export type GenerateSimulationInput = z.infer<typeof generateInputSchema>;

export type GeneratedCriterion = {
  title: string;
  sources: Array<{ platform: string; quote: string }>;
  reflectedIn: string;
};

export type GeneratedUnreflected = {
  requirement: string;
  reason: string;
};

export type GeneratedSimulationDraft = {
  companyName: string;
  roleName: string;
  domain: string;
  simulation: {
    title: string;
    roleLabel: string;
    description: string;
    estimatedMinutes: number | null;
    steps: AdminSimulationStep[];
  };
  rationale: {
    criteria: GeneratedCriterion[];
    unreflected: GeneratedUnreflected[];
  };
};

// 도구가 반환한 원본 형태 검증용 스키마
const toolStepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  durationMin: z.number().int().min(1).max(120).nullable().optional(),
  difficulty: z.number().int().min(1).max(5).nullable().optional(),
  situation: z.string().max(8000).optional().default(""),
  materials: z.string().max(12000).optional().default(""),
  question: z.string().trim().min(1).max(8000),
  hint: z.string().max(4000).optional().default(""),
  completionMessage: z.string().max(2000).optional().default(""),
});

const toolOutputSchema = z.object({
  simulation: z.object({
    title: z.string().trim().min(1).max(200),
    roleLabel: z.string().trim().min(1).max(120),
    description: z.string().max(1000).optional().default(""),
    estimatedMinutes: z.number().int().min(5).max(240).nullable().optional().default(null),
    steps: z.array(toolStepSchema).min(2).max(6),
  }),
  rationale: z.object({
    criteria: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(300),
          sources: z
            .array(
              z.object({
                platform: z.string().max(60).optional().default(""),
                quote: z.string().max(1200).optional().default(""),
              }),
            )
            .max(10)
            .optional()
            .default([]),
          reflectedIn: z.string().max(600).optional().default(""),
        }),
      )
      .max(15)
      .optional()
      .default([]),
    unreflected: z
      .array(
        z.object({
          requirement: z.string().max(400).optional().default(""),
          reason: z.string().max(600).optional().default(""),
        }),
      )
      .max(15)
      .optional()
      .default([]),
  }),
});

// ============================================================
// Claude tool 정의 (구조화 출력 강제)
// ============================================================
const GENERATE_TOOL_NAME = "record_simulation_draft";

const GENERATE_TOOL = {
  name: GENERATE_TOOL_NAME,
  description:
    "채용공고(JD)에서 평가 기준을 추출해 스텝형 직무 시뮬레이션 초안과 그 생성 근거를 정해진 형식으로 기록합니다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["simulation", "rationale"],
    properties: {
      simulation: {
        type: "object",
        additionalProperties: false,
        required: ["title", "roleLabel", "steps"],
        properties: {
          title: {
            type: "string",
            description: "시뮬레이션 제목. 반드시 '{기업명} {직무명} 지원 대비 시뮬레이션' 형태.",
          },
          roleLabel: { type: "string", description: "직무명 (예: 그로스마케터)" },
          description: { type: "string", description: "카드에 보일 한 줄 설명 (해요체)" },
          estimatedMinutes: { type: "integer", description: "전체 예상 소요 시간(분)" },
          steps: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "question"],
              properties: {
                title: { type: "string", description: "단계 제목 (예: 지표 현황 진단)" },
                durationMin: { type: "integer", description: "이 단계 예상 소요(분)" },
                difficulty: { type: "integer", description: "난이도 1~5 (초심자 기준 낮게)" },
                situation: {
                  type: "string",
                  description: "상황 안내 (마크다운). 이 단계에서 처한 업무 상황을 구체적으로.",
                },
                materials: {
                  type: "string",
                  description:
                    "제공 자료 (마크다운, 표 가능). JD에 근거해 만든 현실적인 가상 데이터/문서.",
                },
                question: {
                  type: "string",
                  description: "이 단계에서 답해야 할 질문 1개 (마크다운).",
                },
                hint: { type: "string", description: "초심자용 힌트 (마크다운)" },
                completionMessage: { type: "string", description: "단계 완료 메시지 (선택)" },
              },
            },
          },
        },
      },
      rationale: {
        type: "object",
        additionalProperties: false,
        required: ["criteria", "unreflected"],
        properties: {
          criteria: {
            type: "array",
            maxItems: 15,
            description: "JD에서 추출한 평가 기준과 그 근거",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "sources", "reflectedIn"],
              properties: {
                title: { type: "string", description: "평가 기준 이름" },
                sources: {
                  type: "array",
                  maxItems: 10,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["platform", "quote"],
                    properties: {
                      platform: { type: "string", description: "JD 출처 플랫폼명" },
                      quote: { type: "string", description: "근거가 된 JD 문구 인용" },
                    },
                  },
                },
                reflectedIn: {
                  type: "string",
                  description: "이 기준이 어느 스텝에 어떻게 반영됐는지",
                },
              },
            },
          },
          unreflected: {
            type: "array",
            maxItems: 15,
            description: "시뮬레이션에 반영하지 못한 JD 요건과 그 이유",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["requirement", "reason"],
              properties: {
                requirement: { type: "string", description: "반영하지 못한 요건" },
                reason: { type: "string", description: "반영하지 못한 이유 (예: 도구 실습 필요)" },
              },
            },
          },
        },
      },
    },
  },
} as const;

function getToolInput(payload: Record<string, unknown>): unknown {
  const content = Array.isArray(payload.content) ? payload.content : [];
  const toolUse = content.find(
    (part) =>
      typeof part === "object" &&
      part !== null &&
      (part as { type?: unknown }).type === "tool_use" &&
      (part as { name?: unknown }).name === GENERATE_TOOL_NAME,
  ) as { input?: unknown } | undefined;

  if (!toolUse?.input || typeof toolUse.input !== "object" || Array.isArray(toolUse.input)) {
    throw new Error("AI 생성 결과 형식이 올바르지 않습니다. 다시 시도해주세요.");
  }
  return toolUse.input;
}

// ============================================================
// 프롬프트
// ============================================================
function buildPrompt(input: GenerateSimulationInput): string {
  const sourcesBlock = input.sources
    .map((s, i) => `[출처 ${i + 1} · ${s.platform}]\n${s.jd}`)
    .join("\n\n");

  return `당신은 구직 대학생을 위한 직무 시뮬레이션을 설계하는 전문가입니다. 아래 채용공고(JD)들을 분석해, 지원자가 지원 전에 미리 연습할 수 있는 스텝형 시뮬레이션 초안을 만드세요.

## 대상
- 기업명: ${input.companyName}
- 직무명: ${input.roleName}
- 도메인: ${input.domain}
${input.note ? `- 참고사항: ${input.note}` : ""}

## 채용공고 원문 (평가 기준 추출용)
${sourcesBlock}

## 설계 규칙 (반드시 준수)
1. **제목 형식**: 반드시 "${input.companyName} ${input.roleName} 지원 대비 시뮬레이션" 형태로 짓습니다. 이 시뮬레이션은 ${input.companyName}가 공식 제작·승인한 것이 아니라, 공개 채용공고를 참고해 만든 '지원 대비용' 콘텐츠입니다.
2. **기업 사칭 금지**: "우리 회사는", "저희 ${input.companyName}는" 같은 기업 1인칭 화법을 절대 쓰지 마세요. 상황 안내는 "당신은 ~팀의 신입입니다" 같은 중립적 3인칭 설정으로 씁니다. 실제 기업 내부 정보를 지어내지 말고, JD에 드러난 업무 성격만 활용하세요.
3. **평가 기준 추출**: JD의 주요업무·자격요건·우대사항에서 이 직무가 실제로 평가하는 핵심 역량 3~5개를 뽑고, 각 기준이 어느 JD 문구(어느 출처)에서 나왔는지 인용합니다.
4. **스텝 구성**: 3~4개 단계로 나눕니다. 각 단계는 앞 단계 결과 위에 쌓이는 하나의 업무 흐름이어야 합니다(예: 진단 → 가설 → 실행안 → 정리). 각 단계에는 질문을 정확히 1개만 둡니다.
5. **제공 자료**: 각 단계의 materials에는 JD에 근거해 만든 현실적인 가상 데이터(표, 지표, 짧은 문서)를 넣어 지원자가 근거를 가지고 답하게 합니다. 마크다운 표를 적극 활용하세요.
6. **난이도**: 실무 경험이 없는 초심자도 참고사항의 시간 안에 완수할 수 있는 난이도로 맞춥니다. difficulty는 1~3 사이를 권장합니다.
7. **문체**: 지원자에게 보이는 모든 텍스트(상황·질문·힌트·설명)는 한국어 해요체로 씁니다.
8. **미반영 요건**: 텍스트 과제로 평가하기 어려운 JD 요건(특정 도구 실무, 자격증, 경력 연차 등)은 시뮬레이션에 억지로 넣지 말고 unreflected에 이유와 함께 기록합니다.

반드시 record_simulation_draft 도구를 한 번 호출해 simulation과 rationale을 모두 채워 기록하세요.`;
}

// ============================================================
// 서버 함수
// ============================================================
export const generateSimulationDraft = createServerFn({ method: "POST" })
  .inputValidator(generateInputSchema)
  .handler(async ({ data }): Promise<GeneratedSimulationDraft> => {
    await assertAdmin();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수를 Lovable에 설정해주세요.");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
        max_tokens: 16000,
        tools: [GENERATE_TOOL],
        tool_choice: { type: "tool", name: GENERATE_TOOL_NAME },
        messages: [{ role: "user", content: buildPrompt(data) }],
      }),
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        typeof payload.error === "object" &&
        payload.error !== null &&
        typeof (payload.error as { message?: unknown }).message === "string"
          ? (payload.error as { message: string }).message
          : "AI 생성 요청에 실패했습니다.";
      console.error("Simulation generation request failed:", message);
      throw new Error("AI 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
    if (payload.stop_reason === "max_tokens") {
      throw new Error("생성 결과가 너무 길어요. JD를 줄이거나 다시 시도해주세요.");
    }

    const raw = toolOutputSchema.parse(getToolInput(payload));

    const steps: AdminSimulationStep[] = raw.simulation.steps.map((step, index) => {
      const stepId = `gen-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
      return {
        id: stepId,
        title: step.title.trim(),
        ...(step.durationMin ? { durationMin: step.durationMin } : {}),
        ...(step.difficulty ? { difficulty: step.difficulty } : {}),
        tags: [],
        situation: step.situation.trim(),
        materials: step.materials.trim(),
        hint: step.hint.trim(),
        completionMessage: step.completionMessage.trim(),
        prompts: [
          {
            id: `${stepId}-p1`,
            label: step.title.trim(),
            body: step.question.trim(),
          },
        ],
      };
    });

    return {
      companyName: data.companyName,
      roleName: data.roleName,
      domain: data.domain,
      simulation: {
        title: raw.simulation.title.trim(),
        roleLabel: raw.simulation.roleLabel.trim() || data.roleName,
        description: raw.simulation.description.trim(),
        estimatedMinutes: raw.simulation.estimatedMinutes ?? null,
        steps,
      },
      rationale: {
        criteria: raw.rationale.criteria.map((c) => ({
          title: c.title.trim(),
          sources: c.sources.map((s) => ({ platform: s.platform.trim(), quote: s.quote.trim() })),
          reflectedIn: c.reflectedIn.trim(),
        })),
        unreflected: raw.rationale.unreflected.map((u) => ({
          requirement: u.requirement.trim(),
          reason: u.reason.trim(),
        })),
      },
    };
  });
