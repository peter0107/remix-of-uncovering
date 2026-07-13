import {
  Bold,
  ChevronDown,
  Code2,
  Columns3,
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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const RICH_TEXT_PREFIX = "<!-- beginner-rich-text -->";
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
]);

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
      className={`grid h-8 w-8 place-items-center rounded-md transition-colors ${
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
  const selectionRangeRef = useRef<Range | null>(null);
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

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialHtml) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

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
    if (editorRef.current) onChange(toStoredValue(editorRef.current.innerHTML));
    window.requestAnimationFrame(refreshToolbarState);
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
    return `<table><tbody>${Array.from({ length: rows }, () => `<tr>${cells}</tr>`).join("")}</tbody></table><p><br></p>`;
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

    const container = document.createElement("div");
    container.innerHTML = editor.innerHTML;
    const table = container.querySelectorAll("table")[selection.tableIndex] as
      | HTMLTableElement
      | undefined;
    if (!table) return;

    mutation(table);
    editor.focus();
    document.execCommand("selectAll", false);
    document.execCommand("insertHTML", false, container.innerHTML);
    commitChange();

    if (focusPosition) {
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
      else Array.from(table.rows).forEach((row) => row.deleteCell(selection.columnIndex));
    });
  };

  const deleteTable = () => mutateActiveTable((table) => table.remove());

  const handleTableTab = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
      <p className="mb-2 text-xs font-medium text-neutral-700">{label}</p>
      <div className="rounded-md border border-neutral-300 bg-white focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900">
        <div className="border-b border-neutral-200 bg-neutral-50">
          <div className="grid gap-1 px-2 py-1">
            <div className="flex flex-wrap items-center gap-0.5">
              <ToolbarButton label="굵게" onClick={() => command("bold")}>
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="기울임" onClick={() => command("italic")}>
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                label="밑줄"
                active={isUnderlined}
                onClick={() => command("underline")}
              >
                <Underline className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                label="취소선"
                active={isStruckThrough}
                onClick={() => command("strikeThrough")}
              >
                <Strikethrough className="h-4 w-4" />
              </ToolbarButton>
              <span className="mx-1 h-4 w-px bg-neutral-200" />
              <ToolbarButton label="제목 1" onClick={() => command("formatBlock", "h1")}>
                <span className="text-[11px] font-bold">H1</span>
              </ToolbarButton>
              <ToolbarButton label="제목 2" onClick={() => command("formatBlock", "h2")}>
                <span className="text-[11px] font-bold">H2</span>
              </ToolbarButton>
              <ToolbarButton label="제목 3" onClick={() => command("formatBlock", "h3")}>
                <span className="text-[11px] font-bold">H3</span>
              </ToolbarButton>
              <ToolbarButton label="제목 4" onClick={() => command("formatBlock", "h4")}>
                <span className="text-[11px] font-bold">H4</span>
              </ToolbarButton>
              <ToolbarButton label="일반 텍스트" onClick={() => command("formatBlock", "p")}>
                <span className="text-xs font-medium">T</span>
              </ToolbarButton>
              <span className="mx-1 h-4 w-px bg-neutral-200" />
              <ToolbarButton label="글머리 목록" onClick={() => command("insertUnorderedList")}>
                <List className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="번호 목록" onClick={() => command("insertOrderedList")}>
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>
            </div>
            <div className="flex flex-wrap items-center gap-0.5 border-t border-neutral-200 pt-1">
              <ToolbarButton label="인용" onClick={() => command("formatBlock", "blockquote")}>
                <Quote className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="인라인 코드" active={isInlineCode} onClick={toggleInlineCode}>
                <Code2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="코드 블록" active={isCodeBlock} onClick={toggleCodeBlock}>
                <span className="font-mono text-xs">&lt;/&gt;</span>
              </ToolbarButton>
              <div className="relative flex items-center">
                <ToolbarButton label="기본 3 x 3 표 삽입" onClick={() => insertTable(3, 3)}>
                  <Table2 className="h-4 w-4" />
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
                  className="-ml-1 grid h-8 w-4 place-items-center rounded-r-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                {activePalette === "table" && (
                  <div className="absolute left-0 top-10 z-20 w-48 rounded-md border border-neutral-200 bg-white p-2">
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
                <Rows3 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="행 삭제" disabled={!activeTable} onClick={deleteTableRow}>
                <span className="text-sm leading-none">−</span>
              </ToolbarButton>
              <ToolbarButton label="열 추가" disabled={!activeTable} onClick={addTableColumn}>
                <Columns3 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="열 삭제" disabled={!activeTable} onClick={deleteTableColumn}>
                <span className="text-sm leading-none">−</span>
              </ToolbarButton>
              <ToolbarButton label="표 삭제" disabled={!activeTable} onClick={deleteTable}>
                <Trash2 className="h-4 w-4" />
              </ToolbarButton>
              <span className="mx-1 h-4 w-px bg-neutral-200" />
              <ToolbarButton label="실행 취소" onClick={() => command("undo")}>
                <Undo2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="다시 실행" onClick={() => command("redo")}>
                <Redo2 className="h-4 w-4" />
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
          onInput={() => commitChange()}
          onKeyDown={handleTableTab}
          onKeyUp={refreshToolbarState}
          onMouseUp={refreshToolbarState}
          onFocus={refreshToolbarState}
          onSelect={rememberSelection}
          onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
          className="prose prose-sm prose-neutral min-w-0 max-w-none overflow-x-auto px-3 py-2 outline-none empty:before:pointer-events-none empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 prose-code:rounded-sm prose-code:bg-neutral-100 prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-md prose-pre:bg-neutral-900 prose-pre:px-3 prose-pre:py-3 prose-pre:font-mono [&_pre_code]:!bg-transparent [&_pre_code]:!p-0 [&_pre_code]:!text-neutral-50 prose-table:border-collapse prose-th:border prose-th:border-neutral-300 prose-th:bg-neutral-50 prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-neutral-300 prose-td:px-2 prose-td:py-1"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}

export function RichTextContent({ value, className = "" }: { value: string; className?: string }) {
  if (value.startsWith(RICH_TEXT_PREFIX)) {
    return (
      <div
        className={`${className} [&_code]:rounded-sm [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-neutral-900 [&_pre]:px-3 [&_pre]:py-3 [&_pre]:font-mono [&_pre]:text-neutral-50 [&_pre_code]:!bg-transparent [&_pre_code]:!p-0 [&_pre_code]:!text-neutral-50 [&_table]:border-collapse [&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-neutral-300 [&_td]:px-2 [&_td]:py-1`}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value.slice(RICH_TEXT_PREFIX.length)) }}
      />
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
    </div>
  );
}
