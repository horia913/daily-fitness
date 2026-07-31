"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell } from "@/components/client-ui";
import {
  NotificationFeedList,
  useNotificationFeed,
} from "@/components/notifications/NotificationFeedList";

function ClientNotificationsContent() {
  const router = useRouter();
  const feed = useNotificationFeed({ pollMs: 20_000 });

  return (
    <AnimatedBackground>
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-0 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
        <div className="mb-3 flex items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="fc-surface inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--fc-glass-border)]"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4 fc-text-primary" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold fc-text-primary tracking-tight">
              Notifications
            </h1>
            <p className="text-sm fc-text-dim mt-0.5">
              {feed.unreadCount > 0
                ? `${feed.unreadCount} unread`
                : "All caught up"}
            </p>
          </div>
          <Link
            href="/client/settings"
            className="text-xs fc-text-dim hover:fc-text-primary underline-offset-2 hover:underline"
          >
            Settings
          </Link>
        </div>

        <div className="border-t border-[color:var(--fc-glass-border)]">
          <NotificationFeedList variant="client" feed={feed} />
        </div>
      </ClientPageShell>
    </AnimatedBackground>
  );
}

export default function ClientNotificationsPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <ClientNotificationsContent />
    </ProtectedRoute>
  );
}
