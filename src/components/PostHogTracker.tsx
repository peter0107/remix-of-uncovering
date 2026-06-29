import { useEffect } from "react";
import posthog from "posthog-js";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

const EXCLUDED_POSTHOG_HOSTS = new Set([
  "efe62646-aba5-4e7f-a36e-bfb36fc5947e.lovableproject.com",
  "localhost",
  "127.0.0.1",
]);
const EXCLUDED_POSTHOG_EMAILS = new Set(["standard1414@g.skku.edu"]);

export function PostHogTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();
  const email = user?.email?.trim().toLowerCase();
  const hostname = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const isExcludedHost = EXCLUDED_POSTHOG_HOSTS.has(hostname);
  const isExcludedEmail = email ? EXCLUDED_POSTHOG_EMAILS.has(email) : false;
  const isExcluded = isExcludedHost || isExcludedEmail;

  useEffect(() => {
    if (loading) return;

    if (isExcluded) {
      posthog.reset();
      posthog.opt_out_capturing();
      return;
    }

    posthog.opt_in_capturing();
  }, [loading, isExcluded]);

  useEffect(() => {
    if (loading || isExcluded) return;

    posthog.capture("$pageview", {
      $current_url: window.location.href,
      route: pathname,
    });
  }, [loading, isExcluded, pathname]);

  useEffect(() => {
    if (loading || isExcluded) return;

    if (email) {
      posthog.identify(email, { email });
      return;
    }

    posthog.reset();
  }, [loading, isExcluded, email]);

  return null;
}
