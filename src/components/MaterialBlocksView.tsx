import { Card } from "@/components/ui/card";
import { FileText, ImageIcon, Link as LinkIcon, Table as TableIcon, Type } from "lucide-react";
import type { MaterialBlock } from "@/lib/missions";
import { ParagraphText } from "@/components/ParagraphText";
import { ResizableViewTable } from "@/components/ResizableViewTable";

const TYPE_META: Record<MaterialBlock["type"], { label: string; icon: typeof FileText }> = {
  image: { label: "이미지", icon: ImageIcon },
  table: { label: "표", icon: TableIcon },
  text: { label: "텍스트", icon: Type },
  file: { label: "파일", icon: FileText },
  link: { label: "링크", icon: LinkIcon },
};

export function MaterialBlocksView({ blocks }: { blocks: MaterialBlock[] }) {
  if (!blocks || blocks.length === 0) return null;
  const sorted = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="space-y-4">
      {sorted.map((b) => {
        const Icon = TYPE_META[b.type]?.icon ?? FileText;
        return (
          <Card key={b.id} className="p-4 md:p-6">
            <div className="flex items-start gap-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-base font-bold text-primary">{b.title || TYPE_META[b.type]?.label}</div>
                {b.description && (
                  <ParagraphText text={b.description} className="mt-1 text-xs text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="mt-4">
              <BlockBody block={b} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function BlockBody({ block: b }: { block: MaterialBlock }) {
  switch (b.type) {
    case "image":
      return b.image_url ? (
        <img
          src={b.image_url}
          alt={b.image_alt ?? ""}
          className="max-h-[320px] w-full rounded-md border border-border object-contain md:max-h-[480px]"
        />
      ) : (
        <Empty>이미지가 첨부되지 않았습니다.</Empty>
      );

    case "table":
      return b.table && b.table.headers.length > 0 ? (
        <div>
          {b.table.headers.length > 2 && (
            <p className="mb-2 text-[11px] text-muted-foreground md:hidden">← 좌우로 스크롤 →</p>
          )}
          <div className="-mx-4 overflow-x-auto md:mx-0">
            <ResizableViewTable
              headers={b.table.headers}
              rows={b.table.rows}
              initialWidths={b.table.column_widths}
            />
          </div>
        </div>
      ) : (
        <Empty>표 데이터가 없습니다.</Empty>
      );

    case "text":
      return b.text ? (
        <ParagraphText text={b.text} className="text-sm text-foreground/90" />
      ) : (
        <Empty>본문이 없습니다.</Empty>
      );

    case "file":
      return b.file_url ? (
        <a
          href={b.file_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-brand hover:bg-secondary/60"
        >
          <FileText className="h-4 w-4" />
          {b.file_name || "첨부파일 다운로드"}
        </a>
      ) : (
        <Empty>첨부파일이 없습니다.</Empty>
      );

    case "link":
      return b.link_url ? (
        <a
          href={b.link_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm text-brand underline"
        >
          <LinkIcon className="h-4 w-4" />
          {b.link_label || b.link_url}
        </a>
      ) : (
        <Empty>링크가 없습니다.</Empty>
      );

    default:
      return null;
  }
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
