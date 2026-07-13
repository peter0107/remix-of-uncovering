import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
// Cloudflare 공식 테스트 사이트키 (항상 통과). 운영에서는 VITE_TURNSTILE_SITE_KEY로 교체.
const TEST_SITE_KEY = "1x00000000000000000000AA";
const SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || TEST_SITE_KEY;

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Turnstile")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type TurnstileHandle = { reset: () => void };

type Props = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
};

export const TurnstileWidget = forwardRef<TurnstileHandle, Props>(function TurnstileWidget(
  { onVerify, onExpire, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const cbRef = useRef({ onVerify, onExpire, onError });
  cbRef.current = { onVerify, onExpire, onError };

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: "light",
          callback: (token: string) => cbRef.current.onVerify(token),
          "expired-callback": () => cbRef.current.onExpire?.(),
          "error-callback": () => cbRef.current.onError?.(),
        });
      })
      .catch(() => cbRef.current.onError?.());
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="min-h-[65px]" />;
});
