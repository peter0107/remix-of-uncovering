import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type SimulationRequestStatus = "pending" | "in_progress" | "completed" | "rejected";

export type AdminSimulationRequest = {
  id: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  requestedRole: string;
  requestNote: string;
  contactEmail: string;
  status: SimulationRequestStatus;
  createdAt: string;
  updatedAt: string;
};

const statusEnum = z.enum(["pending", "in_progress", "completed", "rejected"]);

const companyRequestInputSchema = z.object({
  code: z.string().min(1),
  requestedRole: z.string().min(1),
  requestNote: z.string().optional().default(""),
  contactEmail: z.string().email().optional().or(z.literal("")).default(""),
});

const createCompanySimulationInputSchema = z.object({
  companyCode: z.string().min(1),
  title: z.string().min(1),
  roleLabel: z.string().min(1),
  description: z.string().optional().default(""),
  jobFamily: z.string().optional().default(""),
  domain: z.string().optional().default(""),
  estimatedMinutes: z.number().int().positive().nullable().optional().default(null),
  taskPrompt: z.string().min(1),
  requestId: z.string().uuid().optional(),
});

const updateRequestStatusInputSchema = z.object({
  requestId: z.string().uuid(),
  status: statusEnum,
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

function mapAdminRequest(row: Record<string, unknown>): AdminSimulationRequest {
  const company = (row.companies ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    companyCode: String(company.code ?? ""),
    companyName: String(company.name ?? ""),
    requestedRole: String(row.requested_role),
    requestNote: String(row.request_note ?? ""),
    contactEmail: String(row.contact_email ?? ""),
    status: statusEnum.parse(row.status),
    createdAt: formatDateTime(String(row.created_at)),
    updatedAt: formatDateTime(String(row.updated_at)),
  };
}

export const createJobSimulationRequest = createServerFn({ method: "POST" })
  .inputValidator(companyRequestInputSchema)
  .handler(async ({ data }) => {
    const supabase = createPublicServerClient();

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("code", data.code)
      .single();

    if (companyError || !company) {
      throw new Error("Invalid company code");
    }

    const { error } = await supabase.from("job_simulation_requests").insert({
      company_id: company.id,
      requested_role: data.requestedRole,
      request_note: data.requestNote,
      contact_email: data.contactEmail || null,
    });

    if (error) {
      console.error("Failed to create simulation request:", error);
      throw new Error("Failed to create simulation request");
    }

    return { ok: true };
  });

export const getAdminSimulationRequests = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminSimulationRequest[]> => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("job_simulation_requests")
      .select(
        "id, company_id, requested_role, request_note, contact_email, status, created_at, updated_at, companies(code, name)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load simulation requests:", error);
      throw new Error("Failed to load simulation requests");
    }

    return ((data ?? []) as Record<string, unknown>[]).map(mapAdminRequest);
  },
);

export const updateJobSimulationRequestStatus = createServerFn({ method: "POST" })
  .inputValidator(updateRequestStatusInputSchema)
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("job_simulation_requests")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.requestId);

    if (error) {
      console.error("Failed to update simulation request:", error);
      throw new Error("Failed to update simulation request");
    }

    return { ok: true };
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

    const { error } = await supabaseAdmin.from("job_simulations").insert({
      company_id: company.id,
      title: data.title,
      role_label: data.roleLabel,
      description: data.description,
      job_family: data.jobFamily,
      domain: data.domain,
      estimated_minutes: data.estimatedMinutes,
      task_prompt: data.taskPrompt,
    });

    if (error) {
      console.error("Failed to create company simulation:", error);
      throw new Error("Failed to create company simulation");
    }

    if (data.requestId) {
      await supabaseAdmin
        .from("job_simulation_requests")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", data.requestId);
    }

    return { ok: true };
  });
