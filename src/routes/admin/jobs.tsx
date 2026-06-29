import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_CATEGORIES } from "@/data/jobCategories";
import { COMPETENCY_GROUPS, getCompetencyName } from "@/data/competencies";
import {
  createCustomJob,
  deleteCustomJob,
  listCustomJobs,
  updateCustomJob,
  type CustomJob,
} from "@/lib/customJobs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/jobs")({
  head: () => ({ meta: [{ title: "직무 관리 — beginner" }] }),
  component: JobsAdminPage,
});

type FormState = {
  category_id: string;
  name: string;
  description: string;
  slug: string;
  status: "available" | "preparing";
  required_competencies: string[];
};

const EMPTY_FORM: FormState = {
  category_id: JOB_CATEGORIES[0]?.id ?? "",
  name: "",
  description: "",
  slug: "",
  status: "available",
  required_competencies: [],
};

function JobsAdminPage() {
  const [jobs, setJobs] = useState<CustomJob[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomJob | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function refresh() {
    try {
      setJobs(await listCustomJobs());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`admin-jobs-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_jobs" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setOpen(true);
  }

  function openEdit(j: CustomJob) {
    setForm({
      category_id: j.category_id,
      name: j.name,
      description: j.description ?? "",
      slug: j.slug,
      status: j.status,
      required_competencies: j.required_competencies ?? [],
    });
    setEditing(j);
    setOpen(true);
  }

  function toggleCompetency(id: string) {
    setForm((prev) => {
      const has = prev.required_competencies.includes(id);
      if (has) {
        return {
          ...prev,
          required_competencies: prev.required_competencies.filter((c) => c !== id),
        };
      }
      if (prev.required_competencies.length >= 6) {
        toast.error("역량은 최대 6개까지 선택할 수 있습니다.");
        return prev;
      }
      return { ...prev, required_competencies: [...prev.required_competencies, id] };
    });
  }

  async function save() {
    if (!form.name.trim() || !form.slug.trim() || !form.category_id) {
      toast.error("직무군, 이름, slug는 필수입니다.");
      return;
    }
    if (
      form.required_competencies.length !== 0 &&
      form.required_competencies.length !== 6
    ) {
      toast.error("요구 역량은 비워두거나 정확히 6개를 선택해야 합니다.");
      return;
    }
    try {
      const payload = {
        category_id: form.category_id,
        name: form.name,
        description: form.description || null,
        slug: form.slug,
        status: form.status,
        required_competencies: form.required_competencies,
      };
      if (editing) {
        await updateCustomJob(editing.id, payload);
        toast.success("수정되었습니다.");
      } else {
        await createCustomJob(payload);
        toast.success("추가되었습니다.");
      }
      setOpen(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(j: CustomJob) {
    if (!confirm(`'${j.name}' 직무를 삭제하시겠습니까?`)) return;
    try {
      await deleteCustomJob(j.id);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // Group by category
  const byCategory = JOB_CATEGORIES.map((c) => ({
    cat: c,
    items: jobs.filter((j) => j.category_id === c.id),
  }));

  return (
    <div className="block min-h-screen bg-muted/30 lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary sm:text-2xl">직무 관리</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                각 직무군에 표시할 직무 이름과 설명, 추천 로직에서 사용할 요구 역량 6개를 관리할 수 있어요.
              </p>
            </div>
            <Button
              onClick={openCreate}
              style={{ backgroundColor: "#008f8f" }}
              className="w-full text-white hover:opacity-90 sm:w-auto"
            >
              <Plus className="h-4 w-4" /> 직무 추가
            </Button>
          </div>

          <div className="mt-6 space-y-6">
            {byCategory.map(({ cat, items }) => (
              <section key={cat.id} className="rounded-xl border border-border bg-background p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-primary text-base">
                    {cat.name}{" "}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({items.length})
                    </span>
                  </h2>
                </div>
                {items.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">아직 등록된 직무가 없습니다.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {items.map((j) => (
                      <li key={j.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-primary">{j.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">
                              ({j.slug})
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                j.status === "available"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {j.status === "available" ? "체험 가능" : "준비 중"}
                            </span>
                          </div>
                          {j.description && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/70">
                              {j.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              요구 역량
                            </span>
                            {j.required_competencies && j.required_competencies.length > 0 ? (
                              j.required_competencies.map((id) => (
                                <span
                                  key={id}
                                  className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                                  title={id}
                                >
                                  {getCompetencyName(id)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-destructive">미설정 (기본값 사용)</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Select
                            value={j.status}
                            onValueChange={async (v) => {
                              try {
                                await updateCustomJob(j.id, { status: v as "available" | "preparing" });
                                toast.success("상태가 변경되었습니다.");
                                await refresh();
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-[110px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">체험 가능</SelectItem>
                              <SelectItem value="preparing">준비 중</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" onClick={() => openEdit(j)}>
                            <Pencil className="h-3.5 w-3.5" /> 수정
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => remove(j)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "직무 수정" : "직무 추가"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>직무군</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>직무 이름</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 프로덕트디자이너"
              />
            </div>
            <div className="grid gap-2">
              <Label>Slug (URL용 식별자)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="예: product-designer"
              />
            </div>
            <div className="grid gap-2">
              <Label>설명</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="직무에 대한 간단한 설명"
              />
            </div>
            <div className="grid gap-2">
              <Label>상태</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as "available" | "preparing" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">체험 가능</SelectItem>
                  <SelectItem value="preparing">준비 중</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Required competencies picker */}
            <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">요구 세부 역량 (정확히 6개)</Label>
                <span
                  className={`text-xs font-semibold ${
                    form.required_competencies.length === 6
                      ? "text-emerald-600"
                      : "text-muted-foreground"
                  }`}
                >
                  선택 {form.required_competencies.length} / 6
                </span>
              </div>

              {/* Selected chips */}
              {form.required_competencies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-md bg-background p-2">
                  {form.required_competencies.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleCompetency(id)}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      <span className="font-mono">{id}</span>
                      <span className="text-foreground/80">{getCompetencyName(id)}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}

              {/* Group picker */}
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {COMPETENCY_GROUPS.map((group) => (
                  <div key={group.id}>
                    <div className="mb-1 text-[11px] font-bold text-muted-foreground">
                      {group.id}. {group.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.competencies.map((c) => {
                        const selected = form.required_competencies.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCompetency(c.id)}
                            className={`rounded-md border px-2 py-1 text-xs transition ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            <span className="font-mono mr-1">{c.id}</span>
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                비워두면 기본값(A1·A2·A3·B1·B2·F2)이 사용됩니다. 추천 로직에 반영하려면 6개를 선택하세요.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              onClick={save}
              style={{ backgroundColor: "#008f8f" }}
              className="text-white hover:opacity-90"
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
