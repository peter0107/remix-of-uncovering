import { ArrowRight, Clock } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const DEFAULT_CARD_IMAGES = [
  {
    keys: ["마케팅", "광고", "MD", "리테일", "고객서비스"],
    url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80",
  },
  {
    keys: ["AI", "개발", "데이터"],
    url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80",
  },
  {
    keys: ["디자인", "미디어", "문화"],
    url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
  },
  {
    keys: ["식", "음료"],
    url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80",
  },
  {
    keys: ["물류", "무역", "운송", "제조", "생산"],
    url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
  },
];

const DEFAULT_CARD_IMAGE =
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80";

const LOGO_TONES = [
  "bg-indigo-100 text-indigo-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

type SimulationCardPreviewProps = {
  companyName: string;
  companyLogoUrl?: string | null;
  cardImageUrl?: string | null;
  roleLabel: string;
  title: string;
  description?: string | null;
  domain?: string | null;
  estimatedMinutes?: number | null;
  compact?: boolean;
  showCta?: boolean;
  ctaLabel?: string;
  topRight?: ReactNode;
  bottomRight?: ReactNode;
  onLogoClick?: () => void;
  onImageClick?: () => void;
  className?: string;
};

function hashText(value: string) {
  return Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getLogoText(companyName: string) {
  const trimmed = companyName.trim();
  if (!trimmed) return "B";

  const latin = trimmed.match(/[A-Za-z0-9]/g);
  if (latin?.length) return latin.slice(0, 2).join("").toUpperCase();

  return trimmed.slice(0, 1);
}

function getFallbackImage(domain = "", roleLabel = "", title = "") {
  const source = `${domain} ${roleLabel} ${title}`;
  const matched = DEFAULT_CARD_IMAGES.find((item) => item.keys.some((key) => source.includes(key)));
  return matched?.url ?? DEFAULT_CARD_IMAGE;
}

export function SimulationCardPreview({
  companyName,
  companyLogoUrl,
  cardImageUrl,
  roleLabel,
  title,
  description,
  domain,
  estimatedMinutes,
  compact = false,
  showCta = true,
  ctaLabel = "시작하기",
  topRight,
  bottomRight,
  onLogoClick,
  onImageClick,
  className,
}: SimulationCardPreviewProps) {
  const resolvedCompanyName = companyName.trim() || "Beginner";
  const resolvedRole = roleLabel.trim() || title.trim();
  const summary = (description?.trim() || title.trim()).replace(/\s+/g, " ");
  const imageUrl = cardImageUrl?.trim() || getFallbackImage(domain ?? "", resolvedRole, title);
  const logoText = getLogoText(resolvedCompanyName);
  const logoTone = LOGO_TONES[hashText(resolvedCompanyName) % LOGO_TONES.length];
  const logoContent = companyLogoUrl?.trim() ? (
    <img
      src={companyLogoUrl.trim()}
      alt={`${resolvedCompanyName} 로고`}
      className="h-full w-full object-cover"
    />
  ) : (
    <span className={cn("grid h-full w-full place-items-center", logoTone)}>{logoText}</span>
  );
  const logoClassName = cn(
    "grid shrink-0 place-items-center overflow-hidden rounded-lg bg-white font-bold text-neutral-900 shadow-sm",
    compact ? "h-9 w-9 text-sm" : "h-10 w-10 text-base",
    onLogoClick &&
      "cursor-pointer ring-1 ring-white/30 transition-all hover:scale-105 hover:ring-2 hover:ring-white",
  );

  return (
    <article
      className={cn(
        "group flex aspect-[4/3] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-900 hover:shadow-md",
        className,
      )}
    >
      <div
        className={cn(
          "group/image relative shrink-0 basis-[38%] overflow-hidden",
          onImageClick && "cursor-pointer",
        )}
        onClick={(event) => {
          if (!onImageClick) return;
          event.stopPropagation();
          onImageClick();
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.68), rgba(0,0,0,0.28)), url("${imageUrl}")`,
          }}
        />
        {onImageClick && (
          <div className="pointer-events-none absolute inset-0 bg-white/0 ring-0 ring-inset ring-white/0 transition-all group-hover/image:bg-white/10 group-hover/image:ring-2 group-hover/image:ring-white/60" />
        )}
        <div className="relative flex h-full items-end gap-2.5 p-3">
          {onLogoClick ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onLogoClick();
              }}
              className={logoClassName}
              aria-label={`${resolvedCompanyName} 로고 변경`}
            >
              {logoContent}
            </button>
          ) : (
            <div className={logoClassName}>{logoContent}</div>
          )}
          <div className="min-w-0 pb-0.5 text-white">
            <p className="truncate text-sm font-bold leading-tight">{resolvedCompanyName}</p>
            {domain && (
              <p className="mt-0.5 truncate text-[11px] font-medium text-white/80">{domain}</p>
            )}
          </div>
        </div>
        {topRight && <div className="absolute right-3 top-3 z-10">{topRight}</div>}
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col p-4", compact && "p-3")}>
        <h3
          className={cn(
            "line-clamp-1 font-bold tracking-tight text-zinc-900",
            compact ? "text-base" : "text-lg",
          )}
        >
          {resolvedRole}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">{summary}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock className="h-3.5 w-3.5" />
            <span>약 {estimatedMinutes ?? 75}분 소요</span>
          </div>

          {bottomRight ??
            (showCta && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors group-hover:text-blue-700">
                {ctaLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            ))}
        </div>
      </div>
    </article>
  );
}
