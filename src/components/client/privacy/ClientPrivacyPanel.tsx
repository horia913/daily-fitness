"use client";

import Link from "next/link";
import { ChevronRight, Medal } from "lucide-react";

/**
 * Mounted in Settings as the Privacy / Sharing section.
 * `/client/privacy` redirects here.
 */
export function ClientPrivacyPanel({
  variant = "standalone",
}: {
  variant?: "standalone" | "embedded";
}) {
  const body = (
    <div className="space-y-4">
      <div className="rounded-[13px] border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-well)] px-3.5 py-3">
        <p
          className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] fc-text-subtle"
        >
          Who sees your data
        </p>
        <div className="space-y-2 text-[12px] leading-relaxed fc-text-dim">
          <p>
            Your coach can see your health and injury notes, body metrics and
            progress photos, wellness check-ins and notes, workouts, goals, and
            contact details — so they can program for you safely.
          </p>
          <p>
            Other clients on your coach&apos;s roster can only see your
            leaderboard name (or &ldquo;Anonymous&rdquo; / hidden if you choose)
            and your scores. Nothing else.
          </p>
          <p>No one else has access.</p>
        </div>
      </div>

      <div>
        <p
          className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] fc-text-subtle"
        >
          Sharing
        </p>
        <p className="mb-2 text-[11px] fc-text-dim">
          How you appear on your coach&apos;s roster leaderboard.
        </p>
        <Link
          href="/client/progress/leaderboard"
          className="flex w-full items-center gap-3 rounded-[13px] border border-[color:var(--fc-hairline)] bg-transparent px-3 py-3 text-left transition-colors hover:bg-[color:var(--fc-surface-tint)]"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
            style={{
              background:
                "color-mix(in srgb, var(--fc-accent-gold, var(--fc-status-warning)) 14%, transparent)",
              color: "var(--fc-accent-gold, var(--fc-status-warning))",
            }}
            aria-hidden
          >
            <Medal className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block text-[14px] font-bold leading-tight fc-text-primary"
              style={{ fontFamily: "var(--f-display)" }}
            >
              Leaderboard visibility
            </span>
            <span className="mt-0.5 block line-clamp-1 text-[11px] fc-text-dim">
              Public, anonymous, or hidden on your coach&apos;s roster
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 fc-text-subtle"
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );

  if (variant === "embedded") return body;

  return <div className="flex flex-col gap-5">{body}</div>;
}
