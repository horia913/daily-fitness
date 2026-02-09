"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { AnimatedEntry } from "@/components/ui/AnimatedEntry";
import { MetricGauge } from "@/components/ui/MetricGauge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Dumbbell,
  Calendar,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  MessageCircle,
  Trophy,
  Layers,
  Send,
  ChevronRight,
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

interface Client {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  status?: string;
}

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalWorkouts: number;
  totalMealPlans: number;
}

interface Session {
  id: string;
  clientId?: string;
  clientName: string;
  time: string;
  type: string;
  status?: string;
}

function CoachDashboardContent() {
  const { user, profile } = useAuth();
  const { performanceSettings } = useTheme();

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

      const response = await fetch('/api/coach/dashboard', {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'RPC_NOT_FOUND') {
          console.warn('[CoachDashboard] RPC not found, migration needed');
          setError('Dashboard optimization pending. Please run database migrations.');
          return;
        }
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const data: DashboardData = await response.json();
      setStats(data.stats);

      const mappedClients: Client[] = data.recentClients.map((c) => ({
        id: c.id,
        first_name: c.firstName || undefined,
        last_name: c.lastName || undefined,
        avatar_url: c.avatarUrl || undefined,
        status: c.status,
      }));
      setRecentClients(mappedClients);

      const mappedSessions: Session[] = data.todaySessions.map((s) => {
        const scheduledDate = new Date(s.scheduledAt);
        const timeStr = scheduledDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        return {
          id: s.id,
          clientId: s.clientId,
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

  const coachName = profile?.first_name ? `Coach ${profile.first_name}` : "Coach";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-5xl fc-page">

        {/* ===== HEADER: Name + Date ===== */}
        <AnimatedEntry delay={0} animation="fade-up">
          <header className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight fc-text-primary leading-tight">
                {coachName}
              </h1>
              <p className="text-[11px] fc-text-dim font-mono">{dateStr}</p>
            </div>
            <div className="w-10 h-10 rounded-full fc-surface-elevated border border-[color:var(--fc-glass-border)] flex items-center justify-center font-bold fc-text-primary text-sm">
              {profile?.first_name?.[0] || user?.email?.[0] || "C"}
            </div>
          </header>
        </AnimatedEntry>

        {/* ===== ERROR STATE ===== */}
        {error && (
          <div className="fc-surface rounded-2xl p-4 mb-6 border-l-4 border-l-[color:var(--fc-status-error)]">
            <p className="text-sm fc-text-error">{error}</p>
          </div>
        )}

        {/* ===== LOADING STATE ===== */}
        {loading && (
          <div className="space-y-4 mb-8">
            <div className="flex justify-around py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="fc-skeleton rounded-full" style={{ width: 90, height: 90 }} />
                  <div className="fc-skeleton" style={{ width: 60, height: 10 }} />
                </div>
              ))}
            </div>
            <div className="fc-skeleton" style={{ height: 160, borderRadius: 'var(--fc-radius-xl)' }} />
            <div className="fc-skeleton" style={{ height: 200, borderRadius: 'var(--fc-radius-xl)' }} />
          </div>
        )}

        {!loading && (
          <>
            {/* ===== METRIC GAUGES ===== */}
            <AnimatedEntry delay={100} animation="fade-up">
              <section className="flex justify-around items-start py-4 mb-6">
                <MetricGauge
                  value={activePercentage}
                  displayValue={`${stats.activeClients}`}
                  label="Active"
                  size={90}
                  strokeWidth={5}
                  color="var(--fc-status-success)"
                  suffix={`/${stats.totalClients}`}
                />
                <MetricGauge
                  value={todaySessions.length}
                  max={Math.max(todaySessions.length, 8)}
                  displayValue={`${todaySessions.length}`}
                  label="Today"
                  size={90}
                  strokeWidth={5}
                  color="var(--fc-domain-workouts)"
                />
                <MetricGauge
                  value={stats.totalWorkouts}
                  max={Math.max(stats.totalWorkouts, 50)}
                  displayValue={`${stats.totalWorkouts}`}
                  label="Workouts"
                  size={90}
                  strokeWidth={5}
                  gradient={["var(--fc-accent-cyan)", "var(--fc-accent-purple)"]}
                />
              </section>
            </AnimatedEntry>

            {/* ===== QUICK ACTIONS ===== */}
            <AnimatedEntry delay={150} animation="fade-up">
              <section className="mb-6">
                <div className="fc-action-chips">
                  <Link href="/coach/workouts/templates/create" className="fc-action-chip">
                    <div className="fc-action-chip-icon fc-icon-workouts">
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    Create Workout
                  </Link>
                  <Link href="/coach/programs" className="fc-action-chip">
                    <div className="fc-action-chip-icon fc-icon-challenges">
                      <Layers className="w-4 h-4" />
                    </div>
                    Programs
                  </Link>
                  <Link href="/coach/scheduling" className="fc-action-chip">
                    <div className="fc-action-chip-icon fc-icon-neutral">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    Schedule
                  </Link>
                  <Link href="/coach/clients/add" className="fc-action-chip">
                    <div className="fc-action-chip-icon fc-icon-meals">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    Add Client
                  </Link>
                </div>
              </section>
            </AnimatedEntry>

            {/* ===== TODAY'S SESSIONS ===== */}
            <AnimatedEntry delay={200} animation="fade-up">
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest fc-text-dim">
                    Today&apos;s Schedule
                  </h2>
                  <Link href="/coach/sessions" className="text-xs font-semibold fc-text-dim flex items-center gap-1 hover:fc-text-primary transition-colors">
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {todaySessions.length > 0 ? (
                  <div className="space-y-2">
                    {todaySessions.map((session) => (
                      <Link
                        key={session.id}
                        href={session.clientId ? `/coach/clients/${session.clientId}` : "/coach/clients"}
                      >
                        <div className="fc-surface rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98] cursor-pointer">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm fc-surface-elevated border border-[color:var(--fc-glass-border)] fc-text-primary flex-shrink-0">
                            {session.clientName?.[0] || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold fc-text-primary leading-tight">
                              {session.clientName}
                            </h4>
                            <p className="text-[11px] fc-text-dim">{session.type}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-sm font-bold font-mono fc-text-workouts">
                              {session.time}
                            </span>
                            <p className="text-[10px] uppercase tracking-wider fc-text-dim font-semibold">
                              {session.status === "completed" ? "Done" : "Upcoming"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="fc-surface rounded-2xl p-8 text-center">
                    <Calendar className="w-10 h-10 mx-auto mb-3 fc-text-dim opacity-50" />
                    <p className="text-sm font-semibold fc-text-primary">No sessions today</p>
                    <p className="text-xs fc-text-dim mt-1">View calendar to schedule</p>
                  </div>
                )}
              </section>
            </AnimatedEntry>

            {/* ===== STATUS STRIP ===== */}
            <AnimatedEntry delay={250} animation="fade-up">
              <section className="mb-6">
                <div className="fc-stats-strip">
                  <div className="fc-stats-strip-item">
                    <span className="fc-stats-strip-value fc-text-success">{stats.activeClients}</span>
                    <span className="fc-stats-strip-label">Active</span>
                  </div>
                  <div className="fc-stats-strip-item">
                    <span className="fc-stats-strip-value fc-text-warning">0</span>
                    <span className="fc-stats-strip-label">At Risk</span>
                  </div>
                  <div className="fc-stats-strip-item">
                    <span className="fc-stats-strip-value">{stats.totalWorkouts}</span>
                    <span className="fc-stats-strip-label">Templates</span>
                  </div>
                  <div className="fc-stats-strip-item">
                    <span className="fc-stats-strip-value">{stats.totalMealPlans}</span>
                    <span className="fc-stats-strip-label">Meals</span>
                  </div>
                </div>
              </section>
            </AnimatedEntry>

            {/* ===== RECENT CLIENTS ===== */}
            <AnimatedEntry delay={300} animation="fade-up">
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest fc-text-dim">
                    Recent Clients
                  </h2>
                  <Link href="/coach/clients" className="text-xs font-semibold fc-text-dim flex items-center gap-1 hover:fc-text-primary transition-colors">
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {recentClients.length > 0 ? (
                  <div className="space-y-2">
                    {recentClients.map((client) => (
                      <Link key={client.id} href={`/coach/clients/${client.id}`}>
                        <div className="fc-surface rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98] cursor-pointer">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm fc-text-primary flex-shrink-0"
                            style={{
                              background: "color-mix(in srgb, var(--fc-accent-cyan) 15%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--fc-accent-cyan) 25%, transparent)",
                            }}
                          >
                            {client.first_name?.[0] || "C"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold fc-text-primary leading-tight">
                              {client.first_name} {client.last_name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  background: client.status === 'active'
                                    ? 'var(--fc-status-success)'
                                    : 'var(--fc-text-dim)',
                                }}
                              />
                              <span className="text-[11px] fc-text-dim">
                                {client.status === 'active' ? 'Active' : client.status || 'Pending'}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 fc-text-subtle flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="fc-surface rounded-2xl p-8 text-center">
                    <Users className="w-10 h-10 mx-auto mb-3 fc-text-dim opacity-50" />
                    <p className="text-sm font-semibold fc-text-primary mb-1">No clients yet</p>
                    <p className="text-xs fc-text-dim mb-4">Start building your coaching roster</p>
                    <Link href="/coach/clients/add">
                      <button className="fc-btn fc-btn-primary fc-press h-10 px-6 text-sm">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add First Client
                      </button>
                    </Link>
                  </div>
                )}
              </section>
            </AnimatedEntry>
          </>
        )}
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
