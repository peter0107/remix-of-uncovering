import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

declare global {
  interface Window {
    __gaInitializedFor?: string;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_SCRIPT_ID = "google-analytics";
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

function injectGoogleAnalytics(id: string) {
  if (typeof window === "undefined") return;
  if (!document.getElementById(GA_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function (...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }

  if (window.__gaInitializedFor !== id) {
    window.gtag("js", new Date());
    window.gtag("config", id, { send_page_view: false });
    window.__gaInitializedFor = id;
  }
}

export function GoogleAnalyticsTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => s.location.href });

  useEffect(() => {
    if (!measurementId) return;
    injectGoogleAnalytics(measurementId);
  }, []);

  useEffect(() => {
    if (!measurementId || typeof window === "undefined") return;

    injectGoogleAnalytics(measurementId);
    if (!window.gtag) return;

    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.origin + href,
      send_to: measurementId,
    });
  }, [pathname, href]);

  return null;
}
