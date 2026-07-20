import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code2,
  Columns3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Rows3,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

const RICH_TEXT_PREFIX = "<!-- beginner-rich-text -->";
const RICH_TEXT_IMAGE_DRAG_TYPE = "application/x-beginner-rich-text-image";
const MAX_RICH_TEXT_IMAGE_BYTES = 5 * 1024 * 1024;
const RICH_TEXT_IMAGE_WIDTHS = [35, 50, 65, 80, 100] as const;
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "span",
  "font",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "colgroup",
  "col",
  "figure",
  "img",
]);

type TableResizeState = {
  pointerId: number;
  columnIndex: number;
  startX: number;
  table: HTMLTableElement;
  widths: number[];
};

type ContentTableResizeState = TableResizeState;
type ContentTableWidths = Record<string, number[]>;

// User-side table adjustments should survive nearby UI state changes during the same session.
const contentTableWidthCache = new Map<string, ContentTableWidths>();

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>");
}

function isTableDivider(value: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(value);
}

function splitTableRow(value: string) {
  return value
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function markdownToRichHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```") || line.startsWith("~~~")) {
      const fence = line.slice(0, 3);
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith(fence)) {
        codeLines.push(lines[index]);
        index += 1;
      }
      output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = Math.min(4, heading[1].length + 1);
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith("> ")) {
        quoteLines.push(lines[index].slice(2));
        index += 1;
      }
      output.push(
        `<blockquote><p>${quoteLines.map((quote) => inlineMarkdown(quote)).join("<br>")}</p></blockquote>`,
      );
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      output.push(
        `<table><thead><tr>${headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr>${headers
                .map((_, cellIndex) => `<td>${inlineMarkdown(row[cellIndex] ?? "")}</td>`)
                .join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
      );
      continue;
    }

    const unordered = line.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(/^[-*+]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      output.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\d+[.)]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      output.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      const next = lines[index];
      if (
        paragraph.length > 0 &&
        (next.startsWith("#") ||
          next.startsWith("> ") ||
          /^[-*+]\s+/.test(next) ||
          /^\d+[.)]\s+/.test(next))
      ) {
        break;
      }
      paragraph.push(next);
      index += 1;
    }
    output.push(`<p>${paragraph.map(inlineMarkdown).join("<br>")}</p>`);
  }

  return output.join("");
}

function getAttribute(tag: string, attribute: string) {
  const match = tag.match(new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1]?.trim() ?? "";
}

function isSafeColor(value: string) {
  return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-z]+)$/i.test(value);
}

function sanitizeStyle(style: string) {
  const allowed = style
    .split(";")
    .map((declaration) => declaration.split(":", 2).map((part) => part.trim()))
    .filter(
      ([property, value]) =>
        ["color", "background-color"].includes(property.toLowerCase()) && isSafeColor(value),
    )
    .map(([property, value]) => `${property.toLowerCase()}:${value}`);
  return allowed.join(";");
}

function sanitizeColumnStyle(style: string) {
  const width = style.match(/width\s*:\s*(\d+(?:\.\d+)?)%/i)?.[1];
  return width && Number(width) > 0 && Number(width) <= 100 ? `width:${width}%` : "";
}

function isSafeImageSource(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function sanitizeRichHtml(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, rawName: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return "";
      if (tag.startsWith("</")) return `</${name}>`;
      if (name === "font") {
        const color = getAttribute(tag, "color");
        return isSafeColor(color) ? `<font color="${color}">` : "<font>";
      }
      if (name === "span") {
        const style = sanitizeStyle(getAttribute(tag, "style"));
        return style ? `<span style="${style}">` : "<span>";
      }
      if (name === "col") {
        const style = sanitizeColumnStyle(getAttribute(tag, "style"));
        return style ? `<col style="${style}">` : "<col>";
      }
      if (name === "img") {
        const source = getAttribute(tag, "src");
        const alt = getAttribute(tag, "alt").slice(0, 250);
        return isSafeImageSource(source)
          ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(alt)}">`
          : "";
      }
      if (name === "figure") {
        const id = getAttribute(tag, "data-rich-image-id");
        const width = getAttribute(tag, "data-width");
        const align = getAttribute(tag, "data-align");
        const safeId = /^[a-z0-9-]{1,80}$/i.test(id) ? id : "image";
        const safeWidth = RICH_TEXT_IMAGE_WIDTHS.map(String).includes(width) ? width : "100";
        const safeAlign = ["left", "center", "right"].includes(align) ? align : "center";
        return `<figure data-rich-image="true" data-rich-image-id="${safeId}" data-width="${safeWidth}" data-align="${safeAlign}" contenteditable="false" draggable="true">`;
      }
      return name === "br" ? "<br>" : `<${name}>`;
    });
}

function toEditorHtml(value: string) {
  if (value.startsWith(RICH_TEXT_PREFIX)) {
    return sanitizeRichHtml(value.slice(RICH_TEXT_PREFIX.length));
  }
  return markdownToRichHtml(value);
}

function toStoredValue(html: string) {
  return `${RICH_TEXT_PREFIX}${sanitizeRichHtml(html)}`;
}

function ToolbarButton({
  label,
  onClick,
  children,
  active = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${
        active
          ? "bg-neutral-200 text-neutral-950"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      } disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  minHeight = "9rem",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const tableResizeRef = useRef<TableResizeState | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const lastLocalValueRef = useRef<string | null>(null);
  const initialHtml = toEditorHtml(value);
  const [activePalette, setActivePalette] = useState<"table" | null>(null);
  const [tableGridSize, setTableGridSize] = useState({ rows: 3, columns: 3 });
  const [isUnderlined, setIsUnderlined] = useState(false);
  const [isStruckThrough, setIsStruckThrough] = useState(false);
  const [isInlineCode, setIsInlineCode] = useState(false);
  const [isCodeBlock, setIsCodeBlock] = useState(false);
  const [activeTable, setActiveTable] = useState<{
    tableIndex: number;
    rowIndex: number;
    columnIndex: number;
  } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isTableResizing, setIsTableResizing] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastLocalValueRef.current === value) return;
    if (editor.innerHTML !== initialHtml) editor.innerHTML = initialHtml;
  }, [initialHtml, value]);

  const rememberSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      selectionRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    const range = selectionRangeRef.current;
    editor?.focus();
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const rememberDropSelection = (clientX: number, clientY: number) => {
    const editor = editorRef.current;
    const range = document.caretRangeFromPoint?.(clientX, clientY);
    if (editor && range && editor.contains(range.commonAncestorContainer)) {
      selectionRangeRef.current = range.cloneRange();
    }
  };

  const getSelectionElement = () => {
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    if (!node) return null;
    return node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : (node.parentElement as HTMLElement | null);
  };

  const getTableSelection = () => {
    const editor = editorRef.current;
    const element = getSelectionElement();
    if (!editor || !element || !editor.contains(element)) return null;

    const cell = element.closest("td, th");
    const table = cell?.closest("table");
    const row = cell?.parentElement;
    if (!cell || !table || !row) return null;

    const tableIndex = Array.from(editor.querySelectorAll("table")).indexOf(table);
    return {
      tableIndex,
      rowIndex: Array.from(table.rows).indexOf(row as HTMLTableRowElement),
      columnIndex: Array.from((row as HTMLTableRowElement).cells).indexOf(
        cell as HTMLTableCellElement,
      ),
    };
  };

  const refreshToolbarState = () => {
    const editor = editorRef.current;
    const element = getSelectionElement();
    if (!editor || !element || !editor.contains(element)) {
      setActiveTable(null);
      return;
    }

    setIsUnderlined(document.queryCommandState("underline"));
    setIsStruckThrough(document.queryCommandState("strikeThrough"));
    setIsInlineCode(Boolean(element.closest("code:not(pre code)")));
    setIsCodeBlock(Boolean(element.closest("pre")));

    setActiveTable(getTableSelection());
    rememberSelection();
  };

  const commitChange = () => {
    if (editorRef.current) {
      const nextValue = toStoredValue(editorRef.current.innerHTML);
      lastLocalValueRef.current = nextValue;
      onChange(nextValue);
    }
    window.requestAnimationFrame(refreshToolbarState);
  };

  const removeEmptyHeadings = () => {
    const editor = editorRef.current;
    if (!editor) return;

    Array.from(editor.querySelectorAll("h1, h2, h3, h4")).forEach((heading) => {
      const hasText = heading.textContent?.replace(/\u00a0/g, " ").trim();
      const hasNonTextContent = heading.querySelector("img, table, figure");
      if (hasText || hasNonTextContent) return;

      const nextBlock = heading.nextElementSibling as HTMLElement | null;
      const previousBlock = heading.previousElementSibling as HTMLElement | null;
      const selection = window.getSelection();
      const anchor = selection?.anchorNode;
      const wasEditingHeading = Boolean(anchor && heading.contains(anchor));
      heading.remove();

      if (!wasEditingHeading) return;
      const destination = nextBlock ?? previousBlock;
      if (!destination) return;

      const range = document.createRange();
      range.selectNodeContents(destination);
      range.collapse(Boolean(nextBlock));
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  };

  const handleEditorInput = () => {
    removeEmptyHeadings();
    commitChange();
  };

  const command = (name: string, commandValue?: string) => {
    restoreSelection();
    document.execCommand(name, false, commandValue);
    commitChange();
  };

  const toggleInlineCode = () => {
    const selection = window.getSelection();
    const element = getSelectionElement();
    const code = element?.closest("code:not(pre code)");
    if (code) {
      const range = document.createRange();
      range.selectNodeContents(code);
      selection?.removeAllRanges();
      selection?.addRange(range);
      command("insertHTML", code.innerHTML);
      return;
    }

    const selectedText = selection?.toString() ?? "";
    command(
      "insertHTML",
      selectedText ? `<code>${escapeHtml(selectedText)}</code>` : "<code>&nbsp;</code>",
    );
  };

  const toggleCodeBlock = () => {
    command("formatBlock", getSelectionElement()?.closest("pre") ? "p" : "pre");
  };

  const buildTable = (rows: number, columns: number) => {
    const cells = Array.from({ length: columns }, () => "<td><br></td>").join("");
    const columnWidth = 100 / columns;
    const columnGroup = `<colgroup>${Array.from(
      { length: columns },
      () => `<col style="width:${columnWidth}%">`,
    ).join("")}</colgroup>`;
    return `<table>${columnGroup}<tbody>${Array.from({ length: rows }, () => `<tr>${cells}</tr>`).join("")}</tbody></table><p><br></p>`;
  };

  const ensureColumnWidths = (table: HTMLTableElement) => {
    const columnCount = Math.max(...Array.from(table.rows).map((row) => row.cells.length), 1);
    let columnGroup = table.querySelector(":scope > colgroup") as HTMLTableColElement | null;
    if (!columnGroup) {
      columnGroup = document.createElement("colgroup") as unknown as HTMLTableColElement;
      table.insertBefore(columnGroup, table.firstChild);
    }

    while (columnGroup.children.length < columnCount) {
      columnGroup.append(document.createElement("col"));
    }
    while (columnGroup.children.length > columnCount) {
      columnGroup.lastElementChild?.remove();
    }

    const columns = Array.from(columnGroup.children) as HTMLTableColElement[];
    const fallbackWidth = 100 / columnCount;
    columns.forEach((column) => {
      if (!column.style.width.endsWith("%")) column.style.width = `${fallbackWidth}%`;
    });
    return columns;
  };

  const resetColumnWidths = (table: HTMLTableElement) => {
    const columns = ensureColumnWidths(table);
    const width = 100 / columns.length;
    columns.forEach((column) => {
      column.style.width = `${width}%`;
    });
  };

  const insertTable = (rows: number, columns: number) => {
    restoreSelection();
    const editor = editorRef.current;
    const markup = buildTable(rows, columns);
    const insertedWithHistory = document.execCommand("insertHTML", false, markup);

    if (!insertedWithHistory && editor) {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (range && editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(range.createContextualFragment(markup));
      } else {
        editor.insertAdjacentHTML("beforeend", markup);
      }
    }

    commitChange();
  };

  const focusTableCell = (tableIndex: number, rowIndex: number, columnIndex: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    const table = editor.querySelectorAll("table")[tableIndex] as HTMLTableElement | undefined;
    const row = table?.rows[Math.min(rowIndex, (table?.rows.length ?? 1) - 1)];
    const cell = row?.cells[Math.min(columnIndex, (row?.cells.length ?? 1) - 1)];
    if (!cell) return;

    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.focus();
    refreshToolbarState();
  };

  const mutateActiveTable = (
    mutation: (table: HTMLTableElement) => void,
    focusPosition?: { rowIndex: number; columnIndex: number },
  ) => {
    const editor = editorRef.current;
    const selection = getTableSelection() ?? activeTable;
    if (!editor || !selection) return;

    const table = editor.querySelectorAll("table")[selection.tableIndex] as
      | HTMLTableElement
      | undefined;
    if (!table) return;

    // Restrict the history mutation to the table itself so surrounding rich text keeps its markup.
    const replacement = document.createElement("div");
    replacement.append(table.cloneNode(true));
    const replacementTable = replacement.querySelector("table") as HTMLTableElement | null;
    if (!replacementTable) return;

    mutation(replacementTable);
    const range = document.createRange();
    range.selectNode(table);
    const browserSelection = window.getSelection();
    browserSelection?.removeAllRanges();
    browserSelection?.addRange(range);
    editor.focus();
    document.execCommand("insertHTML", false, replacement.innerHTML);
    commitChange();

    if (focusPosition && replacement.querySelector("table")) {
      window.requestAnimationFrame(() =>
        focusTableCell(selection.tableIndex, focusPosition.rowIndex, focusPosition.columnIndex),
      );
    }
  };

  const addTableRow = () => {
    const selection = getTableSelection() ?? activeTable;
    if (!selection) return;
    mutateActiveTable(
      (table) => {
        const sourceRow = table.rows[Math.min(selection.rowIndex, table.rows.length - 1)];
        const row = table.insertRow(Math.min(selection.rowIndex + 1, table.rows.length));
        const count = sourceRow?.cells.length || 1;
        for (let index = 0; index < count; index += 1) row.insertCell().innerHTML = "<br>";
      },
      { rowIndex: selection.rowIndex + 1, columnIndex: selection.columnIndex },
    );
  };

  const deleteTableRow = () => {
    const selection = getTableSelection() ?? activeTable;
    if (!selection) return;
    mutateActiveTable((table) => {
      if (table.rows.length <= 1) table.remove();
      else table.deleteRow(selection.rowIndex);
    });
  };

  const addTableColumn = () => {
    const selection = getTableSelection() ?? activeTable;
    if (!selection) return;
    mutateActiveTable(
      (table) => {
        Array.from(table.rows).forEach((row) => {
          const cell = row.parentElement?.tagName === "THEAD" ? row.insertCell() : row.insertCell();
          if (row.parentElement?.tagName === "THEAD") cell.outerHTML = "<th><br></th>";
          else cell.innerHTML = "<br>";
        });
        resetColumnWidths(table);
      },
      { rowIndex: selection.rowIndex, columnIndex: selection.columnIndex + 1 },
    );
  };

  const deleteTableColumn = () => {
    const selection = getTableSelection() ?? activeTable;
    if (!selection) return;
    mutateActiveTable((table) => {
      const columnCount = Math.max(...Array.from(table.rows).map((row) => row.cells.length));
      if (columnCount <= 1) table.remove();
      else {
        Array.from(table.rows).forEach((row) => row.deleteCell(selection.columnIndex));
        resetColumnWidths(table);
      }
    });
  };

  const deleteTable = () => mutateActiveTable((table) => table.remove());

  const beginTableResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const editor = editorRef.current;
    const target = event.target as HTMLElement;
    const cell = target.closest("td, th");
    const table = cell?.closest("table");
    if (!editor || !cell || !table || !editor.contains(table)) return;

    const row = cell.parentElement as HTMLTableRowElement | null;
    const columnIndex = row ? Array.from(row.cells).indexOf(cell as HTMLTableCellElement) : -1;
    const columnCount = Math.max(
      ...Array.from(table.rows).map((currentRow) => currentRow.cells.length),
    );
    const cellRect = cell.getBoundingClientRect();
    const nearRightBorder = Math.abs(event.clientX - cellRect.right) <= 7;
    if (columnIndex < 0 || columnIndex >= columnCount - 1 || !nearRightBorder) return;

    const columns = ensureColumnWidths(table);
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    tableResizeRef.current = {
      pointerId: event.pointerId,
      columnIndex,
      startX: event.clientX,
      table,
      widths: columns.map(
        (column) => Number.parseFloat(column.style.width) || 100 / columns.length,
      ),
    };
    setIsTableResizing(true);
  };

  const moveTableResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = tableResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const columns = ensureColumnWidths(resize.table);
    const tableWidth = resize.table.getBoundingClientRect().width;
    if (!tableWidth) return;

    const minimumWidth = 8;
    const delta = ((event.clientX - resize.startX) / tableWidth) * 100;
    const currentWidth = resize.widths[resize.columnIndex] ?? minimumWidth;
    const nextWidth = resize.widths[resize.columnIndex + 1] ?? minimumWidth;
    const constrainedDelta = Math.max(
      minimumWidth - currentWidth,
      Math.min(nextWidth - minimumWidth, delta),
    );

    columns[resize.columnIndex].style.width = `${currentWidth + constrainedDelta}%`;
    columns[resize.columnIndex + 1].style.width = `${nextWidth - constrainedDelta}%`;
  };

  const endTableResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tableResizeRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    tableResizeRef.current = null;
    setIsTableResizing(false);
    commitChange();
  };

  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 넣을 수 있습니다.");
      return;
    }
    if (file.size > MAX_RICH_TEXT_IMAGE_BYTES) {
      toast.error("이미지는 5MB 이하만 넣을 수 있습니다.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error("로그인이 필요합니다.");

      const extension =
        {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
        }[file.type] ?? "image";
      const objectPath = `${data.user.id}/rich-text/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("simulation-card-assets")
        .upload(objectPath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("simulation-card-assets")
        .getPublicUrl(objectPath);
      restoreSelection();
      const editor = editorRef.current;
      if (!editor) return;

      const imageId = crypto.randomUUID();
      const markup = `<figure data-rich-image="true" data-rich-image-id="${imageId}" data-width="100" data-align="center" contenteditable="false" draggable="true"><img src="${escapeHtml(publicUrl.publicUrl)}" alt=""></figure><p><br></p>`;
      const insertedWithHistory = document.execCommand("insertHTML", false, markup);
      if (!insertedWithHistory) editor.insertAdjacentHTML("beforeend", markup);
      setSelectedImageId(imageId);
      commitChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이미지를 저장하지 못했습니다.");
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const openImagePicker = () => {
    rememberSelection();
    imageInputRef.current?.click();
  };

  const onImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadImageFile(file);
  };

  const getSelectedImage = () => {
    if (!editorRef.current || !selectedImageId) return null;
    return editorRef.current.querySelector(
      `figure[data-rich-image-id="${selectedImageId}"]`,
    ) as HTMLElement | null;
  };

  const updateSelectedImage = (update: (figure: HTMLElement) => void) => {
    const figure = getSelectedImage();
    if (!figure) return;
    update(figure);
    commitChange();
  };

  const setSelectedImageAlign = (align: "left" | "center" | "right") => {
    updateSelectedImage((figure) => figure.setAttribute("data-align", align));
  };

  const resizeSelectedImage = (direction: -1 | 1) => {
    updateSelectedImage((figure) => {
      const current = Number(figure.getAttribute("data-width")) || 100;
      const index = RICH_TEXT_IMAGE_WIDTHS.indexOf(
        current as (typeof RICH_TEXT_IMAGE_WIDTHS)[number],
      );
      const next =
        RICH_TEXT_IMAGE_WIDTHS[
          Math.max(0, Math.min(RICH_TEXT_IMAGE_WIDTHS.length - 1, index + direction))
        ];
      figure.setAttribute("data-width", String(next));
    });
  };

  const deleteSelectedImage = () => {
    const figure = getSelectedImage();
    if (!figure) return;
    figure.remove();
    setSelectedImageId(null);
    commitChange();
  };

  const handleEditorDrop = (event: DragEvent<HTMLDivElement>) => {
    const imageFile = Array.from(event.dataTransfer.files).find((file) =>
      file.type.startsWith("image/"),
    );
    if (imageFile) {
      event.preventDefault();
      rememberDropSelection(event.clientX, event.clientY);
      void uploadImageFile(imageFile);
      return;
    }

    const imageId = event.dataTransfer.getData(RICH_TEXT_IMAGE_DRAG_TYPE);
    const editor = editorRef.current;
    if (!imageId || !editor) return;
    const figure = editor.querySelector(
      `figure[data-rich-image-id="${imageId}"]`,
    ) as HTMLElement | null;
    if (!figure) return;

    event.preventDefault();
    const dropTarget = document.elementFromPoint(
      event.clientX,
      event.clientY,
    ) as HTMLElement | null;
    const block = dropTarget?.closest("figure, p, h1, h2, h3, h4, ul, ol, blockquote, pre");
    if (block && editor.contains(block) && block !== figure && !figure.contains(block)) {
      block.insertAdjacentElement("afterend", figure);
    } else {
      editor.append(figure);
    }
    setSelectedImageId(imageId);
    commitChange();
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      selectedImageId &&
      (event.key === "Backspace" || event.key === "Delete") &&
      getSelectedImage()
    ) {
      event.preventDefault();
      deleteSelectedImage();
      return;
    }

    if (event.key !== "Tab") return;
    const selection = getTableSelection();
    const editor = editorRef.current;
    if (!selection || !editor) return;
    const table = editor.querySelectorAll("table")[selection.tableIndex] as
      | HTMLTableElement
      | undefined;
    if (!table) return;

    const cells = Array.from(table.querySelectorAll("th, td"));
    const currentCell = table.rows[selection.rowIndex]?.cells[selection.columnIndex];
    const currentIndex = currentCell ? cells.indexOf(currentCell) : -1;
    const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
    event.preventDefault();

    if (nextIndex >= 0 && nextIndex < cells.length) {
      const next = cells[nextIndex] as HTMLTableCellElement;
      focusTableCell(
        selection.tableIndex,
        Array.from(table.rows).indexOf(next.parentElement as HTMLTableRowElement),
        Array.from((next.parentElement as HTMLTableRowElement).cells).indexOf(next),
      );
      return;
    }

    if (!event.shiftKey) addTableRow();
  };

  return (
    <div className="min-w-0 max-w-full">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={onImageFileChange}
      />
      <p className="mb-2 text-xs font-medium text-neutral-700">{label}</p>
      <div className="rounded-md border border-neutral-300 bg-white focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900">
        <div className="border-b border-neutral-200 bg-neutral-50">
          <div className="grid gap-0 px-1.5 py-0.5">
            <div className="flex flex-wrap items-center gap-0.5">
              <ToolbarButton label="굵게" onClick={() => command("bold")}>
                <Bold className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton label="기울임" onClick={() => command("italic")}>
                <Italic className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                label="밑줄"
                active={isUnderlined}
                onClick={() => command("underline")}
              >
                <Underline className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                label="취소선"
                active={isStruckThrough}
                onClick={() => command("strikeThrough")}
              >
                <Strikethrough className="h-3.5 w-3.5" />
              </ToolbarButton>
              <span className="mx-0.5 h-3.5 w-px bg-neutral-200" />
              <ToolbarButton label="제목 1" onClick={() => command("formatBlock", "h1")}>
                <span className="text-[10px] font-bold">H1</span>
              </ToolbarButton>
              <ToolbarButton label="제목 2" onClick={() => command("formatBlock", "h2")}>
                <span className="text-[10px] font-bold">H2</span>
              </ToolbarButton>
              <ToolbarButton label="제목 3" onClick={() => command("formatBlock", "h3")}>
                <span className="text-[10px] font-bold">H3</span>
              </ToolbarButton>
              <ToolbarButton label="제목 4" onClick={() => command("formatBlock", "h4")}>
                <span className="text-[10px] font-bold">H4</span>
              </ToolbarButton>
              <ToolbarButton label="일반 텍스트" onClick={() => command("formatBlock", "p")}>
                <span className="text-[10px] font-medium">T</span>
              </ToolbarButton>
              <span className="mx-0.5 h-3.5 w-px bg-neutral-200" />
              <ToolbarButton label="글머리 목록" onClick={() => command("insertUnorderedList")}>
                <List className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton label="번호 목록" onClick={() => command("insertOrderedList")}>
                <ListOrdered className="h-3.5 w-3.5" />
              </ToolbarButton>
            </div>
            <div className="flex flex-wrap items-center gap-0.5 border-t border-neutral-200 pt-0.5">
              <ToolbarButton label="인용" onClick={() => command("formatBlock", "blockquote")}>
                <Quote className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton label="인라인 코드" active={isInlineCode} onClick={toggleInlineCode}>
                <Code2 className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton label="코드 블록" active={isCodeBlock} onClick={toggleCodeBlock}>
                <span className="font-mono text-[10px]">&lt;/&gt;</span>
              </ToolbarButton>
              <ToolbarButton label="사진 삽입" onClick={openImagePicker}>
                <ImagePlus className="h-3.5 w-3.5" />
              </ToolbarButton>
              {selectedImageId && (
                <>
                  <span className="mx-0.5 h-3.5 w-px bg-neutral-200" />
                  <ToolbarButton
                    label="사진 왼쪽 정렬"
                    onClick={() => setSelectedImageAlign("left")}
                  >
                    <AlignLeft className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <ToolbarButton
                    label="사진 가운데 정렬"
                    onClick={() => setSelectedImageAlign("center")}
                  >
                    <AlignCenter className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <ToolbarButton
                    label="사진 오른쪽 정렬"
                    onClick={() => setSelectedImageAlign("right")}
                  >
                    <AlignRight className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <ToolbarButton label="사진 축소" onClick={() => resizeSelectedImage(-1)}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <ToolbarButton label="사진 확대" onClick={() => resizeSelectedImage(1)}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <ToolbarButton label="사진 삭제" onClick={deleteSelectedImage}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </ToolbarButton>
                </>
              )}
              <div className="relative flex items-center">
                <ToolbarButton label="기본 3 x 3 표 삽입" onClick={() => insertTable(3, 3)}>
                  <Table2 className="h-3.5 w-3.5" />
                </ToolbarButton>
                <button
                  type="button"
                  title="표 크기 선택"
                  aria-label="표 크기 선택"
                  aria-expanded={activePalette === "table"}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    setActivePalette((current) => (current === "table" ? null : "table"))
                  }
                  className="-ml-1 grid h-7 w-3.5 place-items-center rounded-r-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <ChevronDown className="h-2.5 w-2.5" />
                </button>
                {activePalette === "table" && (
                  <div className="absolute left-0 top-8 z-20 w-48 rounded-md border border-neutral-200 bg-white p-2">
                    <p className="mb-2 text-xs text-neutral-500">
                      {tableGridSize.rows} x {tableGridSize.columns} 표
                    </p>
                    <div className="grid grid-cols-5 gap-1">
                      {Array.from({ length: 25 }, (_, index) => {
                        const row = Math.floor(index / 5) + 1;
                        const column = (index % 5) + 1;
                        const selected =
                          row <= tableGridSize.rows && column <= tableGridSize.columns;
                        return (
                          <button
                            key={`${row}-${column}`}
                            type="button"
                            aria-label={`${row}행 ${column}열 표 삽입`}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setTableGridSize({ rows: row, columns: column })}
                            onClick={() => {
                              insertTable(row, column);
                              setActivePalette(null);
                            }}
                            className={`h-5 rounded-sm border ${
                              selected
                                ? "border-neutral-900 bg-neutral-800"
                                : "border-neutral-200 bg-white"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <ToolbarButton label="행 추가" disabled={!activeTable} onClick={addTableRow}>
                <Rows3 className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton label="행 삭제" disabled={!activeTable} onClick={deleteTableRow}>
                <span className="text-xs leading-none">−</span>
              </ToolbarButton>
              <ToolbarButton label="열 추가" disabled={!activeTable} onClick={addTableColumn}>
                <Columns3 className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton label="열 삭제" disabled={!activeTable} onClick={deleteTableColumn}>
                <span className="text-xs leading-none">−</span>
              </ToolbarButton>
              <ToolbarButton label="표 삭제" disabled={!activeTable} onClick={deleteTable}>
                <Trash2 className="h-3.5 w-3.5" />
              </ToolbarButton>
              <span className="mx-0.5 h-3.5 w-px bg-neutral-200" />
              <ToolbarButton label="실행 취소" onClick={() => command("undo")}>
                <Undo2 className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton label="다시 실행" onClick={() => command("redo")}>
                <Redo2 className="h-3.5 w-3.5" />
              </ToolbarButton>
            </div>
          </div>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder={placeholder}
          onInput={handleEditorInput}
          onKeyDown={handleEditorKeyDown}
          onKeyUp={refreshToolbarState}
          onMouseUp={refreshToolbarState}
          onFocus={refreshToolbarState}
          onSelect={rememberSelection}
          onPointerDown={beginTableResize}
          onPointerMove={moveTableResize}
          onPointerUp={endTableResize}
          onPointerCancel={endTableResize}
          onPaste={(event) => {
            const imageFile = Array.from(event.clipboardData.files).find((file) =>
              file.type.startsWith("image/"),
            );
            if (imageFile) {
              event.preventDefault();
              rememberSelection();
              void uploadImageFile(imageFile);
              return;
            }
            event.preventDefault();
            const text = event.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            const figure = target.closest("figure[data-rich-image-id]");
            setSelectedImageId(figure?.getAttribute("data-rich-image-id") ?? null);
          }}
          onDragStart={(event) => {
            const target = event.target as HTMLElement;
            const figure = target.closest("figure[data-rich-image-id]");
            const imageId = figure?.getAttribute("data-rich-image-id");
            if (!imageId) return;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(RICH_TEXT_IMAGE_DRAG_TYPE, imageId);
            setSelectedImageId(imageId);
          }}
          onDragOver={(event) => {
            const hasImageFile = Array.from(event.dataTransfer.files).some((file) =>
              file.type.startsWith("image/"),
            );
            if (
              hasImageFile ||
              Array.from(event.dataTransfer.types).includes(RICH_TEXT_IMAGE_DRAG_TYPE)
            ) {
              event.preventDefault();
              event.dataTransfer.dropEffect = hasImageFile ? "copy" : "move";
            }
          }}
          onDrop={handleEditorDrop}
          data-table-resizing={isTableResizing || undefined}
          className="rich-text-editor prose prose-sm prose-neutral min-w-0 max-w-none overflow-x-auto px-3 py-2 outline-none empty:before:pointer-events-none empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 prose-code:rounded-sm prose-code:bg-neutral-100 prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-md prose-pre:bg-neutral-900 prose-pre:px-3 prose-pre:py-3 prose-pre:font-mono [&_pre_code]:!bg-transparent [&_pre_code]:!p-0 [&_pre_code]:!text-neutral-50 prose-table:border-collapse prose-th:border prose-th:border-neutral-300 prose-th:bg-neutral-50 prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-neutral-300 prose-td:px-2 prose-td:py-1"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}

function ensureContentTableColumns(table: HTMLTableElement) {
  const columnCount = Math.max(...Array.from(table.rows).map((row) => row.cells.length), 1);
  let columnGroup = table.querySelector(":scope > colgroup");
  if (!columnGroup) {
    columnGroup = document.createElement("colgroup");
    table.insertBefore(columnGroup, table.firstChild);
  }

  while (columnGroup.children.length < columnCount) {
    columnGroup.appendChild(document.createElement("col"));
  }
  while (columnGroup.children.length > columnCount) {
    columnGroup.lastElementChild?.remove();
  }

  const columns = Array.from(columnGroup.children) as HTMLTableColElement[];
  const hasWidths = columns.every((column) => Number.parseFloat(column.style.width) > 0);
  if (!hasWidths) {
    const width = 100 / columns.length;
    columns.forEach((column) => {
      column.style.width = `${width}%`;
    });
  }
  return columns;
}

function prepareContentTables(container: HTMLElement, savedWidths: ContentTableWidths) {
  container.querySelectorAll("table").forEach((table, tableIndex) => {
    const htmlTable = table as HTMLTableElement;
    const tableKey = String(tableIndex);
    htmlTable.dataset.richTableIndex = tableKey;
    const columns = ensureContentTableColumns(htmlTable);
    const widths = savedWidths[tableKey];
    if (widths?.length === columns.length) {
      columns.forEach((column, index) => {
        column.style.width = `${widths[index]}%`;
      });
    }

    let wrapper = htmlTable.parentElement;
    if (!wrapper?.classList.contains("rich-text-table-scroll")) {
      wrapper = document.createElement("div");
      wrapper.className = "rich-text-table-scroll rich-text-table-resizable";
      htmlTable.parentNode?.insertBefore(wrapper, htmlTable);
      wrapper.appendChild(htmlTable);
    }

    Array.from(htmlTable.rows).forEach((row) => {
      Array.from(row.cells).forEach((cell, index) => {
        if (index >= row.cells.length - 1 || cell.querySelector(":scope > .rich-text-table-resize-handle")) {
          return;
        }
        const handle = document.createElement("span");
        handle.className = "rich-text-table-resize-handle";
        handle.setAttribute("aria-hidden", "true");
        cell.appendChild(handle);
      });
    });
  });
}

export const RichTextContent = memo(function RichTextContent({
  value,
  className = "",
  compact = false,
}: {
  value: string;
  className?: string;
  compact?: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const tableResizeRef = useRef<ContentTableResizeState | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [tableWidths, setTableWidths] = useState<ContentTableWidths>(
    () => contentTableWidthCache.get(value) ?? {},
  );
  const richValue = value.startsWith(RICH_TEXT_PREFIX);

  useLayoutEffect(() => {
    setTableWidths(contentTableWidthCache.get(value) ?? {});
  }, [value]);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    if (!richValue) return;
    prepareContentTables(contentRef.current, tableWidths);
  }, [tableWidths, value, richValue]);


  useEffect(() => {
    if (!previewImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImage]);

  useEffect(
    () => () => {
      document.body.classList.remove("rich-text-table-resizing");
    },
    [],
  );

  const beginTableResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as HTMLElement;
    const handle = target.closest(".rich-text-table-resize-handle");
    const cell = (handle?.parentElement ?? target.closest("td, th")) as HTMLTableCellElement | null;
    const table = cell?.closest("table");
    const row = cell?.parentElement as HTMLTableRowElement | null;
    if (!cell || !table || !row || !contentRef.current?.contains(table)) return;

    const columnIndex = Array.from(row.cells).indexOf(cell);
    const columns = ensureContentTableColumns(table);
    if (columnIndex < 0 || columnIndex >= columns.length - 1) return;

    const nearRightBorder = Math.abs(event.clientX - cell.getBoundingClientRect().right) <= 8;
    if (!handle && !nearRightBorder) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    tableResizeRef.current = {
      pointerId: event.pointerId,
      columnIndex,
      startX: event.clientX,
      table,
      widths: columns.map((column) => Number.parseFloat(column.style.width) || 100 / columns.length),
    };
    document.body.classList.add("rich-text-table-resizing");
  };

  const moveTableResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = tableResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const columns = ensureContentTableColumns(resize.table);
    const tableWidth = resize.table.getBoundingClientRect().width;
    if (!tableWidth) return;

    const minimumWidth = 8;
    const delta = ((event.clientX - resize.startX) / tableWidth) * 100;
    const currentWidth = resize.widths[resize.columnIndex] ?? minimumWidth;
    const nextWidth = resize.widths[resize.columnIndex + 1] ?? minimumWidth;
    const constrainedDelta = Math.max(
      minimumWidth - currentWidth,
      Math.min(nextWidth - minimumWidth, delta),
    );
    columns[resize.columnIndex].style.width = `${currentWidth + constrainedDelta}%`;
    columns[resize.columnIndex + 1].style.width = `${nextWidth - constrainedDelta}%`;
  };

  const endTableResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = tableResizeRef.current;
    if (resize?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    tableResizeRef.current = null;
    document.body.classList.remove("rich-text-table-resizing");

    const columns = ensureContentTableColumns(resize.table);
    const tableKey = resize.table.dataset.richTableIndex ?? "0";
    const widths = columns.map(
      (column) => Number.parseFloat(column.style.width) || 100 / columns.length,
    );
    setTableWidths((current) => {
      const next = { ...current, [tableKey]: widths };
      contentTableWidthCache.set(value, next);
      return next;
    });
  };

  const compactSpacing = compact
    ? "[&_p]:!my-1.5 [&_ul]:!my-1.5 [&_ol]:!my-1.5 [&_blockquote]:!my-1.5 [&_table]:!my-1.5 [&_figure]:!my-1.5 [&_h1]:!my-1.5 [&_h2]:!my-1.5 [&_h3]:!my-1.5 [&_h4]:!my-1.5 [&_pre]:!my-1.5 [&_img]:!my-1.5 [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0"
    : "";
  const contentClassName = `rich-text-content ${className} ${compactSpacing} [&_code]:rounded-sm [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-neutral-900 [&_pre]:px-3 [&_pre]:py-3 [&_pre]:font-mono [&_pre]:text-neutral-50 [&_pre_code]:!bg-transparent [&_pre_code]:!p-0 [&_pre_code]:!text-neutral-50 [&_table]:border-collapse [&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-neutral-300 [&_td]:px-2 [&_td]:py-1`;

  return (
    <>
      {richValue ? (
        <div
          key={value}
          ref={contentRef}
          className={contentClassName}
          onClick={(event) => {
            const image = (event.target as HTMLElement).closest("img") as HTMLImageElement | null;
            if (!image || !contentRef.current?.contains(image)) return;
            setPreviewImage({ src: image.currentSrc || image.src, alt: image.alt });
          }}
          onPointerDown={beginTableResize}
          onPointerMove={moveTableResize}
          onPointerUp={endTableResize}
          onPointerCancel={endTableResize}
          dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value.slice(RICH_TEXT_PREFIX.length)) }}
        />

      ) : (
        <div
          key={value}
          ref={contentRef}
          className={contentClassName}
          onClick={(event) => {
            const image = (event.target as HTMLElement).closest("img") as HTMLImageElement | null;
            if (!image || !contentRef.current?.contains(image)) return;
            setPreviewImage({ src: image.currentSrc || image.src, alt: image.alt });
          }}
          onPointerDown={beginTableResize}
          onPointerMove={moveTableResize}
          onPointerUp={endTableResize}
          onPointerCancel={endTableResize}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
        </div>
      )}


      {previewImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] grid place-items-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="이미지 확대"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPreviewImage(null);
            }}
          >
            <div className="relative max-h-full max-w-full">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-md bg-black/60 text-white hover:bg-black/80"
                aria-label="이미지 확대 닫기"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={previewImage.src}
                alt={previewImage.alt}
                className="max-h-[calc(100vh-2rem)] max-w-full object-contain"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
});
