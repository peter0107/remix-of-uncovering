import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  COMPANY_AI_PROMPT_DEFAULTS,
  COMPANY_AI_PROMPT_KEYS,
  type CompanyAiPromptKey,
} from "@/lib/ai-prompt.defaults";

export type Status = "submitted" | "in_review" | "completed";
export type ApplicantReviewStage =
  | "document_review"
  | "interview_proposed"
  | "interview_scheduled"
  | "interview_in_progress"
  | "final_review";
export type ApplicantDecisionStatus = "undecided" | "passed" | "rejected";

export type ApplicantReviewState = {
  applicantId: string;
  reviewStage: ApplicantReviewStage;
  decisionStatus: ApplicantDecisionStatus;
};

type JobPostingCandidate = {
  title: string;
  sourceUrl: string;
  content: string;
};

export type ApplicantAiReview = {
  applicantId: string;
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
  photoUrl: string;
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
  reviewStates: ApplicantReviewState[];
  aiReviews: ApplicantAiReview[];
};

const statusEnum = z.enum(["submitted", "in_review", "completed"]);
const reviewStageEnum = z.enum([
  "document_review",
  "interview_proposed",
  "interview_scheduled",
  "interview_in_progress",
  "final_review",
]);
const decisionStatusEnum = z.enum(["undecided", "passed", "rejected"]);

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

const aiReviewAnalysisSchema = z.object({
  simulation: z.object({
    score: z.number().min(0).max(100),
    summary: z.string(),
    strengths: z.array(z.string()),
    concerns: z.array(z.string()),
  }),
  aiUtilization: z.object({
    score: z.number().min(0).max(100),
    summary: z.string(),
    strengths: z.array(z.string()),
    improvements: z.array(z.string()),
  }),
  interviewQuestions: z.array(
    z.object({
      category: z.enum(["시뮬레이션 결과물", "AI 활용"]),
      question: z.string(),
      intent: z.string(),
    }),
  ),
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
  photoUrl: z.string(),
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
  reviewStates: z.array(
    z.object({
      applicantId: z.string().uuid(),
      reviewStage: reviewStageEnum,
      decisionStatus: decisionStatusEnum,
    }),
  ),
  aiReviews: z.array(
    z.object({
      applicantId: z.string().uuid(),
      simulation: z.object({
        score: z.number().min(0).max(100),
        summary: z.string(),
        strengths: z.array(z.string()),
        concerns: z.array(z.string()),
      }),
      aiUtilization: z.object({
        score: z.number().min(0).max(100),
        summary: z.string(),
        strengths: z.array(z.string()),
        improvements: z.array(z.string()),
      }),
      interviewQuestions: z.array(
        z.object({
          category: z.enum(["시뮬레이션 결과물", "AI 활용"]),
          question: z.string(),
          intent: z.string(),
        }),
      ),
      updatedAt: z.string(),
    }),
  ),
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

const applicantDecisionInputSchema = applicantStateInputSchema.extend({
  decisionStatus: decisionStatusEnum,
});

const aiEvaluationInputSchema = applicantStateInputSchema;

const EMPLOYMENT_TYPES = ["인턴", "신입", "계약직", "경력직"] as const;

function normalizeEmploymentType(value: string): string {
  const normalized = new Set<string>();

  for (const item of value.split(",")) {
    const trimmed = item.trim();
    if (!trimmed || trimmed === "근무 형태 미입력") continue;
    const mapped =
      trimmed === "정규직" || trimmed === "하이브리드" || trimmed === "경력" ? "경력직" : trimmed;
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
    photoUrl: String(row.photo_url ?? ""),
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

function parseAiChatLog(value: unknown): AiChatMessage[] {
  if (!Array.isArray(value)) return [];

  const parsed: AiChatMessage[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as Record<string, unknown>;
    if (row.role !== "user" && row.role !== "assistant") continue;
    parsed.push({
      role: row.role,
      content: String(row.content ?? ""),
      at: String(row.at ?? ""),
    });
  }
  return parsed;
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

function mapAiReview(row: Record<string, unknown>): ApplicantAiReview {
  const analysis = aiReviewAnalysisSchema.parse(row.analysis ?? {});
  return {
    applicantId: String(row.applicant_id),
    ...analysis,
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
  };
}

function getCompanyCodeClause(code: string) {
  return `code.eq.${code},unique_code.eq.${code}`;
}

async function getCompanyByCode(
  supabase: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  code: string,
) {
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, code, unique_code, name, role_label")
    .or(getCompanyCodeClause(code))
    .single();

  if (error || !company) throw new Error("Invalid company code");
  return company;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function extractMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedKey}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return "";
}

function extractJobPostingText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[\t\r ]+/g, " ")
      .replace(/\n\s*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  ).slice(0, 60000);
}

function getJobKoreaUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);
  const hostname = url.hostname.toLowerCase();
  if (hostname !== "jobkorea.co.kr" && !hostname.endsWith(".jobkorea.co.kr")) {
    throw new Error("현재는 잡코리아 공고 링크만 불러올 수 있습니다.");
  }
  return url;
}

async function fetchJobKoreaHtml(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BeginnerHiringReview/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });
  } catch {
    throw new Error("잡코리아 공고를 불러오지 못했습니다. 공고 내용을 직접 입력해주세요.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error("잡코리아 공고를 불러오지 못했습니다. 공고 내용을 직접 입력해주세요.");
  }

  return response.text();
}

const CLAUDE_IMAGE_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_JOB_POSTING_OCR_IMAGES = 4;
const MAX_JOB_POSTING_OCR_IMAGE_BYTES = 4 * 1024 * 1024;

type JobPostingOcrImage = {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
};

function isJobKoreaAssetUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return hostname === "jobkorea.co.kr" || hostname.endsWith(".jobkorea.co.kr");
}

function getMarkupAttribute(markup: string, attribute: string) {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markup.match(new RegExp(`\\b${escapedAttribute}=["']([^"']+)["']`, "i"));
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : "";
}

function extractJobPostingImageUrls(html: string, sourceUrl: URL) {
  const found = new Map<string, URL>();
  const add = (rawUrl: string) => {
    if (!rawUrl || rawUrl.startsWith("data:")) return;
    try {
      const url = new URL(rawUrl, sourceUrl);
      if (url.protocol !== "https:" || !isJobKoreaAssetUrl(url)) return;
      found.set(url.toString(), url);
    } catch {
      // 잘못된 이미지 주소는 건너뜁니다.
    }
  };

  const ogImage = extractMetaContent(html, "og:image");
  if (ogImage) add(ogImage);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const markup = match[0];
    for (const attribute of ["src", "data-src", "data-original", "data-lazy-src", "data-lazy"]) {
      add(getMarkupAttribute(markup, attribute));
    }
  }

  for (const match of html.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) {
    add(decodeHtmlEntities(match[1]));
  }

  for (const match of html.matchAll(
    /https?:\/\/[^"'\s]+?\.(?:jpe?g|png|gif|webp)(?:\?[^"'\s]*)?/gi,
  )) {
    add(decodeHtmlEntities(match[0]));
  }

  return Array.from(found.values()).slice(0, MAX_JOB_POSTING_OCR_IMAGES);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(start, start + chunkSize));
  }
  return btoa(binary);
}

function getClaudeImageMediaType(
  contentType: string | null,
): JobPostingOcrImage["mediaType"] | null {
  const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase();
  const normalized = mediaType === "image/jpg" ? "image/jpeg" : mediaType;
  return normalized && CLAUDE_IMAGE_MEDIA_TYPES.has(normalized)
    ? (normalized as JobPostingOcrImage["mediaType"])
    : null;
}

async function fetchJobPostingOcrImage(url: URL, referer: URL): Promise<JobPostingOcrImage | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BeginnerHiringReview/1.0)",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: referer.toString(),
      },
      signal: controller.signal,
    });
    const mediaType = getClaudeImageMediaType(response.headers.get("content-type"));
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (!response.ok || !mediaType || contentLength > MAX_JOB_POSTING_OCR_IMAGE_BYTES) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_JOB_POSTING_OCR_IMAGE_BYTES) return null;
    return { mediaType, data: toBase64(bytes) };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function extractJobPostingImageOcr(html: string, sourceUrl: URL) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { text: "", imageCount: 0 };

  const imageUrls = extractJobPostingImageUrls(html, sourceUrl);
  const images = (
    await Promise.all(imageUrls.map((url) => fetchJobPostingOcrImage(url, sourceUrl)))
  ).filter((image): image is JobPostingOcrImage => image !== null);
  if (images.length === 0) return { text: "", imageCount: 0 };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "아래 이미지는 잡코리아 채용 공고 화면입니다. 이미지 안에서 실제 채용 공고와 관련된 텍스트만 정확히 옮겨 적으세요. 직무명, 주요 업무, 자격 요건, 우대 사항, 고용 형태, 근무 조건, 지원 방법을 가능한 한 구조적으로 정리하세요. 로고, 메뉴, 광고처럼 공고와 무관한 내용은 제외하고 추측으로 내용을 만들지 마세요. 읽을 수 있는 텍스트가 없다면 빈 문자열만 반환하세요.",
            },
            ...images.map((image) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: image.mediaType, data: image.data },
            })),
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn("Failed to OCR job posting images:", response.status);
    return { text: "", imageCount: images.length };
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return { text: getClaudeOutput(payload), imageCount: images.length };
}

function combineJobPostingContent(htmlText: string, ocrText: string) {
  if (!ocrText.trim()) return htmlText;
  if (!htmlText.trim()) return `이미지 공고 OCR\n${ocrText.trim()}`;
  return `${htmlText.trim()}\n\n이미지 공고 OCR\n${ocrText.trim()}`.slice(0, 60000);
}

function extractJobPostingTitle(html: string) {
  return (
    extractMetaContent(html, "og:title") ||
    extractMetaContent(html, "twitter:title") ||
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ? decodeHtmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim()
      : "잡코리아 채용 공고")
  );
}

function extractJobPostingCandidates(html: string, sourceUrl: URL): JobPostingCandidate[] {
  const candidates = new Map<string, JobPostingCandidate>();
  const anchorPattern =
    /<a\b[^>]*href=["']([^"']*\/Recruit\/GI_Read\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeHtmlEntities(match[1]);
    let postingUrl: URL;
    try {
      postingUrl = new URL(href, sourceUrl);
    } catch {
      continue;
    }

    if (postingUrl.hostname.toLowerCase() !== "www.jobkorea.co.kr") continue;
    const titleMarkup =
      match[2].match(/<dt[^>]*class=["'][^"']*\btit\b[^"']*["'][^>]*>([\s\S]*?)<\/dt>/i)?.[1] ??
      match[2];
    const title = extractJobPostingText(titleMarkup).replace(/\s+/g, " ").trim();
    if (!title || candidates.has(postingUrl.toString())) continue;

    candidates.set(postingUrl.toString(), {
      title: title.slice(0, 300),
      sourceUrl: postingUrl.toString(),
      content: "",
    });
  }

  const listed = Array.from(candidates.values()).slice(0, 50);
  if (listed.length > 0) return listed;

  return [
    {
      title: extractJobPostingTitle(html),
      sourceUrl: sourceUrl.toString(),
      content: extractJobPostingText(html),
    },
  ];
}

function extractJsonObject(value: string) {
  const trimmed = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start)
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

function getClaudeOutput(payload: Record<string, unknown>) {
  const content = Array.isArray(payload.content) ? payload.content : [];
  return content
    .flatMap((part) =>
      typeof part === "object" &&
      part !== null &&
      (part as { type?: unknown }).type === "text" &&
      typeof (part as { text?: unknown }).text === "string"
        ? [(part as { text: string }).text]
        : [],
    )
    .join("\n")
    .trim();
}

async function generateApplicantAiReview(applicant: Applicant) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY 환경변수를 Lovable에 설정해주세요.");
  }

  const evaluationMaterial = {
    role: applicant.role,
    simulationAnswers: applicant.simulation,
    aiAssistantChatLog: applicant.aiChatLog,
  };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: promptSettings, error: promptError } = await supabaseAdmin
    .from("ai_prompt_settings")
    .select("key, prompt")
    .in("key", [...COMPANY_AI_PROMPT_KEYS]);

  if (promptError) {
    console.warn("Failed to load AI prompt setting, using default:", promptError.message);
  }

  const savedPrompts = new Map(
    ((promptSettings ?? []) as Array<{ key: string; prompt: string }>).map((setting) => [
      setting.key,
      setting.prompt,
    ]),
  );
  const getPrompt = (key: CompanyAiPromptKey) =>
    savedPrompts.get(key)?.trim() || COMPANY_AI_PROMPT_DEFAULTS[key].prompt;

  const promptInstructions = `당신은 채용 담당자를 돕는 평가 보조자입니다. 아래 지원자의 직무 시뮬레이션 결과물과 AI 어시스트 대화 로그를 검토하세요.

공통 규칙:
- 보호 특성(나이, 성별, 출신, 건강, 가족상태 등)을 추정하거나 판단 근거로 사용하지 마세요.
- 채용 합격/불합격을 결정하지 말고, 근거 기반의 검토 포인트만 제시하세요.
- 점수는 0~100 정수로 작성하고, 근거는 제공된 자료 안에서만 작성하세요.
- 반드시 JSON만 반환하세요.

[1. 시뮬레이션 결과물 평가 프롬프트]
${getPrompt("company_simulation_result_review")}

[2. AI 활용 능력 평가 프롬프트]
${getPrompt("company_ai_utilization_review")}

[3. 면접 질문 추천 프롬프트]
${getPrompt("company_interview_question_recommendation")}

최종 반환 JSON 형식:
{
  "simulation": { "score": 0, "summary": "", "strengths": [""], "concerns": [""] },
  "aiUtilization": { "score": 0, "summary": "", "strengths": [""], "improvements": [""] },
  "interviewQuestions": [
    { "category": "시뮬레이션 결과물", "question": "", "intent": "" },
    { "category": "AI 활용", "question": "", "intent": "" }
  ]
}`;
  const prompt = `${promptInstructions}\n\n평가 자료:\n${JSON.stringify(evaluationMaterial).slice(0, 30000)}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 2400,
      messages: [{ role: "user", content: prompt }],
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

  const output = getClaudeOutput(payload);
  if (!output) throw new Error("AI 평가 결과를 받지 못했습니다.");
  return aiReviewAnalysisSchema.parse(extractJsonObject(output));
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

    const applicantRows = await Promise.all(
      ((rows ?? []) as Record<string, unknown>[]).map(async (row) => {
        const photoPath = String(row.photo_path ?? "");
        if (!photoPath) return row;

        const { data: signedPhoto } = await supabase.storage
          .from("resume-photos")
          .createSignedUrl(photoPath, 60 * 60);

        return { ...row, photo_url: signedPhoto?.signedUrl ?? "" };
      }),
    );
    const applicants = applicantRows.map(mapApplicant);

    // AI 어시스트 대화 로그를 submission id로 조회해 응시자 데이터에 병합
    const applicantIds = applicants.map((a) => a.id);
    if (applicantIds.length > 0) {
      const { data: chatRows, error: chatError } = await supabase
        .from("submissions")
        .select("id, ai_chat_log")
        .in("id", applicantIds);

      if (chatError) {
        console.error("Failed to load ai chat logs:", chatError);
      } else {
        const chatMap = new Map<string, AiChatMessage[]>();
        for (const row of (chatRows ?? []) as { id: string; ai_chat_log: unknown }[]) {
          chatMap.set(String(row.id), parseAiChatLog(row.ai_chat_log));
        }
        for (const a of applicants) {
          a.aiChatLog = chatMap.get(a.id) ?? [];
        }
      }
    }

    const { data: reviewStateRows, error: reviewStateError } = await supabase
      .from("company_applicant_review_states")
      .select("applicant_id, read_at, mail_sent_at, review_stage, decision_status")
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

    const { data: aiReviewRows, error: aiReviewError } = await supabase
      .from("company_simulation_ai_reviews")
      .select("applicant_id, analysis, created_at, updated_at")
      .eq("company_id", company.id)
      .order("updated_at", { ascending: false });

    if (aiReviewError) {
      console.error("Failed to load AI reviews:", aiReviewError);
      throw new Error("Failed to load AI reviews");
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
      reviewStates: ((reviewStateRows ?? []) as Record<string, unknown>[]).map((row) => ({
        applicantId: String(row.applicant_id),
        reviewStage: reviewStageEnum.parse(row.review_stage ?? "document_review"),
        decisionStatus: decisionStatusEnum.parse(row.decision_status ?? "undecided"),
      })),
      aiReviews: ((aiReviewRows ?? []) as Record<string, unknown>[]).map(mapAiReview),
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

    const submissionId = await assertCompanyApplicant(
      supabase,
      String(company.id),
      data.applicantId,
    );
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

    const submissionId = await assertCompanyApplicant(
      supabase,
      String(company.id),
      data.applicantId,
    );
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

const REVIEW_STAGE_ORDER: ApplicantReviewStage[] = [
  "document_review",
  "interview_proposed",
  "interview_scheduled",
  "interview_in_progress",
  "final_review",
];

export const markApplicantInterviewProposedByCompanyCode = createServerFn({ method: "POST" })
  .inputValidator(applicantStateInputSchema)
  .handler(async ({ data }): Promise<ApplicantReviewState> => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
    const company = await getCompanyByCode(supabase, data.code);
    const submissionId = await assertCompanyApplicant(
      supabase,
      String(company.id),
      data.applicantId,
    );
    const { data: current, error: currentError } = await supabase
      .from("company_applicant_review_states")
      .select("decision_status")
      .eq("company_id", company.id)
      .eq("applicant_id", data.applicantId)
      .maybeSingle();

    if (currentError) {
      console.error("Failed to load applicant decision state:", currentError);
      throw new Error("지원자 검토 상태를 불러오지 못했습니다.");
    }

    const now = new Date().toISOString();
    const decisionStatus = decisionStatusEnum.parse(current?.decision_status ?? "undecided");

    const { error } = await supabase.from("company_applicant_review_states").upsert(
      {
        company_id: company.id,
        applicant_id: data.applicantId,
        submission_id: submissionId,
        mail_sent_at: now,
        review_stage: "interview_proposed",
        updated_at: now,
      },
      { onConflict: "company_id,applicant_id" },
    );

    if (error) {
      console.error("Failed to mark interview proposed:", error);
      throw new Error("면접 제안 상태를 저장하지 못했습니다.");
    }

    return {
      applicantId: data.applicantId,
      reviewStage: "interview_proposed",
      decisionStatus,
    };
  });

export const advanceApplicantReviewStageByCompanyCode = createServerFn({ method: "POST" })
  .inputValidator(applicantStateInputSchema)
  .handler(async ({ data }): Promise<ApplicantReviewState> => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
    const company = await getCompanyByCode(supabase, data.code);
    const submissionId = await assertCompanyApplicant(
      supabase,
      String(company.id),
      data.applicantId,
    );
    const { data: current, error: currentError } = await supabase
      .from("company_applicant_review_states")
      .select("review_stage, decision_status")
      .eq("company_id", company.id)
      .eq("applicant_id", data.applicantId)
      .maybeSingle();

    if (currentError) {
      console.error("Failed to load applicant review stage:", currentError);
      throw new Error("지원자 검토 상태를 불러오지 못했습니다.");
    }

    const currentStage = reviewStageEnum.parse(current?.review_stage ?? "document_review");
    if (currentStage === "document_review") {
      throw new Error("면접 제안 메일 템플릿을 복사한 뒤에 다음 단계로 진행할 수 있습니다.");
    }

    const currentIndex = REVIEW_STAGE_ORDER.indexOf(currentStage);
    const nextStage = REVIEW_STAGE_ORDER[(currentIndex + 1) % REVIEW_STAGE_ORDER.length];
    const now = new Date().toISOString();
    const decisionStatus = decisionStatusEnum.parse(current?.decision_status ?? "undecided");

    const { error } = await supabase.from("company_applicant_review_states").upsert(
      {
        company_id: company.id,
        applicant_id: data.applicantId,
        submission_id: submissionId,
        review_stage: nextStage,
        updated_at: now,
      },
      { onConflict: "company_id,applicant_id" },
    );

    if (error) {
      console.error("Failed to advance applicant review stage:", error);
      throw new Error("지원 단계 저장에 실패했습니다.");
    }

    return { applicantId: data.applicantId, reviewStage: nextStage, decisionStatus };
  });

export const setApplicantDecisionByCompanyCode = createServerFn({ method: "POST" })
  .inputValidator(applicantDecisionInputSchema)
  .handler(async ({ data }): Promise<ApplicantReviewState> => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
    const company = await getCompanyByCode(supabase, data.code);
    const submissionId = await assertCompanyApplicant(
      supabase,
      String(company.id),
      data.applicantId,
    );
    const { data: current, error: currentError } = await supabase
      .from("company_applicant_review_states")
      .select("review_stage")
      .eq("company_id", company.id)
      .eq("applicant_id", data.applicantId)
      .maybeSingle();

    if (currentError) {
      console.error("Failed to load applicant decision state:", currentError);
      throw new Error("지원자 검토 상태를 불러오지 못했습니다.");
    }

    const reviewStage = reviewStageEnum.parse(current?.review_stage ?? "document_review");
    const now = new Date().toISOString();
    const { error } = await supabase.from("company_applicant_review_states").upsert(
      {
        company_id: company.id,
        applicant_id: data.applicantId,
        submission_id: submissionId,
        decision_status: data.decisionStatus,
        updated_at: now,
      },
      { onConflict: "company_id,applicant_id" },
    );

    if (error) {
      console.error("Failed to update applicant decision:", error);
      throw new Error("지원 결과 저장에 실패했습니다.");
    }

    return { applicantId: data.applicantId, reviewStage, decisionStatus: data.decisionStatus };
  });

export const evaluateApplicantWithAiByCompanyCode = createServerFn({ method: "POST" })
  .inputValidator(aiEvaluationInputSchema)
  .handler(async ({ data }): Promise<ApplicantAiReview> => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
    const company = await getCompanyByCode(supabase, data.code);
    await assertCompanyApplicant(supabase, String(company.id), data.applicantId);

    const { data: applicantRows, error: applicantsError } = await supabase.rpc(
      "get_applicants_by_company_code",
      { company_code: data.code },
    );
    if (applicantsError) throw new Error("지원자 정보를 불러오지 못했습니다.");

    const applicantRow = ((applicantRows ?? []) as Record<string, unknown>[]).find(
      (row) => String(row.id) === data.applicantId,
    );
    if (!applicantRow) throw new Error("지원자 정보를 찾을 수 없습니다.");

    const applicant = mapApplicant(applicantRow);
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("ai_chat_log")
      .eq("id", data.applicantId)
      .single();
    if (submissionError) throw new Error("AI 활용 기록을 불러오지 못했습니다.");

    applicant.aiChatLog = parseAiChatLog(submission?.ai_chat_log);
    const analysis = await generateApplicantAiReview(applicant);
    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("company_simulation_ai_reviews")
      .upsert(
        {
          company_id: company.id,
          applicant_id: data.applicantId,
          analysis,
          updated_at: now,
        },
        { onConflict: "company_id,applicant_id" },
      )
      .select("applicant_id, analysis, created_at, updated_at")
      .single();

    if (error || !row) {
      console.error("Failed to save AI review:", error);
      throw new Error("AI 평가 결과를 저장하지 못했습니다.");
    }

    return mapAiReview(row as Record<string, unknown>);
  });
