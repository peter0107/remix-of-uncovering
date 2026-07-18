import {
  ArrowRight,
  BriefcaseBusiness,
  ChartColumn,
  Clock,
  Compass,
  Laptop,
  Lightbulb,
  Palette,
  PencilRuler,
  Rocket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const EXPERT_PROFILE_ICONS: LucideIcon[] = [
  BriefcaseBusiness,
  Lightbulb,
  Palette,
  Rocket,
  ChartColumn,
  PencilRuler,
  Laptop,
  Compass,
  Sparkles,
];

function getProfileIcon(seed: string) {
  const value = Array.from(seed || "현직자").reduce(
    (total, character) => total + (character.codePointAt(0) ?? 0),
    0,
  );

  return EXPERT_PROFILE_ICONS[value % EXPERT_PROFILE_ICONS.length];
}

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
  const foreground = textColor?.trim() || "#ffffff";
  const background = backgroundColor?.trim() || "#18181b";
  const meta = [companyType, experienceBand, jobTitle].filter(Boolean).join(" · ");
  const summary = (description?.trim() || title).replace(/\s+/g, " ");
  const ProfileIcon = getProfileIcon(`${nickname}:${jobTitle}:${roleLabel}`);

  return (
    <article
      className={cn(
        "group flex aspect-[4/3] flex-col overflow-hidden rounded-md border border-zinc-200 bg-white text-left transition-colors hover:border-zinc-900",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex shrink-0 basis-[38%] items-end overflow-hidden",
          compact ? "p-3" : "p-4",
        )}
        style={{ backgroundColor: background, color: foreground }}
      >
        <div className="flex min-w-0 flex-1 items-end gap-2.5">
          <div
            aria-hidden="true"
            className={cn(
              "grid shrink-0 place-items-center rounded-md border border-black/10 bg-white/90 font-bold text-zinc-900",
              compact ? "h-9 w-9 text-sm" : "h-10 w-10 text-base",
            )}
          >
            <ProfileIcon className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2} />
          </div>
          <div className="min-w-0 pb-0.5">
            <p
              className={cn("truncate font-bold leading-tight", compact ? "text-sm" : "text-base")}
            >
              {nickname}
            </p>
            {meta && (
              <p className="mt-0.5 truncate text-[11px] font-medium opacity-80" title={meta}>
                {meta}
              </p>
            )}
          </div>
        </div>
        {topRight && <div className="absolute right-3 top-3 z-10">{topRight}</div>}
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col", compact ? "p-3" : "p-4")}>
        <h3
          className={cn(
            "line-clamp-1 font-bold tracking-tight text-zinc-900",
            compact ? "text-base" : "text-lg",
          )}
        >
          {roleLabel}
        </h3>
        <p
          className={cn(
            "mt-1.5 line-clamp-3 leading-relaxed text-zinc-500",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          {summary}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock className="h-3.5 w-3.5" />
            <span>약 {estimatedMinutes ?? 75}분 소요</span>
          </div>
          {bottomRight ?? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors group-hover:text-blue-700">
              시작하기{" "}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
