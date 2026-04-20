"use client";

import React, { Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import ClientProfileView from "@/components/coach/client-views/ClientProfileView";
import CoachClientSubscriptionSection from "@/components/coach/client-views/CoachClientSubscriptionSection";
import ClientHabitsView from "@/components/coach/client-views/ClientHabitsView";
import { CoachClientActivitiesPanel } from "@/components/coach/client-views/CoachClientActivitiesPanel";
import ClientAccountSection from "@/components/coach/client-views/ClientAccountSection";
import { User, Sparkles, Activity, CreditCard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "habits", label: "Habits", icon: Sparkles },
  { id: "activities", label: "Activities", icon: Activity },
  { id: "account", label: "Account", icon: Shield },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function ClientProfilePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = params.id as string;

  const rawSection = (searchParams.get("section") || "personal").toLowerCase();
  const activeSection: SectionId =
    (SECTIONS.find((x) => x.id === rawSection)?.id as SectionId) ?? "personal";

  const navigateSection = (id: SectionId) => {
    router.push(`/coach/clients/${clientId}/profile?section=${id}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassCard
        elevation={2}
        className="fc-card-shell p-3 sm:p-6 md:p-8"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)] truncate">
              Profile
            </h1>
            <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mt-1">
              Personal info, subscription, habits, activities, and account.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="border-b border-[color:var(--fc-glass-border)] -mx-4 sm:mx-0 px-4 sm:px-0">
        <nav
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          role="tablist"
          aria-label="Profile sections"
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => navigateSection(s.id)}
                className={cn(
                  "bg-transparent border-none cursor-pointer",
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] rounded-t-xl",
                  "border-b-2 -mb-[1px]",
                  isActive
                    ? "text-[color:var(--fc-accent)] border-[color:var(--fc-accent)]"
                    : "text-[color:var(--fc-text-dim)] border-transparent hover:text-[color:var(--fc-text-primary)] hover:border-[color:var(--fc-glass-border)]"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {activeSection === "personal" && (
        <div role="tabpanel" className="space-y-6">
          <ClientProfileView clientId={clientId} />
        </div>
      )}

      {activeSection === "subscription" && (
        <div role="tabpanel" className="space-y-3">
          <CoachClientSubscriptionSection clientId={clientId} />
        </div>
      )}

      {activeSection === "habits" && (
        <div role="tabpanel" className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[color:var(--fc-accent)] border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-soft)]"
              asChild
            >
              <Link href="/coach/goals?tab=habits">Assign habits library</Link>
            </Button>
          </div>
          <ClientHabitsView clientId={clientId} />
        </div>
      )}

      {activeSection === "activities" && (
        <div role="tabpanel" className="space-y-3">
          <CoachClientActivitiesPanel clientId={clientId} showPageHeader={false} />
        </div>
      )}

      {activeSection === "account" && (
        <div role="tabpanel" className="space-y-3">
          <ClientAccountSection clientId={clientId} />
        </div>
      )}
    </div>
  );
}

export default function ClientProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <ClientProfilePageContent />
    </Suspense>
  );
}
