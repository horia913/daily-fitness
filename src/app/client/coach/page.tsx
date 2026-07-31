"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  UserRound,
  MessageSquareText,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import {
  fetchMyCoach,
  type MyCoachResult,
} from "@/lib/clientCoachService";
import { CoachingStatusPill } from "@/components/client-profile/CoachingStatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

function CoachPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<MyCoachResult | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchMyCoach(user.id);
      setData(result);
    } catch (e) {
      console.error(e);
      setLoadError("Could not load your coach.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const coach = data?.coach ?? null;
  const displayName = coach
    ? [coach.first_name, coach.last_name].filter(Boolean).join(" ").trim() ||
      coach.email?.split("@")[0] ||
      "Your coach"
    : null;
  const initials = (() => {
    if (!coach) return "?";
    const a = (coach.first_name ?? "").trim().charAt(0);
    const b = (coach.last_name ?? "").trim().charAt(0);
    if (a && b) return (a + b).toUpperCase();
    if (a) return a.toUpperCase();
    const e = (coach.email ?? "").trim().charAt(0);
    return e ? e.toUpperCase() : "?";
  })();

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/client/me")}
            className="fc-surface inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--fc-glass-border)]"
            aria-label="Back to Me"
          >
            <ArrowLeft className="h-4 w-4 fc-text-primary" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold fc-text-primary tracking-tight">
              Coach
            </h1>
            <p className="text-sm fc-text-dim mt-0.5">
              Who coaches you
            </p>
          </div>
        </div>

        {loading ? (
          <PageSkeleton variant="form" />
        ) : loadError ? (
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-4 text-center space-y-3">
            <p className="text-sm fc-text-dim">{loadError}</p>
            <Button
              type="button"
              className="fc-btn fc-btn-primary"
              onClick={() => void load()}
            >
              Retry
            </Button>
          </div>
        ) : !data?.hasCoach ? (
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-6 flex justify-center">
            <EmptyState
              icon={UserRound}
              title="No coach assigned"
              description="You aren’t linked to a coach yet. Once you’re assigned, they’ll show up here."
            />
          </div>
        ) : !coach ? (
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-6 flex justify-center">
            <EmptyState
              icon={UserRound}
              title="Coach unavailable"
              description="You’re linked to a coach, but their profile couldn’t be loaded."
              actionLabel="Retry"
              onAction={() => void load()}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <section className="rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] p-5 text-center">
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[color:var(--fc-accent)]">
                {coach.avatar_url ? (
                  <img
                    src={coach.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-[color:var(--fc-bg-base)]">
                    {initials}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold fc-text-primary tracking-tight">
                {displayName}
              </h2>
              {data.coachingState ? (
                <div className="mt-2 flex justify-center">
                  <CoachingStatusPill state={data.coachingState} />
                </div>
              ) : null}
            </section>

            {coach.bio?.trim() ? (
              <section>
                <h3 className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] fc-text-dim">
                  About
                </h3>
                <p className="text-sm leading-relaxed fc-text-primary whitespace-pre-wrap">
                  {coach.bio.trim()}
                </p>
              </section>
            ) : null}

            {(coach.email?.trim() || coach.phone?.trim()) && (
              <section>
                <h3 className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] fc-text-dim">
                  Contact
                </h3>
                <ul className="flex flex-col border-y border-[color:var(--fc-glass-border)]">
                  {coach.email?.trim() ? (
                    <li>
                      <a
                        href={`mailto:${coach.email.trim()}`}
                        className="flex min-h-[48px] items-center gap-3 py-2.5 transition-colors hover:bg-[color:var(--fc-glass-highlight)]"
                      >
                        <Mail className="h-4 w-4 shrink-0 fc-text-dim" />
                        <span className="min-w-0 truncate text-sm fc-text-primary">
                          {coach.email.trim()}
                        </span>
                      </a>
                    </li>
                  ) : null}
                  {coach.phone?.trim() ? (
                    <li>
                      <a
                        href={`tel:${coach.phone.trim()}`}
                        className={cn(
                          "flex min-h-[48px] items-center gap-3 py-2.5 transition-colors hover:bg-[color:var(--fc-glass-highlight)]",
                          coach.email?.trim() &&
                            "border-t border-[color:var(--fc-glass-border)]",
                        )}
                      >
                        <Phone className="h-4 w-4 shrink-0 fc-text-dim" />
                        <span className="min-w-0 truncate text-sm fc-text-primary">
                          {coach.phone.trim()}
                        </span>
                      </a>
                    </li>
                  ) : null}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] fc-text-dim">
                Notes
              </h3>
              <Link
                href="/client/train"
                className="flex min-h-[52px] items-center gap-3 border-y border-[color:var(--fc-glass-border)] py-3 transition-colors hover:bg-[color:var(--fc-glass-highlight)]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--fc-glass-highlight)]">
                  <MessageSquareText className="h-5 w-5 fc-text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold fc-text-primary">
                    Coach notes on Train
                  </p>
                  <p className="text-xs fc-text-dim line-clamp-1">
                    Week notes appear on your Train screen when your coach leaves them
                  </p>
                </div>
              </Link>
            </section>
          </div>
        )}
      </ClientPageShell>
    </AnimatedBackground>
  );
}

export default function ClientCoachPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <CoachPageContent />
    </ProtectedRoute>
  );
}
