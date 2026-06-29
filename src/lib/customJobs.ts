import { supabase } from "@/integrations/supabase/client";

export type CustomJobStatus = "available" | "preparing";

export type CustomJob = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  slug: string;
  status: CustomJobStatus;
  required_competencies: string[];
  created_at: string;
  updated_at: string;
};

export async function listCustomJobs(): Promise<CustomJob[]> {
  const { data, error } = await supabase
    .from("custom_jobs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomJob[];
}

export async function createCustomJob(input: {
  category_id: string;
  name: string;
  description?: string | null;
  slug: string;
  status?: CustomJobStatus;
  required_competencies?: string[];
}) {
  const { error } = await supabase.from("custom_jobs").insert({
    category_id: input.category_id,
    name: input.name,
    description: input.description ?? null,
    slug: input.slug,
    status: input.status ?? "available",
    required_competencies: input.required_competencies ?? [],
  });
  if (error) throw error;
}

export async function updateCustomJob(
  id: string,
  patch: Partial<
    Pick<
      CustomJob,
      "category_id" | "name" | "description" | "slug" | "status" | "required_competencies"
    >
  >,
) {
  const { error } = await supabase.from("custom_jobs").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCustomJob(id: string) {
  const { error } = await supabase.from("custom_jobs").delete().eq("id", id);
  if (error) throw error;
}
