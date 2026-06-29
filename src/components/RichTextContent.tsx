import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const MIN_RESIZABLE_COL_WIDTH = 72;

function applyTableWidth(table: HTMLTableElement, widths: number[], wrapperWidth: number) {
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  table.style.tableLayout = "fixed";
  table.style.width = `${Math.max(wrapperWidth, totalWidth)}px`;
  table.style.minWidth = `${Math.max(wrapperWidth, totalWidth)}px`;
}

export function RichTextContent({
  html,
  className,
  resizableTables = false,
}: {
  html?: string | null;
  className?: string;
  resizableTables?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tables = root.querySelectorAll("table");

    tables.forEach((table) => {
      if (table.parentElement?.classList.contains("rich-text-table-scroll")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "rich-text-table-scroll";
      table.parentElement?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });

    if (!resizableTables) return;

    const cleanups: Array<() => void> = [];

    tables.forEach((tableNode) => {
      const table = tableNode as HTMLTableElement;
      const wrapper = table.parentElement as HTMLDivElement | null;
      const firstRow = table.rows.item(0);
      if (!wrapper || !firstRow) return;

      wrapper.classList.add("rich-text-table-resizable");

      const firstRowCells = Array.from(firstRow.cells) as HTMLTableCellElement[];
      if (firstRowCells.length < 2) return;

      let colgroup = table.querySelector("colgroup");
      if (!colgroup) {
        colgroup = document.createElement("colgroup");
        table.insertBefore(colgroup, table.firstChild);
      }

      const measuredWidths = firstRowCells.map((cell) =>
        Math.max(MIN_RESIZABLE_COL_WIDTH, Math.round(cell.getBoundingClientRect().width)),
      );

      colgroup.innerHTML = "";
      measuredWidths.forEach((width) => {
        const col = document.createElement("col");
        col.style.width = `${width}px`;
        colgroup?.appendChild(col);
      });

      const getWidths = () =>
        Array.from(colgroup?.children ?? []).map((col) =>
          Math.max(
            MIN_RESIZABLE_COL_WIDTH,
            parseFloat((col as HTMLElement).style.width || "0") || MIN_RESIZABLE_COL_WIDTH,
          ),
        );

      const setWidths = (widths: number[]) => {
        widths.forEach((width, index) => {
          const col = colgroup?.children.item(index) as HTMLElement | null;
          if (col) col.style.width = `${width}px`;
        });
        applyTableWidth(table, widths, wrapper.clientWidth);
      };

      setWidths(measuredWidths);

      firstRowCells.forEach((cell) => {
        cell
          .querySelectorAll(".rich-text-table-resize-handle")
          .forEach((handle) => handle.remove());
      });

      firstRowCells.slice(0, -1).forEach((cell, index) => {
        const handle = document.createElement("div");
        handle.className = "rich-text-table-resize-handle";
        cell.appendChild(handle);

        const onPointerDown = (event: PointerEvent) => {
          event.preventDefault();

          const startX = event.clientX;
          const widths = getWidths();
          const currentWidth = widths[index];
          const nextWidth = widths[index + 1];

          document.body.classList.add("rich-text-table-resizing");

          const onPointerMove = (moveEvent: PointerEvent) => {
            const delta = moveEvent.clientX - startX;
            const nextCurrent = Math.max(MIN_RESIZABLE_COL_WIDTH, currentWidth + delta);
            const consumed = nextCurrent - currentWidth;
            const nextAdjacent = Math.max(MIN_RESIZABLE_COL_WIDTH, nextWidth - consumed);
            const adjustedCurrent = currentWidth + (nextWidth - nextAdjacent);

            const nextWidths = [...widths];
            nextWidths[index] = adjustedCurrent;
            nextWidths[index + 1] = nextAdjacent;
            setWidths(nextWidths);
          };

          const onPointerUp = () => {
            document.body.classList.remove("rich-text-table-resizing");
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
          };

          window.addEventListener("pointermove", onPointerMove);
          window.addEventListener("pointerup", onPointerUp);

          cleanups.push(() => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
          });
        };

        handle.addEventListener("pointerdown", onPointerDown);
        cleanups.push(() => handle.removeEventListener("pointerdown", onPointerDown));
      });
    });

    return () => {
      document.body.classList.remove("rich-text-table-resizing");
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [html, resizableTables]);

  if (!html?.trim()) return null;

  return (
    <div
      ref={rootRef}
      className={cn("rich-text-content", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
