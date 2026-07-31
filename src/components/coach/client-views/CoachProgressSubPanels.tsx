"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useCoachClient } from "@/contexts/CoachClientContext";
import ClientProgressBodySection from "@/components/coach/client-views/ClientProgressBodySection";
import ClientProgressWellnessSection from "@/components/coach/client-views/ClientProgressWellnessSection";
import ClientProgressPhotosSection from "@/components/coach/client-views/ClientProgressPhotosSection";
import ClientGoalsView from "@/components/coach/client-views/ClientGoalsView";
import ClientHabitsView from "@/components/coach/client-views/ClientHabitsView";

export const PROGRESS_SECTIONS = [
  { id: "body" as const, label: "Body", shortLabel: "Body" },
  { id: "wellness" as const, label: "Wellness", shortLabel: "Well" },
  { id: "photos" as const, label: "Photos", shortLabel: "Photos" },
  { id: "goals" as const, label: "Goals", shortLabel: "Goals" },
  { id: "habits" as const, label: "Habits", shortLabel: "Habit" },
] as const;

export type ProgressHubSectionId = (typeof PROGRESS_SECTIONS)[number]["id"];

const SECTION_IDS = new Set<string>(PROGRESS_SECTIONS.map((s) => s.id));

export function parseProgressSubtab(raw: string | null): ProgressHubSectionId {
  const s = (raw || "body").toLowerCase();
  return SECTION_IDS.has(s) ? (s as ProgressHubSectionId) : "body";
}

export default function CoachProgressSubPanels({
  clientId,
  active,
}: {
  clientId: string;
  active: ProgressHubSectionId;
}) {
  const { user } = useAuth();
  const { clientName } = useCoachClient();
  const coachId = user?.id ?? null;

  return (
    <div className="space-y-3">
      {active === "body" && (
        <ClientProgressBodySection clientId={clientId} coachId={coachId ?? undefined} />
      )}
      {active === "wellness" && <ClientProgressWellnessSection clientId={clientId} coachId={coachId} />}
      {active === "photos" && <ClientProgressPhotosSection clientId={clientId} />}
      {active === "goals" && (
        <ClientGoalsView clientId={clientId} layoutVariant="coachV6" />
      )}
      {active === "habits" && <ClientHabitsView clientId={clientId} clientName={clientName} layoutVariant="coachV6" />}
    </div>
  );
}
