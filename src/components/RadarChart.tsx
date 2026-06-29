export function RadarChart({
  data,
  size = 280,
}: {
  data: { name: string; score: number }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;
  const n = data.length;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (radius * Math.max(0, Math.min(100, value))) / 100;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  };

  const rings = [25, 50, 75, 100];
  const polygon = data
    .map((d, i) => point(i, d.score).join(","))
    .join(" ");
  const avgPolygon = data.map((_, i) => point(i, 60).join(",")).join(" ");

  // Padding around chart to fit external labels on one line
  const pad = size * 0.16;
  const vb = size + pad * 2;
  const labelRadius = radius * 1.13;

  const cleanLabel = (s: string) => s.replace(/\s*역량\s*$/u, "").trim();

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${vb} ${vb}`}
      preserveAspectRatio="xMidYMid meet"
      className="mx-auto block h-auto w-full max-w-full"
      style={{ maxWidth: size + pad * 2 }}
    >
      {rings.map((r) => (
        <polygon
          key={r}
          points={data
            .map((_, i) => point(i, r).join(","))
            .join(" ")}
          fill="none"
          stroke="oklch(0.92 0.01 260)"
          strokeWidth="1"
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, 100);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="oklch(0.92 0.01 260)" strokeWidth="1" />
        );
      })}
      <polygon
        points={avgPolygon}
        fill="oklch(0.92 0.01 260 / 0.5)"
        stroke="oklch(0.7 0.02 260)"
        strokeDasharray="3 3"
        strokeWidth="1"
      />
      <polygon
        points={polygon}
        fill="var(--brand)"
        fillOpacity="0.18"
        stroke="var(--brand)"
        strokeWidth="2"
      />
      {data.map((d, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + Math.cos(angle) * labelRadius;
        const y = cy + Math.sin(angle) * labelRadius;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const anchor: "start" | "middle" | "end" =
          cosA > 0.25 ? "start" : cosA < -0.25 ? "end" : "middle";
        const baseline: "auto" | "middle" | "hanging" =
          Math.abs(cosA) > 0.7 ? "middle" : sinA < -0.1 ? "auto" : sinA > 0.1 ? "hanging" : "middle";
        return (
          <text
            key={d.name}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline={baseline}
            className="fill-foreground"
            fontSize="11"
          >
            {cleanLabel(d.name)}
          </text>
        );
      })}
    </svg>
  );
}
