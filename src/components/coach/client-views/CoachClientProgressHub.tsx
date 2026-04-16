"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Scale,
  HeartHandshake,
  ImageIcon,
  ClipboardCheck,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCoachClient } from "@/contexts/CoachClientContext";
import ClientProgressBodySection from "@/components/coach/client-views/ClientProgressBodySection";
import ClientProgressWellnessSection from "@/components/coach/client-views/ClientProgressWellnessSection";
import ClientProgressPhotosSection from "@/components/coach/client-views/ClientProgressPhotosSection";
import { ClientFmsAssessmentsPanel } from "@/components/coach/client-views/ClientFmsAssessmentsPanel";
import ClientGoalsView from "@/components/coach/client-views/ClientGoalsView";

const SECTIONS = [
  { id: "body" as const, label: "Body", shortLabel: "Body", icon: Scale },
  { id: "wellness" as const, label: "Wellness", shortLabel: "Well", icon: HeartHandshake },
  { id: "photos" as const, label: "Photos", shortLabel: "Photos", icon: ImageIcon },
  { id: "fms" as const, label: "FMS", shortLabel: "FMS", icon: ClipboardCheck },
  { id: "goals" as const, label: "Goals", shortLabel: "Goals", icon: Target },
];

export type ProgressHubSectionId = (typeof SECTIONS)[number]["id"];

const SECTION_IDS = new Set<ProgressHubSectionId>(SECTIONS.map((s) => s.id));

function parseSectionParam(raw: string | null): ProgressHubSectionId | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  return SECTION_IDS.has(s as ProgressHubSectionId) ? (s as ProgressHubSectionId) : null;
}

interface CoachClientProgressHubProps {
  clientId: string;
}

export default function CoachClientProgressHub({
  clientId,
}: CoachClientProgressHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { clientName } = useCoachClient();

  const [activeSection, setActiveSection] = useState<ProgressHubSectionId>("body");
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const fromSection = parseSectionParam(searchParams.get("section"));
    const fromTab = parseSectionParam(searchParams.get("tab"));
    const initial = fromSection ?? fromTab;
    if (initial) setActiveSection(initial);

    if (searchParams.has("section") || searchParams.has("tab")) {
      router.replace(`/coach/clients/${clientId}/progress`, { scroll: false });
    }
  }, [clientId, router, searchParams]);

  const coachId = user?.id ?? null;

  return (
    <div className="space-y-6">
      <div className="border-b border-[color:var(--fc-glass-border)] -mx-1 px-1">
        <nav
          className="flex gap-1 overflow-x-auto pb-2 min-h-[44px] items-stretch scrollbar-hide"
          role="tablist"
          aria-label="Check-ins and assessments sections"
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap flex-shrink-0 rounded-full border transition-colors min-h-[44px]",
                  active
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-400 font-medium"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-[color:var(--fc-glass-border)]"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {activeSection === "body" && (
        <ClientProgressBodySection clientId={clientId} coachId={coachId ?? undefined} />
      )}
      {activeSection === "wellness" && (
        <ClientProgressWellnessSection clientId={clientId} coachId={coachId} />
      )}
      {activeSection === "photos" && <ClientProgressPhotosSection clientId={clientId} />}
      {activeSection === "fms" && (
        <ClientFmsAssessmentsPanel
          clientId={clientId}
          showPageHeader={false}
          clientName={clientName}
        />
      )}
      {activeSection === "goals" && <ClientGoalsView clientId={clientId} />}
    </div>
  );
}
