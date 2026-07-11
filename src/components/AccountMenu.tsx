import { Link } from "@tanstack/react-router";
import { Loader2, LogOut, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

export function AccountMenu() {
  const { user, signOut, signingOut } = useAuth();

  if (!user) return null;

  return (
    <>
      {signingOut && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-medium text-foreground">로그아웃 중입니다...</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[200px] truncate text-xs text-muted-foreground md:inline">
          {user.email}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="프로필 메뉴"
              className="grid h-10 w-10 place-items-center rounded-full border border-neutral-300 bg-white text-neutral-800 transition-colors hover:bg-neutral-50"
            >
              <UserRound className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/my" className="cursor-pointer">
                <UserRound className="h-4 w-4" />
                프로필 보기
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void signOut();
              }}
              className="cursor-pointer text-red-600 focus:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
