import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground sm:gap-x-6 sm:text-sm">
            <Link to="/experiences" className="hover:text-foreground">이용 가이드</Link>
            <span className="hidden text-border sm:inline">|</span>
            <Link to="/submit-mission" className="hover:text-foreground">현직자 시뮬레이션 제안</Link>
            <span className="hidden text-border sm:inline">|</span>
            <Link to="/" className="hover:text-foreground">문의하기</Link>
          </nav>
          <div className="flex items-center gap-4 text-muted-foreground">
            <a
              href="https://www.instagram.com/beginnerzxc?igsh=ZzA3NmJiamt3Ym90&utm_source=qr"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="hover:text-foreground"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} beginner. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
