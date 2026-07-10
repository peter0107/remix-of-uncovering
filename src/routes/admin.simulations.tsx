import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Clock,
  ImageIcon,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  createCompany,
  createCompanySimulation,
  deleteCompany,
  deleteCompanySimulation,
  getAdminCompanies,
  getAdminCompanySimulations,
  setCompanySimulationVisibility,
  updateCompany,
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
  cardImageUrl: string;
  domain: string;
  estimatedMinutes: string;
  taskPrompt: string;
};

type CompanyForm = {
  name: string;
  code: string;
  logoUrl: string;
  roleLabel: string;
};

type AssetUploadTarget =
  | { kind: "logo"; companyId: string }
  | { kind: "cardImage"; simulationId: string };

const EMPTY_COMPANY_FORM: CompanyForm = {
  name: "",
  code: "",
  logoUrl: "",
  roleLabel: "",
};

function createEmptyForm(companyCode = ""): SimulationForm {
  return {
    companyCode,
    roleLabel: "",
    title: "",
    description: "",
    cardImageUrl: "",
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
    cardImageUrl: simulation.cardImageUrl,
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
  cardImageUrl: "",
  domain: DOMAIN_CATEGORIES[0],
  estimatedMinutes: "60",
  taskPrompt: "",
};

function getUploadKey(target: AssetUploadTarget) {
  return target.kind === "logo" ? `logo:${target.companyId}` : `cardImage:${target.simulationId}`;
}

function getFileExtension(file: File) {
  const safeNameExtension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (safeNameExtension && ["jpg", "jpeg", "png", "webp", "gif"].includes(safeNameExtension)) {
    return safeNameExtension;
  }

  const mimeExtension = file.type.split("/").pop()?.toLowerCase();
  if (mimeExtension === "jpeg") return "jpg";
  return mimeExtension || "jpg";
}

function getDomainCategory(value: string): DomainCategory {
  return DOMAIN_CATEGORIES.includes(value as DomainCategory)
    ? (value as DomainCategory)
    : DOMAIN_CATEGORIES[0];
}

function getCompanyInitial(companyName: string) {
  const trimmed = companyName.trim();
  if (!trimmed) return "B";

  const latin = trimmed.match(/[A-Za-z0-9]/g);
  if (latin?.length) return latin.slice(0, 2).join("").toUpperCase();

  return trimmed.slice(0, 1);
}

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
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [selectedCompanyCode, setSelectedCompanyCode] = useState("");
  const [selectedSimulationId, setSelectedSimulationId] = useState<string | null>(null);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [actioningCompanyId, setActioningCompanyId] = useState<string | null>(null);
  const [actioningSimulationId, setActioningSimulationId] = useState<string | null>(null);
  const [assetUploadTarget, setAssetUploadTarget] = useState<AssetUploadTarget | null>(null);
  const [uploadingAssetKey, setUploadingAssetKey] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const assetInputRef = useRef<HTMLInputElement | null>(null);
  const userId = user?.id ?? null;

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
  }, []);

  const startNewSimulation = useCallback((companyCode: string) => {
    setSelectedSimulationId(null);
    setForm(createEmptyForm(companyCode));
  }, []);

  const loadSimulations = useCallback(async () => {
    setIsLoading(true);
    try {
      const [companyData, simulationData] = await Promise.all([
        getAdminCompanies(),
        getAdminCompanySimulations(),
      ]);
      setCompanies(companyData);
      setSimulations(simulationData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "관리자 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      navigate({ to: "/login", search: { redirect: "/admin/simulations" } });
      return;
    }
    if (loadedUserIdRef.current === userId) return;
    loadedUserIdRef.current = userId;
    void loadSimulations();
  }, [authLoading, userId, navigate, loadSimulations]);

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

  function resetCompanyForm() {
    setCompanyForm(EMPTY_COMPANY_FORM);
    setEditingCompanyId(null);
  }

  function startCreateCompany() {
    resetCompanyForm();
    setIsCompanyFormOpen((current) => !current || editingCompanyId !== null);
  }

  function startEditCompany(company: AdminCompany) {
    setCompanyForm({
      name: company.name,
      code: company.code,
      logoUrl: company.logoUrl,
      roleLabel: company.roleLabel === company.name ? "" : company.roleLabel,
    });
    setEditingCompanyId(company.id);
    setIsCompanyFormOpen(false);
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

  function activateCard(event: KeyboardEvent<HTMLDivElement>, onActivate: () => void) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onActivate();
  }

  function openAssetFilePicker(target: AssetUploadTarget) {
    if (!userId) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setAssetUploadTarget(target);
    if (assetInputRef.current) {
      assetInputRef.current.value = "";
      assetInputRef.current.click();
    }
  }

  async function uploadAssetFile(file: File, target: AssetUploadTarget) {
    if (!userId) throw new Error("로그인이 필요합니다.");

    const targetId = target.kind === "logo" ? target.companyId : target.simulationId;
    const extension = getFileExtension(file);
    const objectPath = `${userId}/${target.kind}/${targetId}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("simulation-card-assets")
      .upload(objectPath, file, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage.from("simulation-card-assets").getPublicUrl(objectPath);
    if (!data.publicUrl) throw new Error("업로드한 이미지 주소를 만들지 못했습니다.");

    return data.publicUrl;
  }

  async function handleAssetFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const target = assetUploadTarget;
    if (!file || !target) return;

    if (file.type && !file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    const uploadKey = getUploadKey(target);
    setUploadingAssetKey(uploadKey);

    try {
      const publicUrl = await uploadAssetFile(file, target);

      if (target.kind === "logo") {
        const company = companies.find((item) => item.id === target.companyId);
        if (!company) throw new Error("기업 정보를 찾지 못했습니다.");

        await updateCompany({
          data: {
            id: company.id,
            name: company.name,
            code: company.code,
            logoUrl: publicUrl,
            roleLabel: company.roleLabel,
          },
        });

        setCompanies((current) =>
          current.map((item) => (item.id === company.id ? { ...item, logoUrl: publicUrl } : item)),
        );
        setSimulations((current) =>
          current.map((item) =>
            item.companyId === company.id ? { ...item, companyLogoUrl: publicUrl } : item,
          ),
        );
        if (editingCompanyId === company.id) {
          setCompanyForm((current) => ({ ...current, logoUrl: publicUrl }));
        }
        toast.success("기업 로고를 변경했습니다.");
      } else {
        const simulation = simulations.find((item) => item.id === target.simulationId);
        if (!simulation) throw new Error("시뮬레이션 정보를 찾지 못했습니다.");

        await updateCompanySimulation({
          data: {
            id: simulation.id,
            companyCode: simulation.companyCode,
            roleLabel: simulation.roleLabel,
            title: simulation.title,
            description: simulation.description,
            cardImageUrl: publicUrl,
            domain: getDomainCategory(simulation.domain),
            estimatedMinutes: simulation.estimatedMinutes,
            taskPrompt: simulation.taskPrompt,
          },
        });

        setSimulations((current) =>
          current.map((item) =>
            item.id === simulation.id ? { ...item, cardImageUrl: publicUrl } : item,
          ),
        );
        if (selectedSimulationId === simulation.id) {
          setForm((current) => ({ ...current, cardImageUrl: publicUrl }));
        }
        toast.success("카드 이미지를 변경했습니다.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이미지를 업로드하지 못했습니다.");
    } finally {
      setUploadingAssetKey(null);
      setAssetUploadTarget(null);
      event.target.value = "";
    }
  }

  async function submitCompany(event: FormEvent) {
    event.preventDefault();
    if (isCreatingCompany) return;

    setIsCreatingCompany(true);
    try {
      const isEditingCompany = Boolean(editingCompanyId);
      const payload = {
        name: companyForm.name.trim(),
        code: companyForm.code.trim(),
        logoUrl: companyForm.logoUrl.trim(),
        roleLabel: companyForm.roleLabel.trim(),
      };

      const company = isEditingCompany
        ? await updateCompany({
            data: {
              id: editingCompanyId!,
              ...payload,
            },
          })
        : await createCompany({ data: payload });

      resetCompanyForm();
      setIsCompanyFormOpen(false);
      setHasInitializedSelection(true);
      setSelectedCompanyCode(company.code);
      startNewSimulation(company.code);
      await loadSimulations();
      toast.success(
        isEditingCompany
          ? `${company.name} 기업 정보를 수정했습니다.`
          : `${company.name} 기업을 추가했습니다. /biz에서 ${company.code} 코드로 접속할 수 있습니다.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "기업 정보를 저장하지 못했습니다.");
    } finally {
      setIsCreatingCompany(false);
    }
  }

  async function removeCompany(company: AdminCompany & { simulationCount: number }) {
    if (actioningCompanyId) return;
    const confirmed = window.confirm(
      `${company.name} 기업을 삭제할까요? 연결된 직무 시뮬레이션과 제출/관심 지원자 데이터도 함께 삭제될 수 있습니다.`,
    );
    if (!confirmed) return;

    setActioningCompanyId(company.id);
    try {
      await deleteCompany({ data: { id: company.id } });
      const nextCompanies = companiesWithCounts.filter((item) => item.id !== company.id);
      setCompanies((current) => current.filter((item) => item.id !== company.id));
      setSimulations((current) => current.filter((item) => item.companyId !== company.id));

      if (editingCompanyId === company.id) {
        resetCompanyForm();
        setIsCompanyFormOpen(false);
      }

      if (selectedCompanyCode === company.code) {
        const nextCompany = nextCompanies[0];
        if (nextCompany) {
          setSelectedCompanyCode(nextCompany.code);
          const nextSimulation = simulations.find(
            (simulation) =>
              simulation.companyCode === nextCompany.code && simulation.companyId !== company.id,
          );
          if (nextSimulation) selectSimulation(nextSimulation);
          else startNewSimulation(nextCompany.code);
        } else {
          setSelectedCompanyCode("");
          setSelectedSimulationId(null);
          setForm(EMPTY_FORM);
        }
      }

      toast.success(`${company.name} 기업을 삭제했습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "기업을 삭제하지 못했습니다.");
    } finally {
      setActioningCompanyId(null);
    }
  }

  async function submitSimulation(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const estimatedMinutes = form.estimatedMinutes.trim()
        ? Number(form.estimatedMinutes.trim())
        : null;

      const payload = {
        companyCode: form.companyCode.trim(),
        roleLabel: form.roleLabel.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        cardImageUrl: form.cardImageUrl.trim(),
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
        toast.success("직무 시뮬레이션을 수정했습니다.");
        return;
      }

      const result = await createCompanySimulation({ data: payload });
      await loadSimulations();
      setSelectedSimulationId(result.id);
      toast.success("직무 시뮬레이션을 추가했습니다. 기업 페이지 드롭다운에 반영됩니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "직무 시뮬레이션을 추가하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleSimulationVisibility(simulation: AdminCompanySimulation) {
    if (actioningSimulationId) return;

    setActioningSimulationId(simulation.id);
    const nextIsPublic = !simulation.isPublic;

    try {
      await setCompanySimulationVisibility({
        data: {
          id: simulation.id,
          isPublic: nextIsPublic,
        },
      });
      setSimulations((current) =>
        current.map((item) =>
          item.id === simulation.id ? { ...item, isPublic: nextIsPublic } : item,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "공개 상태를 변경하지 못했습니다.");
    } finally {
      setActioningSimulationId(null);
    }
  }

  async function deleteSimulation(simulation: AdminCompanySimulation) {
    if (actioningSimulationId) return;
    const confirmed = window.confirm(
      `${simulation.roleLabel} 직무 시뮬레이션을 삭제할까요? 제출 데이터도 함께 삭제될 수 있습니다.`,
    );
    if (!confirmed) return;

    setActioningSimulationId(simulation.id);

    try {
      await deleteCompanySimulation({ data: { id: simulation.id } });
      setSimulations((current) => current.filter((item) => item.id !== simulation.id));
      if (selectedSimulationId === simulation.id) {
        const nextSimulation = companySimulations.find((item) => item.id !== simulation.id);
        if (nextSimulation) {
          selectSimulation(nextSimulation);
        } else {
          startNewSimulation(selectedCompanyCode);
        }
      }
      toast.success("직무 시뮬레이션을 삭제했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "직무 시뮬레이션을 삭제하지 못했습니다.");
    } finally {
      setActioningSimulationId(null);
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
      <input
        ref={assetInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAssetFileChange}
      />
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[280px_430px_1fr]">
        <section className="flex min-h-0 flex-col rounded-md border border-neutral-200">
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
              onClick={startCreateCompany}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800"
            >
              <Plus className="h-3.5 w-3.5" />
              기업 추가
            </button>

            {isCompanyFormOpen && !editingCompanyId && (
              <CompanyFormEditor
                title="새 기업 등록"
                form={companyForm}
                isSaving={isCreatingCompany}
                submitLabel="기업 저장"
                onSubmit={submitCompany}
                onCancel={() => {
                  resetCompanyForm();
                  setIsCompanyFormOpen(false);
                }}
                onChange={updateCompanyForm}
              />
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {companiesWithCounts.map((company) => (
              <div
                key={company.code}
                role="button"
                tabIndex={0}
                onClick={() => selectCompany(company.code)}
                onKeyDown={(event) => activateCard(event, () => selectCompany(company.code))}
                className={`grid cursor-pointer grid-cols-[auto_1fr_auto] gap-3 rounded-md border p-3 text-left transition-colors ${
                  company.code === selectedCompanyCode
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openAssetFilePicker({ kind: "logo", companyId: company.id });
                  }}
                  disabled={
                    uploadingAssetKey === getUploadKey({ kind: "logo", companyId: company.id })
                  }
                  aria-label={`${company.name} 로고 변경`}
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-neutral-100 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={`${company.name} 로고`}
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    company.name.trim().slice(0, 1) || "B"
                  )}
                </button>
                <div className="min-w-0 text-left">
                  <div className="text-sm font-semibold text-neutral-900">{company.name}</div>
                  <div className="mt-1 truncate text-xs text-neutral-500">{company.code}</div>
                  <div className="mt-3 text-xs text-neutral-400">
                    시뮬레이션 {company.simulationCount}개
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startEditCompany(company);
                    }}
                    disabled={actioningCompanyId === company.id}
                    aria-label={`${company.name} 기업 수정`}
                    className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-white hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeCompany(company);
                    }}
                    disabled={actioningCompanyId === company.id}
                    aria-label={`${company.name} 기업 삭제`}
                    className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {editingCompanyId === company.id && (
                  <div
                    className="col-span-3 mt-2 border-t border-neutral-200 pt-3"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <CompanyFormEditor
                      title="기업 정보 수정"
                      form={companyForm}
                      isSaving={isCreatingCompany}
                      submitLabel="수정 저장"
                      onSubmit={submitCompany}
                      onCancel={resetCompanyForm}
                      onChange={updateCompanyForm}
                    />
                  </div>
                )}
              </div>
            ))}

            {companiesWithCounts.length === 0 && (
              <div className="rounded-md border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
                등록된 기업이 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-md border border-neutral-200">
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

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {companySimulations.map((simulation) => (
              <div
                key={simulation.id}
                role="button"
                tabIndex={0}
                onClick={() => selectSimulation(simulation)}
                onKeyDown={(event) => activateCard(event, () => selectSimulation(simulation))}
                className={`w-full cursor-pointer rounded-md text-left transition-colors ${
                  simulation.id === selectedSimulationId
                    ? "ring-2 ring-neutral-900"
                    : "ring-1 ring-transparent hover:ring-neutral-200"
                }`}
              >
                <AdminSimulationListCard
                  simulation={simulation}
                  isActioning={actioningSimulationId === simulation.id}
                  onUploadLogo={() =>
                    openAssetFilePicker({ kind: "logo", companyId: simulation.companyId })
                  }
                  onUploadImage={() =>
                    openAssetFilePicker({ kind: "cardImage", simulationId: simulation.id })
                  }
                  onDelete={() => deleteSimulation(simulation)}
                  onToggleVisibility={() => toggleSimulationVisibility(simulation)}
                />
              </div>
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
                label="직무명"
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

            <div className="grid gap-4 md:grid-cols-2">
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
      <header className="flex h-14 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6">
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

function AdminSimulationListCard({
  simulation,
  isActioning,
  onUploadLogo,
  onUploadImage,
  onDelete,
  onToggleVisibility,
}: {
  simulation: AdminCompanySimulation;
  isActioning: boolean;
  onUploadLogo: () => void;
  onUploadImage: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}) {
  const logoUrl = simulation.companyLogoUrl.trim();
  const cardImageUrl = simulation.cardImageUrl.trim();
  const summary = simulation.description.trim() || simulation.title.trim();

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3 transition-colors hover:bg-neutral-50">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onUploadImage();
            }}
            className="absolute inset-0 block h-full w-full overflow-hidden text-neutral-400 transition-opacity hover:opacity-85"
            aria-label={`${simulation.roleLabel} 카드 이미지 변경`}
          >
            {cardImageUrl ? (
              <img
                src={cardImageUrl}
                alt={`${simulation.roleLabel} 카드 이미지`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-[10px]">
                <ImageIcon className="h-4 w-4" />
                사진
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onUploadLogo();
            }}
            className="absolute bottom-1.5 left-1.5 z-10 grid h-8 w-8 place-items-center overflow-hidden rounded-md bg-white text-xs font-bold text-blue-600 shadow-sm ring-1 ring-neutral-200 transition-transform hover:scale-105"
            aria-label={`${simulation.companyName} 로고 변경`}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${simulation.companyName} 로고`}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              getCompanyInitial(simulation.companyName)
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-neutral-900">
                {simulation.roleLabel}
              </h3>
              <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{simulation.title}</p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              disabled={isActioning}
              aria-label={`${simulation.roleLabel} 삭제`}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-2 line-clamp-1 text-xs text-neutral-400">{summary}</p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-neutral-500">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>약 {simulation.estimatedMinutes ?? 75}분</span>
            </span>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleVisibility();
              }}
              disabled={isActioning}
              aria-pressed={simulation.isPublic}
              className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-1.5 pr-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                simulation.isPublic
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-500"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  simulation.isPublic ? "bg-white" : "bg-neutral-300"
                }`}
              />
              {simulation.isPublic ? "공개" : "비공개"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyFormEditor({
  title,
  form,
  isSaving,
  submitLabel,
  onSubmit,
  onCancel,
  onChange,
}: {
  title: string;
  form: CompanyForm;
  isSaving: boolean;
  submitLabel: string;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  onChange: <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md bg-neutral-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-neutral-700">{title}</p>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-7 w-7 place-items-center rounded-md text-neutral-400 hover:bg-white hover:text-neutral-900"
          aria-label={`${title} 닫기`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <InputField
        label="기업 이름"
        value={form.name}
        onChange={(value) => onChange("name", value)}
        placeholder="예: B기업"
        required
      />
      <InputField
        label="기업 코드"
        value={form.code}
        onChange={(value) => onChange("code", value)}
        placeholder="예: BGNR-2024-B"
        required
      />
      <InputField
        label="기업 화면 표시명"
        value={form.roleLabel}
        onChange={(value) => onChange("roleLabel", value)}
        placeholder="비워두면 기업 이름"
      />
      <button
        type="submit"
        disabled={isSaving || form.name.trim().length === 0 || form.code.trim().length < 4}
        className="h-9 w-full rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "저장 중..." : submitLabel}
      </button>
    </form>
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
