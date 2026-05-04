"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  User,
  CreditCard,
  Activity,
  Shield,
  Star,
} from "lucide-react";
import SubTabs, { type SubTabDef } from "@/components/coach/client-detail/SubTabs";
import ClientDetailHero from "@/components/coach/client-detail/ClientDetailHero";
import { useCoachClient } from "@/contexts/CoachClientContext";
import { supabase } from "@/lib/supabase";
import { fetchClientHabits } from "@/lib/habitTemplateService";
import ClientProfileView from "@/components/coach/client-views/ClientProfileView";
import CoachClientSubscriptionSection from "@/components/coach/client-views/CoachClientSubscriptionSection";
import { HabitsList } from "@/components/coach/client-views/ClientHabitsView";
import { CoachClientActivitiesPanel } from "@/components/coach/client-views/CoachClientActivitiesPanel";
import ClientAccountSection from "@/components/coach/client-views/ClientAccountSection";

const SECTIONS = [
  { id: "personal" as const, label: "Personal", icon: User },
  { id: "subscription" as const, label: "Subscription", icon: CreditCard },
  { id: "habits" as const, label: "Habits", icon: Star },
  { id: "activities" as const, label: "Activities", icon: Activity },
  { id: "account" as const, label: "Account", icon: Shield },
];

type SectionId = (typeof SECTIONS)[number]["id"];

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

type ClipLite = {
  end_date: string;
  is_active: boolean | null;
  subscription_status: string | null;
};

function isRowActiveSubscription(row: ClipLite): boolean {
  if (!row.is_active) return false;
  const st = String(row.subscription_status || "").toLowerCase();
  if (st === "cancelled" || st === "expired") return false;
  return row.end_date >= todayYmd();
}

function subscriptionHeroState(rows: ClipLite[]): {
  label: string;
  tone: "lime" | "warning" | "critical";
} {
  const active = rows.find(isRowActiveSubscription) ?? null;
  if (active) {
    const st = String(active.subscription_status || "").toLowerCase();
    if (st === "trial") return { label: "Trial", tone: "warning" };
    return { label: "Active", tone: "lime" };
  }
  const sorted = [...rows].sort((a, b) => b.end_date.localeCompare(a.end_date));
  const latest = sorted[0];
  if (latest && latest.end_date < todayYmd()) {
    return { label: "Expired", tone: "critical" };
  }
  return { label: "None", tone: "critical" };
}

const PROFILE_TABS: SubTabDef<SectionId>[] = SECTIONS.map((s) => ({
  id: s.id,
  label: s.label,
  icon: s.icon,
}));

export default function CoachProfileShell() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { clientName, firstName, lastName } = useCoachClient();

  const rawSection = (searchParams.get("section") || "personal").toLowerCase();
  const activeSection: SectionId =
    SECTIONS.find((x) => x.id === rawSection)?.id ?? "personal";

  const navigateSection = useCallback(
    (id: SectionId) => {
      router.push(`/coach/clients/${clientId}/profile?section=${id}`, { scroll: false });
    },
    [router, clientId]
  );

  const [habitCount, setHabitCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);
  const [clips, setClips] = useState<ClipLite[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);

  const loadHero = useCallback(async () => {
    setHeroLoading(true);
    try {
      const [habits, countRes, clipRes] = await Promise.all([
        fetchClientHabits(clientId),
        supabase
          .from("client_activities")
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientId),
        supabase
          .from("clipcards")
          .select("end_date, is_active, subscription_status")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
      ]);
      const activeHabits = (habits ?? []).filter((h) => h.is_active !== false);
      setHabitCount(activeHabits.length);
      setActivityCount(countRes.count ?? 0);
      setClips((clipRes.data ?? []) as ClipLite[]);
    } catch {
      setHabitCount(0);
      setActivityCount(0);
      setClips([]);
    } finally {
      setHeroLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadHero();
  }, [loadHero]);

  const subState = useMemo(() => subscriptionHeroState(clips), [clips]);

  const fullName = useMemo(() => {
    const n = [firstName, lastName].filter(Boolean).join(" ").trim();
    return n || clientName || "Client";
  }, [firstName, lastName, clientName]);

  return (
    <div className="space-y-3">
      <ClientDetailHero
        accent="cyan"
        eyebrow="Client profile"
        title={fullName}
        subtitle="Personal info, subscription, habits, activities, and account"
        stats={[
          {
            num: heroLoading ? "—" : subState.label,
            label: "Subscription",
            tone: subState.tone,
          },
          { num: heroLoading ? "—" : habitCount, label: "Habits", tone: "default" },
          {
            num: heroLoading ? "—" : activityCount,
            label: "Activities",
            tone: "cyan",
          },
        ]}
      />

      <SubTabs tabs={PROFILE_TABS} active={activeSection} onChange={navigateSection} />

      {activeSection === "personal" && (
        <div role="tabpanel">
          <ClientProfileView clientId={clientId} layoutVariant="coachV6" />
        </div>
      )}

      {activeSection === "subscription" && (
        <div role="tabpanel">
          <CoachClientSubscriptionSection clientId={clientId} layoutVariant="coachV6" />
        </div>
      )}

      {activeSection === "habits" && (
        <div role="tabpanel">
          <HabitsList clientId={clientId} clientName={clientName} />
        </div>
      )}

      {activeSection === "activities" && (
        <div role="tabpanel">
          <CoachClientActivitiesPanel clientId={clientId} showPageHeader={false} layoutVariant="coachV6" />
        </div>
      )}

      {activeSection === "account" && (
        <div role="tabpanel">
          <ClientAccountSection clientId={clientId} layoutVariant="coachV6" />
        </div>
      )}
    </div>
  );
}
