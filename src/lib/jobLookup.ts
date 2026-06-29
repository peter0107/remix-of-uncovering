import { JOBS } from "@/data/jobs";
import { listCustomJobs, type CustomJob } from "@/lib/customJobs";
import { supabase } from "@/integrations/supabase/client";

let cache: CustomJob[] | null = null;
let inflight: Promise<CustomJob[]> | null = null;
let realtimeBound = false;

function bindRealtimeInvalidation() {
  if (realtimeBound || typeof window === "undefined") return;
  realtimeBound = true;
  supabase
    .channel("custom-jobs-cache-invalidate")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "custom_jobs" },
      () => {
        cache = null;
      },
    )
    .subscribe();
}

async function loadCustom(): Promise<CustomJob[]> {
  bindRealtimeInvalidation();
  if (cache) return cache;
  if (!inflight) {
    inflight = listCustomJobs()
      .then((rows) => {
        cache = rows;
        return rows;
      })
      .catch(() => [])
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function invalidateJobCache() {
  cache = null;
}

export async function resolveJobName(slug: string): Promise<string> {
  // 관리자에서 수정한 custom_jobs를 우선 적용 (동일 slug일 경우 정적 JOBS보다 우선)
  const rows = await loadCustom();
  const custom = rows.find((r) => r.slug === slug);
  if (custom) return custom.name;
  const staticJob = JOBS.find((j) => j.slug === slug);
  if (staticJob) return staticJob.name;
  return slug;
}

export function useJobNames(slugs: string[]) {
  return Promise.all(slugs.map((s) => resolveJobName(s).then((name) => [s, name] as const)))
    .then((entries) => Object.fromEntries(entries) as Record<string, string>);
}
