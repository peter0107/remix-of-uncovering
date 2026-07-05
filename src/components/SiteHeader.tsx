import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, UserCircle2, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignupDialog } from "@/components/SignupDialog";
import { useAuth } from "@/hooks/use-auth";

const NAV: { to: string; label: string }[] = [];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, signOut, signingOut } = useAuth();

  return (
    <>
    {signingOut && (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm font-medium text-foreground">로그아웃 중입니다...</p>
      </div>
    )}
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="/" className="flex items-center" aria-label="언커버링 홈">
          <span className="text-lg font-bold tracking-tight text-foreground">언커버링</span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm text-foreground/80 transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-semibold" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/my"
            aria-label="프로필"
            className="grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            <UserCircle2 className="h-5 w-5" />
          </Link>
          {user ? (
            <>
              <span className="hidden text-xs text-muted-foreground lg:inline max-w-[180px] truncate">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="mr-1 h-4 w-4" /> 로그아웃
              </Button>
            </>
          ) : (
            <>
              <SignupDialog
                defaultMode="login"
                redirectTo="/onboarding"
                trigger={
                  <Button variant="ghost" size="sm">
                    로그인
                  </Button>
                }
              />
              <Link to="/simulations">
                <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                  시작하기
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <Link
            to="/my"
            aria-label="프로필"
            className="grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            <UserCircle2 className="h-5 w-5" />
          </Link>
          <button
            aria-label="메뉴"
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/my"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
            >
              <UserCircle2 className="h-4 w-4" /> 프로필
            </Link>
            {user ? (
              <button
                type="button"
                onClick={() => { signOut(); setOpen(false); }}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                <LogOut className="h-4 w-4" /> 로그아웃
              </button>
            ) : (
              <>
                <SignupDialog
                  defaultMode="login"
                  redirectTo="/onboarding"
                  trigger={
                    <Button variant="ghost" className="w-full justify-start">
                      로그인
                    </Button>
                  }
                />
                <Link to="/simulations" onClick={() => setOpen(false)}>
                  <Button className="mt-1 w-full bg-brand text-brand-foreground hover:bg-brand/90">
                    시작하기
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
    </>
  );
}
