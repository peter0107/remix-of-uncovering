import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

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
  const bare =
    pathname === "/" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/biz") ||
    pathname.startsWith("/admin");
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
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 hover:text-white"
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
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 hover:text-white"
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
      { title: "Beginner - 직접 경험해보고 확인하는 직무 시뮬레이션" },
      {
        name: "description",
        content:
          "내가 원하는 직무를 직접 경험해보세요. 나의 AI 활용 능력까지 평가 받아보세요.",
      },
      { property: "og:title", content: "Beginner - 직접 경험해보고 확인하는 직무 시뮬레이션" },
      {
        property: "og:description",
        content:
          "내가 원하는 직무를 직접 경험해보세요. 나의 AI 활용 능력까지 평가 받아보세요.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Beginner - 직접 경험해보고 확인하는 직무 시뮬레이션" },
      { name: "twitter:description", content: "내가 원하는 직무를 직접 경험해보세요. 나의 AI 활용 능력까지 평가 받아보세요." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d3de3777-9abf-405e-98f7-92db0d548996/id-preview-5964f416--7f9ca802-38e4-4c9e-9c3d-9f7551ac81e3.lovable.app-1784364704836.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d3de3777-9abf-405e-98f7-92db0d548996/id-preview-5964f416--7f9ca802-38e4-4c9e-9c3d-9f7551ac81e3.lovable.app-1784364704836.png" },
      { name: "twitter:card", content: "summary_large_image" },
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
        {children}
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
