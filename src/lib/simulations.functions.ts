import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  COMPANY_SIMULATION_AI_REVIEW_PROMPT_KEY,
  DEFAULT_COMPANY_SIMULATION_AI_REVIEW_PROMPT,
} from "@/lib/ai-prompt.defaults";
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
  singleAnswerQuestion: string;
  taskPrompt: string;
  steps: AdminSimulationStep[];
  isPublic: boolean;
  deletedAt: string | null;
  createdAt: string;
};

export type SimulationFormat = "single" | "selection";

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
};

export type AdminAiPromptSetting = {
  key: typeof COMPANY_SIMULATION_AI_REVIEW_PROMPT_KEY;
  label: string;
  prompt: string;
  updatedAt: string | null;
};

const domainCategorySchema = z.enum(DOMAIN_CATEGORIES);
const simulationFormatSchema = z.enum(["single", "selection"]);

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
  singleAnswerQuestion: z.string().optional().default(""),
  taskPrompt: z.string().optional().default(""),
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
        prompts: z.array(
          z.object({
            id: z.string().min(1),
            label: z.string().min(1),
            body: z.string().optional().default(""),
          }),
        ),
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

const adminAiPromptInputSchema = z.object({
  prompt: z.string().trim().min(1).max(30000),
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
    singleAnswerQuestion: String(row.single_answer_question ?? ""),
    taskPrompt: String(row.task_prompt ?? ""),
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

function mapAdminSubmission(row: Record<string, unknown>): AdminSubmissionAnswer {
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
  };
}

export const getAdminCompanies = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminCompany[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, code, unique_code, name, description, logo_url, role_label, created_at")
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
        "id, company_id, title, role_label, job_family, domain, estimated_minutes, card_image_url, description, simulation_format, single_answer_question, task_prompt, steps, is_public, deleted_at, created_at, companies(code, unique_code, name, description, logo_url)",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load company simulations:", error);
      throw new Error("Failed to load company simulations");
    }

    return ((data ?? []) as Record<string, unknown>[]).map(mapAdminSimulation);
  },
);

export const getAdminSubmissionAnswers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminSubmissionAnswer[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("submissions")
      .select(
        "id, response_text, response_json, ai_chat_log, duration_sec, submitted_at, created_at, answer_transmission_consent, job_seekers(display_name, email), job_simulations(title, role_label, job_family, companies(name, code, unique_code))",
      )
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Failed to load admin submission answers:", error);
      throw new Error("제출 답변을 불러오지 못했습니다.");
    }

    return ((data ?? []) as Record<string, unknown>[]).map(mapAdminSubmission);
  },
);

export const getAdminAiPromptSetting = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminAiPromptSetting> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ai_prompt_settings")
      .select("prompt, updated_at")
      .eq("key", COMPANY_SIMULATION_AI_REVIEW_PROMPT_KEY)
      .maybeSingle();

    if (error) {
      console.error("Failed to load AI prompt setting:", error);
      throw new Error(
        "AI 프롬프트 설정을 불러오지 못했습니다. SQL migration 적용 여부를 확인해주세요.",
      );
    }

    return {
      key: COMPANY_SIMULATION_AI_REVIEW_PROMPT_KEY,
      label: "시뮬레이션 AI 평가 프롬프트",
      prompt: data?.prompt ?? DEFAULT_COMPANY_SIMULATION_AI_REVIEW_PROMPT,
      updatedAt: data?.updated_at ? formatDateTime(data.updated_at) : null,
    };
  },
);

export const saveAdminAiPromptSetting = createServerFn({ method: "POST" })
  .inputValidator(adminAiPromptInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_prompt_settings").upsert(
      {
        key: COMPANY_SIMULATION_AI_REVIEW_PROMPT_KEY,
        prompt: data.prompt,
        updated_at: new Date().toISOString(),
      },
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
        single_answer_question: data.singleAnswerQuestion.trim() || null,
        task_prompt: data.taskPrompt,
        steps: data.steps,
        is_public: true,
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
        single_answer_question: data.singleAnswerQuestion.trim() || null,
        task_prompt: data.taskPrompt,
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

export const deleteCompanySimulation = createServerFn({ method: "POST" })
  .inputValidator(simulationIdInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("job_simulations")
      .update({
        deleted_at: new Date().toISOString(),
        is_public: false,
      })
      .eq("id", data.id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      console.error("Failed to delete simulation:", error);
      throw new Error("Failed to delete simulation");
    }

    return { ok: true };
  });
