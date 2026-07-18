import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";

import { ExpertSimulationCard } from "@/components/ExpertSimulationCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/expert-simulations")({
  head: () => ({ meta: [{ title: "현직자 제시 시뮬레이션 — Beginner" }] }),
  component: ExpertSimulationsPage,
});

type ExpertSimulation = {
  id: string;
  title: string;
  roleLabel: string;
  description: string;
  domain: string;
  estimatedMinutes: number | null;
  nickname: string;
  companyType: string;
  experienceBand: string;
  jobTitle: string;
  backgroundColor: string;
  textColor: string;
};

function ExpertCardSkeleton() {
  return (
    <div className="flex aspect-[4/3] flex-col overflow-hidden rounded-md border border-zinc-100 bg-white">
      <Skeleton className="basis-[38%] shrink-0 w-full" />
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-3.5 w-5/6" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <div className="mt-auto flex items-center justify-between pt-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

function ExpertSimulationsPage() {
  const [simulations, setSimulations] = useState<ExpertSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error: queryError } = await supabase
        .from("job_simulations")
        .select(
          "id, title, role_label, job_family, description, domain, estimated_minutes, expert_nickname, expert_company_type, expert_experience_band, expert_job_title, card_background_color, card_text_color",
        )
        .eq("simulation_source", "expert")
        .eq("is_public", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (queryError) {
        setError("현직자 시뮬레이션을 불러오지 못했습니다.");
      } else {
        setSimulations(
          (data ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            roleLabel: row.role_label || row.job_family || row.title,
            description: row.description || "",
            domain: row.domain || "",
            estimatedMinutes: row.estimated_minutes,
            nickname: row.expert_nickname || "현직자",
            companyType: row.expert_company_type || "",
            experienceBand: row.expert_experience_band || "",
            jobTitle: row.expert_job_title || row.role_label || "",
            backgroundColor: row.card_background_color || "#ffffff",
            textColor: row.card_text_color || "#18181b",
          })),
        );
      }
      setLoading(false);
    }

    void load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <Link
        to="/simulations"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" /> 기업 시뮬레이션
      </Link>
      <h1 className="mt-5 text-2xl font-bold text-zinc-900 md:text-3xl">현직자 제시 시뮬레이션</h1>

      {error ? (
        <p className="mt-8 text-sm text-zinc-500">{error}</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <ExpertCardSkeleton />
              <ExpertCardSkeleton />
              <ExpertCardSkeleton />
            </>
          ) : simulations.length > 0 ? (
            simulations.map((simulation) => (
              <Link
                key={simulation.id}
                to="/simulation/$id"
                params={{ id: simulation.id }}
                className="block h-full"
              >
                <ExpertSimulationCard
                  nickname={simulation.nickname}
                  companyType={simulation.companyType}
                  experienceBand={simulation.experienceBand}
                  jobTitle={simulation.jobTitle}
                  roleLabel={simulation.roleLabel}
                  title={simulation.title}
                  description={simulation.description}
                  estimatedMinutes={simulation.estimatedMinutes}
                  backgroundColor={simulation.backgroundColor}
                  textColor={simulation.textColor}
                  className="h-full"
                />
              </Link>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center py-20 text-center text-zinc-500">
              <LayoutGrid className="h-8 w-8 text-zinc-300" />
              <p className="mt-4 text-sm">공개된 현직자 시뮬레이션이 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
