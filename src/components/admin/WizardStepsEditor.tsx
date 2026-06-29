import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WizardPrompt, WizardStep } from "@/lib/missions";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createPrompt(): WizardPrompt {
  return {
    id: makeId("prompt"),
    label: "",
    guide: "",
    input_type: "textarea",
    options: [],
  };
}

function createStep(index: number): WizardStep {
  return {
    id: `step-${index + 1}`,
    title: "",
    duration_min: 10,
    body_html: "",
    context_text: "",
    content_blocks: [],
    prompts: [createPrompt()],
  };
}

type Props = {
  value: WizardStep[];
  onChange: (next: WizardStep[]) => void;
};

export function WizardStepsEditor({ value, onChange }: Props) {
  function updateStep(index: number, patch: Partial<WizardStep>) {
    const next = [...value];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function moveStep(index: number, dir: -1 | 1) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  function removeStep(index: number) {
    onChange(value.filter((_, idx) => idx !== index));
  }

  function addStep() {
    onChange([...value, createStep(value.length)]);
  }

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
          아직 단계가 없습니다. 아래 버튼으로 첫 단계를 추가하세요.
        </p>
      )}

      {value.map((step, index) => (
        <div key={step.id} className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-brand-soft/50 text-xs font-bold text-brand">
              {index + 1}
            </div>
            <div className="text-sm font-semibold text-primary">
              {step.title.trim() || `Step ${index + 1}`}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={index === 0}
                onClick={() => moveStep(index, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={index === value.length - 1}
                onClick={() => moveStep(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeStep(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
              <div className="grid gap-2">
                <Label>단계 제목</Label>
                <Input
                  value={step.title}
                  onChange={(e) => updateStep(index, { title: e.target.value })}
                  placeholder="예: Step 1. 문제 파악"
                />
              </div>
              <div className="grid gap-2">
                <Label>예상 시간(분)</Label>
                <Input
                  type="number"
                  min={1}
                  value={step.duration_min}
                  onChange={(e) =>
                    updateStep(index, {
                      duration_min: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>단계 본문</Label>
              <RichTextEditor
                value={step.body_html ?? ""}
                onChange={(next) => updateStep(index, { body_html: next })}
                placeholder="이 step에서 사용자에게 보여줄 내용을 문서처럼 작성하세요. 제목, 본문, 표, 이미지, 링크를 그대로 넣을 수 있습니다."
                minHeightClassName="min-h-[360px]"
              />
              <p className="text-xs text-muted-foreground">
                저장 후 사용자 화면에서는 이 본문이 거의 그대로 렌더링됩니다.
              </p>
            </div>

            <WizardPromptEditor
              value={step.prompts}
              onChange={(next) => updateStep(index, { prompts: next })}
            />
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" className="w-full" onClick={addStep}>
        <Plus className="h-4 w-4" /> 단계 추가
      </Button>
    </div>
  );
}

function WizardPromptEditor({
  value,
  onChange,
}: {
  value: WizardPrompt[];
  onChange: (next: WizardPrompt[]) => void;
}) {
  function updatePrompt(index: number, patch: Partial<WizardPrompt>) {
    const next = [...value];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function movePrompt(index: number, dir: -1 | 1) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  function removePrompt(index: number) {
    onChange(value.filter((_, idx) => idx !== index));
  }

  function addPrompt() {
    onChange([...value, createPrompt()]);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>보고서 포함 항목</Label>
        <span className="text-xs text-muted-foreground">{value.length}개 · ID 자동 생성</span>
      </div>

      {value.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          아직 포함 항목이 없습니다.
        </p>
      )}

      {value.map((prompt, index) => (
        <div key={prompt.id} className="rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-full border border-brand text-[11px] font-semibold text-brand">
              {index + 1}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={index === 0}
                onClick={() => movePrompt(index, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={index === value.length - 1}
                onClick={() => movePrompt(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removePrompt(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 grid gap-3">
            <div className="grid gap-2">
              <Label>포함할 항목</Label>
              <Input
                value={prompt.label}
                onChange={(e) => updatePrompt(index, { label: e.target.value })}
                placeholder="예: 데이터에서 발견한 패턴을 최소 3가지 포함해주세요."
              />
            </div>

            <div className="grid gap-2">
              <Label>작성 가이드</Label>
              <Textarea
                rows={3}
                value={prompt.guide ?? ""}
                onChange={(e) => updatePrompt(index, { guide: e.target.value })}
                placeholder="사용자에게 제공할 작성 힌트를 적어주세요."
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addPrompt}>
        <Plus className="h-3.5 w-3.5" /> 항목 추가
      </Button>
    </div>
  );
}
