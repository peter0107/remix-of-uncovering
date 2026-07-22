import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { INITIAL_PROFILE_FORM, JobInterestFields } from "@/lib/profile-fields";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [jobInterests, setJobInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || user) return;
    navigate({ to: "/login", search: { redirect: "/onboarding" }, replace: true });
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!user) return;

    void supabase
      .from("job_seekers")
      .select("job_interests")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setJobInterests(data?.job_interests ?? []));
  }, [user]);

  const handleFinish = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase.from("job_seekers").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        job_interests: jobInterests,
      },
      { onConflict: "id" },
    );
    setSaving(false);

    if (error) {
      toast.error("저장 중 오류가 발생했어요. 다시 시도해 주세요.");
      return;
    }

    navigate({ to: "/expert-simulations" });
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-6 py-16">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">관심 있는 직무를 선택해주세요</h1>
        <div className="mt-8">
          <JobInterestFields
            data={{ ...INITIAL_PROFILE_FORM, job_interests: jobInterests }}
            setData={(partial) => {
              if (partial.job_interests) setJobInterests(partial.job_interests);
            }}
            showHeader={false}
          />
        </div>
      </div>

      <div className="mt-auto pt-10">
        <Button
          type="button"
          onClick={handleFinish}
          disabled={saving || jobInterests.length === 0}
          className="w-full rounded-md bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {saving ? "저장 중..." : "시작하기"}
        </Button>
      </div>
    </main>
  );
}
