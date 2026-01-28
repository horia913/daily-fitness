"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Grid3x3,
  List,
  UserPlus,
  MessageCircle,
  Eye,
  Dumbbell,
  Users,
  TrendingUp,
  TrendingDown,
  Circle,
  Mail,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DatabaseService } from "@/lib/database";

interface Client {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "active" | "inactive" | "pending" | "at-risk"; // at-risk is derived from compliance (TODO)
  workoutsThisWeek: number;
  workoutGoal: number;
  compliance: number; // 0-100
  lastActive: string;
  totalWorkouts: number;
  assignedWorkouts: number;
  completedWorkouts: number;
}

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "active" | "inactive" | "pending" | "at-risk"; // at-risk is TODO (derived from compliance)

function ClientManagementContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [clients, setClients] = useState<Client[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, [user]);

  const loadClients = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Fetch clients from database
      const dbClients = await DatabaseService.getClients(user.id);
      
      // Map database data to page interface
      const mappedClients: Client[] = dbClients.map((dbClient) => {
        const profile = dbClient.profiles;
        const name = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Client'
          : 'Client';
        
        return {
          id: dbClient.client_id,
          name: name,
          email: profile?.email || '',
          avatar: profile?.avatar_url,
          // Return raw database status only - no mapping
          status: dbClient.status as "active" | "inactive" | "pending",
          // TODO: Calculate from workout_assignments and workout_logs tables
          workoutsThisWeek: 0,
          workoutGoal: 0,
          // TODO: Calculate compliance from completedWorkouts / assignedWorkouts
          // TODO: Derive 'at-risk' status from low compliance (< 50% or similar threshold)
          compliance: 0,
          lastActive: '',
          totalWorkouts: 0,
          assignedWorkouts: 0,
          completedWorkouts: 0,
        };
      });
      
      setClients(mappedClients);
      setLoading(false);
    } catch (error) {
      console.error("Error loading clients:", error);
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    // TODO: at-risk filter requires compliance calculation - return empty until implemented
    if (statusFilter === "at-risk") {
      return false; // TODO: Filter by compliance < threshold once compliance is calculated
    }
    const matchesStatus =
      statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Client["status"]) => {
    switch (status) {
      case "active":
        return getSemanticColor("success").primary;
      case "inactive":
        return getSemanticColor("neutral").primary;
      case "pending":
        return getSemanticColor("neutral").primary;
      case "at-risk":
        return getSemanticColor("warning").primary; // TODO: Derived from compliance
      default:
        return getSemanticColor("neutral").primary;
    }
  };

  const getStatusLabel = (status: Client["status"]) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "pending":
        return "Pending";
      case "at-risk":
        return "At Risk"; // TODO: Derived from compliance, not database status
      default:
        return status;
    }
  };

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 80) return getSemanticColor("success").primary;
    if (compliance >= 50) return getSemanticColor("warning").primary;
    return getSemanticColor("critical").primary;
  };

  const activeCount = clients.filter((c) => c.status === "active").length;
  const inactiveCount = clients.filter((c) => c.status === "inactive").length;
  const pendingCount = clients.filter((c) => c.status === "pending").length;
  // TODO: at-risk is derived from compliance (< 50% or similar), not database status
  const atRiskCount = 0; // TODO: Calculate from compliance once implemented

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
        <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                Client Directory
              </span>
              <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                Client Management
              </h1>
              <p className="text-sm text-[color:var(--fc-text-dim)]">
                Manage your roster, compliance, and engagement signals.
              </p>
            </div>

            <Link href="/coach/clients/add">
              <Button className="fc-btn fc-btn-primary">
                <UserPlus className="w-5 h-5 mr-2" />
                Add Client
              </Button>
            </Link>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-5">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("success").primary
                  }30`,
                }}
              >
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <AnimatedNumber
                  value={activeCount}
                  className="text-3xl font-bold"
                  color={getSemanticColor("success").primary}
                />
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Active Clients
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard elevation={2} className="fc-glass fc-card p-5">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: getSemanticColor("warning").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("warning").primary
                  }30`,
                }}
              >
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div>
                <AnimatedNumber
                  value={atRiskCount}
                  className="text-3xl font-bold"
                  color={getSemanticColor("warning").primary}
                />
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  At Risk
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard elevation={2} className="fc-glass fc-card p-5">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(0,0,0,0.1)",
                }}
              >
                <Circle
                  className="w-6 h-6"
                  style={{ color: getSemanticColor("neutral").primary }}
                />
              </div>
              <div>
                <AnimatedNumber
                  value={inactiveCount}
                  className="text-3xl font-bold"
                  color={getSemanticColor("neutral").primary}
                />
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Inactive
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard elevation={2} className="fc-glass fc-card p-4">
          <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  />
                  <Input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  style={
                    statusFilter === "all"
                      ? {
                          background: getSemanticColor("trust").gradient,
                          boxShadow: `0 4px 12px ${
                            getSemanticColor("trust").primary
                          }30`,
                        }
                      : {}
                  }
                >
                  All ({clients.length})
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                  style={
                    statusFilter === "active"
                      ? {
                          background: getSemanticColor("success").gradient,
                          boxShadow: `0 4px 12px ${
                            getSemanticColor("success").primary
                          }30`,
                        }
                      : {}
                  }
                >
                  Active ({activeCount})
                </Button>
                <Button
                  variant={statusFilter === "at-risk" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("at-risk")}
                  style={
                    statusFilter === "at-risk"
                      ? {
                          background: getSemanticColor("warning").gradient,
                          boxShadow: `0 4px 12px ${
                            getSemanticColor("warning").primary
                          }30`,
                        }
                      : {}
                  }
                >
                  At Risk ({atRiskCount})
                </Button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
          </div>
        </GlassCard>

        {/* Client List/Grid */}
        {filteredClients.length === 0 ? (
          <GlassCard elevation={2} className="fc-glass fc-card p-12 text-center">
            <Users className="w-24 h-24 mx-auto mb-6 text-[color:var(--fc-text-subtle)]" />
            <h3 className="text-2xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
              {searchQuery || statusFilter !== "all"
                ? "No clients found"
                : "Build your coaching roster"}
            </h3>
            <p className="text-sm mb-6 text-[color:var(--fc-text-dim)]">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Start by adding your first client to begin tracking their progress"}
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/coach/clients/add">
                <Button className="fc-btn fc-btn-primary">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add Your First Client
                </Button>
              </Link>
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  className="fc-btn fc-btn-ghost"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </GlassCard>
        ) : viewMode === "grid" ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredClients.map((client) => (
              <GlassCard
                key={client.id}
                elevation={2}
                className="fc-glass fc-card overflow-hidden transition-all hover:scale-102 hover:shadow-2xl"
                borderColor={getStatusColor(client.status)}
              >
                {/* Status indicator bar */}
                <div
                  className="h-2"
                  style={{ background: getStatusColor(client.status) }}
                />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                        style={{
                          background: getSemanticColor("trust").gradient,
                          color: "#fff",
                        }}
                      >
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                          {client.name}
                        </h3>
                        <p className="text-sm text-[color:var(--fc-text-dim)]">
                          {client.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: `${getStatusColor(client.status)}20`,
                        color: getStatusColor(client.status),
                      }}
                    >
                      {getStatusLabel(client.status)}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs mb-1 text-[color:var(--fc-text-subtle)]">
                        Workouts This Week
                      </p>
                      <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                        {client.workoutsThisWeek}/{client.workoutGoal}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-1 text-[color:var(--fc-text-subtle)]">
                        Compliance
                      </p>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: getComplianceColor(client.compliance) }}
                      >
                        {client.compliance}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.1)",
                      }}
                    >
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${client.compliance}%`,
                          background: getComplianceColor(client.compliance),
                        }}
                      />
                    </div>
                  </div>

                  {/* Last Active */}
                  <p className="text-xs mb-4 text-[color:var(--fc-text-subtle)]">
                    Last active: {client.lastActive}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/coach/clients/${client.id}`}
                      className="flex-1"
                    >
                      <Button variant="ghost" size="sm" className="fc-btn fc-btn-secondary w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost">
                      <Dumbbell className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          // List View
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center gap-4 p-4 rounded-lg transition-all hover:scale-102 fc-glass-soft"
                  style={{
                    borderLeft: `4px solid ${getStatusColor(client.status)}`,
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{
                      background: getSemanticColor("trust").gradient,
                      color: "#fff",
                    }}
                  >
                    {client.name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate text-[color:var(--fc-text-primary)]">
                        {client.name}
                      </h4>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0"
                        style={{
                          background: `${getStatusColor(client.status)}20`,
                          color: getStatusColor(client.status),
                        }}
                      >
                        {getStatusLabel(client.status)}
                      </span>
                    </div>
                    <p className="text-sm truncate text-[color:var(--fc-text-dim)]">
                      {client.email}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                        {client.workoutsThisWeek}/{client.workoutGoal}
                      </p>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">
                        This Week
                      </p>
                    </div>
                    <div className="text-center">
                      <p
                        className="text-lg font-bold"
                        style={{ color: getComplianceColor(client.compliance) }}
                      >
                        {client.compliance}%
                      </p>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">
                        Compliance
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-[color:var(--fc-text-primary)]">
                        {client.lastActive}
                      </p>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">
                        Last Active
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/coach/clients/${client.id}`}>
                      <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost">
                      <Dumbbell className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </AnimatedBackground>
  );
}

export default function ClientManagement() {
  return (
    <ProtectedRoute requiredRole="coach">
      <ClientManagementContent />
    </ProtectedRoute>
  );
}
