import { supabase } from "@/integrations/supabase/client";

export type MissionStatus =
  | "draft"
  | "published"
  | "private"
  | "expert_submitted"
  | "review_pending";

export type MissionDifficulty = "easy" | "medium" | "hard";
export type MissionContentMode = "legacy" | "step_wizard";

export type MaterialBlockType = "image" | "table" | "text" | "file" | "link";

export type MetricItem = { label: string; value: string };
export type FeedbackItem = { quote: string; author?: string };
export type TableData = { headers: string[]; rows: string[][]; column_widths?: number[] };

export type MaterialBlock = {
  id: string;
  type: MaterialBlockType;
  title: string;
  description: string;
  order: number;
  // type별 페이로드 (선택적으로 채워짐)
  image_url?: string;
  image_alt?: string;
  /** @deprecated 더 이상 사용하지 않음 — 텍스트 블록으로 대체 */
  metrics?: MetricItem[];
  /** @deprecated 더 이상 사용하지 않음 — 텍스트 블록으로 대체 */
  feedbacks?: FeedbackItem[];
  table?: TableData;
  text?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  link_url?: string;
  link_label?: string;
};

export type MissionQuestion = { id: string; label: string; guide?: string };
export type WizardPromptInputType = "textarea" | "single_select";
export type WizardPromptOption = {
  id: string;
  label: string;
  description?: string;
};
export type WizardPrompt = {
  id: string;
  label: string;
  guide?: string;
  input_type: WizardPromptInputType;
  options?: WizardPromptOption[];
};
export type WizardStep = {
  id: string;
  title: string;
  duration_min: number;
  body_html?: string | null;
  context_text: string;
  content_blocks: MaterialBlock[];
  prompts: WizardPrompt[];
};

export type Mission = {
  id: string;
  job_slug: string;
  job_category: string | null;
  title: string;
  description: string | null;
  content_mode: MissionContentMode;
  situation: string | null;
  data_points: string[];
  material_blocks: MaterialBlock[];
  questions: MissionQuestion[];
  wizard_intro_html: string | null;
  wizard_intro_blocks: MaterialBlock[];
  wizard_steps: WizardStep[];
  duration_min: number;
  difficulty: MissionDifficulty;
  industries: string[];
  status: MissionStatus;
  author_id: string | null;
  is_expert_authored: boolean;
  author_name: string;
  author_role: string | null;
  submitted_competencies: string[];
  frequent_tasks: string | null;
  years_experience: number | null;
  industry_categories: string[];
  // 직전 요약
  summary_title: string | null;
  summary_description: string | null;
  recommended_for: string | null;
  included_results: string[];
  mission_steps: string[];
  preview_notice: string | null;
  locked_preview_text: string | null;
  sample_answer: string | null;
  expert_comment_html: string | null;
  offline_activity_html: string | null;
  reviewed_by: string | null;
  company_size: string | null;
  company_name: string | null;
  industry: string | null;
  verification_file_url: string | null;
  created_at: string;
  updated_at: string;
};

export const STATUS_LABEL: Record<MissionStatus, string> = {
  draft: "임시저장",
  published: "공개 중",
  private: "비공개",
  expert_submitted: "현직자 제출",
  review_pending: "검토 대기",
};

export const STATUS_TONE: Record<MissionStatus, string> = {
  draft: "bg-sky-100 text-sky-700",
  published: "bg-emerald-100 text-emerald-700",
  private: "bg-muted text-muted-foreground",
  expert_submitted: "bg-violet-100 text-violet-700",
  review_pending: "bg-amber-100 text-amber-700",
};

export const DIFFICULTY_LABEL: Record<MissionDifficulty, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

export const DIFFICULTY_TONE: Record<MissionDifficulty, string> = {
  easy: "bg-emerald-50 text-emerald-700",
  medium: "bg-orange-50 text-orange-700",
  hard: "bg-rose-50 text-rose-700",
};

export const EXPERIENCE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1~2년차" },
  { value: 3, label: "3~5년차" },
  { value: 6, label: "6~9년차" },
  { value: 10, label: "10년차 이상" },
];

export function experienceLabel(years: number | null | undefined): string | null {
  if (years === null || years === undefined) return null;
  if (years <= 2) return "1~2년차";
  if (years <= 5) return "3~5년차";
  if (years <= 9) return "6~9년차";
  return "10년차 이상";
}

export const COMPANY_SIZES = ["대기업", "중견기업", "중소기업", "스타트업"] as const;

function normalizeIdPart(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function ensureUniqueId(baseId: string, usedIds: Set<string>) {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  const uniqueId = `${baseId}-${suffix}`;
  usedIds.add(uniqueId);
  return uniqueId;
}

export function normalizeWizardSteps(steps: WizardStep[] | null | undefined): WizardStep[] {
  const usedStepIds = new Set<string>();

  return (steps ?? []).map((step, stepIndex) => {
    const stepId = ensureUniqueId(normalizeIdPart(step.id, `step-${stepIndex + 1}`), usedStepIds);

    const usedPromptIds = new Set<string>();
    const prompts = (step.prompts ?? []).map((prompt, promptIndex) => {
      const promptId = ensureUniqueId(
        normalizeIdPart(prompt.id || prompt.label, `prompt-${promptIndex + 1}`),
        usedPromptIds,
      );

      const usedOptionIds = new Set<string>();
      const options =
        prompt.input_type === "single_select"
          ? (prompt.options ?? []).map((option, optionIndex) => ({
              ...option,
              id: ensureUniqueId(
                normalizeIdPart(option.id || option.label, `option-${optionIndex + 1}`),
                usedOptionIds,
              ),
            }))
          : [];

      return {
        ...prompt,
        id: promptId,
        guide: prompt.guide ?? "",
        options,
      };
    });

    return {
      ...step,
      id: stepId,
      prompts,
    };
  });
}

function fromRow(row: Record<string, unknown>): Mission {
  return {
    id: row.id as string,
    job_slug: row.job_slug as string,
    job_category: (row.job_category as string) ?? null,
    title: row.title as string,
    description: (row.description as string) ?? null,
    content_mode: (row.content_mode as MissionContentMode) ?? "legacy",
    situation: (row.situation as string) ?? null,
    data_points: (row.data_points as string[]) ?? [],
    material_blocks: (row.material_blocks as MaterialBlock[]) ?? [],
    questions: (row.questions as MissionQuestion[]) ?? [],
    wizard_intro_html: (row.wizard_intro_html as string) ?? null,
    wizard_intro_blocks: (row.wizard_intro_blocks as MaterialBlock[]) ?? [],
    wizard_steps: normalizeWizardSteps((row.wizard_steps as WizardStep[]) ?? []),
    duration_min: row.duration_min as number,
    difficulty: row.difficulty as MissionDifficulty,
    industries: (row.industries as string[]) ?? [],
    status: row.status as MissionStatus,
    author_id: (row.author_id as string) ?? null,
    is_expert_authored: (row.is_expert_authored as boolean) ?? false,
    author_name: row.author_name as string,
    author_role: (row.author_role as string) ?? null,
    submitted_competencies: (row.submitted_competencies as string[]) ?? [],
    frequent_tasks: (row.frequent_tasks as string) ?? null,
    years_experience: (row.years_experience as number) ?? null,
    industry_categories: (row.industry_categories as string[]) ?? [],
    summary_title: (row.summary_title as string) ?? null,
    summary_description: (row.summary_description as string) ?? null,
    recommended_for: (row.recommended_for as string) ?? null,
    included_results: (row.included_results as string[]) ?? [],
    mission_steps: (row.mission_steps as string[]) ?? [],
    preview_notice: (row.preview_notice as string) ?? null,
    locked_preview_text: (row.locked_preview_text as string) ?? null,
    sample_answer: (row.sample_answer as string) ?? null,
    expert_comment_html: (row.expert_comment_html as string) ?? null,
    offline_activity_html: (row.offline_activity_html as string) ?? null,
    reviewed_by: (row.reviewed_by as string) ?? null,
    company_size: (row.company_size as string) ?? null,
    company_name: (row.company_name as string) ?? null,
    industry: (row.industry as string) ?? null,
    verification_file_url: (row.verification_file_url as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// Columns safe for anonymous reads (excludes `sample_answer`, gated to authenticated users via column-level grants).
const PUBLIC_MISSION_COLUMNS =
  "id,job_slug,job_category,title,description,content_mode,situation,data_points,material_blocks,questions,wizard_intro_html,wizard_intro_blocks,wizard_steps,duration_min,difficulty,industries,status,author_id,is_expert_authored,author_name,author_role,submitted_competencies,frequent_tasks,years_experience,industry_categories,summary_title,summary_description,recommended_for,included_results,mission_steps,preview_notice,locked_preview_text,reviewed_by,company_size,company_name,industry,verification_file_url,created_at,updated_at";

export async function listMissions(): Promise<Mission[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => fromRow(r as Record<string, unknown>));
}

export async function listPublishedByJob(jobSlug: string): Promise<Mission[]> {
  const { data, error } = await supabase
    .from("missions")
    .select(PUBLIC_MISSION_COLUMNS)
    .eq("job_slug", jobSlug)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(fromRow);
}

export async function getMission(id: string): Promise<Mission | null> {
  const { data: auth } = await supabase.auth.getUser();
  const cols = auth.user ? "*" : PUBLIC_MISSION_COLUMNS;
  const { data, error } = await supabase.from("missions").select(cols).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as unknown as Record<string, unknown>) : null;
}

export async function updateMission(id: string, patch: Partial<Mission>) {
  const { error } = await supabase.from("missions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setMissionStatus(id: string, status: MissionStatus) {
  return updateMission(id, { status });
}

export async function deleteMission(id: string) {
  const { error } = await supabase.from("missions").delete().eq("id", id);
  if (error) throw error;
}

export type MissionSubmissionInput = {
  job_slug: string;
  title: string;
  description?: string;
  content_mode?: MissionContentMode;
  situation?: string;
  data_points?: string[];
  questions?: { id: string; label: string }[];
  duration_min?: number;
  difficulty?: MissionDifficulty;
  author_name: string;
  author_role: string;
  years_experience: number;
  industry_categories: string[];
  frequent_tasks: string;
  submitted_competencies: string[];
  company_size?: string | null;
  company_name?: string | null;
  industry?: string | null;
  verification_file_url?: string | null;
};

export async function submitExpertMission(input: MissionSubmissionInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("missions").insert({
    job_slug: input.job_slug,
    title: input.title,
    description: input.description ?? null,
    content_mode: input.content_mode ?? "legacy",
    situation: input.situation ?? null,
    data_points: input.data_points ?? [],
    questions: input.questions ?? [],
    duration_min: input.duration_min ?? 25,
    difficulty: input.difficulty ?? "medium",
    status: "review_pending",
    is_expert_authored: true,
    author_id: user.id,
    author_name: input.author_name,
    author_role: input.author_role,
    years_experience: input.years_experience,
    industry_categories: input.industry_categories,
    frequent_tasks: input.frequent_tasks,
    submitted_competencies: input.submitted_competencies,
    company_size: input.company_size ?? null,
    company_name: input.company_name ?? null,
    industry: input.industry ?? null,
    verification_file_url: input.verification_file_url ?? null,
  });
  if (error) throw error;
}

export type OfficialMissionInput = {
  job_slug: string;
  job_category?: string | null;
  title: string;
  description?: string | null;
  content_mode?: MissionContentMode;
  duration_min: number;
  difficulty: MissionDifficulty;
  status: MissionStatus;
  author_name: string;
  industries?: string[];
  // 시뮬레이션 내용
  situation?: string | null;
  data_points?: string[];
  material_blocks?: MaterialBlock[];
  questions?: MissionQuestion[];
  wizard_intro_html?: string | null;
  wizard_intro_blocks?: MaterialBlock[];
  wizard_steps?: WizardStep[];
  // 직전 요약
  summary_title?: string | null;
  summary_description?: string | null;
  recommended_for?: string | null;
  included_results?: string[];
  mission_steps?: string[];
  preview_notice?: string | null;
  locked_preview_text?: string | null;
  sample_answer?: string | null;
  expert_comment_html?: string | null;
  offline_activity_html?: string | null;
  // 현직자 정보
  author_role?: string | null;
  years_experience?: number | null;
  industry_categories?: string[];
  frequent_tasks?: string | null;
  submitted_competencies?: string[];
  is_expert_authored?: boolean;
  company_size?: string | null;
};

export async function createOfficialMission(input: OfficialMissionInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("missions").insert({
    ...input,
    description: input.description ?? null,
    content_mode: input.content_mode ?? "legacy",
    author_id: user?.id ?? null,
  });
  if (error) throw error;
}
