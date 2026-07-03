import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { PostHogProvider } from "@posthog/react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NavigationOverlay } from "@/components/LoadingOverlay";
import { ClarityTracker } from "@/components/ClarityTracker";
import { GoogleAnalyticsTracker } from "@/components/GoogleAnalyticsTracker";
import { PostHogTracker } from "@/components/PostHogTracker";
import { useRouterState } from "@tanstack/react-router";

function GlobalNavigationOverlay() {
  const isNavigating = useRouterState({
    select: (s) => s.isLoading || s.isTransitioning,
  });
  if (!isNavigating) return null;
  return <NavigationOverlay />;
}

function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bare = pathname.startsWith("/admin");
  if (bare) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Beginner - 하고 싶은 일을 찾기" },
      {
        name: "description",
        content:
          "관심 직무를 선택하고 실제 업무를 경험한 후, 직무 역량 리포트와 현직자 피드백까지 받아보세요.",
      },
      { property: "og:title", content: "Beginner - 하고 싶은 일을 찾기" },
      {
        property: "og:description",
        content:
          "관심 직무를 선택하고 실제 업무를 경험한 후, 직무 역량 리포트와 현직자 피드백까지 받아보세요.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Beginner - 하고 싶은 일을 찾기" },
      {
        name: "twitter:description",
        content:
          "관심 직무를 선택하고 실제 업무를 경험한 후, 직무 역량 리포트와 현직자 피드백까지 받아보세요.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8a03b4ad-1812-4167-82f1-2103810ca739/id-preview-193e0ba8--bc1010db-6cc4-4e75-a858-7a48f9b5a376.lovable.app-1778568493500.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8a03b4ad-1812-4167-82f1-2103810ca739/id-preview-193e0ba8--bc1010db-6cc4-4e75-a858-7a48f9b5a376.lovable.app-1778568493500.png",
      },
      { name: "description", content: "Experience real job scenarios, get a personalized career report, and identify your strengths." },
      { property: "og:description", content: "Experience real job scenarios, get a personalized career report, and identify your strengths." },
      { name: "twitter:description", content: "Experience real job scenarios, get a personalized career report, and identify your strengths." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7feeed6b-35f0-49cb-9ca5-129e56908ad4/id-preview-bfc275d2--7f9ca802-38e4-4c9e-9c3d-9f7551ac81e3.lovable.app-1783085120803.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7feeed6b-35f0-49cb-9ca5-129e56908ad4/id-preview-bfc275d2--7f9ca802-38e4-4c9e-9c3d-9f7551ac81e3.lovable.app-1783085120803.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <PostHogProvider
          apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN!}
          options={{
            api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
            ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_UI_HOST || "https://us.posthog.com",
            defaults: "2025-05-24",
            capture_exceptions: true,
            capture_pageview: false,
            debug: import.meta.env.DEV,
          }}
        >
          {children}
        </PostHogProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ClarityTracker />
      <GoogleAnalyticsTracker />
      <PostHogTracker />
      <SiteLayout>
        <Outlet />
      </SiteLayout>
      <GlobalNavigationOverlay />
      <Toaster />
    </QueryClientProvider>
  );
}
