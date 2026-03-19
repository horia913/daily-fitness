"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MessageCircle,
  Dumbbell,
  Mail,
  Phone,
  Calendar,
  Target,
  Activity,
  BarChart3,
  TrendingUp,
  User,
  ChevronRight,
  Layers,
  ClipboardList,
  Utensils,
  BookOpen,
  AlertCircle,
  Footprints,
} from "lucide-react";
import Link from "next/link";
import { usePageData } from "@/hooks/usePageData";
import WorkoutAssignmentModal from "@/components/WorkoutAssignmentModal";

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  avatar?: string;
  joinedDate: string;
  status: "active" | "inactive" | "at-risk";
}

function ClientDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getSemanticColor, performanceSettings } = useTheme();
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
      };
    },
    [clientId]
  );

  const { data: client, loading } = usePageData(
    fetchSummary,
    [clientId, user?.id]
  );

  const [showAssignWorkoutModal, setShowAssignWorkoutModal] = useState(false);

  const clientOrPlaceholder: ClientData = client ?? {
    id: clientId,
    name: "Client",
    email: "",
    joinedDate: "",
    status: "active",
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
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl fc-page p-4 sm:p-6 pb-32">
            <Link href="/coach/clients" className="inline-flex mb-4">
              <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
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
                  <div key={i} className="h-20 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                ))}
              </div>
              <div className="h-40 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const displayClient = client ?? clientOrPlaceholder;

  const navCards: { section: string; items: { label: string; href: string; icon: React.ElementType }[] }[] = [
    {
      section: "Training",
      items: [
        { label: "Workouts / Assignments", href: `/coach/clients/${clientId}/workouts`, icon: Dumbbell },
        { label: "Programs", href: `/coach/clients/${clientId}/workouts`, icon: Layers },
        { label: "Adherence", href: `/coach/clients/${clientId}/adherence`, icon: ClipboardList },
      ],
    },
    {
      section: "Nutrition",
      items: [
        { label: "Meals / Meal plans", href: `/coach/clients/${clientId}/meals`, icon: Utensils },
      ],
    },
    {
      section: "Goals",
      items: [
        { label: "Goals", href: `/coach/clients/${clientId}/goals`, icon: Target },
      ],
    },
    {
      section: "Habits & Activities",
      items: [
        { label: "Habits", href: `/coach/clients/${clientId}/habits`, icon: Activity },
        { label: "Extra Activities", href: `/coach/clients/${clientId}/activities`, icon: Footprints },
      ],
    },
    {
      section: "Progress / Analytics",
      items: [
        { label: "Progress", href: `/coach/clients/${clientId}/progress`, icon: TrendingUp },
        { label: "Analytics", href: `/coach/clients/${clientId}/analytics`, icon: BarChart3 },
      ],
    },
    {
      section: "Profile",
      items: [
        { label: "Profile", href: `/coach/clients/${clientId}/profile`, icon: User },
      ],
    },
  ];

  const moreLinks = [
    { label: "Clipcards", href: `/coach/clients/${clientId}/clipcards`, icon: BookOpen },
    { label: "FMS", href: `/coach/clients/${clientId}/fms`, icon: Activity },
  ];

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-6xl fc-page flex flex-col min-w-0 overflow-x-hidden px-4 sm:p-6 pb-32" style={{ gap: "var(--fc-gap-sections)" }}>
        <Link href="/coach/clients" className="inline-flex">
          <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </Link>

        <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
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
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                className="fc-btn fc-btn-secondary min-h-[44px]"
                onClick={() => {
                  const phone = displayClient?.phone;
                  const email = displayClient?.email;
                  if (phone) {
                    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
                    window.open(`https://wa.me/${cleanPhone}`, "_blank");
                  } else if (email) {
                    window.open(`mailto:${email}`, "_blank");
                  } else {
                    addToast({ title: "No phone number or email available for this client.", variant: "destructive" });
                  }
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                <span>{displayClient?.phone ? "WhatsApp" : displayClient?.email ? "Email" : "Message"}</span>
              </Button>
              <Button
                className="fc-btn fc-btn-primary"
                style={{
                  background: getSemanticColor("energy").gradient,
                  boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
                }}
                onClick={() => setShowAssignWorkoutModal(true)}
              >
                <Dumbbell className="w-4 h-4 mr-2" />
                <span>Assign Workout</span>
              </Button>
            </div>
          </div>
        </GlassCard>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[color:var(--fc-text-dim)] mb-3">
            Quick access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {navCards.map(({ section, items }) =>
              items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={`${section}-${item.label}`} href={item.href}>
                    <GlassCard
                      elevation={2}
                      className="fc-glass fc-card p-4 flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${getSemanticColor("trust").primary}20`,
                          color: getSemanticColor("trust").primary,
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[color:var(--fc-text-primary)] truncate">
                          {item.label}
                        </p>
                        <p className="text-xs text-[color:var(--fc-text-dim)]">{section}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[color:var(--fc-text-subtle)] flex-shrink-0" />
                    </GlassCard>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[color:var(--fc-text-dim)] mb-3">
            More
          </h2>
          <div className="flex flex-wrap gap-2">
            {moreLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost gap-2">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {showAssignWorkoutModal && (
        <WorkoutAssignmentModal
          isOpen={showAssignWorkoutModal}
          onClose={() => setShowAssignWorkoutModal(false)}
          onSuccess={() => {
            setShowAssignWorkoutModal(false);
          }}
        />
      )}
    </AnimatedBackground>
  );
}

export default function ClientDetailPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <ClientDetailContent />
    </ProtectedRoute>
  );
}
