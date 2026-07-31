"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { User, Activity, Shield, Star } from "lucide-react";
import SubTabs, { type SubTabDef } from "@/components/coach/client-detail/SubTabs";
import ClientDetailHero from "@/components/coach/client-detail/ClientDetailHero";
import { useCoachClient } from "@/contexts/CoachClientContext";
import { supabase } from "@/lib/supabase";
import { fetchClientHabits } from "@/lib/habitTemplateService";
import ClientProfileView from "@/components/coach/client-views/ClientProfileView";
import { HabitsList } from "@/components/coach/client-views/ClientHabitsView";
import { CoachClientActivitiesPanel } from "@/components/coach/client-views/CoachClientActivitiesPanel";
import ClientAccountSection from "@/components/coach/client-views/ClientAccountSection";
import { RecoveryTargetsForm } from "@/components/coach/RecoveryTargetsForm";

const SECTIONS = [
  { id: "personal" as const, label: "Personal", icon: User },
  { id: "habits" as const, label: "Habits", icon: Star },
  { id: "activities" as const, label: "Activities", icon: Activity },
  { id: "account" as const, label: "Account", icon: Shield },
];

type SectionId = (typeof SECTIONS)[number]["id"];

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
  const [heroLoading, setHeroLoading] = useState(true);

  const loadHero = useCallback(async () => {
    setHeroLoading(true);
    try {
      const [habits, countRes] = await Promise.all([
        fetchClientHabits(clientId),
        supabase
          .from("client_activities")
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientId),
      ]);
      const activeHabits = (habits ?? []).filter((h) => h.is_active !== false);
      setHabitCount(activeHabits.length);
      setActivityCount(countRes.count ?? 0);
    } catch {
      setHabitCount(0);
      setActivityCount(0);
    } finally {
      setHeroLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadHero();
  }, [loadHero]);

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
        subtitle="Personal info, habits, activities, and account"
        stats={[
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
        <div role="tabpanel" className="space-y-6">
          <ClientProfileView clientId={clientId} layoutVariant="coachV6" />
          <RecoveryTargetsForm clientId={clientId} />
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
