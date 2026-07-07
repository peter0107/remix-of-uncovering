import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { DOMAIN_CATEGORIES } from "@/lib/domain-categories";

export type AdminCompany = {
  id: string;
  code: string;
  uniqueCode: string;
  name: string;
  roleLabel: string;
  createdAt: string;
};

export type AdminCompanySimulation = {
  id: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  title: string;
  roleLabel: string;
  jobFamily: string;
  domain: string;
  estimatedMinutes: number | null;
  description: string;
  taskPrompt: string;
  isPublic: boolean;
  createdAt: string;
};

const domainCategorySchema = z.enum(DOMAIN_CATEGORIES);

const createCompanyInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(4),
  roleLabel: z.string().optional().default(""),
});

const createCompanySimulationInputSchema = z.object({
  companyCode: z.string().min(1),
  title: z.string().min(1),
  roleLabel: z.string().min(1),
  description: z.string().optional().default(""),
  jobFamily: z.string().optional().default(""),
  domain: domainCategorySchema,
  estimatedMinutes: z.number().int().positive().nullable().optional().default(null),
  taskPrompt: z.string().min(1),
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
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    companyCode: String(company.code ?? company.unique_code ?? ""),
    companyName: String(company.name ?? ""),
    title: String(row.title),
    roleLabel: String(row.role_label ?? row.job_family ?? row.title),
    jobFamily: String(row.job_family ?? ""),
    domain: String(row.domain ?? ""),
    estimatedMinutes: typeof row.estimated_minutes === "number" ? row.estimated_minutes : null,
    description: String(row.description ?? ""),
    taskPrompt: String(row.task_prompt ?? ""),
    isPublic: row.is_public !== false,
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
    roleLabel: String(row.role_label ?? name),
    createdAt: formatDateTime(String(row.created_at)),
  };
}

export const getAdminCompanies = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminCompany[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, code, unique_code, name, role_label, created_at")
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
        "id, company_id, title, role_label, job_family, domain, estimated_minutes, description, task_prompt, is_public, created_at, companies(code, unique_code, name)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load company simulations:", error);
      throw new Error("Failed to load company simulations");
    }

    return ((data ?? []) as Record<string, unknown>[]).map(mapAdminSimulation);
  },
);

export const createCompany = createServerFn({ method: "POST" })
  .inputValidator(createCompanyInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
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
        role_label: roleLabel,
      })
      .select("id, code, unique_code, name, role_label, created_at")
      .single();

    if (error) {
      console.error("Failed to create company:", error);
      throw new Error("Failed to create company");
    }

    return mapAdminCompany(row as Record<string, unknown>);
  });

export const createCompanySimulation = createServerFn({ method: "POST" })
  .inputValidator(createCompanySimulationInputSchema)
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

    const { data: row, error } = await supabaseAdmin
      .from("job_simulations")
      .insert({
        company_id: company.id,
        title: data.title,
        role_label: data.roleLabel,
        description: data.description,
        job_family: data.jobFamily,
        domain: data.domain,
        estimated_minutes: data.estimatedMinutes,
        task_prompt: data.taskPrompt,
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
        job_family: data.jobFamily,
        domain: data.domain,
        estimated_minutes: data.estimatedMinutes,
        task_prompt: data.taskPrompt,
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
      .eq("id", data.id);

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

    const { error } = await supabaseAdmin.from("job_simulations").delete().eq("id", data.id);

    if (error) {
      console.error("Failed to delete simulation:", error);
      throw new Error("Failed to delete simulation");
    }

    return { ok: true };
  });
