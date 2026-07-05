import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground sm:text-sm">
          <Link to="/simulations" className="hover:text-foreground">추천 시뮬레이션</Link>
          <span className="hidden text-border sm:inline">|</span>
          <Link to="/my" className="hover:text-foreground">프로필</Link>
        </nav>
        <p className="mt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Beginner. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
