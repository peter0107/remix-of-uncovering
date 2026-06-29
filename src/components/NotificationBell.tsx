import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useJobNames } from "@/lib/jobLookup";

type NotificationItem = {
  key: string;
  orderId: string;
  jobSlug: string;
  jobName: string;
  type: "report_ready" | "feedback_ready";
  title: string;
  missionTitle: string;
  createdAt: number;
};

const SEEN_STORAGE_PREFIX = "beginner.notifications.seenAt.";

function loadSeenAt(userId: string): number {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_PREFIX + userId);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveSeenAt(userId: string, ts: number) {
  try {
    localStorage.setItem(SEEN_STORAGE_PREFIX + userId, String(ts));
  } catch {
    // ignore
  }
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [seenAt, setSeenAt] = useState<number>(0);
  const [open, setOpen] = useState(false);

  // Load per-user seenAt when user changes
  useEffect(() => {
    if (!user) {
      setSeenAt(0);
      return;
    }
    setSeenAt(loadSeenAt(user.id));
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    const { data, error } = await supabase
      .from("orders")
      .select("id,status,updated_at,job_slug,mission_id")
      .eq("user_id", user.id)
      .in("status", ["report_ready", "feedback_ready"])
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error || !data) return;

    const missionIds = Array.from(
      new Set(data.map((r) => r.mission_id).filter((v): v is string => !!v)),
    );
    const titleMap = new Map<string, string>();
    if (missionIds.length > 0) {
      const { data: missions } = await supabase
        .from("missions")
        .select("id,title")
        .in("id", missionIds);
      missions?.forEach((m) => titleMap.set(m.id, m.title));
    }

    const slugs = Array.from(new Set(data.map((r) => r.job_slug).filter(Boolean)));
    const jobMap = await useJobNames(slugs);

    const list: NotificationItem[] = data.map((r) => ({
      key: `${r.id}:${r.status}`,
      orderId: r.id,
      jobSlug: r.job_slug,
      jobName: jobMap[r.job_slug] ?? r.job_slug,
      type: r.status as NotificationItem["type"],
      title:
        r.status === "report_ready"
          ? "결과 리포트가 등록되었어요"
          : "현직자 피드백이 등록되었어요",
      missionTitle: (r.mission_id && titleMap.get(r.mission_id)) || "시뮬레이션",
      createdAt: new Date(r.updated_at).getTime(),
    }));
    setItems(list);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime updates on this user's orders
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(
      `orders-notify-${user.id}-${Math.random().toString(36).slice(2, 8)}`,
    );
    channel
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchNotifications(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const unreadCount = useMemo(
    () => items.filter((i) => i.createdAt > seenAt).length,
    [items, seenAt],
  );

  const markAllSeen = useCallback(() => {
    if (!user) return;
    const maxTs = items.reduce((m, i) => Math.max(m, i.createdAt), 0);
    const next = Math.max(maxTs, Date.now());
    setSeenAt(next);
    saveSeenAt(user.id, next);
  }, [items, user]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) markAllSeen();
  };

  // If popover is already open when new items arrive, keep them marked as seen
  useEffect(() => {
    if (open) markAllSeen();
  }, [open, items, markAllSeen]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="알림"
          className={`relative grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground ${className}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-primary">알림</p>
        </div>
        {!user ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            로그인 후 알림을 확인할 수 있어요.
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            새로운 알림이 없습니다.
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <li key={n.key} className="border-b border-border last:border-b-0">
                <Link
                  to="/report/$orderId"
                  params={{ orderId: n.orderId }}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm transition-colors hover:bg-muted"
                >
                  <p className="font-medium text-foreground">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {n.jobName} · {n.missionTitle}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
