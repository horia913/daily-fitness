"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Dumbbell,
  Mail,
  Phone,
  Calendar,
  Utensils,
  Layers,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { usePageData } from "@/hooks/usePageData";
import WorkoutAssignmentModal from "@/components/WorkoutAssignmentModal";
import {
  attentionCardSurfaceStyle,
  type AttentionLevel,
} from "@/lib/coachClientAttention";
interface SummaryProgram {
  assignmentId: string;
  programId: string;
  name: string;
  currentWeek: number | null;
  durationWeeks: number | null;
}

interface SummaryNutrition {
  assignmentId: string;
  planId: string;
  planName: string;
  compliance7dPct: number | null;
  mealsLoggedToday: number;
  checkinsThisWeek: number;
}

interface RecentActivityItem {
  kind: "workout" | "checkin" | "meal";
  label: string;
  at: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  avatar?: string;
  joinedDate: string;
  status: "active" | "inactive" | "at-risk";
  streak: number;
  weeklyProgress: { current: number; goal: number };
  attention: { level: AttentionLevel; reasons: string[] };
  program: SummaryProgram | null;
  nutrition: SummaryNutrition | null;
  recentActivity: RecentActivityItem[];
  subscription: { expiringSoon: boolean; endDate: string | null };
}

export default function ClientDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { getSemanticColor } = useTheme();
  const { addToast } = useToast();
  const clientId = params.id as string;

  const fetchSummary = useMemo(
    () => async (): Promise<ClientData> => {
      const res = await fetch(`/api/coach/clients/${clientId}/summary`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed to load client (${res.status})`);
      }
      const json = await res.json();
      return {
        id: clientId,
        name: json.name ?? "Client",
        email: json.email ?? "",
        phone: json.phone,
        location: undefined,
        joinedDate: json.joinedDate ?? "",
        status: json.status ?? "active",
        streak: typeof json.streak === "number" ? json.streak : 0,
        weeklyProgress: json.weeklyProgress ?? { current: 0, goal: 0 },
        attention: json.attention ?? {
          level: "good" as AttentionLevel,
          reasons: [],
        },
        program: json.program ?? null,
        nutrition: json.nutrition ?? null,
        recentActivity: Array.isArray(json.recentActivity)
          ? json.recentActivity
          : [],
        subscription: {
          expiringSoon: Boolean(json.subscription?.expiringSoon),
          endDate:
            typeof json.subscription?.endDate === "string"
              ? json.subscription.endDate
              : null,
        },
      };
    },
    [clientId]
  );

  const { data: client, loading } = usePageData(fetchSummary, [
    clientId,
    user?.id,
  ]);

  const [showAssignWorkoutModal, setShowAssignWorkoutModal] = useState(false);

  const clientOrPlaceholder: ClientData = client ?? {
    id: clientId,
    name: "Client",
    email: "",
    joinedDate: "",
    status: "active",
    streak: 0,
    weeklyProgress: { current: 0, goal: 0 },
    attention: { level: "good", reasons: [] },
    program: null,
    nutrition: null,
    recentActivity: [],
    subscription: { expiringSoon: false, endDate: null },
  };

  const getStatusColor = (status: ClientData["status"]) => {
    switch (status) {
      case "active":
        return getSemanticColor("success").primary;
      case "at-risk":
        return getSemanticColor("warning").primary;
      case "inactive":
        return getSemanticColor("neutral").primary;
      default:
        return getSemanticColor("neutral").primary;
    }
  };

  const getStatusLabel = (status: ClientData["status"]) => {
    switch (status) {
      case "active":
        return "Active";
      case "at-risk":
        return "At Risk";
      case "inactive":
        return "Inactive";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl fc-page flex flex-col min-w-0 overflow-x-hidden">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[color:var(--fc-glass-highlight)]" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-40 rounded-full bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-4 w-24 rounded-full bg-[color:var(--fc-glass-highlight)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-[color:var(--fc-glass-highlight)]"
              />
            ))}
          </div>
          <div className="h-40 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
        </div>
      </div>
    );
  }

  const displayClient = client ?? clientOrPlaceholder;
  const att = displayClient.attention;
  const heroSurfaceStyle =
    att.level !== "good" ? attentionCardSurfaceStyle(att.level) : undefined;

  return (
    <div
      className="mx-auto w-full max-w-6xl fc-page flex flex-col min-w-0 overflow-x-hidden"
      style={{ gap: "var(--fc-gap-sections)" }}
    >
      {displayClient.subscription.expiringSoon && (
        <div className="border-b border-white/5 border-l-2 border-l-amber-500/80 bg-amber-500/10 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold fc-text-primary text-sm sm:text-base">
                Subscription ending soon
              </p>
              <p className="text-sm fc-text-dim mt-1">
                {displayClient.subscription.endDate
                  ? `Nearest active membership ends ${new Date(
                      displayClient.subscription.endDate + "T12:00:00Z"
                    ).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}.`
                  : "Review membership dates in the client profile."}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 fc-btn fc-btn-ghost border border-amber-500/40 text-cyan-400 hover:bg-amber-500/10"
              asChild
            >
              <Link href={`/coach/clients/${clientId}/profile?section=subscription`}>
                Open subscription
              </Link>
            </Button>
          </div>
        </div>
      )}

      {att.reasons.length > 0 && (
        <div
          className="border-b border-white/5 px-4 py-3"
          style={attentionCardSurfaceStyle(att.level)}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[color:var(--fc-status-warning)]" />
            <div className="min-w-0">
              <p className="font-semibold fc-text-primary text-sm sm:text-base">
                This client needs your attention
              </p>
              <ul className="mt-2 list-disc list-inside text-sm fc-text-dim space-y-1">
                {att.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <GlassCard
        elevation={2}
        className="fc-card p-6 sm:p-10 border border-[color:var(--fc-glass-border)]"
        surfaceStyle={heroSurfaceStyle}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0"
              style={{
                background: getSemanticColor("trust").gradient,
                color: "#fff",
              }}
            >
              {displayClient.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold fc-text-primary">
                  {displayClient.name}
                </h1>
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold"
                  style={{
                    background: `${getStatusColor(displayClient.status)}20`,
                    color: getStatusColor(displayClient.status),
                  }}
                >
                  {getStatusLabel(displayClient.status)}
                </span>
                {att.level === "urgent" && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                    Urgent
                  </span>
                )}
                {att.level === "warning" && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    Review
                  </span>
                )}
                {att.level === "inactive" && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[color:var(--fc-glass-highlight)] fc-text-subtle">
                    Inactive
                  </span>
                )}
              </div>
              <div className="space-y-0.5 text-sm text-[color:var(--fc-text-dim)]">
                {displayClient.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{displayClient.email}</span>
                  </div>
                )}
                {displayClient.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{displayClient.phone}</span>
                  </div>
                )}
                {displayClient.joinedDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Client since {displayClient.joinedDate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0 justify-end">
            <Button
              variant="ghost"
              className="fc-btn fc-btn-ghost min-h-[44px] text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
              onClick={() => {
                const phone = displayClient?.phone;
                const email = displayClient?.email;
                if (phone) {
                  const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
                  window.open(`https://wa.me/${cleanPhone}`, "_blank");
                } else if (email) {
                  window.open(`mailto:${email}`, "_blank");
                } else {
                  addToast({
                    title:
                      "No phone number or email available for this client.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              <span>
                {displayClient?.phone
                  ? "WhatsApp"
                  : displayClient?.email
                    ? "Email"
                    : "Message"}
              </span>
            </Button>
            <Button
              className="fc-btn fc-btn-primary min-h-[44px]"
              onClick={() => setShowAssignWorkoutModal(true)}
            >
              <Dumbbell className="w-4 h-4 mr-2" />
              <span>Assign Workout</span>
            </Button>
          </div>
        </div>
      </GlassCard>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link href={`/coach/clients/${clientId}/workouts`}>
            <Button
              size="sm"
              className="fc-btn fc-btn-primary gap-2"
            >
              <Layers className="w-4 h-4" />
              Adjust program
            </Button>
          </Link>
          <Link href={`/coach/clients/${clientId}/meals`}>
            <Button
              variant="ghost"
              size="sm"
              className="fc-btn fc-btn-ghost gap-2 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
            >
              <Utensils className="w-4 h-4" />
              Edit meals
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="fc-btn fc-btn-ghost gap-2 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
            onClick={() => {
              const phone = displayClient?.phone;
              const email = displayClient?.email;
              if (phone) {
                window.open(
                  `https://wa.me/${phone.replace(/[\s\-\(\)]/g, "")}`,
                  "_blank"
                );
              } else if (email) {
                window.open(`mailto:${email}`, "_blank");
              } else {
                addToast({
                  title: "No contact on file.",
                  variant: "destructive",
                });
              }
            }}
          >
            <MessageCircle className="w-4 h-4" />
            Send message
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-0 border-y border-white/5 md:grid-cols-2 md:divide-x md:divide-white/5">
        <div className="border-b border-white/5 px-4 py-3 md:border-b-0">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
            This week
          </h3>
          <div className="space-y-2 text-sm">
            <p className="fc-text-primary">
              <span className="font-semibold">Workouts:</span>{" "}
              <span className="text-cyan-400 font-bold tabular-nums">
                {displayClient.weeklyProgress.goal > 0
                  ? `${displayClient.weeklyProgress.current} / ${displayClient.weeklyProgress.goal}`
                  : `${displayClient.weeklyProgress.current} completed`}
              </span>
            </p>
            <p className="fc-text-primary">
              <span className="font-semibold">Check-in streak:</span>{" "}
              <span className="text-cyan-400 font-bold tabular-nums">{displayClient.streak}</span>
              <span className="fc-text-dim"> days</span>
            </p>
            {displayClient.nutrition?.compliance7dPct != null && (
              <p className="fc-text-primary">
                <span className="font-semibold">Meals (7d):</span>{" "}
                <span className="text-cyan-400 font-bold tabular-nums">
                  {displayClient.nutrition.compliance7dPct}%
                </span>
              </p>
            )}
            {displayClient.nutrition && (
              <p className="fc-text-dim text-xs">
                Today: {displayClient.nutrition.mealsLoggedToday} meal log
                {displayClient.nutrition.mealsLoggedToday === 1 ? "" : "s"} ·
                Check-ins this week: {displayClient.nutrition.checkinsThisWeek}
              </p>
            )}
          </div>
        </div>

        <div className="border-b border-white/5 border-l-0 px-4 py-3 md:border-b-0 md:border-l md:border-l-cyan-500/50">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
            Program
          </h3>
          {displayClient.program ? (
            <>
              <p className="text-sm font-semibold text-white">
                {displayClient.program.name}
              </p>
              <p className="text-xs fc-text-dim mt-1">
                {displayClient.program.currentWeek != null &&
                displayClient.program.durationWeeks != null
                  ? `Week ${displayClient.program.currentWeek} of ${displayClient.program.durationWeeks}`
                  : displayClient.program.durationWeeks != null
                    ? `${displayClient.program.durationWeeks} week program`
                    : "Active assignment"}
              </p>
              {displayClient.program.currentWeek != null &&
                displayClient.program.durationWeeks != null &&
                displayClient.program.durationWeeks > 0 && (
                  <div className="mt-3 h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (displayClient.program.currentWeek /
                              displayClient.program.durationWeeks) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                )}
              <Link
                href={`/coach/clients/${clientId}/programs/${displayClient.program.programId}`}
                className="inline-block mt-3"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="fc-btn fc-btn-ghost text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
                >
                  View / customize program
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-sm fc-text-dim">
              No active program. Assign from Training.
            </p>
          )}
        </div>

        <div className="col-span-1 border-b border-white/5 px-4 py-3 md:col-span-2 md:border-l-2 md:border-l-emerald-500/60">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
            Nutrition
          </h3>
          {displayClient.nutrition ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold fc-text-primary">
                  {displayClient.nutrition.planName}
                </p>
                <p className="text-xs fc-text-dim mt-1">
                  {displayClient.nutrition.compliance7dPct != null
                    ? `${displayClient.nutrition.compliance7dPct}% compliance (7d)`
                    : "Compliance tracking"}
                </p>
              </div>
              <Link href={`/coach/clients/${clientId}/meals`}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="fc-btn fc-btn-ghost text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10"
                >
                  Edit client meals
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm fc-text-dim">No active meal plan assignment.</p>
          )}
        </div>
      </div>

      {displayClient.recentActivity.length > 0 && (
        <div className="border-y border-white/5">
          <h3 className="border-b border-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
            Recent activity
          </h3>
          <ul className="text-sm">
            {displayClient.recentActivity.map((a, i) => (
              <li
                key={`${a.at}-${i}`}
                className={`flex justify-between gap-2 border-b border-white/5 px-4 py-3 last:border-b-0 fc-text-primary ${
                  a.kind === "workout"
                    ? "border-l-2 border-l-purple-500 pl-3"
                    : a.kind === "checkin"
                      ? "border-l-2 border-l-emerald-500 pl-3"
                      : "border-l-2 border-l-amber-500 pl-3"
                }`}
              >
                <span>{a.label}</span>
                <span className="whitespace-nowrap text-xs fc-text-dim">
                  {new Date(a.at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAssignWorkoutModal && (
        <WorkoutAssignmentModal
          isOpen={showAssignWorkoutModal}
          onClose={() => setShowAssignWorkoutModal(false)}
          onSuccess={() => {
            setShowAssignWorkoutModal(false);
          }}
        />
      )}
    </div>
  );
}
