import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { JOBS } from "@/data/jobs";
import { getRequiredCompetencies } from "@/data/jobCompetencies";
import { getCompetencyName } from "@/data/competencies";

export type SummaryChip = { id: string; name: string };

export type CareerSummary =
  | {
      locked: true;
      hasExperience: boolean;
    }
  | {
      locked: false;
      top: {
        slug: string;
        name: string;
        finalScore: number;
        evidenceCount: number;
        evidenceTotal: number;
        goodFits: SummaryChip[];
        weakPoints: SummaryChip[];
        missingPoints: SummaryChip[];
      } | null;
      completedCount: number;
      highOkCount: number;
    };

type OrderRow = {
  id: string;
  product_id: string;
  status: string;
  competency_scores: Record<string, number> | null;
};

type CustomJobRow = {
  slug: string;
  name: string;
  required_competencies: string[] | null;
};

export const getCareerSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CareerSummary> => {
    const { supabase } = context;

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, product_id, status, competency_scores");
    if (error) throw error;

    const rows = (orders ?? []) as OrderRow[];

    // 잠금 해제: 항상 오픈 (결제 없이 무조건 표시)
    const unlocked = true;

    const completedStatuses = new Set([
      "submitted",
      "report_pending",
      "report_ready",
      "feedback_ready",
    ]);
    const experienceOrders = rows.filter((o) => o.product_id !== "summary");
    const completedCount = experienceOrders.filter((o) =>
      completedStatuses.has(o.status),
    ).length;
    const hasExperience = experienceOrders.length > 0;

    if (!unlocked) {
      return { locked: true, hasExperience };
    }


    // 프로필 빌드 (서버에서만 계산)
    const buckets: Record<string, number[]> = {};
    for (const o of rows) {
      if (!o.competency_scores) continue;
      for (const [id, raw] of Object.entries(o.competency_scores)) {
        const v = Number(raw);
        if (!Number.isFinite(v)) continue;
        (buckets[id] ??= []).push(Math.max(0, Math.min(100, v)));
      }
    }
    const profile: Record<string, { score: number; evidenceCount: number }> = {};
    for (const [id, vals] of Object.entries(buckets)) {
      if (vals.length === 0) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      profile[id] = { score: Math.round(avg), evidenceCount: vals.length };
    }

    const { data: customs } = await supabase
      .from("custom_jobs")
      .select("slug, name, required_competencies");
    const customRows = (customs ?? []) as CustomJobRow[];

    const jobs: { slug: string; name: string; required?: string[] }[] = [
      ...JOBS.map((j) => ({ slug: j.slug, name: j.name })),
      ...customRows.map((c) => ({
        slug: c.slug,
        name: c.name,
        required: c.required_competencies ?? undefined,
      })),
    ];
    const seen = new Set<string>();
    const unique = jobs.filter((j) =>
      seen.has(j.slug) ? false : (seen.add(j.slug), true),
    );

    type Ranked = {
      slug: string;
      name: string;
      finalScore: number;
      fitPercent: number;
      evidenceCount: number;
      evidenceTotal: number;
      status: "high" | "ok" | "explore" | "more_needed";
      goodFits: SummaryChip[];
      weakPoints: SummaryChip[];
      missingPoints: SummaryChip[];
    };

    const ranked: Ranked[] = unique.map((j) => {
      const required =
        j.required && j.required.length === 6
          ? j.required
          : getRequiredCompetencies(j.slug);
      const details = required.map((id) => {
        const entry = profile[id];
        const score = entry ? entry.score : null;
        const level: "good" | "ok" | "weak" | "missing" =
          score === null
            ? "missing"
            : score >= 70
              ? "good"
              : score >= 60
                ? "ok"
                : "weak";
        return { id, name: getCompetencyName(id), score, level };
      });
      const measured = details.filter((d) => d.score !== null);
      const evidenceCount = measured.length;
      const evidenceTotal = required.length;
      const fitPercent =
        evidenceCount === 0
          ? 0
          : Math.round(
              measured.reduce((a, d) => a + (d.score ?? 0), 0) / evidenceCount,
            );
      const evidenceRatio = evidenceTotal === 0 ? 0 : evidenceCount / evidenceTotal;
      const finalScore = Math.round(fitPercent * evidenceRatio);
      let status: Ranked["status"];
      if (evidenceCount < 3) status = "more_needed";
      else if (finalScore >= 60) status = "high";
      else if (finalScore >= 45) status = "ok";
      else if (finalScore >= 30) status = "explore";
      else status = "more_needed";
      return {
        slug: j.slug,
        name: j.name,
        finalScore,
        fitPercent,
        evidenceCount,
        evidenceTotal,
        status,
        goodFits: details
          .filter((d) => d.level === "good")
          .map((d) => ({ id: d.id, name: d.name })),
        weakPoints: details
          .filter((d) => d.level === "weak")
          .map((d) => ({ id: d.id, name: d.name })),
        missingPoints: details
          .filter((d) => d.level === "missing")
          .map((d) => ({ id: d.id, name: d.name })),
      };
    });

    ranked.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (b.evidenceCount !== a.evidenceCount)
        return b.evidenceCount - a.evidenceCount;
      return b.fitPercent - a.fitPercent;
    });

    const top = ranked[0] ?? null;
    const highOkCount = ranked.filter(
      (r) => r.status === "high" || r.status === "ok",
    ).length;

    // 측정 데이터가 전혀 없으면 top을 null 로 (기본 직무가 떠있는 현상 방지)
    const hasAnyMeasured = ranked.some((r) => r.evidenceCount > 0);
    const effectiveTop = hasAnyMeasured ? top : null;

    return {
      locked: false,
      top: effectiveTop
        ? {
            slug: effectiveTop.slug,
            name: effectiveTop.name,
            finalScore: effectiveTop.finalScore,
            evidenceCount: effectiveTop.evidenceCount,
            evidenceTotal: effectiveTop.evidenceTotal,
            goodFits: effectiveTop.goodFits.slice(0, 3),
            weakPoints: effectiveTop.weakPoints.slice(0, 2),
            missingPoints: effectiveTop.missingPoints.slice(0, 2),
          }
        : null,
      completedCount,
      highOkCount,
    };

  });
