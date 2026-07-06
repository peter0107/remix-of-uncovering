import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type Status = "submitted" | "in_review" | "completed";

export type PortfolioItem = {
  title: string;
  url: string;
  updatedAt: string;
};

export type SimulationStep = {
  step: number;
  title: string;
  answer: string;
};

export type Applicant = {
  id: string;
  name: string;
  role: string;
  experience: string;
  status: Status;
  submittedAt: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  education: string;
  recentJob: string;
  skills: string[];
  tools: string[];
  resumeUrl: string;
  portfolio: PortfolioItem[];
  duration: string;
  simulation: SimulationStep[];
};

export type Company = {
  id: string;
  code: string;
  name: string;
  roleLabel: string;
};

export type CompanyApplicants = {
  company: Company;
  applicants: Applicant[];
};

const statusEnum = z.enum(["submitted", "in_review", "completed"]);

const portfolioItemSchema = z.object({
  title: z.string(),
  url: z.string(),
  updatedAt: z.string(),
});

const simulationStepSchema = z.object({
  step: z.number(),
  title: z.string(),
  answer: z.string(),
});

const applicantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  role: z.string(),
  experience: z.string(),
  status: statusEnum,
  submittedAt: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  headline: z.string(),
  education: z.string(),
  recentJob: z.string(),
  skills: z.array(z.string()),
  tools: z.array(z.string()),
  resumeUrl: z.string(),
  portfolio: z.array(portfolioItemSchema),
  duration: z.string(),
  simulation: z.array(simulationStepSchema),
});

const companyApplicantsSchema = z.object({
  company: z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    roleLabel: z.string(),
  }),
  applicants: z.array(applicantSchema),
});

const companyCodeInputSchema = z.object({
  code: z.string().min(1),
});

function formatSubmittedAt(iso: string): string {
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

function mapApplicant(row: Record<string, unknown>): Applicant {
  const portfolio = Array.isArray(row.portfolio) ? row.portfolio : [];
  const simulation = Array.isArray(row.simulation) ? row.simulation : [];

  return {
    id: String(row.id),
    name: String(row.name),
    role: String(row.role),
    experience: String(row.experience),
    status: statusEnum.parse(row.status),
    submittedAt: formatSubmittedAt(String(row.submitted_at)),
    email: String(row.email),
    phone: String(row.phone),
    location: String(row.location),
    headline: String(row.headline),
    education: String(row.education),
    recentJob: String(row.recent_job),
    skills: Array.isArray(row.skills) ? row.skills.map(String) : [],
    tools: Array.isArray(row.tools) ? row.tools.map(String) : [],
    resumeUrl: String(row.resume_url),
    portfolio: portfolio.map((p) => portfolioItemSchema.parse(p)),
    duration: String(row.duration),
    simulation: simulation.map((s) => simulationStepSchema.parse(s)),
  };
}

export const getApplicantsByCompanyCode = createServerFn({ method: "GET" })
  .inputValidator(companyCodeInputSchema)
  .handler(async ({ data }): Promise<CompanyApplicants> => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Backend is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, code, name, role_label")
      .eq("code", data.code)
      .single();

    if (companyError || !company) {
      throw new Error("Invalid company code");
    }

    const { data: rows, error: rpcError } = await supabase.rpc("get_applicants_by_company_code", {
      company_code: data.code,
    });

    if (rpcError) {
      console.error("Failed to load applicants:", rpcError);
      throw new Error("Failed to load applicants");
    }

    const applicants = ((rows ?? []) as Record<string, unknown>[]).map(mapApplicant);

    return companyApplicantsSchema.parse({
      company: {
        id: company.id,
        code: company.code,
        name: company.name,
        roleLabel: company.role_label,
      },
      applicants,
    });
  });
