import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { DOMAIN_CATEGORIES } from "@/lib/domain-categories";
import type {
  AdminSimulationPrompt,
  AdminSimulationStep,
  SimulationFormat,
} from "@/lib/simulations.functions";

export const EXPERT_SIMULATION_COMPANY_CODE = "EXPERT-SIMULATIONS-2026";

export const EXPERT_COMPANY_TYPES = [
  "대기업",
  "중견기업",
  "스타트업",
  "외국계",
  "공공기관",
  "기타",
] as const;
export const EXPERT_EXPERIENCE_BANDS = ["1~2년차", "3~5년차", "6~10년차", "10년차 이상"] as const;

export type AdminExpertSimulation = {
  id: string;
  title: string;
  roleLabel: string;
  description: string;
  domain: string;
  estimatedMinutes: number | null;
  simulationFormat: SimulationFormat;
  singleAnswerQuestion: string;
  taskPrompt: string;
  steps: AdminSimulationStep[];
  isPublic: boolean;
  nickname: string;
  companyType: (typeof EXPERT_COMPANY_TYPES)[number];
  experienceBand: (typeof EXPERT_EXPERIENCE_BANDS)[number];
  jobTitle: string;
  cardBackgroundColor: string;
  cardTextColor: string;
  modelAnswer: string;
  aiFeedback: string;
  createdAt: string;
};

export type ExpertSimulationFeedback = {
  simulation: {
    id: string;
    title: string;
    roleLabel: string;
    nickname: string;
    companyType: string;
    experienceBand: string;
    jobTitle: string;
    modelAnswer: string;
    aiFeedback: string;
  };
  submission: {
    id: string;
    responseText: string;
    responseAnswers: Array<{ id: string; label: string; answer: string }>;
    aiChatLog: Array<{ role: "user" | "assistant"; content: string; at: string }>;
    submittedAt: string | null;
  };
};

const domainCategorySchema = z.enum(DOMAIN_CATEGORIES);
const simulationFormatSchema = z.enum(["single", "selection"]);
const expertCompanyTypeSchema = z.enum(EXPERT_COMPANY_TYPES);
const expertExperienceBandSchema = z.enum(EXPERT_EXPERIENCE_BANDS);
const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const stepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  durationMin: z.number().int().positive().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string().min(1)).optional(),
  situation: z.string().optional(),
  materials: z.string().optional(),
  hint: z.string().optional(),
  completionMessage: z.string().optional(),
  prompts: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      body: z.string().optional().default(""),
    }),
  ),
});

const expertSimulationInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  roleLabel: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().default(""),
  domain: domainCategorySchema,
  estimatedMinutes: z.number().int().positive().nullable().optional().default(null),
  simulationFormat: simulationFormatSchema.optional().default("single"),
  singleAnswerQuestion: z.string().optional().default(""),
  taskPrompt: z.string().optional().default(""),
  steps: z.array(stepSchema).default([]),
  nickname: z.string().trim().min(1).max(60),
  companyType: expertCompanyTypeSchema,
  experienceBand: expertExperienceBandSchema,
  jobTitle: z.string().trim().min(1).max(100),
  cardBackgroundColor: hexColorSchema.default("#ffffff"),
  cardTextColor: hexColorSchema.default("#18181b"),
  modelAnswer: z.string().optional().default(""),
  aiFeedback: z.string().optional().default(""),
});

const updateExpertSimulationInputSchema = expertSimulationInputSchema.extend({
  id: z.string().uuid(),
});

const expertSimulationIdSchema = z.object({ id: z.string().uuid() });
const expertSimulationVisibilitySchema = expertSimulationIdSchema.extend({ isPublic: z.boolean() });
const expertFeedbackInputSchema = z.object({
  simulationId: z.string().uuid(),
  submissionId: z.string().uuid().optional(),
});

function createPublicServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Backend is not configured");

  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getBearerToken() {
  const authorization = getRequest()?.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Error("로그인이 필요합니다.");
  return authorization.slice("Bearer ".length).trim();
}

async function getCurrentUserId() {
  const token = getBearerToken();
  const client = createPublicServerClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("로그인이 필요합니다.");
  return data.user.id;
}

async function assertAdmin() {
  const token = getBearerToken();
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) throw new Error("ADMIN_EMAILS 환경변수가 필요합니다.");

  const client = createPublicServerClient();
  const { data, error } = await client.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !emails.includes(email)) throw new Error("관리자 권한이 없습니다.");
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function mapSteps(value: unknown): AdminSimulationStep[] {
  return Array.isArray(value) ? (value as AdminSimulationStep[]) : [];
}

function mapExpertSimulation(row: Record<string, unknown>): AdminExpertSimulation {
  const steps = mapSteps(row.steps);
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    roleLabel: String(row.role_label ?? row.job_family ?? row.title ?? ""),
    description: String(row.description ?? ""),
    domain: String(row.domain ?? ""),
    estimatedMinutes: typeof row.estimated_minutes === "number" ? row.estimated_minutes : null,
    simulationFormat:
      row.simulation_format === "selection" ||
      (row.simulation_format !== "single" && steps.length > 0)
        ? "selection"
        : "single",
    singleAnswerQuestion: String(row.single_answer_question ?? ""),
    taskPrompt: String(row.task_prompt ?? ""),
    steps,
    isPublic: row.is_public === true,
    nickname: String(row.expert_nickname ?? ""),
    companyType: (EXPERT_COMPANY_TYPES.includes(
      row.expert_company_type as (typeof EXPERT_COMPANY_TYPES)[number],
    )
      ? row.expert_company_type
      : "기타") as (typeof EXPERT_COMPANY_TYPES)[number],
    experienceBand: (EXPERT_EXPERIENCE_BANDS.includes(
      row.expert_experience_band as (typeof EXPERT_EXPERIENCE_BANDS)[number],
    )
      ? row.expert_experience_band
      : "1~2년차") as (typeof EXPERT_EXPERIENCE_BANDS)[number],
    jobTitle: String(row.expert_job_title ?? ""),
    cardBackgroundColor: String(row.card_background_color ?? "#ffffff"),
    cardTextColor: String(row.card_text_color ?? "#18181b"),
    modelAnswer: String(row.expert_model_answer ?? ""),
    aiFeedback: String(row.expert_ai_feedback ?? ""),
    createdAt: formatDateTime(String(row.created_at ?? "")),
  };
}

async function getExpertCompanyId() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("code", EXPERT_SIMULATION_COMPANY_CODE)
    .maybeSingle();

  if (error) throw new Error("현직자 시뮬레이션 정보를 불러오지 못했습니다.");
  if (data?.id) return data.id;

  const { data: created, error: createError } = await supabaseAdmin
    .from("companies")
    .insert({
      name: "현직자 제시 시뮬레이션",
      code: EXPERT_SIMULATION_COMPANY_CODE,
      unique_code: EXPERT_SIMULATION_COMPANY_CODE,
      role_label: "현직자 제시",
      description: "",
    })
    .select("id")
    .single();
  if (createError || !created) throw new Error("현직자 시뮬레이션 정보를 만들지 못했습니다.");
  return created.id;
}

export const getAdminExpertSimulations = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminExpertSimulation[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("job_simulations")
      .select(
        "id, title, role_label, job_family, description, domain, estimated_minutes, simulation_format, single_answer_question, task_prompt, steps, is_public, expert_nickname, expert_company_type, expert_experience_band, expert_job_title, card_background_color, card_text_color, expert_model_answer, expert_ai_feedback, created_at",
      )
      .eq("simulation_source", "expert")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error("현직자 시뮬레이션을 불러오지 못했습니다.");
    return ((data ?? []) as Record<string, unknown>[]).map(mapExpertSimulation);
  },
);

export const createExpertSimulation = createServerFn({ method: "POST" })
  .inputValidator(expertSimulationInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const companyId = await getExpertCompanyId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin
      .from("job_simulations")
      .insert({
        company_id: companyId,
        title: data.title,
        role_label: data.roleLabel,
        job_family: data.roleLabel,
        description: data.description || null,
        domain: data.domain,
        estimated_minutes: data.estimatedMinutes,
        simulation_format: data.simulationFormat,
        single_answer_question: data.singleAnswerQuestion || null,
        task_prompt: data.taskPrompt || null,
        steps: data.steps,
        simulation_source: "expert",
        expert_nickname: data.nickname,
        expert_company_type: data.companyType,
        expert_experience_band: data.experienceBand,
        expert_job_title: data.jobTitle,
        card_background_color: data.cardBackgroundColor,
        card_text_color: data.cardTextColor,
        expert_model_answer: data.modelAnswer || null,
        expert_ai_feedback: data.aiFeedback || null,
        is_public: false,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error("현직자 시뮬레이션을 추가하지 못했습니다.");
    return { id: created.id as string };
  });

export const updateExpertSimulation = createServerFn({ method: "POST" })
  .inputValidator(updateExpertSimulationInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("job_simulations")
      .update({
        title: data.title,
        role_label: data.roleLabel,
        job_family: data.roleLabel,
        description: data.description || null,
        domain: data.domain,
        estimated_minutes: data.estimatedMinutes,
        simulation_format: data.simulationFormat,
        single_answer_question: data.singleAnswerQuestion || null,
        task_prompt: data.taskPrompt || null,
        steps: data.steps,
        expert_nickname: data.nickname,
        expert_company_type: data.companyType,
        expert_experience_band: data.experienceBand,
        expert_job_title: data.jobTitle,
        card_background_color: data.cardBackgroundColor,
        card_text_color: data.cardTextColor,
        expert_model_answer: data.modelAnswer || null,
        expert_ai_feedback: data.aiFeedback || null,
      })
      .eq("id", data.id)
      .eq("simulation_source", "expert")
      .is("deleted_at", null);
    if (error) throw new Error("현직자 시뮬레이션을 수정하지 못했습니다.");
    return { ok: true };
  });

export const setExpertSimulationVisibility = createServerFn({ method: "POST" })
  .inputValidator(expertSimulationVisibilitySchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("job_simulations")
      .update({ is_public: data.isPublic })
      .eq("id", data.id)
      .eq("simulation_source", "expert")
      .is("deleted_at", null);
    if (error) throw new Error("공개 상태를 수정하지 못했습니다.");
    return { ok: true };
  });

export const deleteExpertSimulation = createServerFn({ method: "POST" })
  .inputValidator(expertSimulationIdSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: submissionError } = await supabaseAdmin
      .from("submissions")
      .delete()
      .eq("job_simulation_id", data.id);
    if (submissionError) throw new Error("연결된 제출 데이터를 삭제하지 못했습니다.");

    const { error } = await supabaseAdmin
      .from("job_simulations")
      .delete()
      .eq("id", data.id)
      .eq("simulation_source", "expert");
    if (error) throw new Error("현직자 시뮬레이션을 삭제하지 못했습니다.");
    return { ok: true };
  });

function mapResponseAnswers(
  value: unknown,
): ExpertSimulationFeedback["submission"]["responseAnswers"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const answers = (value as { answers?: unknown }).answers;
  if (!Array.isArray(answers)) return [];
  return answers.flatMap((answer) => {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return [];
    const row = answer as Record<string, unknown>;
    if (typeof row.answer !== "string") return [];
    return [{ id: String(row.id ?? ""), label: String(row.label ?? "답변"), answer: row.answer }];
  });
}

function mapAiChatLog(value: unknown): ExpertSimulationFeedback["submission"]["aiChatLog"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((message) => {
    if (!message || typeof message !== "object" || Array.isArray(message)) return [];
    const row = message as Record<string, unknown>;
    if ((row.role !== "user" && row.role !== "assistant") || typeof row.content !== "string")
      return [];
    return [{ role: row.role, content: row.content, at: typeof row.at === "string" ? row.at : "" }];
  });
}

export const getExpertSimulationFeedback = createServerFn({ method: "GET" })
  .inputValidator(expertFeedbackInputSchema)
  .handler(async ({ data }): Promise<ExpertSimulationFeedback> => {
    const userId = await getCurrentUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: simulation, error: simulationError } = await supabaseAdmin
      .from("job_simulations")
      .select(
        "id, title, role_label, expert_nickname, expert_company_type, expert_experience_band, expert_job_title, expert_model_answer, expert_ai_feedback",
      )
      .eq("id", data.simulationId)
      .eq("simulation_source", "expert")
      .maybeSingle();
    if (simulationError || !simulation) throw new Error("현직자 시뮬레이션을 찾을 수 없습니다.");

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

    return {
      simulation: {
        id: String(simulation.id),
        title: String(simulation.title),
        roleLabel: String(simulation.role_label ?? simulation.title),
        nickname: String(simulation.expert_nickname ?? "현직자"),
        companyType: String(simulation.expert_company_type ?? ""),
        experienceBand: String(simulation.expert_experience_band ?? ""),
        jobTitle: String(simulation.expert_job_title ?? ""),
        modelAnswer: String(simulation.expert_model_answer ?? ""),
        aiFeedback: String(simulation.expert_ai_feedback ?? ""),
      },
      submission: {
        id: String(submission.id),
        responseText: String(submission.response_text ?? ""),
        responseAnswers: mapResponseAnswers(submission.response_json),
        aiChatLog: mapAiChatLog(submission.ai_chat_log),
        submittedAt: submission.submitted_at ? String(submission.submitted_at) : null,
      },
    };
  });
