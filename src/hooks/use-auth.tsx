import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

let cachedSession: Session | null = null;
let cachedUser: User | null = null;
let authInitialized = false;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(cachedSession);
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!authInitialized);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      cachedSession = s;
      cachedUser = s?.user ?? null;
      authInitialized = true;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    if (!authInitialized) {
      supabase.auth.getSession().then(({ data }) => {
        cachedSession = data.session;
        cachedUser = data.session?.user ?? null;
        authInitialized = true;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

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
