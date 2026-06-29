/**
 * <colgroup> renderer that applies pixel widths when present.
 * Use inside a <table className="table-fixed"> to enforce widths.
 */
export function ResizableColgroup({
  count,
  widths,
}: {
  count: number;
  widths?: number[];
}) {
  return (
    <colgroup>
      {Array.from({ length: count }).map((_, i) => {
        const w = widths?.[i];
        return <col key={i} style={w ? { width: `${w}px` } : undefined} />;
      })}
    </colgroup>
  );
}
