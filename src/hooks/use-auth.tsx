import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      // 로컬 캐시 정리: 다음 로그인 시 새로운 계정 선택 가능하게
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-") || k.includes("supabase"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
      // 잠시 보여준 뒤 새로고침으로 상태 완전 초기화
      await new Promise((r) => setTimeout(r, 600));
      window.location.href = "/";
    } catch {
      setSigningOut(false);
    }
  };

  return { session, user, loading, signOut, signingOut };
}
