import { cn } from "@/lib/utils";

/**
 * 줄바꿈(\n)을 문단으로 분리해서 렌더링.
 * - 한 줄 내 자동 줄바꿈: 일반 line-height
 * - Enter로 친 줄바꿈: 문단 사이 여백(mt-3)으로 표현
 */
export function ParagraphText({
  text,
  className,
  paragraphClassName,
}: {
  text: string;
  className?: string;
  paragraphClassName?: string;
}) {
  const paragraphs = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return (
    <div className={cn("text-sm leading-relaxed", className)}>
      {paragraphs.map((p, i) => (
        <p key={i} className={cn(i > 0 && "mt-3", paragraphClassName)}>
          {p}
        </p>
      ))}
    </div>
  );
}
