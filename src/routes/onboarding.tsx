import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  type ProfileFormData,
  INITIAL_PROFILE_FORM,
  EducationFields,
  JobInterestFields,
  CompanyInterestFields,
  WorkPreferenceFields,
  DiscoveryConsentFields,
  EDUCATION_SCHOOL_TYPES,
  EDUCATION_STATUS_OPTIONS,
} from "@/lib/profile-fields";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

type OnboardingData = ProfileFormData;
const INITIAL = INITIAL_PROFILE_FORM;

const STEP_LABELS = ["학력", "관심 직무", "관심 기업", "근무 선호", "공개 동의"];

// ─── 메인 페이지 ─────────────────────────────────────────────

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setDataRaw] = useState<OnboardingData>(INITIAL);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/onboarding" } });
    }
  }, [user, authLoading, navigate]);

  const setData = (partial: Partial<OnboardingData>) =>
    setDataRaw((prev) => ({ ...prev, ...partial }));

  const canProceed = () => {
    if (step === 1) {
      const hasSchoolType = EDUCATION_SCHOOL_TYPES.some((item) =>
        data.education_level.includes(item),
      );
      const hasStatus = EDUCATION_STATUS_OPTIONS.some((item) =>
        data.education_level.includes(item),
      );
      return Boolean(
        data.university_name.trim() && hasSchoolType && hasStatus && data.academic_mark,
      );
    }
    if (step === 2) return data.job_interests.length > 0;
    return true;
  };

  const handleFinish = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate({ to: "/login", search: { redirect: "/onboarding" } });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("job_seekers").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        education_level: data.education_level || null,
        majors: data.majors.length ? data.majors : null,
        academic_mark: data.academic_mark ? parseFloat(data.academic_mark) : null,
        job_interests: data.job_interests.length ? data.job_interests : null,
        company_interests: data.company_interests.length ? data.company_interests : null,
        work_regions: data.work_regions.length ? data.work_regions : null,
        employment_types: data.employment_types.length ? data.employment_types : null,
        willing_to_relocate: data.willing_to_relocate,
        discovery_consent: data.discovery_consent,
      },
      { onConflict: "id" },
    );

    setSaving(false);

    if (error) {
      toast.error("저장 중 오류가 발생했어요. 다시 시도해 주세요.");
      return;
    }

    toast.success("프로필이 저장됐어요!");
    navigate({ to: "/simulations" });
  };

  const progress = (step / 5) * 100;

  if (authLoading || !user) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* 상단 진행 바 */}
      <div className="h-1 bg-zinc-100">
        <div
          className="h-full bg-zinc-900 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        {/* 단계 표시 */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  i + 1 === step
                    ? "bg-zinc-900 text-white"
                    : i + 1 < step
                      ? "bg-zinc-200 text-zinc-500"
                      : "text-zinc-300",
                )}
              >
                {i + 1 < step ? "✓" : label}
              </div>
            ))}
          </div>
          <span className="text-xs text-zinc-400">
            {step} / 5
          </span>
        </div>

        {/* 단계별 콘텐츠 */}
        <div className="mt-8">
          {step === 1 && <EducationFields data={data} setData={setData} />}
          {step === 2 && <JobInterestFields data={data} setData={setData} />}
          {step === 3 && <CompanyInterestFields data={data} setData={setData} />}
          {step === 4 && <WorkPreferenceFields data={data} setData={setData} />}
          {step === 5 && <DiscoveryConsentFields data={data} setData={setData} />}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="mt-10 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="min-w-28 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              다음
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="min-w-36 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              {saving ? "저장 중..." : "시작하기"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
