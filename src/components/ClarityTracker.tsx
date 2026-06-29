import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

declare global {
  interface Window {
    clarity?: {
      (...args: unknown[]): void;
      q?: unknown[];
    };
  }
}

const CLARITY_SCRIPT_ID = "microsoft-clarity";
const clarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim();
const EXCLUDED_CLARITY_HOSTS = new Set([
  "efe62646-aba5-4e7f-a36e-bfb36fc5947e.lovableproject.com",
  "localhost",
  "127.0.0.1",
]);
const EXCLUDED_CLARITY_EMAILS = new Set(["standard1414@g.skku.edu"]);

function injectClarity(projectId: string) {
  if (typeof window === "undefined") return;
  if (document.getElementById(CLARITY_SCRIPT_ID)) return;

  (function (c: Window & Record<string, unknown>, l: Document, a: string, r: string, i: string) {
    c[a] =
      c[a] ||
      function (...args: unknown[]) {
        const fn = c[a] as { q?: unknown[] };
        (fn.q = fn.q || []).push(args);
      };

    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = `https://www.clarity.ms/tag/${i}`;
    t.id = CLARITY_SCRIPT_ID;

    const y = l.getElementsByTagName(r)[0];
    y.parentNode?.insertBefore(t, y);
  })(window as unknown as Window & Record<string, unknown>, document, "clarity", "script", projectId);
}

export function ClarityTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();
  const email = user?.email?.trim().toLowerCase();
  const hostname = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const isExcludedHost = EXCLUDED_CLARITY_HOSTS.has(hostname);
  const isExcludedEmail = email ? EXCLUDED_CLARITY_EMAILS.has(email) : false;
  const isExcluded = isExcludedHost || isExcludedEmail;

  useEffect(() => {
    if (loading || !clarityProjectId || isExcluded) return;
    injectClarity(clarityProjectId);
  }, [loading, isExcluded]);

  useEffect(() => {
    if (!isExcluded) return;

    document.getElementById(CLARITY_SCRIPT_ID)?.remove();
    if (typeof window !== "undefined") {
      window.clarity = undefined;
    }
  }, [isExcluded]);

  useEffect(() => {
    if (loading || isExcluded || !clarityProjectId || !window.clarity) return;

    window.clarity("set", "route", pathname);
  }, [loading, isExcluded, pathname]);

  useEffect(() => {
    if (loading || isExcluded || !clarityProjectId || !window.clarity || !email) return;

    window.clarity("identify", email);
    window.clarity("set", "user_email", email);
  }, [loading, isExcluded, email]);

  return null;
}
