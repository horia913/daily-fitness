"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  X,
  Dumbbell,
  Apple,
  TrendingUp,
  BarChart3,
  Target,
  Flame,
  Activity,
  ChevronRight,
  User,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ClientProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
}

const functionCards = [
  {
    id: "profile",
    title: "Client Profile",
    description: "View personal information & settings",
    icon: User,
    gradient: "from-purple-500 to-indigo-600",
    iconBg: "from-purple-500 to-indigo-600",
    href: "profile",
  },
  {
    id: "workouts",
    title: "Assigned Workouts",
    description: "View and manage workout plans",
    icon: Dumbbell,
    gradient: "from-blue-500 to-indigo-600",
    iconBg: "from-blue-500 to-indigo-600",
    href: "workouts",
  },
  {
    id: "meals",
    title: "Assigned Meal Plans",
    description: "View and manage nutrition",
    icon: Apple,
    gradient: "from-teal-500 to-cyan-600",
    iconBg: "from-teal-500 to-cyan-600",
    href: "meals",
  },
  {
    id: "progress",
    title: "Client Progress",
    description: "Check-ins, measurements, photos",
    icon: TrendingUp,
    gradient: "from-orange-500 to-amber-600",
    iconBg: "from-orange-500 to-amber-600",
    href: "progress",
  },
  {
    id: "adherence",
    title: "Client Adherence",
    description: "Workout & nutrition compliance",
    icon: BarChart3,
    gradient: "from-green-500 to-emerald-600",
    iconBg: "from-green-500 to-emerald-600",
    href: "adherence",
  },
  {
    id: "goals",
    title: "Goals & Milestones",
    description: "Track client objectives",
    icon: Target,
    gradient: "from-purple-500 to-indigo-600",
    iconBg: "from-purple-500 to-indigo-600",
    href: "goals",
  },
  {
    id: "habits",
    title: "Habits & Lifestyle",
    description: "Sleep, water, steps, cardio",
    icon: Flame,
    gradient: "from-yellow-500 to-orange-600",
    iconBg: "from-yellow-500 to-orange-600",
    href: "habits",
  },
  {
    id: "clipcards",
    title: "ClipCards",
    description: "Manage session credits & packages",
    icon: CreditCard,
    gradient: "from-pink-500 to-rose-600",
    iconBg: "from-pink-500 to-rose-600",
    href: "clipcards",
  },
  {
    id: "analytics",
    title: "App Analytics",
    description: "Login history, time spent",
    icon: Activity,
    gradient: "from-slate-500 to-slate-600",
    iconBg: "from-slate-500 to-slate-600",
    href: "analytics",
  },
];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { getThemeStyles, isDark } = useTheme();
  const theme = getThemeStyles();

  const clientId = params.id as string;
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && clientId) {
      loadClient();
    }
  }, [clientId, authLoading]);

  const loadClient = async () => {
    try {
      setLoading(true);

      // Load client data from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .single();

      if (profileError) {
        console.error("Error loading client profile:", profileError);
        setLoading(false);
        return;
      }

      if (profileData) {
        setClient({
          id: profileData.id,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          email: profileData.email,
          avatar_url: profileData.avatar_url,
        });
      }
    } catch (error) {
      console.error("Error loading client:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!client) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-7xl mx-auto text-center py-12">
              <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>
                Client Not Found
              </h2>
              <Link href="/coach/clients">
                <Button className="rounded-xl">Back to Clients</Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div
              className={`rounded-3xl p-[1px] bg-gradient-to-r from-blue-500 to-indigo-600 shadow-2xl`}
            >
              <div
                className={`${theme.card} border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
              >
                <div
                  className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-between flex-shrink-0"
                  style={{
                    padding: "24px",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <Link href="/coach/clients">
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl bg-white/20 hover:bg-white/30 border-white/30 text-white"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </Link>
                    <div
                      className="bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold shadow-lg"
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "18px",
                        fontSize: "20px",
                      }}
                    >
                      {client.first_name?.[0] || "C"}
                    </div>
                    <div>
                      <h2
                        className="text-white"
                        style={{ fontSize: "28px", fontWeight: "700" }}
                      >
                        {client.first_name} {client.last_name}
                      </h2>
                      <p className="text-white/80" style={{ fontSize: "14px" }}>
                        {client.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div
                  className="flex-1 overflow-y-auto"
                  style={{ padding: "24px", paddingBottom: "32px" }}
                >
                  <div
                    className="space-y-4"
                    style={{ paddingTop: "24px", paddingBottom: "32px" }}
                  >
                    <h3
                      className={`${theme.text} mb-4`}
                      style={{ fontSize: "20px", fontWeight: "700" }}
                    >
                      Select Function to View
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {functionCards.map((card) => {
                        const Icon = card.icon;
                        return (
                          <Link
                            key={card.id}
                            href={`/coach/clients/${clientId}/${card.href}`}
                            className="cursor-pointer"
                          >
                            <div
                              className={`p-[1px] bg-gradient-to-r ${card.gradient} hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
                              style={{
                                borderRadius: "24px",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                              }}
                            >
                              <Card
                                className={`${theme.card} border-0 h-full`}
                                style={{ borderRadius: "24px" }}
                              >
                                <CardContent style={{ padding: "20px" }}>
                                  <div className="flex items-center gap-4 mb-3">
                                    <div
                                      className={`bg-gradient-to-br ${card.iconBg} flex items-center justify-center shadow-md`}
                                      style={{
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "16px",
                                      }}
                                    >
                                      <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4
                                        className={`${theme.text} mb-1`}
                                        style={{
                                          fontSize: "16px",
                                          fontWeight: "600",
                                        }}
                                      >
                                        {card.title}
                                      </h4>
                                      <p
                                        className={`${theme.textSecondary}`}
                                        style={{ fontSize: "14px" }}
                                      >
                                        {card.description}
                                      </p>
                                    </div>
                                    <ChevronRight
                                      className={`${theme.textSecondary} flex-shrink-0`}
                                      style={{ width: "20px", height: "20px" }}
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
