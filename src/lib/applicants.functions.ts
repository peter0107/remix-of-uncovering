import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";


export type Status = "submitted" | "in_review" | "completed";

export type PortfolioItem = {
  title: string;
  url: string;
  updatedAt: string;
  description: string;
};

export type ExperienceItem = {
  company: string;
  role: string;
  period: string;
  duration: string;
  description: string;
};

export type EducationItem = {
  school: string;
  major: string;
  status: string;
  description: string;
};

export type SimulationStep = {
  step: number;
  title: string;
  answer: string;
};

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
  at: string;
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
  educations: EducationItem[];
  recentJob: string;
  experiences: ExperienceItem[];
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
  aiChatLog: AiChatMessage[];
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
  savedApplicantIds: string[];
  readApplicantIds: string[];
  mailSentApplicantIds: string[];
};

const statusEnum = z.enum(["submitted", "in_review", "completed"]);

const portfolioItemSchema = z.object({
  title: z.string(),
  url: z.string(),
  updatedAt: z.string(),
  description: z.string(),
});

const experienceItemSchema = z.object({
  company: z.string(),
  role: z.string(),
  period: z.string(),
  duration: z.string(),
  description: z.string(),
});

const educationItemSchema = z.object({
  school: z.string(),
  major: z.string(),
  status: z.string(),
  description: z.string(),
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
  educations: z.array(educationItemSchema),
  recentJob: z.string(),
  experiences: z.array(experienceItemSchema),
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
  aiChatLog: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      at: z.string(),
    }),
  ),
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
  savedApplicantIds: z.array(z.string().uuid()),
  readApplicantIds: z.array(z.string().uuid()),
  mailSentApplicantIds: z.array(z.string().uuid()),
});

const companyCodeInputSchema = z.object({
  code: z.string().min(1),
});

const savedApplicantInputSchema = z.object({
  code: z.string().min(1),
  applicantId: z.string().uuid(),
  isSaved: z.boolean(),
});

const applicantStateInputSchema = z.object({
  code: z.string().min(1),
  applicantId: z.string().uuid(),
});

const applicantMailStateInputSchema = applicantStateInputSchema.extend({
  isMailSent: z.boolean(),
});

const EMPLOYMENT_TYPES = ["인턴", "신입", "계약직", "경력직"] as const;

function normalizeEmploymentType(value: string): string {
  const normalized = new Set<string>();

  for (const item of value.split(",")) {
    const trimmed = item.trim();
    if (!trimmed || trimmed === "근무 형태 미입력") continue;
    const mapped =
      trimmed === "정규직" || trimmed === "하이브리드" || trimmed === "경력"
        ? "경력직"
        : trimmed;
    if ((EMPLOYMENT_TYPES as readonly string[]).includes(mapped)) normalized.add(mapped);
  }

  return EMPLOYMENT_TYPES.filter((type) => normalized.has(type)).join(", ");
}

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
  const educationRows = Array.isArray(row.educations) ? row.educations : [];
  const experienceRows = Array.isArray(row.experiences) ? row.experiences : [];
  const simulation = Array.isArray(row.simulation) ? row.simulation : [];
  const educations = educationRows.map((item) =>
    educationItemSchema.parse({
      school: String(
        typeof item === "object" && item !== null && "school" in item
          ? (item as { school?: unknown }).school
          : "",
      ),
      major: String(
        typeof item === "object" && item !== null && "major" in item
          ? (item as { major?: unknown }).major
          : "",
      ),
      status: String(
        typeof item === "object" && item !== null && "status" in item
          ? (item as { status?: unknown }).status
          : "",
      ),
      description: String(
        typeof item === "object" && item !== null && "description" in item
          ? (item as { description?: unknown }).description
          : "",
      ),
    }),
  );
  const experiences = experienceRows.map((item) =>
    experienceItemSchema.parse({
      company: String(
        typeof item === "object" && item !== null && "company" in item
          ? (item as { company?: unknown }).company
          : "",
      ),
      role: String(
        typeof item === "object" && item !== null && "role" in item
          ? (item as { role?: unknown }).role
          : "",
      ),
      period: String(
        typeof item === "object" && item !== null && "period" in item
          ? (item as { period?: unknown }).period
          : "",
      ),
      duration: String(
        typeof item === "object" && item !== null && "duration" in item
          ? (item as { duration?: unknown }).duration
          : "",
      ),
      description: String(
        typeof item === "object" && item !== null && "description" in item
          ? (item as { description?: unknown }).description
          : "",
      ),
    }),
  );

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
    educations,
    recentJob: String(row.recent_job),
    experiences,
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
        description: String(
          typeof p === "object" && p !== null && "description" in p
            ? (p as { description?: unknown }).description
            : "",
        ),
      }),
    ),
    duration: String(row.duration),
    simulation: simulation.map((s) => simulationStepSchema.parse(s)),
    desiredSalary: String(row.desired_salary ?? "희망 연봉 미입력"),
    preferredRegion: String(row.preferred_region ?? ""),
    employmentType:
      normalizeEmploymentType(String(row.employment_type ?? "")) || "근무 형태 미입력",
    resumeTitle: String(row.resume_title ?? "기본 프로필"),
    resumeSourceType: String(row.resume_source_type ?? ""),
    aiChatLog: [],
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

async function assertCompanyApplicant(
  supabase: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  companyId: string,
  applicantId: string,
) {
  const { data: submission, error } = await supabase
    .from("submissions")
    .select("id, job_simulations!inner(company_id)")
    .eq("id", applicantId)
    .eq("job_simulations.company_id", companyId)
    .not("submitted_at", "is", null)
    .eq("answer_transmission_consent", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to validate company applicant:", error);
    throw new Error("Failed to validate company applicant");
  }

  if (!submission) {
    throw new Error("Invalid company applicant");
  }

  return String(submission.id);
}

export const getApplicantsByCompanyCode = createServerFn({ method: "GET" })
  .inputValidator(companyCodeInputSchema)
  .handler(async ({ data }): Promise<CompanyApplicants> => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

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

    const { data: reviewStateRows, error: reviewStateError } = await supabase
      .from("company_applicant_review_states")
      .select("applicant_id, read_at, mail_sent_at")
      .eq("company_id", company.id);

    if (reviewStateError) {
      console.error("Failed to load applicant review states:", reviewStateError);
      throw new Error("Failed to load applicant review states");
    }

    const { data: savedRows, error: savedError } = await supabase.rpc(
      "get_saved_applicant_ids_by_company_code",
      {
        company_code: data.code,
      },
    );

    if (savedError) {
      console.error("Failed to load saved applicants:", savedError);
      throw new Error("Failed to load saved applicants");
    }

    const { data: simulationRows, error: simulationsError } = await supabase
      .from("job_simulations")
      .select("id, title, role_label, job_family, domain, estimated_minutes, description")
      .eq("company_id", company.id)
      .eq("is_public", true)
      .is("deleted_at", null)
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
      savedApplicantIds: ((savedRows ?? []) as { submission_id: string }[]).map(
        (row) => row.submission_id,
      ),
      readApplicantIds: ((reviewStateRows ?? []) as Record<string, unknown>[])
        .filter((row) => row.read_at)
        .map((row) => String(row.applicant_id)),
      mailSentApplicantIds: ((reviewStateRows ?? []) as Record<string, unknown>[])
        .filter((row) => row.mail_sent_at)
        .map((row) => String(row.applicant_id)),
    });
  });

export const setSavedApplicantByCompanyCode = createServerFn({ method: "POST" })
  .inputValidator(savedApplicantInputSchema)
  .handler(async ({ data }): Promise<{ saved: boolean }> => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");


    const { data: saved, error } = await supabase.rpc("set_saved_applicant_by_company_code", {
      p_company_code: data.code,
      p_applicant_id: data.applicantId,
      p_is_saved: data.isSaved,
    });

    if (error) {
      console.error("Failed to update saved applicant:", error);
      throw new Error("Failed to update saved applicant");
    }

    return { saved: Boolean(saved) };
  });

export const markApplicantReadByCompanyCode = createServerFn({ method: "POST" })
  .inputValidator(applicantStateInputSchema)
  .handler(async ({ data }): Promise<{ read: boolean }> => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .or(`code.eq.${data.code},unique_code.eq.${data.code}`)
      .single();

    if (companyError || !company) {
      throw new Error("Invalid company code");
    }

    const submissionId = await assertCompanyApplicant(supabase, String(company.id), data.applicantId);
    const now = new Date().toISOString();

    const { error } = await supabase.from("company_applicant_review_states").upsert(
      {
        company_id: company.id,
        applicant_id: data.applicantId,
        submission_id: submissionId,
        read_at: now,
        updated_at: now,
      },
      { onConflict: "company_id,applicant_id" },
    );

    if (error) {
      console.error("Failed to mark applicant as read:", error);
      throw new Error("Failed to mark applicant as read");
    }

    return { read: true };
  });

export const setApplicantMailSentByCompanyCode = createServerFn({ method: "POST" })
  .inputValidator(applicantMailStateInputSchema)
  .handler(async ({ data }): Promise<{ mailSent: boolean }> => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .or(`code.eq.${data.code},unique_code.eq.${data.code}`)
      .single();

    if (companyError || !company) {
      throw new Error("Invalid company code");
    }

    const submissionId = await assertCompanyApplicant(supabase, String(company.id), data.applicantId);
    const now = new Date().toISOString();

    const { error } = await supabase.from("company_applicant_review_states").upsert(
      {
        company_id: company.id,
        applicant_id: data.applicantId,
        submission_id: submissionId,
        mail_sent_at: data.isMailSent ? now : null,
        updated_at: now,
      },
      { onConflict: "company_id,applicant_id" },
    );

    if (error) {
      console.error("Failed to update applicant mail state:", error);
      throw new Error("Failed to update applicant mail state");
    }

    return { mailSent: data.isMailSent };
  });
