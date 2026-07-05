import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "프로필 — Beginner" }] }),
  component: MyPage,
});

type ExternalLinks = { github?: string; portfolio?: string; linkedin?: string };

type CompletedSimulation = {
  submissionId: string;
  title: string;
  companyName: string;
  submittedAt: string | null;
};

function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [oneLineIntro, setOneLineIntro] = useState("");
  const [links, setLinks] = useState<ExternalLinks>({});
  const [history, setHistory] = useState<CompletedSimulation[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/my" } });
      return;
    }

    (async () => {
      const { data: seeker } = await supabase
        .from("job_seekers")
        .select("one_line_intro, external_links")
        .eq("id", user.id)
        .maybeSingle();

      setHasProfile(!!seeker);
      setOneLineIntro(seeker?.one_line_intro ?? "");
      setLinks((seeker?.external_links as ExternalLinks) ?? {});

      const { data: submissions } = await supabase
        .from("submissions")
        .select(
          "id, submitted_at, job_simulations(title, companies(name))",
        )
        .eq("job_seeker_id", user.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });

      type Row = {
        id: string;
        submitted_at: string | null;
        job_simulations: { title: string; companies: { name: string } | null } | null;
      };
      const rows = (submissions ?? []) as unknown as Row[];
      setHistory(
        rows.map((r) => ({
          submissionId: r.id,
          title: r.job_simulations?.title ?? "",
          companyName: r.job_simulations?.companies?.name ?? "",
          submittedAt: r.submitted_at,
        })),
      );
    })();
  }, [user, authLoading, navigate]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("job_seekers")
      .update({ one_line_intro: oneLineIntro || null, external_links: links })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("저장 중 오류가 발생했어요.");
      return;
    }
    toast.success("저장됐어요.");
  };

  if (authLoading || hasProfile === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900">아직 프로필이 없어요</h1>
          <p className="mt-2 text-sm text-zinc-500">
            온보딩을 완료하면 프로필과 추천 시뮬레이션을 볼 수 있어요.
          </p>
          <Link to="/onboarding">
            <Button className="mt-6 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700">
              온보딩 시작하기
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900">프로필</h1>

      <Card className="mt-6 p-6">
        <Label htmlFor="intro">한줄소개</Label>
        <Input
          id="intro"
          value={oneLineIntro}
          onChange={(e) => setOneLineIntro(e.target.value)}
          placeholder="나를 한 줄로 소개해보세요"
          maxLength={100}
          className="mt-2"
        />

        <div className="mt-6 grid gap-3">
          <div>
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              value={links.github ?? ""}
              onChange={(e) => setLinks((prev) => ({ ...prev, github: e.target.value }))}
              placeholder="https://github.com/..."
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="portfolio">포트폴리오</Label>
            <Input
              id="portfolio"
              value={links.portfolio ?? ""}
              onChange={(e) => setLinks((prev) => ({ ...prev, portfolio: e.target.value }))}
              placeholder="https://..."
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={links.linkedin ?? ""}
              onChange={(e) => setLinks((prev) => ({ ...prev, linkedin: e.target.value }))}
              placeholder="https://linkedin.com/in/..."
              className="mt-2"
            />
          </div>
        </div>

        <Button
          onClick={saveProfile}
          disabled={saving}
          className="mt-6 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
        >
          {saving ? "저장 중..." : "저장"}
        </Button>
      </Card>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">완료한 시뮬레이션</h2>
        {history === null ? (
          <Skeleton className="mt-4 h-24 w-full" />
        ) : history.length === 0 ? (
          <Card className="mt-4 p-6 text-center text-sm text-zinc-400">
            <FileText className="mx-auto h-8 w-8 opacity-40" />
            <p className="mt-2">아직 완료한 시뮬레이션이 없어요.</p>
            <Link to="/simulations" className="mt-3 inline-block text-sm text-zinc-600 underline">
              추천 시뮬레이션 보러 가기
            </Link>
          </Card>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((h) => (
              <li key={h.submissionId}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-zinc-900">{h.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {h.companyName}
                      {h.submittedAt &&
                        ` · ${new Date(h.submittedAt).toLocaleDateString("ko-KR")}`}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
