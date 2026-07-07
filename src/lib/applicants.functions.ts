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
  desiredSalary: string;
  preferredRegion: string;
  employmentType: string;
  resumeTitle: string;
  resumeSourceType: string;
};

export type Company = {
  id: string;
  code: string;
  name: string;
  roleLabel: string;
};

export type CompanySimulation = {
  id: string;
  title: string;
  roleLabel: string;
  jobFamily: string;
  domain: string;
  estimatedMinutes: number | null;
  description: string;
};

export type CompanyApplicants = {
  company: Company;
  applicants: Applicant[];
  simulations: CompanySimulation[];
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
  desiredSalary: z.string(),
  preferredRegion: z.string(),
  employmentType: z.string(),
  resumeTitle: z.string(),
  resumeSourceType: z.string(),
});

const companyApplicantsSchema = z.object({
  company: z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    roleLabel: z.string(),
  }),
  applicants: z.array(applicantSchema),
  simulations: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      roleLabel: z.string(),
      jobFamily: z.string(),
      domain: z.string(),
      estimatedMinutes: z.number().nullable(),
      description: z.string(),
    }),
  ),
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
    portfolio: portfolio.map((p) =>
      portfolioItemSchema.parse({
        ...(typeof p === "object" && p !== null ? p : {}),
        updatedAt:
          typeof p === "object" && p !== null && "updatedAt" in p
            ? (p as { updatedAt?: unknown }).updatedAt
            : "",
      }),
    ),
    duration: String(row.duration),
    simulation: simulation.map((s) => simulationStepSchema.parse(s)),
    desiredSalary: String(row.desired_salary ?? "희망 연봉 미입력"),
    preferredRegion: String(row.preferred_region ?? ""),
    employmentType: String(row.employment_type ?? "근무 형태 미입력"),
    resumeTitle: String(row.resume_title ?? "기본 프로필"),
    resumeSourceType: String(row.resume_source_type ?? ""),
  };
}

function mapSimulation(row: Record<string, unknown>): CompanySimulation {
  const roleLabel = String(row.role_label ?? row.job_family ?? row.title);
  return {
    id: String(row.id),
    title: String(row.title),
    roleLabel,
    jobFamily: String(row.job_family ?? ""),
    domain: String(row.domain ?? ""),
    estimatedMinutes: typeof row.estimated_minutes === "number" ? row.estimated_minutes : null,
    description: String(row.description ?? ""),
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
      .or(`code.eq.${data.code},unique_code.eq.${data.code}`)
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

    const { data: simulationRows, error: simulationsError } = await supabase
      .from("job_simulations")
      .select("id, title, role_label, job_family, domain, estimated_minutes, description")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });

    if (simulationsError) {
      console.error("Failed to load company simulations:", simulationsError);
      throw new Error("Failed to load company simulations");
    }

    return companyApplicantsSchema.parse({
      company: {
        id: company.id,
        code: company.code ?? data.code,
        name: company.name,
        roleLabel: company.role_label ?? company.name,
      },
      applicants,
      simulations: ((simulationRows ?? []) as Record<string, unknown>[]).map(mapSimulation),
    });
  });
