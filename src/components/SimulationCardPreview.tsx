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
  rank?: number;
  compact?: boolean;
  showCta?: boolean;
  ctaLabel?: string;
  topRight?: ReactNode;
  bottomRight?: ReactNode;
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
  rank,
  compact = false,
  showCta = true,
  ctaLabel = "시작하기",
  topRight,
  bottomRight,
  className,
}: SimulationCardPreviewProps) {
  const resolvedCompanyName = companyName.trim() || "Beginner";
  const resolvedRole = roleLabel.trim() || title.trim();
  const summary = (description?.trim() || title.trim()).replace(/\s+/g, " ");
  const imageUrl = cardImageUrl?.trim() || getFallbackImage(domain ?? "", resolvedRole, title);
  const logoText = getLogoText(resolvedCompanyName);
  const logoTone = LOGO_TONES[hashText(resolvedCompanyName) % LOGO_TONES.length];
  const topRightNode =
    topRight ??
    (rank ? (
      <span className="grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-sm font-bold text-white shadow-sm">
        {rank}
      </span>
    ) : null);

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-900 hover:shadow-md",
        className,
      )}
    >
      <div className={cn("relative h-32 overflow-hidden", compact && "h-24")}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.68), rgba(0,0,0,0.28)), url("${imageUrl}")`,
          }}
        />
        <div className="relative flex h-full items-end gap-3 p-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-lg font-bold text-neutral-900 shadow-sm">
            {companyLogoUrl?.trim() ? (
              <img
                src={companyLogoUrl.trim()}
                alt={`${resolvedCompanyName} 로고`}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className={cn("grid h-full w-full place-items-center", logoTone)}>
                {logoText}
              </span>
            )}
          </div>
          <div className="min-w-0 pb-1 text-white">
            <p className="truncate text-lg font-bold leading-tight">{resolvedCompanyName}</p>
            {domain && <p className="mt-1 truncate text-xs font-medium text-white/80">{domain}</p>}
          </div>
        </div>
        {topRightNode && <div className="absolute right-4 top-4 z-10">{topRightNode}</div>}
      </div>

      <div className={cn("flex min-h-[150px] flex-col p-5", compact && "min-h-[132px] p-4")}>
        <h3
          className={cn(
            "line-clamp-1 font-bold tracking-tight text-zinc-900",
            compact ? "text-lg" : "text-xl",
          )}
        >
          {resolvedRole}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-500">{summary}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="flex items-center gap-1 text-sm text-zinc-500">
            <Clock className="h-4 w-4" />
            <span>약 {estimatedMinutes ?? 75}분 소요</span>
          </div>

          {bottomRight ??
            (showCta && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-colors group-hover:text-blue-700">
                {ctaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            ))}
        </div>
      </div>
    </article>
  );
}
