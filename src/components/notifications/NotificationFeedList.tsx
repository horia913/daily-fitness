"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type InAppNotification,
} from "@/lib/inAppNotificationService";

function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function useNotificationFeed(options?: { pollMs?: number }) {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        listNotifications({ limit: 80 }),
        getUnreadNotificationCount(),
      ]);
      setItems(list);
      setUnreadCount(count);
    } catch (e) {
      console.error("[useNotificationFeed]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const ms = options?.pollMs ?? 0;
    if (ms <= 0) return;
    const id = setInterval(() => void refresh(), ms);
    return () => clearInterval(id);
  }, [refresh, options?.pollMs]);

  const markOne = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAll = useCallback(async () => {
    await markAllNotificationsRead();
    setItems((prev) =>
      prev.map((n) => ({
        ...n,
        read_at: n.read_at ?? new Date().toISOString(),
      }))
    );
    setUnreadCount(0);
  }, []);

  const remove = useCallback(
    async (id: string) => {
      const wasUnread = items.find((n) => n.id === id)?.read_at == null;
      await deleteNotification(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    },
    [items]
  );

  const groups = useMemo(() => {
    const map = new Map<string, InAppNotification[]>();
    for (const n of items) {
      const label = dayLabel(n.created_at);
      const arr = map.get(label) ?? [];
      arr.push(n);
      map.set(label, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  return {
    items,
    groups,
    unreadCount,
    loading,
    refresh,
    markOne,
    markAll,
    remove,
    relativeTime,
  };
}

export type NotificationFeedController = ReturnType<typeof useNotificationFeed>;

export function useUnreadNotificationCount(pollMs = 15_000) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(await getUnreadNotificationCount());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { count, refresh };
}

type FeedListProps = {
  variant?: "client" | "coach";
  onClose?: () => void;
  feed?: NotificationFeedController;
};

function NotificationFeedListView({
  variant = "coach",
  onClose,
  feed,
}: {
  variant?: "client" | "coach";
  onClose?: () => void;
  feed: NotificationFeedController;
}) {
  const router = useRouter();
  const { groups, unreadCount, loading, markOne, markAll, relativeTime } = feed;

  const onTap = async (n: InAppNotification) => {
    if (!n.read_at) await markOne(n.id);
    onClose?.();
    if (n.link) router.push(n.link);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-[color:var(--fc-glass-border)]"
          />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm font-medium fc-text-primary">Nothing new</p>
        <p className="mt-1 text-xs fc-text-dim">
          When something happens, it will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {unreadCount > 0 && (
        <div className="flex justify-end px-4 py-2 border-b border-[color:var(--fc-glass-border)]">
          <button
            type="button"
            onClick={() => void markAll()}
            className="text-xs font-medium fc-text-workouts hover:underline"
          >
            Mark all as read
          </button>
        </div>
      )}
      {groups.map(([label, rows]) => (
        <section key={label}>
          <h3
            className={
              variant === "client"
                ? "px-4 pt-4 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] fc-text-dim"
                : "px-4 pt-3 pb-1 text-xs font-semibold fc-text-subtle"
            }
          >
            {label}
          </h3>
          <ul>
            {rows.map((n) => {
              const unread = n.read_at == null;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void onTap(n)}
                    className={`w-full text-left px-4 py-3 border-b border-[color:var(--fc-glass-border)] transition-colors hover:bg-[color:var(--fc-glass-highlight)] ${
                      unread ? "fc-glass-soft" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {unread ? (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--fc-accent)]"
                          aria-hidden
                        />
                      ) : (
                        <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`text-sm truncate ${
                              unread
                                ? "font-semibold fc-text-primary"
                                : "font-medium fc-text-primary"
                            }`}
                          >
                            {n.title}
                          </p>
                          <span className="shrink-0 text-[10px] fc-text-dim tabular-nums">
                            {relativeTime(n.created_at)}
                          </span>
                        </div>
                        {n.body ? (
                          <p className="mt-0.5 text-xs fc-text-dim line-clamp-2">
                            {n.body}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function NotificationFeedListInternal(props: Omit<FeedListProps, "feed">) {
  const feed = useNotificationFeed();
  return <NotificationFeedListView {...props} feed={feed} />;
}

export function NotificationFeedList({ feed, ...rest }: FeedListProps) {
  if (feed) return <NotificationFeedListView {...rest} feed={feed} />;
  return <NotificationFeedListInternal {...rest} />;
}
