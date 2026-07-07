import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, ListChecks, Plus, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  createCompany,
  createCompanySimulation,
  getAdminCompanies,
  getAdminCompanySimulations,
  updateCompanySimulation,
  type AdminCompany,
  type AdminCompanySimulation,
} from "@/lib/simulations.functions";
import { DOMAIN_CATEGORIES, type DomainCategory } from "@/lib/domain-categories";

type SimulationForm = {
  companyCode: string;
  roleLabel: string;
  title: string;
  description: string;
  jobFamily: string;
  domain: string;
  estimatedMinutes: string;
  taskPrompt: string;
};

type CompanyForm = {
  name: string;
  code: string;
  roleLabel: string;
};

const EMPTY_COMPANY_FORM: CompanyForm = {
  name: "",
  code: "",
  roleLabel: "",
};

function createEmptyForm(companyCode = ""): SimulationForm {
  return {
    companyCode,
    roleLabel: "",
    title: "",
    description: "",
    jobFamily: "",
    domain: DOMAIN_CATEGORIES[0],
    estimatedMinutes: "60",
    taskPrompt: "",
  };
}

function formFromSimulation(simulation: AdminCompanySimulation): SimulationForm {
  return {
    companyCode: simulation.companyCode,
    roleLabel: simulation.roleLabel,
    title: simulation.title,
    description: simulation.description,
    jobFamily: simulation.jobFamily,
    domain: DOMAIN_CATEGORIES.includes(simulation.domain as (typeof DOMAIN_CATEGORIES)[number])
      ? simulation.domain
      : DOMAIN_CATEGORIES[0],
    estimatedMinutes: simulation.estimatedMinutes ? String(simulation.estimatedMinutes) : "",
    taskPrompt: simulation.taskPrompt,
  };
}

const EMPTY_FORM: SimulationForm = {
  companyCode: "",
  roleLabel: "",
  title: "",
  description: "",
  jobFamily: "",
  domain: DOMAIN_CATEGORIES[0],
  estimatedMinutes: "60",
  taskPrompt: "",
};

export const Route = createFileRoute("/admin/simulations")({
  head: () => ({
    meta: [
      { title: "Beginner - 직무 시뮬레이션 관리자" },
      { name: "description", content: "기업별 직무 시뮬레이션을 관리합니다." },
    ],
  }),
  component: AdminSimulations,
});

function AdminSimulations() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [simulations, setSimulations] = useState<AdminCompanySimulation[]>([]);
  const [form, setForm] = useState<SimulationForm>(EMPTY_FORM);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(EMPTY_COMPANY_FORM);
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [selectedCompanyCode, setSelectedCompanyCode] = useState("");
  const [selectedSimulationId, setSelectedSimulationId] = useState<string | null>(null);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const companiesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const simulation of simulations) {
      counts.set(simulation.companyCode, (counts.get(simulation.companyCode) ?? 0) + 1);
    }

    return companies.map((company) => ({
      ...company,
      simulationCount: counts.get(company.code) ?? 0,
    }));
  }, [companies, simulations]);

  const selectedCompany = useMemo(
    () => companiesWithCounts.find((company) => company.code === selectedCompanyCode) ?? null,
    [companiesWithCounts, selectedCompanyCode],
  );

  const companySimulations = useMemo(
    () =>
      simulations
        .filter((simulation) => simulation.companyCode === selectedCompanyCode)
        .sort((a, b) => a.roleLabel.localeCompare(b.roleLabel, "ko-KR")),
    [simulations, selectedCompanyCode],
  );

  const isEditing = selectedSimulationId !== null;

  const selectSimulation = useCallback((simulation: AdminCompanySimulation) => {
    setSelectedSimulationId(simulation.id);
    setForm(formFromSimulation(simulation));
    setMessage(null);
    setError(null);
  }, []);

  const startNewSimulation = useCallback((companyCode: string) => {
    setSelectedSimulationId(null);
    setForm(createEmptyForm(companyCode));
    setMessage(null);
    setError(null);
  }, []);

  const loadSimulations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [companyData, simulationData] = await Promise.all([
        getAdminCompanies(),
        getAdminCompanySimulations(),
      ]);
      setCompanies(companyData);
      setSimulations(simulationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "관리자 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/admin/simulations" } });
      return;
    }
    void loadSimulations();
  }, [authLoading, user, navigate, loadSimulations]);

  useEffect(() => {
    if (isLoading || hasInitializedSelection || companies.length === 0) return;
    const firstCompany = companies[0];
    setSelectedCompanyCode(firstCompany.code);
    const firstSimulation = simulations.find(
      (simulation) => simulation.companyCode === firstCompany.code,
    );
    if (firstSimulation) {
      selectSimulation(firstSimulation);
    } else {
      startNewSimulation(firstCompany.code);
    }
    setHasInitializedSelection(true);
  }, [
    companies,
    hasInitializedSelection,
    isLoading,
    selectSimulation,
    simulations,
    startNewSimulation,
  ]);

  function updateForm<K extends keyof SimulationForm>(key: K, value: SimulationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCompanyForm<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setCompanyForm((current) => ({ ...current, [key]: value }));
  }

  function selectCompany(companyCode: string) {
    setSelectedCompanyCode(companyCode);
    const firstSimulation = simulations.find(
      (simulation) => simulation.companyCode === companyCode,
    );
    if (firstSimulation) {
      selectSimulation(firstSimulation);
    } else {
      startNewSimulation(companyCode);
    }
  }

  async function submitCompany(event: FormEvent) {
    event.preventDefault();
    if (isCreatingCompany) return;

    setIsCreatingCompany(true);
    setMessage(null);
    setError(null);
    try {
      const company = await createCompany({
        data: {
          name: companyForm.name.trim(),
          code: companyForm.code.trim(),
          roleLabel: companyForm.roleLabel.trim(),
        },
      });

      setCompanyForm(EMPTY_COMPANY_FORM);
      setIsCompanyFormOpen(false);
      setHasInitializedSelection(true);
      setSelectedCompanyCode(company.code);
      startNewSimulation(company.code);
      await loadSimulations();
      setMessage(
        `${company.name} 기업을 추가했습니다. /biz에서 ${company.code} 코드로 접속할 수 있습니다.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "기업을 추가하지 못했습니다.");
    } finally {
      setIsCreatingCompany(false);
    }
  }

  async function submitSimulation(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const estimatedMinutes = form.estimatedMinutes.trim()
        ? Number(form.estimatedMinutes.trim())
        : null;

      const payload = {
        companyCode: form.companyCode.trim(),
        roleLabel: form.roleLabel.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        jobFamily: form.jobFamily.trim(),
        domain: form.domain as DomainCategory,
        estimatedMinutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : null,
        taskPrompt: form.taskPrompt.trim(),
      };

      if (selectedSimulationId) {
        await updateCompanySimulation({
          data: {
            id: selectedSimulationId,
            ...payload,
          },
        });
        await loadSimulations();
        setMessage("직무 시뮬레이션을 수정했습니다.");
        return;
      }

      const result = await createCompanySimulation({ data: payload });
      await loadSimulations();
      setSelectedSimulationId(result.id);
      setMessage("직무 시뮬레이션을 추가했습니다. 기업 페이지 드롭다운에 반영됩니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "직무 시뮬레이션을 추가하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  if (authLoading || isLoading) {
    return (
      <AdminShell>
        <div className="py-16 text-center text-sm text-neutral-500">
          관리자 정보를 확인 중입니다...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">Beginner Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            직무 시뮬레이션 관리
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            기업 코드별 직무 시뮬레이션을 등록하고 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSimulations}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      </div>

      {(message || error) && (
        <div
          className={`mt-5 rounded-md border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[280px_360px_1fr]">
        <section className="rounded-md border border-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-200 p-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">기업</h2>
              <p className="mt-1 text-xs text-neutral-500">
                등록 기업 {companiesWithCounts.length}곳
              </p>
            </div>
            <Building2 className="h-4 w-4 text-neutral-400" />
          </div>

          <div className="border-b border-neutral-200 p-3">
            <button
              type="button"
              onClick={() => setIsCompanyFormOpen((current) => !current)}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800"
            >
              <Plus className="h-3.5 w-3.5" />
              기업 추가
            </button>

            {isCompanyFormOpen && (
              <form
                onSubmit={submitCompany}
                className="mt-3 space-y-3 rounded-md bg-neutral-50 p-3"
              >
                <InputField
                  label="기업 이름"
                  value={companyForm.name}
                  onChange={(value) => updateCompanyForm("name", value)}
                  placeholder="예: B기업"
                  required
                />
                <InputField
                  label="기업 코드"
                  value={companyForm.code}
                  onChange={(value) => updateCompanyForm("code", value)}
                  placeholder="예: BGNR-2024-B"
                  required
                />
                <InputField
                  label="기업 화면 표시명"
                  value={companyForm.roleLabel}
                  onChange={(value) => updateCompanyForm("roleLabel", value)}
                  placeholder="비워두면 기업 이름"
                />
                <button
                  type="submit"
                  disabled={
                    isCreatingCompany ||
                    companyForm.name.trim().length === 0 ||
                    companyForm.code.trim().length < 4
                  }
                  className="h-9 w-full rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingCompany ? "추가 중..." : "기업 저장"}
                </button>
              </form>
            )}
          </div>

          <div className="max-h-[640px] space-y-2 overflow-y-auto p-3">
            {companiesWithCounts.map((company) => (
              <button
                key={company.code}
                type="button"
                onClick={() => selectCompany(company.code)}
                className={`w-full rounded-md border p-4 text-left transition-colors ${
                  company.code === selectedCompanyCode
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="text-sm font-semibold text-neutral-900">{company.name}</div>
                <div className="mt-1 text-xs text-neutral-500">{company.code}</div>
                <div className="mt-3 text-xs text-neutral-400">
                  시뮬레이션 {company.simulationCount}개
                </div>
              </button>
            ))}

            {companiesWithCounts.length === 0 && (
              <div className="rounded-md border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
                등록된 기업이 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-md border border-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-200 p-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">직무 시뮬레이션</h2>
              <p className="mt-1 text-xs text-neutral-500">
                {selectedCompany?.name ?? "기업 선택"} · {companySimulations.length}개
              </p>
            </div>
            <ListChecks className="h-4 w-4 text-neutral-400" />
          </div>

          <div className="border-b border-neutral-200 p-3">
            <button
              type="button"
              onClick={() =>
                startNewSimulation(selectedCompanyCode || companiesWithCounts[0]?.code || "")
              }
              disabled={!selectedCompanyCode && companiesWithCounts.length === 0}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />이 기업에 추가
            </button>
          </div>

          <div className="max-h-[584px] space-y-2 overflow-y-auto p-3">
            {companySimulations.map((simulation) => (
              <button
                key={simulation.id}
                type="button"
                onClick={() => selectSimulation(simulation)}
                className={`w-full rounded-md border p-4 text-left transition-colors ${
                  simulation.id === selectedSimulationId
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">
                      {simulation.roleLabel}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{simulation.title}</p>
                  </div>
                  {simulation.estimatedMinutes && (
                    <span className="shrink-0 rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                      {simulation.estimatedMinutes}분
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
                  <span className="rounded bg-neutral-50 px-2 py-1">{simulation.domain}</span>
                  {simulation.jobFamily && (
                    <span className="rounded bg-neutral-50 px-2 py-1">{simulation.jobFamily}</span>
                  )}
                </div>
              </button>
            ))}

            {companySimulations.length === 0 && (
              <div className="rounded-md border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
                이 기업에 등록된 직무 시뮬레이션이 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-md border border-neutral-200">
          <div className="border-b border-neutral-200 p-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              {isEditing ? "시뮬레이션 수정" : "시뮬레이션 추가"}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              저장하면 유저 추천 화면과 기업 직무 선택 목록에 반영됩니다.
            </p>
          </div>

          <form onSubmit={submitSimulation} className="grid gap-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="기업 코드"
                value={form.companyCode}
                onChange={(value) => updateForm("companyCode", value)}
                disabled
                required
              />
              <InputField
                label="드롭다운 직무명"
                value={form.roleLabel}
                onChange={(value) => updateForm("roleLabel", value)}
                placeholder="예: 마케팅 매니저"
                required
              />
            </div>

            <InputField
              label="시뮬레이션 제목"
              value={form.title}
              onChange={(value) => updateForm("title", value)}
              placeholder="예: 마케팅 캠페인 A/B 테스트 결과 해석"
              required
            />

            <TextareaField
              label="간단 설명"
              value={form.description}
              onChange={(value) => updateForm("description", value)}
              rows={3}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <InputField
                label="직무군"
                value={form.jobFamily}
                onChange={(value) => updateForm("jobFamily", value)}
                placeholder="예: 데이터"
              />
              <SelectField
                label="도메인"
                value={form.domain}
                onChange={(value) => updateForm("domain", value)}
                options={DOMAIN_CATEGORIES}
                required
              />
              <InputField
                label="예상 소요 시간"
                type="number"
                value={form.estimatedMinutes}
                onChange={(value) => updateForm("estimatedMinutes", value)}
              />
            </div>

            <TextareaField
              label="과제 본문"
              value={form.taskPrompt}
              onChange={(value) => updateForm("taskPrompt", value)}
              rows={16}
              required
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!selectedSimulationId) {
                    startNewSimulation(form.companyCode);
                    return;
                  }
                  const currentSimulation =
                    simulations.find((simulation) => simulation.id === selectedSimulationId) ??
                    companySimulations[0];
                  if (currentSimulation) selectSimulation(currentSimulation);
                }}
                className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50"
              >
                초기화
              </button>
              <button
                type="submit"
                disabled={
                  isSaving ||
                  !form.companyCode.trim() ||
                  !form.roleLabel.trim() ||
                  !form.title.trim() ||
                  !form.domain.trim() ||
                  !form.taskPrompt.trim()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isSaving ? "저장 중..." : isEditing ? "수정 저장" : "시뮬레이션 추가"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 px-6">
        <div>
          <span className="text-sm font-semibold tracking-tight">Beginner</span>
          <span className="ml-2 text-xs text-neutral-500">Admin</span>
        </div>
        <Link to="/biz" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          기업 페이지
        </Link>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="mt-2 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  rows,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        required={required}
        className="mt-2 w-full resize-y rounded-md border border-neutral-300 p-3 text-sm leading-relaxed outline-none focus:border-neutral-900"
      />
    </label>
  );
}
