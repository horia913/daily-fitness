"use client";

import React, { useEffect, useMemo, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import ClientProfileView from "@/components/coach/client-views/ClientProfileView";
import CoachClientSubscriptionSection from "@/components/coach/client-views/CoachClientSubscriptionSection";
import ClientHabitsView from "@/components/coach/client-views/ClientHabitsView";
import { CoachClientActivitiesPanel } from "@/components/coach/client-views/CoachClientActivitiesPanel";
import ClientAccountSection from "@/components/coach/client-views/ClientAccountSection";
import { User, Sparkles, Activity, CreditCard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  { id: "personal", label: "Personal" },
  { id: "subscription", label: "Subscription" },
  { id: "habits", label: "Habits" },
  { id: "activities", label: "Activities" },
  { id: "account", label: "Account" },
] as const;

function ClientProfilePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const section = (searchParams.get("section") || "personal").toLowerCase();
  const personalRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<HTMLDivElement>(null);
  const habitsRef = useRef<HTMLDivElement>(null);
  const activitiesRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const refs = useMemo(
    () => ({
      personal: personalRef,
      subscription: subscriptionRef,
      habits: habitsRef,
      activities: activitiesRef,
      account: accountRef,
    }),
    []
  );

  useEffect(() => {
    const s = SECTIONS.find((x) => x.id === section)?.id ?? "personal";
    const el = refs[s]?.current;
    if (el && s !== "personal") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [section, refs]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                  Profile
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                  Personal info, subscription, habits, activities, and account.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 min-h-[44px] items-center">
            {SECTIONS.map((s) => (
              <Button
                key={s.id}
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  window.location.href = `/coach/clients/${clientId}/profile?section=${s.id}`;
                }}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div ref={personalRef} className="scroll-mt-4 space-y-6">
        <ClientProfileView clientId={clientId} />
      </div>

      <div ref={subscriptionRef} className="scroll-mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-cyan-400/70" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
            Subscription
          </h2>
        </div>
        <CoachClientSubscriptionSection clientId={clientId} />
      </div>

      <div ref={habitsRef} className="scroll-mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400/70" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
              Habits
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
            asChild
          >
            <Link href="/coach/goals?tab=habits">Assign habits library</Link>
          </Button>
        </div>
        <ClientHabitsView clientId={clientId} />
      </div>

      <div ref={activitiesRef} className="scroll-mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400/70" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
            Activities
          </h2>
        </div>
        <CoachClientActivitiesPanel clientId={clientId} showPageHeader={false} />
      </div>

      <div ref={accountRef} className="scroll-mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400/70" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
            Account information
          </h2>
        </div>
        <ClientAccountSection clientId={clientId} />
      </div>
    </div>
  );
}

export default function ClientProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-[color:var(--fc-glass-highlight)]" />
          <div className="h-48 animate-pulse rounded-xl bg-[color:var(--fc-glass-highlight)]" />
        </div>
      }
    >
      <ClientProfilePageContent />
    </Suspense>
  );
}
