import { useEffect, useRef, useState } from "react";

const MIN_COL_WIDTH = 60;

type Props = {
  headers: string[];
  rows: string[][];
  initialWidths?: number[];
};

/**
 * Read-only table with user-adjustable column widths.
 * Default: table-auto so columns shrink to fit content (min length showing text).
 * Once user drags a divider, the table switches to fixed widths with pixel values.
 * Widths are local-only (not persisted) — viewers can tweak readability without
 * mutating the underlying mission data.
 */
export function ResizableViewTable({ headers, rows, initialWidths }: Props) {
  const [widths, setWidths] = useState<number[] | null>(
    initialWidths && initialWidths.length === headers.length ? [...initialWidths] : null,
  );
  const headerRefs = useRef<(HTMLTableCellElement | null)[]>([]);

  useEffect(() => {
    headerRefs.current = headerRefs.current.slice(0, headers.length);
  }, [headers.length]);

  const startResize = (ci: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Snapshot current widths from rendered DOM, then switch to fixed layout
    const current = headerRefs.current.map(
      (el, i) => Math.round(el?.getBoundingClientRect().width ?? widths?.[i] ?? 120),
    );
    const startWidth = current[ci];
    const startX = e.clientX;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = [...current];
      next[ci] = Math.max(MIN_COL_WIDTH, Math.round(startWidth + delta));
      setWidths(next);
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

  const isFixed = widths !== null;

  return (
    <table
      className={`${isFixed ? "table-fixed w-full" : "table-auto w-auto min-w-full"} border-collapse text-xs md:text-sm`}
    >
      {isFixed && (
        <colgroup>
          {headers.map((_, i) => (
            <col key={i} style={{ width: `${widths![i]}px` }} />
          ))}
        </colgroup>
      )}
      <thead>
        <tr className="bg-secondary/50">
          {headers.map((h, i) => (
            <th
              key={i}
              ref={(el) => {
                headerRefs.current[i] = el;
              }}
              className="relative whitespace-nowrap border border-border px-2 py-1.5 text-left font-semibold text-primary md:px-3 md:py-2"
            >
              <span className={isFixed ? "block break-words whitespace-normal" : ""}>{h}</span>
              {i < headers.length - 1 && (
                <span
                  role="separator"
                  aria-orientation="vertical"
                  onMouseDown={(e) => startResize(i, e)}
                  className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize select-none hover:bg-brand/40 active:bg-brand/60"
                  title="드래그하여 열 너비 조정"
                />
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                className={`border border-border px-2 py-1.5 text-foreground/90 md:px-3 md:py-2 ${
                  isFixed ? "break-words" : "whitespace-nowrap"
                }`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
