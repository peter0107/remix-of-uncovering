import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { findTable, TableMap } from "@tiptap/pm/tables";

import { Button } from "@/components/ui/button";
import { uploadMissionContentImage } from "@/lib/mission-assets";
import { isRichTextEmpty } from "@/lib/rich-text";
import { toast } from "sonner";

function ToolbarButton({
  active,
  children,
  onClick,
  disabled,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={active ? "border-brand bg-brand-soft text-brand" : ""}
    >
      {children}
    </Button>
  );
}

function getFirstRowSelection(editor: Editor) {
  const table = findTable(editor.state.selection.$from);

  if (!table) return null;

  const map = TableMap.get(table.node);

  if (map.width === 0) return null;

  const anchorCell = table.start + map.positionAt(0, 0, table.node);
  const headCell = table.start + map.positionAt(0, map.width - 1, table.node);

  return { anchorCell, headCell };
}

function isFirstRowHeader(editor: Editor) {
  const selection = getFirstRowSelection(editor);

  if (!selection) return false;

  const firstCell = editor.state.doc.resolve(selection.anchorCell).nodeAfter;

  return firstCell?.type.name === "tableHeader";
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClassName = "min-h-[280px]",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        autolink: true,
        openOnClick: false,
        protocols: ["http", "https", "mailto"],
      }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder ?? "내용을 작성하세요",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `rich-text-content ${minHeightClassName} px-4 py-4 focus:outline-none`,
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (current === incoming) return;
    if (isRichTextEmpty(current) && isRichTextEmpty(incoming)) return;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, value]);

  async function handleImage(file: File) {
    if (!editor) return;
    setUploading(true);
    try {
      const url = await uploadMissionContentImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      toast.success("이미지를 업로드했습니다.");
    } catch (error) {
      toast.error((error as Error).message || "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL을 입력하세요.", previousUrl || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function toggleFirstHeaderRow() {
    if (!editor) return;
    const selection = getFirstRowSelection(editor);

    if (!selection) return;

    editor.chain().focus().setCellSelection(selection).toggleHeaderRow().run();
  }

  if (!editor) {
    return (
      <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
        에디터를 불러오는 중...
      </div>
    );
  }

  const inTable = editor.isActive("table");

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleImage(file);
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2 border-b border-border bg-secondary/20 p-3">
        <ToolbarButton
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <Table2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={inTable && isFirstRowHeader(editor)}
          onClick={toggleFirstHeaderRow}
          disabled={!inTable}
        >
          첫 줄 헤더
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!inTable}
        >
          행 추가
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} disabled={!inTable}>
          행 삭제
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!inTable}
        >
          열 추가
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().deleteColumn().run()}
          disabled={!inTable}
        >
          열 삭제
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={!inTable}
        >
          <Trash2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="border-b border-border bg-brand-soft/25 px-4 py-2 text-xs text-muted-foreground">
        {inTable
          ? "표 세로선을 마우스로 드래그해서 각 열 너비를 조절할 수 있습니다."
          : "표 안에 커서를 두면 행/열 추가, 헤더 설정, 열 너비 조절을 바로 사용할 수 있습니다."}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
