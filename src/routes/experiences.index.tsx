import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Check, Clock, ArrowRight, MessageSquarePlus, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JOB_CATEGORIES } from "@/data/jobCategories";
import { listCustomJobs, type CustomJob } from "@/lib/customJobs";
import { RequestMissionDialog } from "@/components/RequestMissionDialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/experiences/")({
  head: () => ({
    meta: [
      { title: "직무 탐색 — beginner" },
      {
        name: "description",
        content: "산업군과 직무를 선택하고 시뮬레이션을 체험해 보세요.",
      },
    ],
  }),
  component: ExperiencesPage,
});

type DisplayJob = {
  slug: string;
  name: string;
  description: string;
  duration: string;
  status: "available" | "preparing";
  categoryId: string;
};

const DEFAULT_DURATION = "20~30분";
const ALL = "all";

function ExperiencesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [allJobs, setAllJobs] = useState<DisplayJob[]>([]);
  const [missionCounts, setMissionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    listCustomJobs()
      .then((rows: CustomJob[]) => {
        setAllJobs(
          rows.map((r) => ({
            slug: r.slug,
            name: r.name,
            description: r.description ?? "",
            duration: DEFAULT_DURATION,
            status: r.status,
            categoryId: r.category_id,
          })),
        );
      })
      .catch(() => setAllJobs([]));

    supabase
      .from("missions")
      .select("job_slug")
      .eq("status", "published")
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((m: { job_slug: string }) => {
          counts[m.job_slug] = (counts[m.job_slug] ?? 0) + 1;
        });
        setMissionCounts(counts);
      });
  }, []);

  // Only show categories that have at least one job
  const availableCategories = useMemo(() => {
    const ids = new Set(allJobs.map((j) => j.categoryId));
    return JOB_CATEGORIES.filter((c) => ids.has(c.id));
  }, [allJobs]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = allJobs.filter((j) => {
      if (categoryId !== ALL && j.categoryId !== categoryId) return false;
      if (!q) return true;
      return `${j.name} ${j.description}`.toLowerCase().includes(q);
    });
    return [...filtered].sort((a, b) => {
      // available first
      if (a.status !== b.status) return a.status === "available" ? -1 : 1;
      // then group by category
      return a.categoryId.localeCompare(b.categoryId);
    });
  }, [allJobs, categoryId, query]);

  const categoryNameById = useMemo(
    () => Object.fromEntries(JOB_CATEGORIES.map((c) => [c.id, c.name])),
    [],
  );

  return (
    <div className="bg-muted/30 pb-10">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary md:text-3xl">직무 선택</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            체험하고 싶은 직무를 선택해 시뮬레이션을 시작해 보세요.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4 w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="직무 검색"
            className="h-10 rounded-lg bg-background pl-10 text-sm"
          />
        </div>

        {/* Category filter chips */}
        <div className="mb-6 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2">
            <CategoryChip
              label="전체"
              active={categoryId === ALL}
              onClick={() => setCategoryId(ALL)}
            />
            {availableCategories.map((c) => {
              const Icon = c.icon;
              return (
                <CategoryChip
                  key={c.id}
                  label={c.name}
                  icon={<Icon className="h-3 w-3" />}
                  active={categoryId === c.id}
                  onClick={() => setCategoryId(c.id)}
                />
              );
            })}
          </div>
        </div>

        <Card className="p-6 md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-primary">
              {categoryId === ALL ? "전체 직무" : categoryNameById[categoryId]}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {filteredJobs.length}건
              </span>
            </h2>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <p className="text-sm text-muted-foreground">
                {query.trim()
                  ? `"${query}"에 해당하는 직무가 없습니다.`
                  : "이 카테고리에는 아직 직무가 없습니다."}
              </p>
              <Button className="mt-4" onClick={() => setRequestOpen(true)}>
                직무 체험 요청하기
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job, idx) => {
                const key = job.slug ?? `${job.name}-${idx}`;
                const selected = !!job.slug && job.slug === selectedSlug;
                const disabled = job.status === "preparing";
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (disabled || !job.slug) return;
                      setSelectedSlug(job.slug);
                      navigate({ to: "/experiences/$slug", params: { slug: job.slug } });
                    }}
                    className={`group relative flex h-full flex-col gap-3 rounded-xl border bg-background p-5 text-left transition-all ${
                      selected
                        ? "border-brand ring-2 ring-brand/30"
                        : "border-border hover:border-brand/40 hover:shadow-sm"
                    } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
                  >
                    {selected && (
                      <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-brand text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    )}
                    <span className="w-fit rounded-md bg-brand-soft/60 px-2 py-0.5 text-[11px] font-semibold text-brand">
                      {categoryNameById[job.categoryId] ?? "직무"}
                    </span>
                    <h3 className={`text-base font-bold text-primary ${disabled ? "blur-[1px]" : ""}`}>{job.name}</h3>
                    <p className={`whitespace-pre-line text-sm leading-relaxed text-foreground/75 ${disabled ? "blur-[1px]" : ""}`}>
                      {job.description}
                    </p>
                    <div className={`mt-auto flex items-center justify-between border-t border-border pt-3 text-xs ${disabled ? "blur-[1px]" : ""}`}>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {job.duration}
                      </span>
                      <span
                        className={`font-semibold ${disabled ? "text-muted-foreground" : "text-brand"}`}
                      >
                        {disabled
                          ? "준비 중"
                          : `${missionCounts[job.slug] ?? 0}개 체험 가능`}
                      </span>
                    </div>
                    {disabled && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/50 backdrop-blur-[2px]">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        </span>
                        <span className="mt-2 text-sm font-semibold text-muted-foreground">
                          준비 중
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Always-on request card */}
              <button
                type="button"
                onClick={() => setRequestOpen(true)}
                className="group relative flex h-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-brand/40 bg-brand-soft/20 p-5 text-center transition-all hover:border-brand hover:bg-brand-soft/40"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-white">
                  <MessageSquarePlus className="h-6 w-6" />
                </span>
                <h3 className="text-base font-bold text-primary">
                  체험하고 싶은 직무가 없나요?
                </h3>
                <p className="text-sm leading-relaxed text-foreground/70">
                  원하는 직무를 알려주세요.
                  <br />
                  운영팀이 시뮬레이션 제작을 검토합니다.
                </p>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  직무 체험 요청하기
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </div>
          )}
        </Card>
      </div>

      <RequestMissionDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        categoryName={
          categoryId !== ALL ? categoryNameById[categoryId] : undefined
        }
      />
    </div>
  );
}

function CategoryChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-border bg-background text-foreground/80 hover:border-brand/40 hover:bg-brand-soft/30"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
