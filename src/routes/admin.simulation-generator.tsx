import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/BrandLogo";
import { RichTextContent } from "@/components/RichTextEditor";
import { DOMAIN_CATEGORIES } from "@/lib/domain-categories";
import {
  generateSimulationDraft,
  type GeneratedSimulationDraft,
} from "@/lib/simulation-generator.functions";
import {
  createCompanySimulation,
  getAdminCompanies,
  type AdminCompany,
} from "@/lib/simulations.functions";

export const Route = createFileRoute("/admin/simulation-generator")({
  head: () => ({
    meta: [
      { title: "Beginner - JD 시뮬레이션 생성기" },
      { name: "description", content: "채용공고에서 직무 시뮬레이션 초안을 생성합니다." },
    ],
  }),
  component: AdminSimulationGenerator,
});

const PLATFORMS = [
  "잡코리아",
  "사람인",
  "리멤버",
  "인크루트",
  "원티드",
  "잡플래닛",
  "기업 채용페이지",
  "기타",
] as const;

type SourceInput = { platform: string; jd: string };

function createSource(platform: string = PLATFORMS[0]): SourceInput {
  return { platform, jd: "" };
}

function buildRationaleMarkdown(draft: GeneratedSimulationDraft): string {
  const lines: string[] = [];
  lines.push(`# ${draft.simulation.title} — 생성 근거`);
  lines.push("");
  lines.push("## 평가 기준");
  draft.rationale.criteria.forEach((c, i) => {
    lines.push(`${i + 1}. **${c.title}**`);
    c.sources.forEach((s) => lines.push(`   - [${s.platform}] "${s.quote}"`));
    if (c.reflectedIn) lines.push(`   - 반영: ${c.reflectedIn}`);
  });
  if (draft.rationale.unreflected.length) {
    lines.push("");
    lines.push("## 미반영 요건");
    draft.rationale.unreflected.forEach((u) => lines.push(`- ${u.requirement} — ${u.reason}`));
  }
  return lines.join("\n");
}

function AdminSimulationGenerator() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const loadedUserIdRef = useRef<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [domain, setDomain] = useState<string>(DOMAIN_CATEGORIES[0]);
  const [sources, setSources] = useState<SourceInput[]>([createSource()]);
  const [note, setNote] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<GeneratedSimulationDraft | null>(null);
  const [saveCompanyCode, setSaveCompanyCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      const rows = await getAdminCompanies();
      setCompanies(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "기업 목록을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      navigate({ to: "/login", search: { redirect: "/admin/simulation-generator" } });
      return;
    }
    if (loadedUserIdRef.current === userId) return;
    loadedUserIdRef.current = userId;
    void loadCompanies();
  }, [authLoading, userId, navigate, loadCompanies]);

  const canGenerate =
    companyName.trim().length > 0 &&
    roleName.trim().length > 0 &&
    sources.some((s) => s.jd.trim().length > 0);

  function updateSource(index: number, patch: Partial<SourceInput>) {
    setSources((current) =>
      current.map((source, i) => (i === index ? { ...source, ...patch } : source)),
    );
  }

  function addSource() {
    setSources((current) => [...current, createSource()]);
  }

  function removeSource(index: number) {
    setSources((current) =>
      current.length <= 1 ? current : current.filter((_, i) => i !== index),
    );
  }

  async function handleGenerate() {
    if (!canGenerate || isGenerating) return;
    const cleanedSources = sources
      .map((s) => ({ platform: s.platform.trim(), jd: s.jd.trim() }))
      .filter((s) => s.jd.length > 0);
    if (cleanedSources.length === 0) {
      toast.error("JD를 최소 한 개 이상 붙여넣어 주세요.");
      return;
    }

    setIsGenerating(true);
    setDraft(null);
    try {
      const result = await generateSimulationDraft({
        data: {
          companyName: companyName.trim(),
          roleName: roleName.trim(),
          domain: domain as (typeof DOMAIN_CATEGORIES)[number],
          sources: cleanedSources,
          note: note.trim(),
        },
      });
      setDraft(result);
      // 기업명이 일치하는 등록 기업이 있으면 저장 대상으로 미리 선택
      const matched = companies.find((c) => c.name.trim() === result.companyName.trim());
      setSaveCompanyCode(matched?.code ?? "");
      toast.success("시뮬레이션 초안을 생성했어요.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "생성에 실패했어요.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!draft || isSaving) return;
    if (!saveCompanyCode) {
      toast.error("저장할 기업을 선택해주세요. 등록된 기업이 없다면 먼저 기업을 추가하세요.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await createCompanySimulation({
        data: {
          companyCode: saveCompanyCode,
          title: draft.simulation.title,
          roleLabel: draft.simulation.roleLabel,
          description: draft.simulation.description,
          cardImageUrl: "",
          jobFamily: draft.simulation.roleLabel,
          domain: draft.domain as (typeof DOMAIN_CATEGORIES)[number],
          estimatedMinutes: draft.simulation.estimatedMinutes,
          simulationFormat: "selection",
          selectionMode: "separated",
          singleAnswerQuestion: "",
          taskPrompt: "",
          sharedSituation: "",
          sharedMaterials: "",
          steps: draft.simulation.steps,
        },
      });
      void result;
      toast.success("비공개 시뮬레이션으로 저장했어요. 시뮬레이션 관리에서 공개·수정할 수 있어요.");
      navigate({ to: "/admin/simulations" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyRationale() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(buildRationaleMarkdown(draft));
      toast.success("근거를 마크다운으로 복사했어요.");
    } catch {
      toast.error("복사에 실패했어요.");
    }
  }

  return (
    <AdminShell>
      <div className="border-b border-neutral-200 pb-6">
        <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wand2 className="h-6 w-6 text-neutral-700" /> JD 시뮬레이션 생성기
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          채용공고를 붙여넣으면 평가 기준을 추출해 스텝형 시뮬레이션 초안을 만듭니다. 생성물은 비공개로
          저장되며, 시뮬레이션 관리에서 공개·수정할 수 있습니다.
        </p>
      </div>

      {/* 입력 */}
      <section className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">기업명</span>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="예: 당근마켓"
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">직무명</span>
            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="예: 그로스마케터"
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
            />
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium">도메인</span>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="h-10 max-w-xs rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
          >
            {DOMAIN_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">JD 소스 (1개 이상)</span>
            <button
              type="button"
              onClick={addSource}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-neutral-300 px-2.5 text-xs font-medium hover:bg-neutral-50"
            >
              <Plus className="h-3.5 w-3.5" /> 소스 추가
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {sources.map((source, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-[140px_1fr]"
              >
                <div className="flex flex-col gap-2">
                  <select
                    value={source.platform}
                    onChange={(e) => updateSource(index, { platform: e.target.value })}
                    className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm outline-none focus:border-neutral-900"
                  >
                    {PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                  {sources.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSource(index)}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-neutral-200 text-xs text-neutral-500 hover:bg-neutral-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> 삭제
                    </button>
                  )}
                </div>
                <textarea
                  value={source.jd}
                  onChange={(e) => updateSource(index, { jd: e.target.value })}
                  placeholder="채용공고의 주요업무·자격요건·우대사항을 붙여넣어 주세요."
                  className="min-h-[120px] w-full resize-y rounded-md border border-neutral-300 bg-white p-3 text-sm leading-6 outline-none focus:border-neutral-900"
                />
              </div>
            ))}
          </div>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium">참고사항 (선택)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 초심자도 40분 안에 끝낼 수 있는 난이도로"
            className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
          />
        </label>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> {isGenerating ? "생성 중..." : "시뮬레이션 생성"}
          </button>
          <span className="text-xs text-neutral-500">생성에 30초~1분 정도 걸려요.</span>
        </div>
      </section>

      {/* 로딩 */}
      {isGenerating && (
        <div className="mt-8 animate-pulse rounded-md border border-neutral-200 p-6">
          <div className="h-4 w-1/3 rounded bg-neutral-200" />
          <div className="mt-4 h-3 w-full rounded bg-neutral-100" />
          <div className="mt-2 h-3 w-5/6 rounded bg-neutral-100" />
          <div className="mt-2 h-3 w-2/3 rounded bg-neutral-100" />
        </div>
      )}

      {/* 결과 */}
      {draft && !isGenerating && (
        <section className="mt-8 border-t border-neutral-200 pt-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            {/* 초안 */}
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-neutral-500">생성된 초안</h2>
              <div className="mt-3 rounded-md border border-neutral-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold text-neutral-900">{draft.simulation.title}</p>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    비공개
                  </span>
                </div>
                {draft.simulation.description && (
                  <p className="mt-1.5 text-sm text-neutral-500">{draft.simulation.description}</p>
                )}
                <p className="mt-1 text-xs text-neutral-400">
                  {draft.simulation.roleLabel} · {draft.domain}
                  {draft.simulation.estimatedMinutes
                    ? ` · 약 ${draft.simulation.estimatedMinutes}분`
                    : ""}
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  {draft.simulation.steps.map((step, i) => (
                    <details key={step.id} className="rounded-md border border-neutral-200">
                      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-neutral-800">
                        <span>
                          <span className="text-neutral-400">스텝 {i + 1} ·</span> {step.title}
                        </span>
                        <span className="shrink-0 text-xs text-neutral-400">
                          {step.difficulty ? `★${step.difficulty}` : ""}
                          {step.durationMin ? ` · ${step.durationMin}분` : ""}
                        </span>
                      </summary>
                      <div className="border-t border-neutral-100 px-3 py-3">
                        {step.situation && (
                          <StepBlock label="상황 안내" value={step.situation} />
                        )}
                        {step.materials && (
                          <StepBlock label="제공 자료" value={step.materials} />
                        )}
                        <StepBlock label="질문" value={step.prompts[0]?.body ?? ""} />
                        {step.hint && <StepBlock label="힌트" value={step.hint} />}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>

            {/* 근거 */}
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-neutral-500">생성 근거</h2>
              <div className="mt-3 rounded-md border border-neutral-200 p-4">
                {draft.rationale.criteria.length === 0 && (
                  <p className="text-sm text-neutral-400">추출된 평가 기준이 없어요.</p>
                )}
                <div className="flex flex-col gap-4">
                  {draft.rationale.criteria.map((c, i) => (
                    <div key={i}>
                      <p className="text-sm font-semibold text-neutral-900">
                        평가 기준 {i + 1} · {c.title}
                      </p>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        {c.sources.map((s, si) => (
                          <div
                            key={si}
                            className="rounded-r-md border-l-2 border-emerald-500 bg-emerald-50 px-2.5 py-1.5"
                          >
                            <p className="text-[11px] font-semibold text-emerald-700">
                              {s.platform || "JD"} 인용
                            </p>
                            <p className="text-xs text-neutral-700">"{s.quote}"</p>
                          </div>
                        ))}
                      </div>
                      {c.reflectedIn && (
                        <p className="mt-1 text-xs text-neutral-500">→ {c.reflectedIn}</p>
                      )}
                    </div>
                  ))}
                </div>

                {draft.rationale.unreflected.length > 0 && (
                  <div className="mt-4 border-t border-neutral-100 pt-4">
                    <p className="text-xs font-semibold text-amber-700">미반영 요건</p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {draft.rationale.unreflected.map((u, i) => (
                        <li
                          key={i}
                          className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800"
                        >
                          <span className="font-medium">{u.requirement}</span> — {u.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 저장 바 */}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">저장할 기업</span>
              <select
                value={saveCompanyCode}
                onChange={(e) => setSaveCompanyCode(e.target.value)}
                className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm outline-none focus:border-neutral-900"
              >
                <option value="">기업 선택…</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.code}>
                    {company.name} ({company.code})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "비공개로 저장"}
            </button>
            <button
              type="button"
              onClick={handleCopyRationale}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50"
            >
              근거 마크다운 복사
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              다시 생성
            </button>
          </div>
          {companies.length === 0 && (
            <p className="mt-3 text-xs text-amber-700">
              등록된 기업이 없어요.{" "}
              <Link to="/admin/simulations" className="underline">
                시뮬레이션 관리
              </Link>
              에서 기업을 먼저 추가하면 저장할 수 있어요.
            </p>
          )}
        </section>
      )}
    </AdminShell>
  );
}

function StepBlock({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="mt-2 first:mt-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <div className="prose prose-sm prose-neutral mt-1 max-w-none prose-table:text-xs prose-headings:text-sm">
        <RichTextContent value={value} compact />
      </div>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-14 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6">
        <Link to="/admin" className="text-sm font-semibold tracking-tight">
          <BrandLogo className="inline-block h-5 w-auto align-middle" />
          <span className="ml-1 text-xs font-normal text-neutral-500">Admin</span>
        </Link>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          기업 페이지
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
