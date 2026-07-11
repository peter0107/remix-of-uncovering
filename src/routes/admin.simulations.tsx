import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  ChevronDown,
  ChevronUp,
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

import { SimulationCardPreview } from "@/components/SimulationCardPreview";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
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
  type AdminSimulationPrompt,
  type AdminSimulationStep,
  type SimulationFormat,
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
  simulationFormat: SimulationFormat;
  singleAnswerQuestion: string;
  taskPrompt: string;
  steps: AdminSimulationStep[];
};

type CompanyForm = {
  name: string;
  code: string;
  description: string;
  logoUrl: string;
  roleLabel: string;
};

type AssetUploadTarget =
  | { kind: "logo"; companyId: string }
  | { kind: "cardImage"; simulationId: string };

type AssetEditorState = {
  target: AssetUploadTarget;
  previewUrl: string;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

type AssetEditorPreset = {
  title: string;
  description: string;
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
  previewClassName: string;
};

const EMPTY_COMPANY_FORM: CompanyForm = {
  name: "",
  code: "",
  description: "",
  logoUrl: "",
  roleLabel: "",
};

function createPrompt(): AdminSimulationPrompt {
  const id = `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, label: "", body: "" };
}

function createStep(): AdminSimulationStep {
  const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    title: "",
    durationMin: 15,
    difficulty: 1,
    tags: [],
    situation: "",
    materials: "",
    hint: "",
    completionMessage: "",
    prompts: [createPrompt()],
  };
}

function normaliseSteps(raw: AdminSimulationStep[]): AdminSimulationStep[] {
  return raw
    .filter((step) => step && typeof step.title === "string" && Array.isArray(step.prompts))
    .map((step, index) => ({
      id: step.id || `step-${index + 1}`,
      title: step.title,
      durationMin: step.durationMin,
      difficulty: step.difficulty,
      tags: Array.isArray(step.tags) ? step.tags.filter(Boolean) : [],
      situation: step.situation ?? "",
      materials: step.materials ?? "",
      hint: step.hint ?? "",
      completionMessage: step.completionMessage ?? "",
      prompts: step.prompts
        .filter((prompt) => prompt && typeof prompt.id === "string")
        .map((prompt, promptIndex) => ({
          id: prompt.id || `prompt-${index + 1}-${promptIndex + 1}`,
          label: prompt.label ?? "",
          body: prompt.body ?? "",
        })),
    }));
}

function hasValidSteps(steps: AdminSimulationStep[]) {
  return (
    steps.length > 0 &&
    steps.every(
      (step) =>
        step.title.trim() &&
        step.prompts.length > 0 &&
        step.prompts.every((prompt) => prompt.label.trim()),
    )
  );
}

function prepareSteps(steps: AdminSimulationStep[]): AdminSimulationStep[] {
  return steps.map((step) => ({
    id: step.id,
    title: step.title.trim(),
    ...(step.durationMin ? { durationMin: step.durationMin } : {}),
    ...(step.difficulty ? { difficulty: step.difficulty } : {}),
    ...(step.tags?.map((tag) => tag.trim()).filter(Boolean).length
      ? { tags: step.tags.map((tag) => tag.trim()).filter(Boolean) }
      : {}),
    ...(step.situation?.trim() ? { situation: step.situation.trim() } : {}),
    ...(step.materials?.trim() ? { materials: step.materials.trim() } : {}),
    ...(step.hint?.trim() ? { hint: step.hint.trim() } : {}),
    ...(step.completionMessage?.trim() ? { completionMessage: step.completionMessage.trim() } : {}),
    prompts: step.prompts.map((prompt) => ({
      id: prompt.id,
      label: prompt.label.trim(),
      body: prompt.body.trim(),
    })),
  }));
}

function createEmptyForm(companyCode = ""): SimulationForm {
  return {
    companyCode,
    roleLabel: "",
    title: "",
    description: "",
    cardImageUrl: "",
    domain: DOMAIN_CATEGORIES[0],
    estimatedMinutes: "60",
    simulationFormat: "single",
    singleAnswerQuestion: "",
    taskPrompt: "",
    steps: [],
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
    simulationFormat: simulation.simulationFormat,
    singleAnswerQuestion: simulation.singleAnswerQuestion,
    taskPrompt: simulation.taskPrompt,
    steps: normaliseSteps(simulation.steps),
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
  simulationFormat: "single",
  singleAnswerQuestion: "",
  taskPrompt: "",
  steps: [],
};

function getUploadKey(target: AssetUploadTarget) {
  return target.kind === "logo" ? `logo:${target.companyId}` : `cardImage:${target.simulationId}`;
}

function getDomainCategory(value: string): DomainCategory {
  return DOMAIN_CATEGORIES.includes(value as DomainCategory)
    ? (value as DomainCategory)
    : DOMAIN_CATEGORIES[0];
}

function getAssetEditorPreset(kind: AssetUploadTarget["kind"]): AssetEditorPreset {
  if (kind === "logo") {
    return {
      title: "기업 로고 편집",
      description: "로고가 정사각형 영역 안에 잘 보이도록 조정한 뒤 적용하세요.",
      width: 640,
      height: 640,
      previewWidth: 256,
      previewHeight: 256,
      previewClassName: "h-64 w-64 rounded-xl",
    };
  }

  return {
    title: "카드 배경 사진 편집",
    description: "유저 카드 상단 배경과 같은 비율로 보이도록 조정한 뒤 적용하세요.",
    width: 1400,
    height: 400,
    previewWidth: 512,
    previewHeight: 146,
    previewClassName: "w-full max-w-lg rounded-xl",
  };
}

function loadAssetImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function getAssetImageGeometry({
  imageWidth,
  imageHeight,
  frameWidth,
  frameHeight,
  zoom,
  offsetX,
  offsetY,
}: {
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}) {
  const baseScale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
  const baseWidth = imageWidth * baseScale;
  const baseHeight = imageHeight * baseScale;
  const scaledWidth = baseWidth * zoom;
  const scaledHeight = baseHeight * zoom;
  const overflowX = Math.max(0, scaledWidth - frameWidth);
  const overflowY = Math.max(0, scaledHeight - frameHeight);
  const translateX = -(overflowX * offsetX) / 100;
  const translateY = -(overflowY * offsetY) / 100;

  return {
    baseWidth,
    baseHeight,
    scaledWidth,
    scaledHeight,
    translateX,
    translateY,
  };
}

async function createCroppedAssetBlob(
  src: string,
  preset: AssetEditorPreset,
  options: { zoom: number; offsetX: number; offsetY: number },
) {
  const image = await loadAssetImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");

  const geometry = getAssetImageGeometry({
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    frameWidth: preset.width,
    frameHeight: preset.height,
    zoom: options.zoom,
    offsetX: options.offsetX,
    offsetY: options.offsetY,
  });
  const drawX = (preset.width - geometry.scaledWidth) / 2 + geometry.translateX;
  const drawY = (preset.height - geometry.scaledHeight) / 2 + geometry.translateY;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, preset.width, preset.height);
  context.drawImage(image, drawX, drawY, geometry.scaledWidth, geometry.scaledHeight);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create edited image"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

function getAssetEditorImageStyle(editor: AssetEditorState, preset: AssetEditorPreset) {
  const geometry = getAssetImageGeometry({
    imageWidth: editor.imageWidth,
    imageHeight: editor.imageHeight,
    frameWidth: preset.previewWidth,
    frameHeight: preset.previewHeight,
    zoom: editor.zoom,
    offsetX: editor.offsetX,
    offsetY: editor.offsetY,
  });

  return {
    left: `calc(50% + ${geometry.translateX}px)`,
    top: `calc(50% + ${geometry.translateY}px)`,
    width: `${(geometry.baseWidth / preset.previewWidth) * 100}%`,
    height: `${(geometry.baseHeight / preset.previewHeight) * 100}%`,
    transform: `translate(-50%, -50%) scale(${editor.zoom})`,
    transformOrigin: "center center",
  };
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
  const [assetEditor, setAssetEditor] = useState<AssetEditorState | null>(null);
  const [uploadingAssetKey, setUploadingAssetKey] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const assetInputRef = useRef<HTMLInputElement | null>(null);
  const userId = user?.id ?? null;
  const assetEditorPreset = assetEditor ? getAssetEditorPreset(assetEditor.target.kind) : null;
  const isApplyingAssetEdit = assetEditor
    ? uploadingAssetKey === getUploadKey(assetEditor.target)
    : false;

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

  useEffect(() => {
    const previewUrl = assetEditor?.previewUrl;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [assetEditor?.previewUrl]);

  function updateForm<K extends keyof SimulationForm>(key: K, value: SimulationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSteps(updater: (steps: AdminSimulationStep[]) => AdminSimulationStep[]) {
    setForm((current) => ({ ...current, steps: updater(current.steps) }));
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
      description: company.description,
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

  async function uploadAssetBlob(blob: Blob, target: AssetUploadTarget) {
    if (!userId) throw new Error("로그인이 필요합니다.");

    const targetId = target.kind === "logo" ? target.companyId : target.simulationId;
    const objectPath = `${userId}/${target.kind}/${targetId}-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("simulation-card-assets")
      .upload(objectPath, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage.from("simulation-card-assets").getPublicUrl(objectPath);
    if (!data.publicUrl) throw new Error("업로드한 이미지 주소를 만들지 못했습니다.");

    return data.publicUrl;
  }

  async function saveAssetPublicUrl(publicUrl: string, target: AssetUploadTarget) {
    if (target.kind === "logo") {
      const company = companies.find((item) => item.id === target.companyId);
      if (!company) throw new Error("기업 정보를 찾지 못했습니다.");

      await updateCompany({
        data: {
          id: company.id,
          name: company.name,
          code: company.code,
          description: company.description,
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
      return;
    }

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

  async function handleAssetFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const target = assetUploadTarget;
    event.target.value = "";
    setAssetUploadTarget(null);

    if (!file || !target) return;

    if (file.type && !file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    let image: HTMLImageElement;
    try {
      image = await loadAssetImage(previewUrl);
    } catch {
      URL.revokeObjectURL(previewUrl);
      toast.error("이미지를 불러오지 못했습니다.");
      return;
    }

    setAssetEditor({
      target,
      previewUrl,
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
  }

  function updateAssetEditor(
    value: Partial<Omit<AssetEditorState, "target" | "previewUrl" | "imageWidth" | "imageHeight">>,
  ) {
    setAssetEditor((current) => (current ? { ...current, ...value } : current));
  }

  function closeAssetEditor() {
    if (isApplyingAssetEdit) return;
    setAssetEditor(null);
  }

  async function applyAssetEdit() {
    if (!assetEditor || !assetEditorPreset) return;

    const target = assetEditor.target;
    const uploadKey = getUploadKey(target);
    setUploadingAssetKey(uploadKey);

    try {
      const blob = await createCroppedAssetBlob(assetEditor.previewUrl, assetEditorPreset, {
        zoom: assetEditor.zoom,
        offsetX: assetEditor.offsetX,
        offsetY: assetEditor.offsetY,
      });
      const publicUrl = await uploadAssetBlob(blob, target);
      await saveAssetPublicUrl(publicUrl, target);
      setAssetEditor(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "사진 편집 또는 업로드에 실패했습니다.");
    } finally {
      setUploadingAssetKey(null);
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
        description: companyForm.description.trim(),
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

    const steps = prepareSteps(form.steps);
    if (
      form.simulationFormat === "single" &&
      (!form.taskPrompt.trim() || !form.singleAnswerQuestion.trim())
    ) {
      toast.error("단일형은 과제 본문과 답변 질문을 모두 작성해주세요.");
      return;
    }
    if (form.simulationFormat === "selection" && !hasValidSteps(steps)) {
      toast.error("선택형은 최소 한 단계와 답변 질문을 작성해주세요.");
      return;
    }

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
        simulationFormat: form.simulationFormat,
        singleAnswerQuestion: form.singleAnswerQuestion.trim(),
        taskPrompt: form.taskPrompt.trim(),
        steps,
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[280px_320px_minmax(0,1fr)]">
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
                      className="h-full w-full object-cover"
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

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {companySimulations.map((simulation) => (
              <div
                key={simulation.id}
                role="button"
                tabIndex={0}
                onClick={() => selectSimulation(simulation)}
                onKeyDown={(event) => activateCard(event, () => selectSimulation(simulation))}
                className={`w-full cursor-pointer rounded-xl text-left transition-colors ${
                  simulation.id === selectedSimulationId
                    ? "ring-2 ring-neutral-900"
                    : "ring-1 ring-transparent hover:ring-neutral-200"
                }`}
              >
                <SimulationCardPreview
                  compact
                  companyName={simulation.companyName}
                  companyDescription={simulation.companyDescription}
                  companyLogoUrl={simulation.companyLogoUrl}
                  cardImageUrl={simulation.cardImageUrl}
                  roleLabel={simulation.roleLabel}
                  title={simulation.title}
                  description={simulation.description}
                  domain={simulation.domain}
                  estimatedMinutes={simulation.estimatedMinutes}
                  className="h-full shadow-none"
                  onLogoClick={() =>
                    openAssetFilePicker({ kind: "logo", companyId: simulation.companyId })
                  }
                  onImageClick={() =>
                    openAssetFilePicker({ kind: "cardImage", simulationId: simulation.id })
                  }
                  topRight={
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteSimulation(simulation);
                      }}
                      disabled={actioningSimulationId === simulation.id}
                      aria-label={`${simulation.roleLabel} 삭제`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-neutral-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  }
                  bottomRight={
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSimulationVisibility(simulation);
                      }}
                      disabled={actioningSimulationId === simulation.id}
                      aria-pressed={simulation.isPublic}
                      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-1.5 pr-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        simulation.isPublic
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-500"
                      }`}
                    >
                      <span
                        className={`h-3 w-3 rounded-full transition-colors ${
                          simulation.isPublic ? "bg-white" : "bg-neutral-300"
                        }`}
                      />
                      {simulation.isPublic ? "공개" : "비공개"}
                    </button>
                  }
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

        <section className="min-w-0 max-w-full rounded-md border border-neutral-200">
          <div className="border-b border-neutral-200 p-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              {isEditing ? "시뮬레이션 수정" : "시뮬레이션 추가"}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              저장하면 유저 추천 화면과 기업 직무 선택 목록에 반영됩니다.
            </p>
          </div>

          <form onSubmit={submitSimulation} className="grid min-w-0 max-w-full gap-5 p-5">
            <InputField
              label="시뮬레이션 제목"
              value={form.title}
              onChange={(value) => updateForm("title", value)}
              placeholder="예: 마케팅 캠페인 A/B 테스트 결과 해석"
              required
            />

            <div className="grid min-w-0 gap-4 md:grid-cols-3">
              <InputField
                label="직무명"
                value={form.roleLabel}
                onChange={(value) => updateForm("roleLabel", value)}
                placeholder="예: 마케팅 매니저"
                required
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
              label="간단 설명"
              value={form.description}
              onChange={(value) => updateForm("description", value)}
              rows={3}
            />

            <div>
              <p className="text-xs font-medium text-neutral-600">시뮬레이션 형식</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["single", "단일형"],
                    ["selection", "선택형"],
                  ] as const
                ).map(([format, label]) => (
                  <button
                    key={format}
                    type="button"
                    aria-pressed={form.simulationFormat === format}
                    onClick={() => updateForm("simulationFormat", format)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      form.simulationFormat === format
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.simulationFormat === "single" ? (
              <>
                <RichTextEditor
                  label="과제 본문"
                  value={form.taskPrompt}
                  onChange={(value) => updateForm("taskPrompt", value)}
                  placeholder="유저에게 보여줄 과제 내용과 자료를 작성하세요."
                  minHeight="20rem"
                />
                <InputField
                  label="답변 질문"
                  value={form.singleAnswerQuestion}
                  onChange={(value) => updateForm("singleAnswerQuestion", value)}
                  placeholder="예: 이 상황에서 제안할 실행 전략을 작성해주세요."
                  required
                />
              </>
            ) : (
              <StepEditor steps={form.steps} onChange={updateSteps} />
            )}

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
                  (form.simulationFormat === "single"
                    ? !form.taskPrompt.trim() || !form.singleAnswerQuestion.trim()
                    : !hasValidSteps(form.steps))
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

      <Dialog open={Boolean(assetEditor)} onOpenChange={(open) => !open && closeAssetEditor()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{assetEditorPreset?.title ?? "사진 편집"}</DialogTitle>
            <DialogDescription>
              {assetEditorPreset?.description ?? "사진이 카드에 맞게 보이도록 조정하세요."}
            </DialogDescription>
          </DialogHeader>

          {assetEditor && assetEditorPreset && (
            <div className="space-y-6">
              <div
                className={`relative mx-auto overflow-hidden bg-neutral-100 ring-1 ring-neutral-200 ${assetEditorPreset.previewClassName}`}
                style={{
                  aspectRatio: `${assetEditorPreset.width} / ${assetEditorPreset.height}`,
                  maxWidth: "100%",
                  width: assetEditorPreset.previewWidth,
                }}
              >
                <img
                  src={assetEditor.previewUrl}
                  alt="편집 미리보기"
                  draggable={false}
                  className="absolute max-w-none select-none"
                  style={{
                    ...getAssetEditorImageStyle(assetEditor, assetEditorPreset),
                  }}
                />
              </div>

              <div className="space-y-5">
                <label className="block">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-600">
                    <span>확대</span>
                    <span>{assetEditor.zoom.toFixed(2)}x</span>
                  </div>
                  <Slider
                    value={[assetEditor.zoom]}
                    min={1}
                    max={3}
                    step={0.05}
                    onValueChange={([value]) => updateAssetEditor({ zoom: value ?? 1 })}
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-xs font-medium text-neutral-600">가로 위치</div>
                  <Slider
                    value={[assetEditor.offsetX]}
                    min={-100}
                    max={100}
                    step={1}
                    onValueChange={([value]) => updateAssetEditor({ offsetX: value ?? 0 })}
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-xs font-medium text-neutral-600">세로 위치</div>
                  <Slider
                    value={[assetEditor.offsetY]}
                    min={-100}
                    max={100}
                    step={1}
                    onValueChange={([value]) => updateAssetEditor({ offsetY: value ?? 0 })}
                  />
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={closeAssetEditor}
              disabled={isApplyingAssetEdit}
              className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={applyAssetEdit}
              disabled={isApplyingAssetEdit}
              className="h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApplyingAssetEdit ? "적용 중..." : "적용"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function StepEditor({
  steps,
  onChange,
}: {
  steps: AdminSimulationStep[];
  onChange: (updater: (steps: AdminSimulationStep[]) => AdminSimulationStep[]) => void;
}) {
  const updateStep = (stepIndex: number, patch: Partial<AdminSimulationStep>) => {
    onChange((current) =>
      current.map((step, index) => (index === stepIndex ? { ...step, ...patch } : step)),
    );
  };

  const updatePrompt = (
    stepIndex: number,
    promptIndex: number,
    patch: Partial<AdminSimulationPrompt>,
  ) => {
    onChange((current) =>
      current.map((step, index) => {
        if (index !== stepIndex) return step;
        return {
          ...step,
          prompts: step.prompts.map((prompt, promptIndexValue) =>
            promptIndexValue === promptIndex ? { ...prompt, ...patch } : prompt,
          ),
        };
      }),
    );
  };

  const move = <T,>(items: T[], index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return items;
    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  };

  return (
    <section className="rounded-md border border-neutral-200">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 p-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">단계별 시뮬레이션 구성</h3>
          <p className="mt-1 text-xs text-neutral-500">
            저장하면 유저의 단계별 시뮬레이션 화면에 바로 반영됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange((current) => [...current, createStep()])}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-50"
        >
          <Plus className="h-3.5 w-3.5" /> 단계 추가
        </button>
      </div>

      <div className="space-y-4 p-4">
        {steps.map((step, stepIndex) => (
          <div key={step.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-neutral-700">{stepIndex + 1}단계</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`${stepIndex + 1}단계 위로 이동`}
                  disabled={stepIndex === 0}
                  onClick={() => onChange((current) => move(current, stepIndex, -1))}
                  className="grid h-7 w-7 place-items-center rounded-md text-neutral-500 hover:bg-white disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`${stepIndex + 1}단계 아래로 이동`}
                  disabled={stepIndex === steps.length - 1}
                  onClick={() => onChange((current) => move(current, stepIndex, 1))}
                  className="grid h-7 w-7 place-items-center rounded-md text-neutral-500 hover:bg-white disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`${stepIndex + 1}단계 삭제`}
                  onClick={() =>
                    onChange((current) => current.filter((_, index) => index !== stepIndex))
                  }
                  className="grid h-7 w-7 place-items-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_120px_120px]">
              <InputField
                label="단계 제목"
                value={step.title}
                onChange={(value) => updateStep(stepIndex, { title: value })}
                placeholder="예: 문제 정의와 현황 파악"
                required
              />
              <InputField
                label="소요 시간(분)"
                type="number"
                value={step.durationMin ? String(step.durationMin) : ""}
                onChange={(value) =>
                  updateStep(stepIndex, {
                    durationMin: value.trim() ? Number(value) : undefined,
                  })
                }
              />
              <SelectField
                label="난이도"
                value={String(step.difficulty ?? 1)}
                onChange={(value) => updateStep(stepIndex, { difficulty: Number(value) })}
                options={["1", "2", "3", "4", "5"]}
              />
            </div>

            <div className="mt-4 grid gap-4">
              <RichTextEditor
                label="상황 안내"
                value={step.situation ?? ""}
                onChange={(value) => updateStep(stepIndex, { situation: value })}
                placeholder="이 단계에서 알아야 할 상황을 작성하세요."
              />
              <RichTextEditor
                label="제공 자료"
                value={step.materials ?? ""}
                onChange={(value) => updateStep(stepIndex, { materials: value })}
                placeholder="데이터, 표, 참고 자료를 작성하세요."
                minHeight="14rem"
              />
              <RichTextEditor
                label="힌트"
                value={step.hint ?? ""}
                onChange={(value) => updateStep(stepIndex, { hint: value })}
                placeholder="필요한 힌트를 작성하세요."
              />
              <RichTextEditor
                label="단계 완료 메시지"
                value={step.completionMessage ?? ""}
                onChange={(value) => updateStep(stepIndex, { completionMessage: value })}
                placeholder="답변을 완료한 유저에게 보여줄 메시지를 작성하세요."
              />
            </div>

            <div className="mt-5 border-t border-neutral-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-neutral-700">답변 질문</p>
                <button
                  type="button"
                  onClick={() =>
                    onChange((current) =>
                      current.map((item, index) =>
                        index === stepIndex
                          ? { ...item, prompts: [...item.prompts, createPrompt()] }
                          : item,
                      ),
                    )
                  }
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-neutral-300 px-3 text-xs font-medium hover:bg-white"
                >
                  <Plus className="h-3.5 w-3.5" /> 질문 추가
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {step.prompts.map((prompt, promptIndex) => (
                  <div
                    key={prompt.id}
                    className="rounded-md border border-neutral-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-neutral-500">질문 {promptIndex + 1}</p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`질문 ${promptIndex + 1} 위로 이동`}
                          disabled={promptIndex === 0}
                          onClick={() =>
                            onChange((current) =>
                              current.map((item, index) =>
                                index === stepIndex
                                  ? { ...item, prompts: move(item.prompts, promptIndex, -1) }
                                  : item,
                              ),
                            )
                          }
                          className="grid h-7 w-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`질문 ${promptIndex + 1} 아래로 이동`}
                          disabled={promptIndex === step.prompts.length - 1}
                          onClick={() =>
                            onChange((current) =>
                              current.map((item, index) =>
                                index === stepIndex
                                  ? { ...item, prompts: move(item.prompts, promptIndex, 1) }
                                  : item,
                              ),
                            )
                          }
                          className="grid h-7 w-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-50 disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`질문 ${promptIndex + 1} 삭제`}
                          onClick={() =>
                            onChange((current) =>
                              current.map((item, index) =>
                                index === stepIndex
                                  ? {
                                      ...item,
                                      prompts: item.prompts.filter(
                                        (_, indexValue) => indexValue !== promptIndex,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                          className="grid h-7 w-7 place-items-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-3">
                      <InputField
                        label="질문 제목"
                        value={prompt.label}
                        onChange={(value) => updatePrompt(stepIndex, promptIndex, { label: value })}
                        placeholder="예: 핵심 문제를 정의해주세요"
                        required
                      />
                      <RichTextEditor
                        label="질문 설명"
                        value={prompt.body}
                        onChange={(value) => updatePrompt(stepIndex, promptIndex, { body: value })}
                        placeholder="유저가 작성해야 할 내용을 안내하세요."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {steps.length === 0 && (
          <div className="rounded-md border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500">
            아직 단계가 없습니다. 단계 추가로 유저 화면의 흐름을 구성해주세요.
          </div>
        )}
      </div>
    </section>
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
        label="기업 한 줄 설명"
        value={form.description}
        onChange={(value) => onChange("description", value)}
        placeholder="예: 라이프스타일 커머스 브랜드"
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
    <label className="block min-w-0">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="mt-2 h-10 min-w-0 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
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
    <label className="block min-w-0">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 h-10 min-w-0 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-900"
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
    <label className="block min-w-0">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        required={required}
        className="mt-2 min-w-0 w-full resize-y rounded-md border border-neutral-300 p-3 text-sm leading-relaxed outline-none focus:border-neutral-900"
      />
    </label>
  );
}
