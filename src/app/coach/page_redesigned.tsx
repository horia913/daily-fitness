"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Dumbbell,
  Apple,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Client {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  status?: string;
  last_active?: string;
}

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalWorkouts: number;
  totalMealPlans: number;
}

interface Session {
  id: string;
  client_name: string;
  time: string;
  type: string;
}

interface ComplianceClient {
  id: string;
  name: string;
  compliance: number;
  avatar_url?: string;
}

function CoachDashboardContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalWorkouts: 0,
    totalMealPlans: 0,
  });
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [topCompliant, setTopCompliant] = useState<ComplianceClient[]>([]);
  const [atRisk, setAtRisk] = useState<ComplianceClient[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      // Load clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("client_id, status")
        .eq("coach_id", user.id);

      const totalClients = clientsData?.length || 0;
      const activeClients =
        clientsData?.filter((c) => c.status === "active").length || 0;

      // Load recent client profiles
      if (clientsData && clientsData.length > 0) {
        const recentClientIds = clientsData.slice(0, 5).map((c) => c.client_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .in("id", recentClientIds);

        setRecentClients(profilesData || []);
      }

      // Load workout templates count
      const { data: workoutsData } = await supabase
        .from("workout_templates")
        .select("id")
        .eq("coach_id", user.id)
        .eq("is_active", true);

      // Load meal plans count
      const { data: mealPlansData } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("coach_id", user.id)
        .eq("is_active", true);

      setStats({
        totalClients,
        activeClients,
        totalWorkouts: workoutsData?.length || 0,
        totalMealPlans: mealPlansData?.length || 0,
      });

      // Mock data for sessions and compliance (replace with real data)
      setTodaySessions([]);
      setTopCompliant([]);
      setAtRisk([]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const activePercentage =
    stats.totalClients > 0
      ? Math.round((stats.activeClients / stats.totalClients) * 100)
      : 0;

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="relative min-h-screen">
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className="text-3xl font-bold mb-1"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Welcome back, Coach!
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Hero Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Clients */}
          <GlassCard
            elevation={2}
            className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{
                background: getSemanticColor("trust").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
              }}
            >
              <Users className="w-7 h-7 text-white" />
            </div>
            <AnimatedNumber
              value={stats.totalClients}
              size="heroLg"
              weight="bold"
              color={getSemanticColor("trust").primary}
            />
            <p
              className="text-sm font-medium mt-2"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              Total Clients
            </p>
          </GlassCard>

          {/* Active Clients */}
          <GlassCard
            elevation={2}
            className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{
                background: getSemanticColor("success").gradient,
                boxShadow: `0 4px 12px ${
                  getSemanticColor("success").primary
                }30`,
              }}
            >
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <AnimatedNumber
                value={stats.activeClients}
                size="heroLg"
                weight="bold"
                color={getSemanticColor("success").primary}
              />
              <span
                className="text-lg font-semibold"
                style={{ color: getSemanticColor("success").primary }}
              >
                {activePercentage}%
              </span>
            </div>
            <p
              className="text-sm font-medium mt-2"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              Active Clients
            </p>
          </GlassCard>

          {/* Total Workouts */}
          <GlassCard
            elevation={2}
            className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{
                background: getSemanticColor("trust").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
              }}
            >
              <Dumbbell className="w-7 h-7 text-white" />
            </div>
            <AnimatedNumber
              value={stats.totalWorkouts}
              size="heroLg"
              weight="bold"
              color={getSemanticColor("trust").primary}
            />
            <p
              className="text-sm font-medium mt-2"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              Workout Templates
            </p>
          </GlassCard>

          {/* Total Meal Plans */}
          <GlassCard
            elevation={2}
            className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{
                background: getSemanticColor("energy").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
              }}
            >
              <Apple className="w-7 h-7 text-white" />
            </div>
            <AnimatedNumber
              value={stats.totalMealPlans}
              size="heroLg"
              weight="bold"
              color={getSemanticColor("energy").primary}
            />
            <p
              className="text-sm font-medium mt-2"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              Meal Plans
            </p>
          </GlassCard>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/coach/workouts/templates/create">
              <GlassCard
                elevation={2}
                className="p-6 h-full transition-all hover:scale-105 hover:shadow-xl cursor-pointer"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto"
                  style={{
                    background: getSemanticColor("energy").gradient,
                  }}
                >
                  <Dumbbell className="w-7 h-7 text-white" />
                </div>
                <h3
                  className="text-center font-semibold text-lg"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Create Workout
                </h3>
                <p
                  className="text-center text-sm mt-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  New template
                </p>
              </GlassCard>
            </Link>

            <Link href="/coach/clients/add">
              <GlassCard
                elevation={2}
                className="p-6 h-full transition-all hover:scale-105 hover:shadow-xl cursor-pointer"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto"
                  style={{
                    background: getSemanticColor("trust").gradient,
                  }}
                >
                  <UserPlus className="w-7 h-7 text-white" />
                </div>
                <h3
                  className="text-center font-semibold text-lg"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Add Client
                </h3>
                <p
                  className="text-center text-sm mt-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Grow your roster
                </p>
              </GlassCard>
            </Link>

            <Link href="/coach/meal-plans/create">
              <GlassCard
                elevation={2}
                className="p-6 h-full transition-all hover:scale-105 hover:shadow-xl cursor-pointer"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto"
                  style={{
                    background: getSemanticColor("success").gradient,
                  }}
                >
                  <Apple className="w-7 h-7 text-white" />
                </div>
                <h3
                  className="text-center font-semibold text-lg"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Create Meal Plan
                </h3>
                <p
                  className="text-center text-sm mt-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Nutrition guidance
                </p>
              </GlassCard>
            </Link>

            <Link href="/coach/reports">
              <GlassCard
                elevation={2}
                className="p-6 h-full transition-all hover:scale-105 hover:shadow-xl cursor-pointer"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0,0,0,0.1)",
                  }}
                >
                  <FileText
                    className="w-7 h-7"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  />
                </div>
                <h3
                  className="text-center font-semibold text-lg"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  View Reports
                </h3>
                <p
                  className="text-center text-sm mt-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Analytics & insights
                </p>
              </GlassCard>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Clients */}
          <GlassCard elevation={2} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-2xl font-bold"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Recent Clients
              </h2>
              <Link href="/coach/clients">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {recentClients.length > 0 ? (
              <div className="space-y-4">
                {recentClients.map((client) => (
                  <Link key={client.id} href={`/coach/clients/${client.id}`}>
                    <div
                      className="flex items-center gap-4 p-3 rounded-lg transition-all hover:scale-102 hover:shadow-md cursor-pointer"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.02)",
                      }}
                    >
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                        style={{
                          background: getSemanticColor("trust").gradient,
                          color: "#fff",
                        }}
                      >
                        {client.first_name?.[0] || "C"}
                      </div>
                      <div className="flex-1">
                        <h3
                          className="font-semibold"
                          style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                        >
                          {client.first_name} {client.last_name}
                        </h3>
                        <p
                          className="text-sm flex items-center gap-2"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.6)",
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: getSemanticColor("success").primary,
                            }}
                          />
                          Active
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="w-5 h-5" />
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users
                  className="w-16 h-16 mx-auto mb-4"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                  }}
                />
                <p
                  className="text-lg font-semibold mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                  }}
                >
                  No clients yet
                </p>
                <p
                  className="text-sm mb-4"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  }}
                >
                  Start building your coaching roster
                </p>
                <Link href="/coach/clients/add">
                  <Button
                    variant="default"
                    style={{
                      background: getSemanticColor("trust").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("trust").primary
                      }30`,
                    }}
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Add Your First Client
                  </Button>
                </Link>
              </div>
            )}
          </GlassCard>

          {/* Today's Schedule */}
          <GlassCard elevation={2} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-2xl font-bold"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Today&apos;s Schedule
              </h2>
              <Link href="/coach/sessions">
                <Button variant="ghost" size="sm">
                  <Calendar className="w-5 h-5 mr-2" />
                  Calendar
                </Button>
              </Link>
            </div>

            {todaySessions.length > 0 ? (
              <div className="space-y-3">
                {todaySessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.02)",
                    }}
                  >
                    <Clock
                      className="w-5 h-5"
                      style={{ color: getSemanticColor("trust").primary }}
                    />
                    <div className="flex-1">
                      <p
                        className="font-semibold"
                        style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      >
                        {session.client_name}
                      </p>
                      <p
                        className="text-sm"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(0,0,0,0.6)",
                        }}
                      >
                        {session.type}
                      </p>
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.8)"
                          : "rgba(0,0,0,0.8)",
                      }}
                    >
                      {session.time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar
                  className="w-16 h-16 mx-auto mb-4"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                  }}
                />
                <p
                  className="text-lg font-semibold mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                  }}
                >
                  No sessions scheduled today
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  }}
                >
                  Enjoy your day off or schedule some sessions!
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
      </div>
    </AnimatedBackground>
  );
}

export default function CoachDashboard() {
  return (
    <ProtectedRoute requiredRole="coach">
      <CoachDashboardContent />
    </ProtectedRoute>
  );
}
