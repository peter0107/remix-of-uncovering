import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  COMPANY_AI_PROMPT_DEFAULTS,
  COMPANY_AI_PROMPT_KEYS,
  type CompanyAiPromptKey,
} from "@/lib/ai-prompt.defaults";
import {
  COMPANY_AI_REVIEW_TOOL,
  COMPANY_AI_REVIEW_TOOL_NAME,
  getClaudeAiReviewInput,
} from "@/lib/ai-evaluation";
import { DOMAIN_CATEGORIES } from "@/lib/domain-categories";

export type AdminCompany = {
  id: string;
  code: string;
  uniqueCode: string;
  name: string;
  description: string;
  logoUrl: string;
  roleLabel: string;
  createdAt: string;
};

export type AdminCompanySimulation = {
  id: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  companyDescription: string;
  companyLogoUrl: string;
  title: string;
  roleLabel: string;
  jobFamily: string;
  domain: string;
  estimatedMinutes: number | null;
  cardImageUrl: string;
  description: string;
  simulationFormat: SimulationFormat;
  selectionMode: SelectionMode;
  singleAnswerQuestion: string;
  taskPrompt: string;
  sharedSituation: string;
  sharedMaterials: string;
  steps: AdminSimulationStep[];
  isPublic: boolean;
  deletedAt: string | null;
  createdAt: string;
};

export type SimulationFormat = "single" | "selection";
export type SelectionMode = "separated" | "common";

export type AdminSimulationPrompt = {
  id: string;
  label: string;
  body: string;
};

export type AdminSimulationStep = {
  id: string;
  title: string;
  durationMin?: number;
  difficulty?: number;
  tags?: string[];
  situation?: string;
  materials?: string;
  hint?: string;
  completionMessage?: string;
  prompts: AdminSimulationPrompt[];
};

export type AdminSubmissionAnswer = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  companyName: string;
  companyCode: string;
  simulationTitle: string;
  roleLabel: string;
  responseText: string;
  responseAnswers: Array<{ id: string; label: string; answer: string }>;
  aiChatLog: Array<{ role: "user" | "assistant"; content: string; at: string }>;
  submittedAt: string;
  durationSeconds: number | null;
  isSharedWithCompany: boolean;
  aiReview: AdminSubmissionAiReview | null;
};

export type AdminSubmissionAiReview = {
  simulation: {
    score: number;
    summary: string;
    strengths: string[];
    concerns: string[];
  };
  aiUtilization: {
    score: number;
    summary: string;
    strengths: string[];
    improvements: string[];
  };
  interviewQuestions: Array<{
    category: "시뮬레이션 결과물" | "AI 활용";
    question: string;
    intent: string;
  }>;
  updatedAt: string;
};

export type CompanySimulationFeedback = {
  simulation: {
    id: string;
    title: string;
    roleLabel: string;
    companyName: string;
  };
  submission: {
    id: string;
    responseText: string;
    responseAnswers: Array<{ id: string; label: string; answer: string }>;
    aiChatLog: Array<{ role: "user" | "assistant"; content: string; at: string }>;
    submittedAt: string | null;
  };
  aiReview: AdminSubmissionAiReview | null;
};

export type AdminAiPromptSetting = {
  key: CompanyAiPromptKey;
  label: string;
  description: string;
  prompt: string;
  updatedAt: string | null;
};

export type AdminSimulationPreview = Pick<
  AdminCompanySimulation,
  | "id"
  | "title"
  | "simulationFormat"
  | "selectionMode"
  | "singleAnswerQuestion"
  | "taskPrompt"
  | "sharedSituation"
  | "sharedMaterials"
  | "steps"
  | "estimatedMinutes"
  | "companyName"
  | "roleLabel"
> & {
  simulationSource: "company" | "expert";
  expertNickname: string;
  expertJobTitle: string;
};

const domainCategorySchema = z.enum(DOMAIN_CATEGORIES);
const simulationFormatSchema = z.enum(["single", "selection"]);
const selectionModeSchema = z.enum(["separated", "common"]);

const createCompanyInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(4),
  description: z.string().max(200).optional().default(""),
  logoUrl: z.string().optional().default(""),
  roleLabel: z.string().optional().default(""),
});

const updateCompanyInputSchema = createCompanyInputSchema.extend({
  id: z.string().uuid(),
});

const companyIdInputSchema = z.object({
  id: z.string().uuid(),
});

const createCompanySimulationInputSchema = z.object({
  companyCode: z.string().min(1),
  title: z.string().min(1),
  roleLabel: z.string().min(1),
  description: z.string().optional().default(""),
  cardImageUrl: z.string().optional().default(""),
  jobFamily: z.string().optional().default(""),
  domain: domainCategorySchema,
  estimatedMinutes: z.number().int().positive().nullable().optional().default(null),
  simulationFormat: simulationFormatSchema.optional().default("single"),
  selectionMode: selectionModeSchema.optional().default("separated"),
  singleAnswerQuestion: z.string().optional().default(""),
  taskPrompt: z.string().optional().default(""),
  sharedSituation: z.string().optional().default(""),
  sharedMaterials: z.string().optional().default(""),
  steps: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        durationMin: z.number().int().positive().optional(),
        difficulty: z.number().int().min(1).max(5).optional(),
        tags: z.array(z.string().min(1)).optional(),
        situation: z.string().optional(),
        materials: z.string().optional(),
        hint: z.string().optional(),
        completionMessage: z.string().optional(),
        prompts: z
          .array(
            z.object({
              id: z.string().min(1),
              label: z.string().min(1),
              body: z.string().optional().default(""),
            }),
          )
          .max(1),
      }),
    )
    .default([]),
});

const updateCompanySimulationInputSchema = createCompanySimulationInputSchema.extend({
  id: z.string().uuid(),
});

const simulationIdInputSchema = z.object({
  id: z.string().uuid(),
});

const simulationVisibilityInputSchema = simulationIdInputSchema.extend({
  isPublic: z.boolean(),
});

const companySimulationCardImageInputSchema = z.object({
  companyCode: z.string().min(1),
  cardImageUrl: z.string().min(1),
});

const adminAiPromptSettingsInputSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.enum(COMPANY_AI_PROMPT_KEYS),
        prompt: z.string().trim().min(1).max(30000),
      }),
    )
    .min(1),
});

const adminSubmissionIdInputSchema = z.object({ submissionId: z.string().uuid() });
const adminSubmissionAiReviewSchema = z.object({
  simulation: z.object({
    score: z.number().int().min(0).max(100),
    summary: z.string().max(10000),
    strengths: z.array(z.string().max(2000)).max(20),
    concerns: z.array(z.string().max(2000)).max(20),
  }),
  aiUtilization: z.object({
    score: z.number().int().min(0).max(100),
    summary: z.string().max(10000),
    strengths: z.array(z.string().max(2000)).max(20),
    improvements: z.array(z.string().max(2000)).max(20),
  }),
  interviewQuestions: z.array(
    z.object({
      category: z.enum(["시뮬레이션 결과물", "AI 활용"]),
      question: z.string().max(3000),
      intent: z.string().max(3000),
    }),
  ).max(20),
});
const updateAdminSubmissionAiReviewInputSchema = adminSubmissionIdInputSchema.extend({
  analysis: adminSubmissionAiReviewSchema,
});
const companySimulationFeedbackInputSchema = z.object({
  simulationId: z.string().uuid(),
  submissionId: z.string().uuid().optional(),
});

function createPublicServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Backend is not configured");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getBearerToken(): string {
  const request = getRequest();
  const authHeader = request?.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("로그인이 필요합니다.");
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    throw new Error("로그인이 필요합니다.");
  }
  return token;
}

async function getCurrentUserId() {
  const token = getBearerToken();
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("로그인이 필요합니다.");
  return data.user.id;
}

async function assertAdmin() {
  const token = getBearerToken();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    throw new Error("ADMIN_EMAILS 환경변수가 필요합니다.");
  }

  const supabase = createPublicServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();

  if (error || !email || !adminEmails.includes(email)) {
    throw new Error("관리자 권한이 없습니다.");
  }
}

function formatDateTime(iso: string): string {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

function mapAdminSimulation(row: Record<string, unknown>): AdminCompanySimulation {
  const company = (row.companies ?? {}) as Record<string, unknown>;
  const steps = Array.isArray(row.steps) ? (row.steps as AdminSimulationStep[]) : [];
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    companyCode: String(company.code ?? company.unique_code ?? ""),
    companyName: String(company.name ?? ""),
    companyDescription: String(company.description ?? ""),
    companyLogoUrl: String(company.logo_url ?? ""),
    title: String(row.title),
    roleLabel: String(row.role_label ?? row.job_family ?? row.title),
    jobFamily: String(row.job_family ?? ""),
    domain: String(row.domain ?? ""),
    estimatedMinutes: typeof row.estimated_minutes === "number" ? row.estimated_minutes : null,
    cardImageUrl: String(row.card_image_url ?? ""),
    description: String(row.description ?? ""),
    simulationFormat:
      row.simulation_format === "selection" ||
      (row.simulation_format !== "single" && steps.length > 0)
        ? "selection"
        : "single",
    selectionMode: row.selection_mode === "common" ? "common" : "separated",
    singleAnswerQuestion: String(row.single_answer_question ?? ""),
    taskPrompt: String(row.task_prompt ?? ""),
    sharedSituation: String(row.shared_situation ?? ""),
    sharedMaterials: String(row.shared_materials ?? ""),
    steps,
    isPublic: row.is_public !== false,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    createdAt: formatDateTime(String(row.created_at)),
  };
}

function mapAdminCompany(row: Record<string, unknown>): AdminCompany {
  const code = String(row.code ?? row.unique_code ?? "");
  const name = String(row.name ?? "");
  return {
    id: String(row.id),
    code,
    uniqueCode: String(row.unique_code ?? code),
    name,
    description: String(row.description ?? ""),
    logoUrl: String(row.logo_url ?? ""),
    roleLabel: String(row.role_label ?? name),
    createdAt: formatDateTime(String(row.created_at)),
  };
}

function firstRelation(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] ?? {}) as Record<string, unknown>;
  return (value ?? {}) as Record<string, unknown>;
}

function mapResponseAnswers(value: unknown): AdminSubmissionAnswer["responseAnswers"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rawAnswers = (value as { answers?: unknown }).answers;
  if (!Array.isArray(rawAnswers)) return [];

  return rawAnswers.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    if (typeof row.answer !== "string") return [];
    return [
      {
        id: String(row.id ?? ""),
        label: String(row.label ?? "답변"),
        answer: row.answer,
      },
    ];
  });
}

function mapAiChatLog(value: unknown): AdminSubmissionAnswer["aiChatLog"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const role = row.role;
    const content = row.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return [];
    return [{ role, content, at: typeof row.at === "string" ? row.at : "" }];
  });
}

function mapAdminSubmissionAiReview(
  value: unknown,
  updatedAt: string,
): AdminSubmissionAiReview | null {
  const parsed = adminSubmissionAiReviewSchema.safeParse(value);
  return parsed.success ? { ...parsed.data, updatedAt: formatDateTime(updatedAt) } : null;
}

function mapAdminSubmission(
  row: Record<string, unknown>,
  aiReview: AdminSubmissionAiReview | null,
): AdminSubmissionAnswer {
  const seeker = firstRelation(row.job_seekers);
  const simulation = firstRelation(row.job_simulations);
  const company = firstRelation(simulation.companies);
  const submittedAt = String(row.submitted_at ?? row.created_at ?? new Date(0).toISOString());

  return {
    id: String(row.id),
    applicantName: String(seeker.display_name ?? "이름 미입력"),
    applicantEmail: String(seeker.email ?? ""),
    companyName: String(company.name ?? ""),
    companyCode: String(company.code ?? company.unique_code ?? ""),
    simulationTitle: String(simulation.title ?? ""),
    roleLabel: String(simulation.role_label ?? simulation.job_family ?? simulation.title ?? ""),
    responseText: String(row.response_text ?? ""),
    responseAnswers: mapResponseAnswers(row.response_json),
    aiChatLog: mapAiChatLog(row.ai_chat_log),
    submittedAt: formatDateTime(submittedAt),
    durationSeconds: typeof row.duration_sec === "number" ? row.duration_sec : null,
    isSharedWithCompany: row.answer_transmission_consent === true,
    aiReview,
  };
}

export const getAdminCompanies = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminCompany[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, code, unique_code, name, description, logo_url, role_label, created_at")
      .neq("code", "EXPERT-SIMULATIONS-2026")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load companies:", error);
      throw new Error("Failed to load companies");
    }

    return ((data ?? []) as Record<string, unknown>[]).map(mapAdminCompany);
  },
);

export const getAdminCompanySimulations = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminCompanySimulation[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("job_simulations")
      .select(
        "id, company_id, title, role_label, job_family, domain, estimated_minutes, card_image_url, description, simulation_source, expert_nickname, expert_job_title, simulation_format, selection_mode, single_answer_question, task_prompt, shared_situation, shared_materials, steps, is_public, deleted_at, created_at, companies(code, unique_code, name, description, logo_url)",
      )
      .eq("simulation_source", "company")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load company simulations:", error);
      throw new Error("Failed to load company simulations");
    }

    return ((data ?? []) as Record<string, unknown>[]).map(mapAdminSimulation);
  },
);

export const getAdminSimulationPreview = createServerFn({ method: "GET" })
  .inputValidator(simulationIdInputSchema)
  .handler(async ({ data }): Promise<AdminSimulationPreview> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("job_simulations")
      .select(
        "id, company_id, title, role_label, job_family, domain, estimated_minutes, card_image_url, description, simulation_source, expert_nickname, expert_job_title, simulation_format, selection_mode, single_answer_question, task_prompt, shared_situation, shared_materials, steps, is_public, deleted_at, created_at, companies(code, unique_code, name, description, logo_url)",
      )
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !row) {
      console.error("Failed to load simulation preview:", error);
      throw new Error("시뮬레이션 미리보기를 불러오지 못했습니다.");
    }

    const simulation = mapAdminSimulation(row as Record<string, unknown>);
    return {
      id: simulation.id,
      title: simulation.title,
      simulationFormat: simulation.simulationFormat,
      selectionMode: simulation.selectionMode,
      singleAnswerQuestion: simulation.singleAnswerQuestion,
      taskPrompt: simulation.taskPrompt,
      sharedSituation: simulation.sharedSituation,
      sharedMaterials: simulation.sharedMaterials,
      steps: simulation.steps,
      estimatedMinutes: simulation.estimatedMinutes,
      roleLabel: simulation.roleLabel,
      companyName:
        (row as Record<string, unknown>).simulation_source === "expert"
          ? String((row as Record<string, unknown>).expert_nickname ?? "현직자")
          : simulation.companyName,
      simulationSource:
        (row as Record<string, unknown>).simulation_source === "expert" ? "expert" : "company",
      expertNickname: String((row as Record<string, unknown>).expert_nickname ?? ""),
      expertJobTitle: String((row as Record<string, unknown>).expert_job_title ?? ""),
    };
  });

export const getAdminSubmissionAnswers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminSubmissionAnswer[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("submissions")
      .select(
        "id, response_text, response_json, ai_chat_log, duration_sec, submitted_at, created_at, answer_transmission_consent, job_seekers(display_name, email), job_simulations(id, company_id, title, role_label, job_family, companies(name, code, unique_code))",
      )
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Failed to load admin submission answers:", error);
      throw new Error("제출 답변을 불러오지 못했습니다.");
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const submissionIds = rows.map((row) => String(row.id));
    const reviewBySubmission = new Map<string, AdminSubmissionAiReview>();

    if (submissionIds.length > 0) {
      const { data: reviews, error: reviewError } = await supabaseAdmin
        .from("company_simulation_ai_reviews")
        .select("applicant_id, analysis, created_at, updated_at")
        .in("applicant_id", submissionIds);
      if (reviewError) throw new Error("AI 평가 결과를 불러오지 못했습니다.");

      for (const review of reviews ?? []) {
        const parsed = mapAdminSubmissionAiReview(
          review.analysis,
          String(review.updated_at ?? review.created_at ?? ""),
        );
        if (parsed) reviewBySubmission.set(String(review.applicant_id), parsed);
      }
    }

    return rows.map((row) => mapAdminSubmission(row, reviewBySubmission.get(String(row.id)) ?? null));
  },
);

export const getCompanySimulationFeedback = createServerFn({ method: "GET" })
  .inputValidator(companySimulationFeedbackInputSchema)
  .handler(async ({ data }): Promise<CompanySimulationFeedback> => {
    const userId = await getCurrentUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: simulation, error: simulationError } = await supabaseAdmin
      .from("job_simulations")
      .select("id, company_id, title, role_label, job_family, companies(name)")
      .eq("id", data.simulationId)
      .eq("simulation_source", "company")
      .is("deleted_at", null)
      .maybeSingle();
    if (simulationError || !simulation) throw new Error("시뮬레이션을 찾을 수 없습니다.");

    let submissionQuery = supabaseAdmin
      .from("submissions")
      .select("id, response_text, response_json, ai_chat_log, submitted_at")
      .eq("job_simulation_id", data.simulationId)
      .eq("job_seeker_id", userId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(1);
    if (data.submissionId) submissionQuery = submissionQuery.eq("id", data.submissionId);

    const { data: submissions, error: submissionError } = await submissionQuery;
    const submission = submissions?.[0];
    if (submissionError || !submission) throw new Error("제출 기록을 찾을 수 없습니다.");

    const { data: review, error: reviewError } = await supabaseAdmin
      .from("company_simulation_ai_reviews")
      .select("analysis, created_at, updated_at")
      .eq("company_id", simulation.company_id)
      .eq("applicant_id", submission.id)
      .maybeSingle();
    if (reviewError) throw new Error("AI 평가 결과를 불러오지 못했습니다.");

    const company = firstRelation(simulation.companies);
    return {
      simulation: {
        id: String(simulation.id),
        title: String(simulation.title ?? ""),
        roleLabel: String(simulation.role_label ?? simulation.job_family ?? simulation.title ?? ""),
        companyName: String(company.name ?? ""),
      },
      submission: {
        id: String(submission.id),
        responseText: String(submission.response_text ?? ""),
        responseAnswers: mapResponseAnswers(submission.response_json),
        aiChatLog: mapAiChatLog(submission.ai_chat_log),
        submittedAt: submission.submitted_at ? String(submission.submitted_at) : null,
      },
      aiReview: review
        ? mapAdminSubmissionAiReview(
            review.analysis,
            String(review.updated_at ?? review.created_at ?? ""),
          )
        : null,
    };
  });

export const evaluateAdminSubmissionWithAi = createServerFn({ method: "POST" })
  .inputValidator(adminSubmissionIdInputSchema)
  .handler(async ({ data }): Promise<AdminSubmissionAiReview> => {
    await assertAdmin();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수를 Lovable에 설정해주세요.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("submissions")
      .select(
        "id, response_text, response_json, ai_chat_log, job_simulations(company_id, title, role_label, job_family)",
      )
      .eq("id", data.submissionId)
      .not("submitted_at", "is", null)
      .maybeSingle();
    if (submissionError || !submission) throw new Error("제출 답변을 찾을 수 없습니다.");

    const simulation = firstRelation(submission.job_simulations);
    const companyId = String(simulation.company_id ?? "");
    if (!companyId) throw new Error("시뮬레이션 연결 정보를 찾을 수 없습니다.");

    const { data: prompts, error: promptError } = await supabaseAdmin
      .from("ai_prompt_settings")
      .select("key, prompt")
      .in("key", [...COMPANY_AI_PROMPT_KEYS]);
    if (promptError) throw new Error("AI 프롬프트 설정을 불러오지 못했습니다.");

    const promptByKey = new Map(
      (prompts ?? []).map((prompt) => [String(prompt.key), String(prompt.prompt ?? "")]),
    );
    const getPrompt = (key: CompanyAiPromptKey) =>
      promptByKey.get(key)?.trim() || COMPANY_AI_PROMPT_DEFAULTS[key].prompt;
    const material = {
      simulationTitle: String(simulation.title ?? ""),
      roleLabel: String(simulation.role_label ?? simulation.job_family ?? simulation.title ?? ""),
      responseText: String(submission.response_text ?? ""),
      responseAnswers: mapResponseAnswers(submission.response_json),
      aiAssistantChatLog: mapAiChatLog(submission.ai_chat_log),
    };
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
        max_tokens: 8000,
        tools: [COMPANY_AI_REVIEW_TOOL],
        tool_choice: { type: "tool", name: COMPANY_AI_REVIEW_TOOL_NAME },
        messages: [
          {
            role: "user",
            content: `[1. 시뮬레이션 결과물 평가 프롬프트]\n${getPrompt("company_simulation_result_review")}\n\n[2. AI 활용 능력 평가 프롬프트]\n${getPrompt("company_ai_utilization_review")}\n\n[3. 면접 질문 추천 프롬프트]\n${getPrompt("company_interview_question_recommendation")}\n\n공통 규칙:\n- 제공된 결과물과 AI 대화 로그 안에서 확인되는 내용만 평가하세요.\n- 채용 합격/불합격을 판단하지 마세요.\n- 반드시 simulation, aiUtilization, interviewQuestions 세 필드를 모두 포함하여 record_ai_review 도구를 한 번의 호출로 기록하세요. interviewQuestions는 최소 1개 이상 작성하고, 자료가 부족하면 빈 배열이라도 반드시 필드를 포함하세요.\n\n평가 자료:\n${JSON.stringify(material).slice(0, 30000)}`,
          },
        ],
      }),
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        typeof payload.error === "object" &&
        payload.error !== null &&
        typeof (payload.error as { message?: unknown }).message === "string"
          ? (payload.error as { message: string }).message
          : "AI 평가 요청에 실패했습니다.";
      throw new Error(message);
    }
    if (payload.stop_reason === "max_tokens") {
      throw new Error("AI 평가 응답이 길이 제한을 초과했습니다. 다시 시도해주세요.");
    }

    const analysis = adminSubmissionAiReviewSchema.parse(getClaudeAiReviewInput(payload));
    const now = new Date().toISOString();
    const { data: saved, error: saveError } = await supabaseAdmin
      .from("company_simulation_ai_reviews")
      .upsert(
        {
          company_id: companyId,
          applicant_id: submission.id,
          analysis,
          updated_at: now,
        },
        { onConflict: "company_id,applicant_id" },
      )
      .select("created_at, updated_at")
      .single();
    if (saveError || !saved) throw new Error("AI 평가 결과를 저장하지 못했습니다.");

    return {
      ...analysis,
      updatedAt: formatDateTime(String(saved.updated_at ?? saved.created_at ?? now)),
    };
  });

export const updateAdminSubmissionAiReview = createServerFn({ method: "POST" })
  .inputValidator(updateAdminSubmissionAiReviewInputSchema)
  .handler(async ({ data }): Promise<AdminSubmissionAiReview> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("submissions")
      .select("id, job_simulations(company_id)")
      .eq("id", data.submissionId)
      .not("submitted_at", "is", null)
      .maybeSingle();
    if (submissionError || !submission) throw new Error("제출 답변을 찾을 수 없습니다.");

    const companyId = String(firstRelation(submission.job_simulations).company_id ?? "");
    if (!companyId) throw new Error("시뮬레이션 연결 정보를 찾을 수 없습니다.");

    const now = new Date().toISOString();
    const { data: saved, error: saveError } = await supabaseAdmin
      .from("company_simulation_ai_reviews")
      .upsert(
        {
          company_id: companyId,
          applicant_id: submission.id,
          analysis: data.analysis,
          updated_at: now,
        },
        { onConflict: "company_id,applicant_id" },
      )
      .select("created_at, updated_at")
      .single();
    if (saveError || !saved) throw new Error("AI 평가 결과를 저장하지 못했습니다.");

    return {
      ...data.analysis,
      updatedAt: formatDateTime(String(saved.updated_at ?? saved.created_at ?? now)),
    };
  });

export const getAdminAiPromptSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminAiPromptSetting[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ai_prompt_settings")
      .select("key, prompt, updated_at")
      .in("key", [...COMPANY_AI_PROMPT_KEYS]);

    if (error) {
      console.error("Failed to load AI prompt setting:", error);
      throw new Error(
        "AI 프롬프트 설정을 불러오지 못했습니다. SQL migration 적용 여부를 확인해주세요.",
      );
    }

    const rows = new Map(
      ((data ?? []) as Array<{ key: string; prompt: string; updated_at: string | null }>).map(
        (row) => [row.key, row],
      ),
    );

    return COMPANY_AI_PROMPT_KEYS.map((key) => {
      const defaultSetting = COMPANY_AI_PROMPT_DEFAULTS[key];
      const saved = rows.get(key);
      return {
        key,
        label: defaultSetting.label,
        description: defaultSetting.description,
        prompt: saved?.prompt ?? defaultSetting.prompt,
        updatedAt: saved?.updated_at ? formatDateTime(saved.updated_at) : null,
      };
    });
  },
);

export const saveAdminAiPromptSettings = createServerFn({ method: "POST" })
  .inputValidator(adminAiPromptSettingsInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("ai_prompt_settings").upsert(
      data.settings.map((setting) => ({
        key: setting.key,
        prompt: setting.prompt,
        updated_at: now,
      })),
      { onConflict: "key" },
    );

    if (error) {
      console.error("Failed to save AI prompt setting:", error);
      throw new Error("AI 프롬프트를 저장하지 못했습니다. SQL migration 적용 여부를 확인해주세요.");
    }

    return { ok: true };
  });

export const createCompany = createServerFn({ method: "POST" })
  .inputValidator(createCompanyInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    const description = data.description.trim();
    const logoUrl = data.logoUrl.trim();
    const roleLabel = data.roleLabel.trim() || name;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .or(`code.eq.${code},unique_code.eq.${code}`)
      .maybeSingle();

    if (existingError) {
      console.error("Failed to check company code:", existingError);
      throw new Error("Failed to check company code");
    }

    if (existing) {
      throw new Error("이미 사용 중인 기업 코드입니다.");
    }

    const { data: row, error } = await supabaseAdmin
      .from("companies")
      .insert({
        name,
        code,
        unique_code: code,
        description,
        logo_url: logoUrl || null,
        role_label: roleLabel,
      })
      .select("id, code, unique_code, name, description, logo_url, role_label, created_at")
      .single();

    if (error) {
      console.error("Failed to create company:", error);
      throw new Error("Failed to create company");
    }

    return mapAdminCompany(row as Record<string, unknown>);
  });

export const updateCompany = createServerFn({ method: "POST" })
  .inputValidator(updateCompanyInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    const description = data.description.trim();
    const logoUrl = data.logoUrl.trim();
    const roleLabel = data.roleLabel.trim() || name;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .or(`code.eq.${code},unique_code.eq.${code}`)
      .neq("id", data.id)
      .maybeSingle();

    if (existingError) {
      console.error("Failed to check company code:", existingError);
      throw new Error("Failed to check company code");
    }

    if (existing) {
      throw new Error("이미 사용 중인 기업 코드입니다.");
    }

    const { data: row, error } = await supabaseAdmin
      .from("companies")
      .update({
        name,
        code,
        unique_code: code,
        description,
        logo_url: logoUrl || null,
        role_label: roleLabel,
      })
      .eq("id", data.id)
      .select("id, code, unique_code, name, description, logo_url, role_label, created_at")
      .single();

    if (error) {
      console.error("Failed to update company:", error);
      throw new Error("Failed to update company");
    }

    return mapAdminCompany(row as Record<string, unknown>);
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .inputValidator(companyIdInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("companies").delete().eq("id", data.id);

    if (error) {
      console.error("Failed to delete company:", error);
      throw new Error("Failed to delete company");
    }

    return { ok: true };
  });

export const createCompanySimulation = createServerFn({ method: "POST" })
  .inputValidator(createCompanySimulationInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const jobFamily = data.jobFamily.trim() || data.roleLabel.trim();

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("code", data.companyCode)
      .single();

    if (companyError || !company) {
      throw new Error("Invalid company code");
    }

    const { data: row, error } = await supabaseAdmin
      .from("job_simulations")
      .insert({
        company_id: company.id,
        title: data.title,
        role_label: data.roleLabel,
        description: data.description,
        card_image_url: data.cardImageUrl.trim() || null,
        job_family: jobFamily,
        domain: data.domain,
        estimated_minutes: data.estimatedMinutes,
        simulation_format: data.simulationFormat,
        selection_mode: data.selectionMode,
        single_answer_question: data.singleAnswerQuestion.trim() || null,
        task_prompt: data.taskPrompt,
        shared_situation: data.sharedSituation.trim(),
        shared_materials: data.sharedMaterials.trim(),
        steps: data.steps,
        is_public: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create company simulation:", error);
      throw new Error("Failed to create company simulation");
    }

    return { ok: true, id: row.id as string };
  });

export const updateCompanySimulation = createServerFn({ method: "POST" })
  .inputValidator(updateCompanySimulationInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const jobFamily = data.jobFamily.trim() || data.roleLabel.trim();

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("code", data.companyCode)
      .single();

    if (companyError || !company) {
      throw new Error("Invalid company code");
    }

    const { error } = await supabaseAdmin
      .from("job_simulations")
      .update({
        company_id: company.id,
        title: data.title,
        role_label: data.roleLabel,
        description: data.description,
        card_image_url: data.cardImageUrl.trim() || null,
        job_family: jobFamily,
        domain: data.domain,
        estimated_minutes: data.estimatedMinutes,
        simulation_format: data.simulationFormat,
        selection_mode: data.selectionMode,
        single_answer_question: data.singleAnswerQuestion.trim() || null,
        task_prompt: data.taskPrompt,
        shared_situation: data.sharedSituation.trim(),
        shared_materials: data.sharedMaterials.trim(),
        steps: data.steps,
      })
      .eq("id", data.id);

    if (error) {
      console.error("Failed to update company simulation:", error);
      throw new Error("Failed to update company simulation");
    }

    return { ok: true };
  });

export const setCompanySimulationVisibility = createServerFn({ method: "POST" })
  .inputValidator(simulationVisibilityInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("job_simulations")
      .update({ is_public: data.isPublic })
      .eq("id", data.id)
      .is("deleted_at", null);

    if (error) {
      console.error("Failed to update simulation visibility:", error);
      throw new Error("Failed to update simulation visibility");
    }

    return { ok: true };
  });

export const setCompanySimulationCardImage = createServerFn({ method: "POST" })
  .inputValidator(companySimulationCardImageInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("code", data.companyCode)
      .single();

    if (companyError || !company) {
      throw new Error("Invalid company code");
    }

    const { error } = await supabaseAdmin
      .from("job_simulations")
      .update({ card_image_url: data.cardImageUrl.trim() })
      .eq("company_id", company.id)
      .is("deleted_at", null);

    if (error) {
      console.error("Failed to update company simulation card image:", error);
      throw new Error("기업 시뮬레이션 배경을 저장하지 못했습니다.");
    }

    return { ok: true };
  });

export const deleteCompanySimulation = createServerFn({ method: "POST" })
  .inputValidator(simulationIdInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 연결된 제출 데이터가 있으면 함께 삭제 (외래키 제약 회피)
    const { error: subError } = await supabaseAdmin
      .from("submissions")
      .delete()
      .eq("job_simulation_id", data.id);

    if (subError) {
      console.error("Failed to delete related submissions:", subError);
      throw new Error("Failed to delete related submissions");
    }

    const { error } = await supabaseAdmin.from("job_simulations").delete().eq("id", data.id);

    if (error) {
      console.error("Failed to delete simulation:", error);
      throw new Error("Failed to delete simulation");
    }

    return { ok: true };
  });
