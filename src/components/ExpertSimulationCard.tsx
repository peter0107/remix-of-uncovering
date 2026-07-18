import { ArrowRight, Clock } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ExpertSimulationCardProps = {
  nickname: string;
  companyType: string;
  experienceBand: string;
  jobTitle: string;
  roleLabel: string;
  title: string;
  description?: string | null;
  estimatedMinutes?: number | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  compact?: boolean;
  topRight?: ReactNode;
  bottomRight?: ReactNode;
  className?: string;
};

export function ExpertSimulationCard({
  nickname,
  companyType,
  experienceBand,
  jobTitle,
  roleLabel,
  title,
  description,
  estimatedMinutes,
  backgroundColor,
  textColor,
  compact = false,
  topRight,
  bottomRight,
  className,
}: ExpertSimulationCardProps) {
  const foreground = textColor?.trim() || "#18181b";
  const background = backgroundColor?.trim() || "#ffffff";
  const meta = [companyType, experienceBand, jobTitle].filter(Boolean).join(" · ");
  const summary = (description?.trim() || title).replace(/\s+/g, " ");

  return (
    <article
      className={cn(
        "group flex aspect-[4/3] flex-col overflow-hidden rounded-md border border-zinc-200 text-left transition-colors hover:border-zinc-500",
        compact ? "p-3" : "p-4",
        className,
      )}
      style={{ backgroundColor: background, color: foreground }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("truncate font-bold", compact ? "text-sm" : "text-base")}>{nickname}</p>
          {meta && (
            <p className="mt-1 truncate text-[11px] font-medium opacity-65" title={meta}>
              {meta}
            </p>
          )}
        </div>
        {topRight}
      </div>

      <div className={cn("min-h-0", compact ? "mt-5" : "mt-7")}>
        <p className={cn("truncate font-semibold opacity-90", compact ? "text-sm" : "text-base")}>
          {roleLabel}
        </p>
        <h3
          className={cn(
            "mt-1 line-clamp-2 font-bold tracking-tight",
            compact ? "text-base" : "text-lg",
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "mt-2 line-clamp-2 leading-relaxed opacity-70",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          {summary}
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <div className="flex items-center gap-1 text-xs opacity-70">
          <Clock className="h-3.5 w-3.5" />
          <span>약 {estimatedMinutes ?? 75}분 소요</span>
        </div>
        {bottomRight ?? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold opacity-80 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100">
            시작하기 <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </article>
  );
}
