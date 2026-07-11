import { Link } from "@tanstack/react-router";
import { Loader2, LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const displayNameCache = new Map<string, string>();

function fallbackDisplayName(email: string | undefined) {
  return email?.split("@")[0] || "사용자";
}

export function AccountMenu() {
  const { user, signOut, signingOut } = useAuth();
  const [displayName, setDisplayName] = useState(() => fallbackDisplayName(user?.email));

  useEffect(() => {
    if (!user) return;

    const fallbackName = fallbackDisplayName(user.email);
    const cachedName = displayNameCache.get(user.id);
    setDisplayName(cachedName ?? fallbackName);

    if (!cachedName) {
      void supabase
        .from("job_seekers")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          const nextName = data?.display_name?.trim();
          if (!nextName) return;
          displayNameCache.set(user.id, nextName);
          setDisplayName(nextName);
        });
    }

    const handleDisplayNameUpdate = (event: Event) => {
      const nextName = (event as CustomEvent<string>).detail?.trim();
      if (!nextName) return;
      displayNameCache.set(user.id, nextName);
      setDisplayName(nextName);
    };

    window.addEventListener("beginner:display-name-updated", handleDisplayNameUpdate);
    return () =>
      window.removeEventListener("beginner:display-name-updated", handleDisplayNameUpdate);
  }, [user]);

  if (!user) return null;

  const profileLabel = `${displayName.replace(/님$/, "")}님`;

  return (
    <>
      {signingOut && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-medium text-foreground">로그아웃 중입니다...</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span
          className="max-w-28 truncate text-sm font-semibold text-neutral-800"
          title={profileLabel}
        >
          {profileLabel}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="프로필 메뉴"
              className="grid h-9 w-9 place-items-center rounded-full border border-neutral-300 bg-white text-neutral-800 transition-colors hover:bg-neutral-50"
            >
              <UserRound className="h-4 w-4" strokeWidth={2.2} />
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
