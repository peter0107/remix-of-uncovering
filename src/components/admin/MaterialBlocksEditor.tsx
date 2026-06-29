import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Image as ImageIcon,
  Table as TableIcon,
  FileText,
  Paperclip,
  Link as LinkIcon,
  Plus,
  Trash2,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MaterialBlock, MaterialBlockType } from "@/lib/missions";

const BUCKET = "mission-materials";

const BLOCK_OPTIONS: { type: MaterialBlockType; label: string; icon: React.ReactNode }[] = [
  { type: "image", label: "이미지 자료", icon: <ImageIcon className="h-4 w-4" /> },
  { type: "table", label: "표 데이터", icon: <TableIcon className="h-4 w-4" /> },
  { type: "text", label: "텍스트 자료", icon: <FileText className="h-4 w-4" /> },
  { type: "file", label: "파일 첨부", icon: <Paperclip className="h-4 w-4" /> },
  { type: "link", label: "외부 링크", icon: <LinkIcon className="h-4 w-4" /> },
];

const TYPE_LABEL: Record<MaterialBlockType, string> = Object.fromEntries(
  BLOCK_OPTIONS.map((b) => [b.type, b.label]),
) as Record<MaterialBlockType, string>;

const TYPE_ICON: Record<MaterialBlockType, React.ReactNode> = Object.fromEntries(
  BLOCK_OPTIONS.map((b) => [b.type, b.icon]),
) as Record<MaterialBlockType, React.ReactNode>;

function makeBlock(type: MaterialBlockType, order: number): MaterialBlock {
  const base: MaterialBlock = {
    id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title: "",
    description: "",
    order,
  };
  if (type === "table") base.table = { headers: ["항목", "값"], rows: [["", ""]] };
  if (type === "text") base.text = "";
  return base;
}

type Props = {
  value: MaterialBlock[];
  onChange: (next: MaterialBlock[]) => void;
};

export function MaterialBlocksEditor({ value, onChange }: Props) {
  const sorted = [...value].sort((a, b) => a.order - b.order);

  function addBlock(type: MaterialBlockType) {
    const order = sorted.length;
    onChange([...sorted, makeBlock(type, order)]);
  }

  function updateBlock(id: string, patch: Partial<MaterialBlock>) {
    onChange(sorted.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function removeBlock(id: string) {
    onChange(sorted.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i })));
  }

  function move(id: string, dir: -1 | 1) {
    const idx = sorted.findIndex((b) => b.id === id);
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    const arr = [...sorted];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChange(arr.map((b, i) => ({ ...b, order: i })));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sorted.findIndex((b) => b.id === active.id);
    const newIdx = sorted.findIndex((b) => b.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(sorted, oldIdx, newIdx);
    onChange(next.map((b, i) => ({ ...b, order: i })));
  }

  return (
    <div className="space-y-3">
      {sorted.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          아직 자료 블록이 없습니다. 아래 버튼으로 블록을 추가하세요.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {sorted.map((block, idx) => (
            <SortableBlockCard
              key={block.id}
              block={block}
              idx={idx}
              total={sorted.length}
              onMove={(dir) => move(block.id, dir)}
              onRemove={() => removeBlock(block.id)}
              onUpdate={(patch) => updateBlock(block.id, patch)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4" /> 자료 블록 추가
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {BLOCK_OPTIONS.map((opt) => (
            <DropdownMenuItem key={opt.type} onClick={() => addBlock(opt.type)}>
              <span className="mr-2 text-brand">{opt.icon}</span>
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SortableBlockCard({
  block,
  idx,
  total,
  onMove,
  onRemove,
  onUpdate,
}: {
  block: MaterialBlock;
  idx: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<MaterialBlock>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-background p-4"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="grid h-7 w-7 cursor-grab place-items-center rounded-md text-muted-foreground hover:bg-secondary active:cursor-grabbing"
          aria-label="블록 순서 변경"
          title="드래그하여 순서 변경"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft/50 text-brand">
          {TYPE_ICON[block.type]}
        </span>
        <span className="text-xs font-semibold text-primary">
          {idx + 1}. {TYPE_LABEL[block.type]}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => onMove(-1)} disabled={idx === 0}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => onMove(1)} disabled={idx === total - 1}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <Input
          value={block.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="블록 제목 (예: 핵심 지표 요약)"
          className="h-9"
        />
        <Input
          value={block.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="블록 설명 (선택)"
          className="h-9"
        />
      </div>

      <div className="mt-3">
        <BlockPayloadEditor block={block} onChange={onUpdate} />
      </div>
    </div>
  );
}

function BlockPayloadEditor({
  block,
  onChange,
}: {
  block: MaterialBlock;
  onChange: (patch: Partial<MaterialBlock>) => void;
}) {
  if (block.type === "image") {
    return (
      <ImageUploadField
        url={block.image_url}
        alt={block.image_alt}
        onChange={(patch) => onChange(patch)}
      />
    );
  }

  if (block.type === "text") {
    return (
      <Textarea
        rows={4}
        value={block.text ?? ""}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="자료 본문 텍스트"
      />
    );
  }

  if (block.type === "table") {
    const table = block.table ?? { headers: ["항목", "값"], rows: [["", ""]] };
    return (
      <TableBlockEditor table={table} onChange={(next) => onChange({ table: next })} />
    );
  }

  if (block.type === "file") {
    return (
      <FileUploadField
        url={block.file_url}
        name={block.file_name}
        size={block.file_size}
        onChange={(patch) => onChange(patch)}
      />
    );
  }

  if (block.type === "link") {
    return (
      <div className="grid gap-2">
        <Label className="text-xs">링크 URL</Label>
        <Input
          value={block.link_url ?? ""}
          onChange={(e) => onChange({ link_url: e.target.value })}
          placeholder="https://..."
          className="h-9"
        />
        <Label className="text-xs">표시할 텍스트</Label>
        <Input
          value={block.link_label ?? ""}
          onChange={(e) => onChange({ link_label: e.target.value })}
          placeholder="예: 참고 자료 보러가기"
          className="h-9"
        />
      </div>
    );
  }

  return null;
}

function ImageUploadField({
  url,
  alt,
  onChange,
}: {
  url?: string;
  alt?: string;
  onChange: (patch: Partial<MaterialBlock>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange({ image_url: data.publicUrl });
      toast.success("이미지를 업로드했습니다.");
    } catch (e) {
      console.error(e);
      toast.error("업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {url ? (
        <div className="space-y-2">
          <img
            src={url}
            alt={alt ?? ""}
            className="max-h-64 w-full rounded-md border border-border object-contain"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} 다시 업로드
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-destructive"
              onClick={() => onChange({ image_url: undefined })}>
              <X className="h-3.5 w-3.5" /> 제거
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 text-xs text-muted-foreground hover:bg-secondary/60"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {uploading ? "업로드 중..." : "클릭하여 이미지 업로드"}
        </button>
      )}
      <Input
        value={alt ?? ""}
        onChange={(e) => onChange({ image_alt: e.target.value })}
        placeholder="대체 텍스트 (선택)"
        className="h-9"
      />
    </div>
  );
}

function FileUploadField({
  url,
  name,
  size,
  onChange,
}: {
  url?: string;
  name?: string;
  size?: number;
  onChange: (patch: Partial<MaterialBlock>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `files/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange({ file_url: data.publicUrl, file_name: file.name, file_size: file.size });
      toast.success("파일을 업로드했습니다.");
    } catch (e) {
      console.error(e);
      toast.error("업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {url ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/30 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-brand" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-primary">{name ?? "첨부파일"}</div>
              {size != null && (
                <div className="text-[11px] text-muted-foreground">{formatBytes(size)}</div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              교체
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive"
              onClick={() => onChange({ file_url: undefined, file_name: undefined, file_size: undefined })}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 text-xs text-muted-foreground hover:bg-secondary/60"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          {uploading ? "업로드 중..." : "클릭하여 파일 업로드"}
        </button>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type TableData = { headers: string[]; rows: string[][]; column_widths?: number[] };

const MIN_COL_WIDTH = 60;
const DEFAULT_COL_WIDTH = 160;

function useColumnResize(
  table: TableData,
  onChange: (next: TableData) => void,
) {
  const startResize = (ci: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest("th");
    const startWidth = th?.getBoundingClientRect().width ?? DEFAULT_COL_WIDTH;
    const startX = e.clientX;
    const initial =
      table.column_widths && table.column_widths.length === table.headers.length
        ? [...table.column_widths]
        : table.headers.map((_, i) =>
            Math.round(table.column_widths?.[i] ?? DEFAULT_COL_WIDTH),
          );

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = [...initial];
      next[ci] = Math.max(MIN_COL_WIDTH, Math.round(startWidth + delta));
      onChange({ ...table, column_widths: next });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  return { startResize };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseDelimitedText(text: string): TableData | null {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const rows = lines.map((l) => (delim === "\t" ? l.split("\t") : parseCsvLine(l)));
  const maxCols = Math.max(...rows.map((r) => r.length));
  const norm = rows.map((r) => [...r, ...Array(maxCols - r.length).fill("")]);
  const headers = norm[0].map((h, i) => (h?.trim() ? h : `열 ${i + 1}`));
  const dataRows = norm.slice(1);
  return {
    headers,
    rows: dataRows.length > 0 ? dataRows : [Array(maxCols).fill("")],
  };
}

function TableBlockEditor({
  table,
  onChange,
}: {
  table: TableData;
  onChange: (next: TableData) => void;
}) {
  const colCount = table.headers.length;
  const { startResize } = useColumnResize(table, onChange);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function applyParsed(parsed: TableData | null, sourceText?: string) {
    if (!parsed) {
      setPasteError("표를 인식하지 못했습니다. 원본 텍스트를 확인하고 다시 시도해주세요.");
      if (sourceText !== undefined) setPasteText(sourceText);
      return;
    }
    onChange(parsed);
    setPasteMode(false);
    setPasteText("");
    setPasteError(null);
    toast.success(`표를 불러왔습니다. (${parsed.rows.length}행 × ${parsed.headers.length}열)`);
  }

  function handleApplyPaste() {
    try {
      const parsed = parseDelimitedText(pasteText);
      applyParsed(parsed, pasteText);
    } catch (e) {
      console.error(e);
      setPasteError("파싱 중 오류가 발생했습니다.");
    }
  }

  async function handleFile(file: File) {
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".csv") || file.type === "text/csv") {
        const text = await file.text();
        applyParsed(parseDelimitedText(text), text);
        return;
      }
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
      if (!aoa.length) {
        toast.error("빈 시트입니다.");
        return;
      }
      const maxCols = Math.max(...aoa.map((r) => r.length));
      const norm = aoa.map((r) => [...r.map(String), ...Array(maxCols - r.length).fill("")]);
      const headers = norm[0].map((h, i) => (h?.trim() ? h : `열 ${i + 1}`));
      const rows = norm.slice(1);
      applyParsed({
        headers,
        rows: rows.length > 0 ? rows : [Array(maxCols).fill("")],
      });
    } catch (e) {
      console.error(e);
      toast.error("파일을 읽지 못했습니다.");
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => { setPasteMode((v) => !v); setPasteError(null); }}
        >
          <FileText className="h-3.5 w-3.5" /> {pasteMode ? "붙여넣기 닫기" : "엑셀/시트 붙여넣기"}
        </Button>
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" /> CSV/엑셀 업로드
        </Button>
        <span className="text-[11px] text-muted-foreground">
          엑셀이나 구글시트에서 표를 복사한 뒤 붙여넣으면 자동으로 인식돼요.
        </span>
      </div>

      {pasteMode && (
        <div className="space-y-2 rounded-md border border-border bg-secondary/30 p-3">
          <Textarea
            rows={6}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (text) {
                e.preventDefault();
                setPasteText(text);
                const parsed = parseDelimitedText(text);
                if (parsed) applyParsed(parsed);
                else setPasteError("표를 인식하지 못했습니다. 텍스트를 확인해주세요.");
              }
            }}
            placeholder={"엑셀/구글시트에서 표를 복사해 여기에 붙여넣으세요.\n(또는 CSV 텍스트를 직접 입력)"}
            className="text-xs"
          />
          {pasteError && (
            <p className="text-xs text-destructive">{pasteError}</p>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleApplyPaste} disabled={!pasteText.trim()}>
              표로 변환
            </Button>
            <Button type="button" size="sm" variant="ghost"
              onClick={() => { setPasteMode(false); setPasteText(""); setPasteError(null); }}>
              취소
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            {table.headers.map((_, i) => {
              const w = table.column_widths?.[i];
              return <col key={i} style={w ? { width: `${w}px` } : { width: `${DEFAULT_COL_WIDTH}px` }} />;
            })}
            <col style={{ width: "40px" }} />
          </colgroup>
          <thead>
            <tr className="bg-secondary/50">
              {table.headers.map((h, ci) => (
                <th key={ci} className="relative border-b border-r border-border p-0 align-middle last:border-r-0">
                  <div className="flex items-center">
                    <Input
                      value={h}
                      onChange={(e) => {
                        const headers = [...table.headers];
                        headers[ci] = e.target.value;
                        onChange({ ...table, headers });
                      }}
                      placeholder={`헤더 ${ci + 1}`}
                      className="h-9 rounded-none border-0 bg-transparent text-xs font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      type="button" size="icon" variant="ghost"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={table.headers.length <= 1}
                      onClick={() =>
                        onChange({
                          headers: table.headers.filter((_, i) => i !== ci),
                          rows: table.rows.map((r) => r.filter((_, i) => i !== ci)),
                          column_widths: table.column_widths?.filter((_, i) => i !== ci),
                        })
                      }
                      title="이 열 삭제"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={(e) => startResize(ci, e)}
                    className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize select-none hover:bg-brand/40 active:bg-brand/60"
                    title="드래그하여 열 너비 조정"
                  />
                </th>
              ))}
              <th className="border-b border-border bg-secondary/50">
                <Button
                  type="button" size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() =>
                    onChange({
                      headers: [...table.headers, `헤더 ${colCount + 1}`],
                      rows: table.rows.map((r) => [...r, ""]),
                      column_widths: table.column_widths
                        ? [...table.column_widths, DEFAULT_COL_WIDTH]
                        : undefined,
                    })
                  }
                  title="열 추가"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-b-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="border-r border-border p-0 align-middle last:border-r-0">
                    <Input
                      value={cell}
                      onChange={(e) => {
                        const rows = table.rows.map((r) => [...r]);
                        rows[ri][ci] = e.target.value;
                        onChange({ ...table, rows });
                      }}
                      placeholder=" "
                      className="h-9 rounded-none border-0 bg-transparent text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </td>
                ))}
                <td className="w-10 bg-background">
                  <Button
                    type="button" size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() =>
                      onChange({ ...table, rows: table.rows.filter((_, idx) => idx !== ri) })
                    }
                    title="이 행 삭제"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => onChange({ ...table, rows: [...table.rows, Array(colCount).fill("")] })}
        >
          <Plus className="h-3.5 w-3.5" /> 행 추가
        </Button>
      </div>
    </div>
  );
}
