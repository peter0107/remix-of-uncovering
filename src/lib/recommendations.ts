import { type Order } from "@/lib/orders";
import { JOBS } from "@/data/jobs";
import { listCustomJobs } from "@/lib/customJobs";
import { getRequiredCompetencies } from "@/data/jobCompetencies";
import { getCompetencyName } from "@/data/competencies";

export type CompetencyProfile = Record<string, { score: number; evidenceCount: number }>;

export type CompetencyDetail = {
  id: string;
  name: string;
  score: number | null; // null = 미측정
  level: "good" | "ok" | "weak" | "missing";
};

export type JobRecommendation = {
  slug: string;
  name: string;
  description?: string;
  fitPercent: number; // 예상 적합도 0-100
  evidenceCount: number; // 측정된 필요 역량 개수
  evidenceTotal: number; // 총 필요 역량 개수 (보통 6)
  finalScore: number; // 최종 추천 점수
  status: "high" | "ok" | "explore" | "more_needed";
  details: CompetencyDetail[];
  goodFits: CompetencyDetail[]; // ≥70
  weakPoints: CompetencyDetail[]; // <60 (측정됨)
  missingPoints: CompetencyDetail[]; // 미측정
};

// 1. 시뮬레이션 결과 → 세부 역량 프로필 생성
export function buildProfile(orders: Order[]): CompetencyProfile {
  const buckets: Record<string, number[]> = {};
  for (const o of orders) {
    if (!o.competencyScores) continue;
    // 모든 가격 옵션(single/compare/feedback) 체험 역량이 반영됨
    for (const [id, raw] of Object.entries(o.competencyScores)) {
      const v = Number(raw);
      if (!Number.isFinite(v)) continue;
      (buckets[id] ??= []).push(Math.max(0, Math.min(100, v)));
    }
  }
  const profile: CompetencyProfile = {};
  for (const [id, vals] of Object.entries(buckets)) {
    if (vals.length === 0) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    profile[id] = { score: Math.round(avg), evidenceCount: vals.length };
  }
  return profile;
}

function classify(score: number | null): CompetencyDetail["level"] {
  if (score === null) return "missing";
  if (score >= 70) return "good";
  if (score >= 60) return "ok";
  return "weak";
}

// 2. 단일 직무 추천 계산
export function scoreJob(
  slug: string,
  name: string,
  profile: CompetencyProfile,
  description?: string,
  overrideRequired?: string[],
): JobRecommendation {
  const required =
    overrideRequired && overrideRequired.length === 6
      ? overrideRequired
      : getRequiredCompetencies(slug);
  const details: CompetencyDetail[] = required.map((id) => {
    const entry = profile[id];
    const score = entry ? entry.score : null;
    return { id, name: getCompetencyName(id), score, level: classify(score) };
  });

  const measured = details.filter((d) => d.score !== null);
  const evidenceCount = measured.length;
  const evidenceTotal = required.length;
  const fitPercent =
    evidenceCount === 0
      ? 0
      : Math.round(measured.reduce((a, d) => a + (d.score ?? 0), 0) / evidenceCount);
  const evidenceRatio = evidenceTotal === 0 ? 0 : evidenceCount / evidenceTotal;
  const finalScore = Math.round(fitPercent * evidenceRatio);

  let status: JobRecommendation["status"];
  if (evidenceCount < 3) status = "more_needed";
  else if (finalScore >= 60) status = "high";
  else if (finalScore >= 45) status = "ok";
  else if (finalScore >= 30) status = "explore";
  else status = "more_needed";

  return {
    slug,
    name,
    description,
    fitPercent,
    evidenceCount,
    evidenceTotal,
    finalScore,
    status,
    details,
    goodFits: details.filter((d) => d.level === "good"),
    weakPoints: details.filter((d) => d.level === "weak"),
    missingPoints: details.filter((d) => d.level === "missing"),
  };
}

// 3. 모든 직무 추천 (정렬됨)
export async function rankJobs(profile: CompetencyProfile): Promise<JobRecommendation[]> {
  const customs = await listCustomJobs().catch(() => []);
  const jobs: { slug: string; name: string; description?: string; required?: string[] }[] = [
    ...JOBS.map((j) => ({ slug: j.slug, name: j.name, description: j.tagline })),
    ...customs.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description ?? undefined,
      required: c.required_competencies,
    })),
  ];
  // dedupe by slug (custom override 우선시 키)
  const seen = new Set<string>();
  const unique = jobs.filter((j) => (seen.has(j.slug) ? false : (seen.add(j.slug), true)));
  const ranked = unique.map((j) => scoreJob(j.slug, j.name, profile, j.description, j.required));
  // 정렬: 최종점수 → 근거 → 적합도
  ranked.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.evidenceCount !== a.evidenceCount) return b.evidenceCount - a.evidenceCount;
    return b.fitPercent - a.fitPercent;
  });
  return ranked;
}

export const STATUS_LABEL: Record<JobRecommendation["status"], string> = {
  high: "높은 추천",
  ok: "추천 가능",
  explore: "탐색 가능",
  more_needed: "추가 확인 필요",
};
