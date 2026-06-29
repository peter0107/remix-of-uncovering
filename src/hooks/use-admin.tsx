import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!userId) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) {
        setIsAdmin(!!data);
        setLoading(false);
      }
    }
    if (!authLoading) {
      // 같은 userId에 대해선 loading을 다시 true로 올리지 않음
      // (탭 전환 시 토큰 갱신으로 user 객체 참조만 바뀌는 경우 Dialog 등 UI가 unmount되는 것을 방지)
      check();
    }
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  return { isAdmin, loading: authLoading || loading, user };
}
