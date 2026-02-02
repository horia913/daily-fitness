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
  Target,
} from "lucide-react";

// API response types
interface DashboardData {
  stats: {
    totalClients: number;
    activeClients: number;
    totalWorkouts: number;
    totalMealPlans: number;
  };
  todaySessions: Array<{
    id: string;
    scheduledAt: string;
    durationMinutes: number;
    status: string;
    clientId: string;
    clientName: string;
    clientAvatar: string | null;
  }>;
  recentClients: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    status: string;
  }>;
}

// UI types (mapped from API response)
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
  clientName: string;
  time: string;
  type: string;
  status?: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Single API call to get all dashboard data
      const response = await fetch('/api/coach/dashboard', {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle RPC not found - fall back gracefully
        if (errorData.code === 'RPC_NOT_FOUND') {
          console.warn('[CoachDashboard] RPC not found, migration needed');
          setError('Dashboard optimization pending. Please run database migrations.');
          return;
        }
        
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const data: DashboardData = await response.json();

      // Map stats
      setStats(data.stats);

      // Map recent clients to UI format
      const mappedClients: Client[] = data.recentClients.map((c) => ({
        id: c.id,
        first_name: c.firstName || undefined,
        last_name: c.lastName || undefined,
        avatar_url: c.avatarUrl || undefined,
        status: c.status,
      }));
      setRecentClients(mappedClients);

      // Map sessions to UI format
      const mappedSessions: Session[] = data.todaySessions.map((s) => {
        // Parse scheduled time for display
        const scheduledDate = new Date(s.scheduledAt);
        const timeStr = scheduledDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        return {
          id: s.id,
          clientName: s.clientName || 'Unknown Client',
          time: timeStr,
          type: 'Training Session',
          status: s.status || '',
        };
      });
      setTodaySessions(mappedSessions);

    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
      setError(err.message || 'An error occurred');
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

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
        {/* Header */}
        <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                Coach Hub
              </span>
              <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                Welcome back, Coach!
              </h1>
              <p className="text-sm text-[color:var(--fc-text-dim)]">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {/* Pickup Mode Quick Access */}
            <Link href="/coach/gym-console">
              <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg">
                <Target className="w-4 h-4 mr-2" />
                Pickup Mode
              </Button>
            </Link>
          </div>
        </GlassCard>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <p>{error}</p>
          </div>
        )}

        {/* Hero Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Clients */}
          <GlassCard
            elevation={2}
            className="fc-glass fc-card p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
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
            <p className="text-sm font-medium mt-2 text-[color:var(--fc-text-dim)]">
              Total Clients
            </p>
          </GlassCard>

          {/* Active Clients */}
          <GlassCard
            elevation={2}
            className="fc-glass fc-card p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
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
            <p className="text-sm font-medium mt-2 text-[color:var(--fc-text-dim)]">
              Active Clients
            </p>
          </GlassCard>

          {/* Total Workouts */}
          <GlassCard
            elevation={2}
            className="fc-glass fc-card p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
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
            <p className="text-sm font-medium mt-2 text-[color:var(--fc-text-dim)]">
              Workout Templates
            </p>
          </GlassCard>

          {/* Total Meal Plans */}
          <GlassCard
            elevation={2}
            className="fc-glass fc-card p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer"
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
            <p className="text-sm font-medium mt-2 text-[color:var(--fc-text-dim)]">
              Meal Plans
            </p>
          </GlassCard>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-[color:var(--fc-text-primary)]">
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

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full"></div>
              </div>
            ) : recentClients.length > 0 ? (
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
                        <div
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
                              background: client.status === 'active' 
                                ? getSemanticColor("success").primary 
                                : 'rgba(128,128,128,0.5)',
                            }}
                          />
                          {client.status === 'active' ? 'Active' : client.status || 'Pending'}
                        </div>
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

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full"></div>
              </div>
            ) : todaySessions.length > 0 ? (
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
                        {session.clientName}
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
