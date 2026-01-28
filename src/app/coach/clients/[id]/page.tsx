"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MessageCircle,
  Dumbbell,
  Apple,
  Calendar,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  Activity,
  Clock,
  Award,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calculateStreak, calculateWeeklyProgress } from "@/lib/clientDashboardService";
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
  stats: {
    workoutsThisWeek: number;
    workoutGoal: number;
    compliance: number;
    streak: number;
    totalWorkouts: number;
    lastActive: string;
  };
  recentActivity: Array<{
    type: "workout" | "meal" | "check-in";
    title: string;
    date: string;
    status: "completed" | "missed" | "scheduled";
  }>;
}

type TabView = "overview" | "workouts" | "nutrition" | "progress";

function ClientDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();
  const clientId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabView>("overview");
  const [loading, setLoading] = useState(true);
  const [showAssignWorkoutModal, setShowAssignWorkoutModal] = useState(false);
  
  // Mock client data - Replace with actual API call
  const [client, setClient] = useState<ClientData>({
    id: clientId,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1 (555) 123-4567",
    location: "New York, NY",
    joinedDate: "Jan 15, 2024",
    status: "active",
    stats: {
      workoutsThisWeek: 4,
      workoutGoal: 4,
      compliance: 95,
      streak: 12,
      totalWorkouts: 87,
      lastActive: "2 hours ago",
    },
    recentActivity: [
      {
        type: "workout",
        title: "Upper Body Strength",
        date: "Today, 9:30 AM",
        status: "completed",
      },
      {
        type: "meal",
        title: "Breakfast logged",
        date: "Today, 8:15 AM",
        status: "completed",
      },
      {
        type: "workout",
        title: "HIIT Cardio",
        date: "Yesterday, 6:00 PM",
        status: "completed",
      },
      {
        type: "check-in",
        title: "Weekly Check-in",
        date: "2 days ago",
        status: "completed",
      },
    ],
  });

  useEffect(() => {
    loadClientData();
  }, [clientId, user]);

  const loadClientData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get client profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .single();

      if (profileError || !profile) {
        console.error("Error loading client profile:", profileError);
        setLoading(false);
        return;
      }

      // Calculate real stats
      const [streak, weeklyProgress] = await Promise.all([
        calculateStreak(clientId),
        calculateWeeklyProgress(clientId),
      ]);

      // Get total completed workouts
      const { data: completedWorkouts } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("client_id", clientId)
        .not("completed_at", "is", null);

      const totalWorkouts = completedWorkouts?.length || 0;

      // Calculate compliance (completed / assigned this week)
      const compliance =
        weeklyProgress.goal > 0
          ? Math.round((weeklyProgress.current / weeklyProgress.goal) * 100)
          : 0;

      // Get last activity
      const { data: lastLog } = await supabase
        .from("workout_logs")
        .select("completed_at")
        .eq("client_id", clientId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastActive = lastLog?.completed_at
        ? getRelativeTime(new Date(lastLog.completed_at))
        : "Never";

      // Get recent activity (workouts + meal photos)
      const { data: recentWorkouts } = await supabase
        .from("workout_logs")
        .select(`
          completed_at,
          workout_assignment_id,
          workout_assignments!inner(
            workout_template_id,
            workout_templates(
              name
            )
          )
        `)
        .eq("client_id", clientId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5);

      const { data: recentMeals } = await supabase
        .from("meal_photo_logs")
        .select("created_at, meal:meals(name, meal_type)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(5);

      const recentActivity: ClientData["recentActivity"] = [];

      // Add workouts
      (recentWorkouts || []).forEach((log: any) => {
        const assignment = Array.isArray(log.workout_assignments) 
          ? log.workout_assignments[0] 
          : log.workout_assignments;
        const template = Array.isArray(assignment?.workout_templates) 
          ? assignment.workout_templates[0] 
          : assignment?.workout_templates;
        recentActivity.push({
          type: "workout",
          title: template?.name || "Workout",
          date: getRelativeTime(new Date(log.completed_at!)),
          status: "completed",
        });
      });

      // Add meals
      (recentMeals || []).forEach((log: any) => {
        const meal = Array.isArray(log.meal) ? log.meal[0] : log.meal;
        recentActivity.push({
          type: "meal",
          title: `${meal?.meal_type || "Meal"} logged`,
          date: getRelativeTime(new Date(log.created_at)),
          status: "completed",
        });
      });

      // Sort by date and take top 10
      recentActivity.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Determine status
      let status: ClientData["status"] = "active";
      if (compliance < 50) {
        status = "at-risk";
      } else if (compliance === 0 && weeklyProgress.goal > 0) {
        status = "inactive";
      }

      setClient({
        id: clientId,
        name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Client",
        email: profile.email || "",
        phone: profile.phone || undefined,
        location: undefined,
        joinedDate: new Date(profile.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        status,
        stats: {
          workoutsThisWeek: weeklyProgress.current,
          workoutGoal: weeklyProgress.goal,
          compliance,
          streak,
          totalWorkouts,
          lastActive,
        },
        recentActivity: recentActivity.slice(0, 10),
      });

      setLoading(false);
    } catch (error) {
      console.error("Error loading client data:", error);
      setLoading(false);
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusColor = (status: ClientData["status"]) => {
    switch (status) {
      case "active":
        return getSemanticColor("success").primary;
      case "at-risk":
        return getSemanticColor("warning").primary;
      case "inactive":
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
    }
  };

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 80) return getSemanticColor("success").primary;
    if (compliance >= 50) return getSemanticColor("warning").primary;
    return getSemanticColor("critical").primary;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "workout":
        return Dumbbell;
      case "meal":
        return Apple;
      case "check-in":
        return Activity;
      default:
        return Activity;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case "completed":
        return getSemanticColor("success").primary;
      case "missed":
        return getSemanticColor("critical").primary;
      case "scheduled":
        return getSemanticColor("trust").primary;
      default:
        return getSemanticColor("neutral").primary;
    }
  };

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
        <Link href="/coach/clients" className="inline-flex">
          <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </Link>

        <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            {/* Left: Avatar + Info */}
            <div className="flex items-center gap-4">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0"
                style={{
                  background: getSemanticColor("trust").gradient,
                  color: "#fff",
                }}
              >
                {client.name.charAt(0)}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-[color:var(--fc-text-primary)]">
                    {client.name}
                  </h1>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-semibold"
                    style={{
                      background: `${getStatusColor(client.status)}20`,
                      color: getStatusColor(client.status),
                    }}
                  >
                    {getStatusLabel(client.status)}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      {client.email}
                    </p>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        {client.phone}
                      </p>
                    </div>
                  )}
                  {client.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        {client.location}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[color:var(--fc-text-subtle)]" />
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Client since {client.joinedDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                className="fc-btn fc-btn-secondary"
                style={{
                  background: getSemanticColor("trust").gradient,
                  boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
                }}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Message
              </Button>
              <Button
                variant="default"
                onClick={() => setShowAssignWorkoutModal(true)}
                className="fc-btn fc-btn-primary"
                style={{
                  background: getSemanticColor("energy").gradient,
                  boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
                }}
              >
                <Dumbbell className="w-5 h-5 mr-2" />
                Assign Workout
              </Button>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Workouts This Week */}
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: getSemanticColor("trust").gradient,
                  boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
                }}
              >
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-[color:var(--fc-text-subtle)]">
                  This Week
                </p>
                <div className="flex items-baseline gap-1">
                  <AnimatedNumber
                    value={client.stats.workoutsThisWeek}
                    className="text-2xl font-bold"
                    color={isDark ? "#fff" : "#1A1A1A"}
                  />
                  <span
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    / {client.stats.workoutGoal}
                  </span>
                </div>
              </div>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${(client.stats.workoutsThisWeek / client.stats.workoutGoal) * 100}%`,
                  background: getSemanticColor("trust").gradient,
                }}
              />
            </div>
          </GlassCard>

          {/* Compliance */}
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("success").primary
                  }30`,
                }}
              >
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-[color:var(--fc-text-subtle)]">
                  Compliance
                </p>
                <AnimatedNumber
                  value={client.stats.compliance}
                  suffix="%"
                  className="text-2xl font-bold"
                  color={getComplianceColor(client.stats.compliance)}
                />
              </div>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${client.stats.compliance}%`,
                  background: getComplianceColor(client.stats.compliance),
                }}
              />
            </div>
          </GlassCard>

          {/* Streak */}
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: getSemanticColor("energy").gradient,
                  boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
                }}
              >
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-[color:var(--fc-text-subtle)]">
                  Day Streak
                </p>
                <AnimatedNumber
                  value={client.stats.streak}
                  className="text-2xl font-bold"
                  color={getSemanticColor("energy").primary}
                />
              </div>
            </div>
            <p className="text-xs text-[color:var(--fc-text-subtle)]">
              {client.stats.streak >= 7 ? "🔥 On fire!" : "Keep it going!"}
            </p>
          </GlassCard>

          {/* Total Workouts */}
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(0,0,0,0.1)",
                }}
              >
                <Award className="w-6 h-6" style={{ color: getSemanticColor("neutral").primary }} />
              </div>
              <div>
                <p className="text-xs text-[color:var(--fc-text-subtle)]">
                  Total Workouts
                </p>
                <AnimatedNumber
                  value={client.stats.totalWorkouts}
                  className="text-2xl font-bold"
                  color={isDark ? "#fff" : "#1A1A1A"}
                />
              </div>
            </div>
            <p className="text-xs text-[color:var(--fc-text-subtle)]">
              Last active: {client.stats.lastActive}
            </p>
          </GlassCard>
        </div>

        {/* Tabs */}
        <GlassCard elevation={2} className="fc-glass fc-card p-2">
          <div className="flex items-center gap-2">
              {[
                { id: "overview", label: "Overview", icon: Activity },
                { id: "workouts", label: "Workouts", icon: Dumbbell },
                { id: "nutrition", label: "Nutrition", icon: Apple },
                { id: "progress", label: "Progress", icon: TrendingUp },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabView)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all"
                    style={{
                      background: isActive
                        ? getSemanticColor("trust").gradient
                        : "transparent",
                      color: isActive ? "#fff" : isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                      boxShadow: isActive
                        ? `0 4px 12px ${getSemanticColor("trust").primary}30`
                        : "none",
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">{tab.label}</span>
                  </button>
                );
              })}
          </div>
        </GlassCard>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <GlassCard elevation={2} className="p-6">
              <h3
                className="text-xl font-bold mb-6"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Recent Activity
              </h3>

              <div className="space-y-4">
                {client.recentActivity.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-lg"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.02)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${getActivityColor(activity.status)}20`,
                        }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: getActivityColor(activity.status) }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold truncate"
                          style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                        >
                          {activity.title}
                        </p>
                        <p
                          className="text-sm"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.6)",
                          }}
                        >
                          {activity.date}
                        </p>
                      </div>

                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                        style={{
                          background: `${getActivityColor(activity.status)}20`,
                          color: getActivityColor(activity.status),
                        }}
                      >
                        {activity.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Quick Links */}
            <GlassCard elevation={2} className="p-6">
              <h3
                className="text-xl font-bold mb-6"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Quick Actions
              </h3>

              <div className="space-y-3">
                {[
                  { label: "View Full Profile", icon: Activity, href: "profile" },
                  { label: "Assign Meal Plan", icon: Apple, href: "meals" },
                  { label: "Schedule Check-in", icon: Calendar, href: "progress" },
                  { label: "View Goals", icon: Target, href: "goals" },
                ].map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Link key={index} href={`/coach/clients/${clientId}/${action.href}`}>
                      <div
                        className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all hover:scale-102"
                        style={{
                          background: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.02)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className="w-5 h-5"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.7)"
                                : "rgba(0,0,0,0.7)",
                            }}
                          />
                          <span
                            className="font-semibold"
                            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                          >
                            {action.label}
                          </span>
                        </div>
                        <Clock
                          className="w-5 h-5"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.4)"
                              : "rgba(0,0,0,0.4)",
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "workouts" && (
          <GlassCard elevation={2} className="p-12 text-center">
            <Dumbbell
              className="w-24 h-24 mx-auto mb-6"
              style={{
                color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              }}
            />
            <h3
              className="text-2xl font-bold mb-2"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              Workouts View
            </h3>
            <p
              className="text-sm mb-6"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              View and manage assigned workouts for {client.name}
            </p>
            <Button
              variant="default"
              style={{
                background: getSemanticColor("trust").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
              }}
            >
              Assign New Workout
            </Button>
          </GlassCard>
        )}

        {activeTab === "nutrition" && (
          <GlassCard elevation={2} className="p-12 text-center">
            <Apple
              className="w-24 h-24 mx-auto mb-6"
              style={{
                color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              }}
            />
            <h3
              className="text-2xl font-bold mb-2"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              Nutrition View
            </h3>
            <p
              className="text-sm mb-6"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              View and manage meal plans for {client.name}
            </p>
            <Button
              variant="default"
              style={{
                background: getSemanticColor("success").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
              }}
            >
              Assign Meal Plan
            </Button>
          </GlassCard>
        )}

        {activeTab === "progress" && (
          <GlassCard elevation={2} className="p-12 text-center">
            <TrendingUp
              className="w-24 h-24 mx-auto mb-6"
              style={{
                color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              }}
            />
            <h3
              className="text-2xl font-bold mb-2"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              Progress View
            </h3>
            <p
              className="text-sm mb-6"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              Track check-ins, measurements, and photos for {client.name}
            </p>
            <Button
              variant="default"
              style={{
                background: getSemanticColor("energy").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
              }}
            >
              Schedule Check-in
            </Button>
          </GlassCard>
        )}
      </div>

      {/* Workout Assignment Modal */}
      {showAssignWorkoutModal && (
        <WorkoutAssignmentModal
          isOpen={showAssignWorkoutModal}
          onClose={() => setShowAssignWorkoutModal(false)}
          onSuccess={() => {
            setShowAssignWorkoutModal(false);
            // Reload client data if needed
            if (clientId) {
              // You may want to reload client data here
            }
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

