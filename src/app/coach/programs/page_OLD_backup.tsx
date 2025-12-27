"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService from "@/lib/workoutTemplateService";
import ProgramCard from "@/components/features/programs/ProgramCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, BookOpen, X } from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Program {
  id: string;
  name: string;
  description?: string;
  coach_id: string;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  duration_weeks: number;
  target_audience: string;
  is_public?: boolean; // Optional - not in database schema
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function ProgramsDashboardContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentCountByProgram, setAssignmentCountByProgram] = useState<
    Record<string, number>
  >({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [confirmImpact, setConfirmImpact] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [assignStartDate, setAssignStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [assignNotes, setAssignNotes] = useState<string>("");
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");

  const coachId = user?.id || "";

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const query = clientSearchQuery.toLowerCase();
    return clients.filter((c) => {
      const firstName = c.profiles?.first_name?.toLowerCase() || "";
      const lastName = c.profiles?.last_name?.toLowerCase() || "";
      const email = c.profiles?.email?.toLowerCase() || "";
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        email.includes(query)
      );
    });
  }, [clients, clientSearchQuery]);

  const loadAssignmentCounts = useCallback(async (cid: string) => {
    try {
      const { data, error } = await supabase
        .from("program_assignments")
        .select("program_id")
        .eq("coach_id", cid);

      if (error) return;

      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        counts[row.program_id] = (counts[row.program_id] || 0) + 1;
      });
      setAssignmentCountByProgram(counts);
    } catch {}
  }, []);

  const loadPrograms = useCallback(async (cid: string) => {
    setLoading(true);
    try {
      const list = await WorkoutTemplateService.getPrograms(cid);
      setPrograms(list || []);
    } catch {
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const openAssignModal = useCallback(
    async (programId: string) => {
      setAssignProgramId(programId);
      setSelectedClients([]);
      setAssignNotes("");
      setAssignStartDate(new Date().toISOString().split("T")[0]);
      setClientSearchQuery("");
      setShowAssignModal(true);
      // load clients for coach
      try {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .eq("coach_id", coachId)
          .eq("status", "active");

        if (clientsError) throw clientsError;

        // Fetch profiles separately for each client
        if (clientsData && clientsData.length > 0) {
          const profileIds = clientsData
            .map((c) => c.client_id)
            .filter(Boolean);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, email")
            .in("id", profileIds);

          // Merge profiles into clients
          const merged = clientsData.map((client) => ({
            ...client,
            profiles:
              profilesData?.find((p) => p.id === client.client_id) || null,
          }));
          setClients(merged);
        } else {
          setClients([]);
        }
      } catch (error) {
        console.error("Error loading clients:", error);
        setClients([]);
      }
    },
    [coachId]
  );

  const submitAssign = useCallback(async () => {
    if (!assignProgramId || selectedClients.length === 0) return;
    const count = await WorkoutTemplateService.assignProgramToClients(
      assignProgramId,
      selectedClients,
      coachId,
      assignStartDate,
      assignNotes
    );
    await loadAssignmentCounts(coachId);
    setShowAssignModal(false);
    setClientSearchQuery("");
    setSelectedClients([]);
  }, [
    assignProgramId,
    selectedClients,
    coachId,
    assignStartDate,
    assignNotes,
    loadAssignmentCounts,
  ]);

  const handleDelete = useCallback(async () => {
    if (!programToDelete || !confirmImpact) return;
    try {
      await WorkoutTemplateService.deleteProgram(programToDelete.id);
      await loadPrograms(coachId);
      await loadAssignmentCounts(coachId);
      setShowDeleteModal(false);
      setProgramToDelete(null);
      setConfirmImpact(false);
    } catch (error) {
      console.error("Error deleting program:", error);
    }
  }, [programToDelete, confirmImpact, coachId, loadPrograms, loadAssignmentCounts]);

  useEffect(() => {
    if (!coachId) return;
    loadPrograms(coachId);
    loadAssignmentCounts(coachId);
  }, [coachId, loadPrograms, loadAssignmentCounts]);

  if (!coachId) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard elevation={2} className="p-6">
            <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
              Please sign in to view programs.
            </p>
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  if (loading) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-2xl"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  // Calculate stats
  const totalPrograms = programs.length;
  const activePrograms = programs.filter((p) => p.is_active).length;
  const totalAssignments = Object.values(assignmentCountByProgram).reduce((a, b) => a + b, 0);

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          {/* Header Section */}
          <GlassCard elevation={3} className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
                  }}
                >
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-3xl font-bold mb-2"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Training Programs
                  </h1>
                  <p
                    className="text-sm"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Create and manage structured training programs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (coachId) {
                      loadPrograms(coachId);
                      loadAssignmentCounts(coachId);
                    }
                  }}
                  className="rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Link href="/coach/programs/create">
                  <Button
                    className="rounded-xl"
                    style={{
                      background: getSemanticColor("success").gradient,
                      boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Program
                  </Button>
                </Link>
              </div>
            </div>
          </GlassCard>

          {/* Stats Summary */}
          {programs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassCard elevation={2} className="p-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${getSemanticColor("trust").primary}20`,
                    }}
                  >
                    <BookOpen className="w-6 h-6" style={{ color: getSemanticColor("trust").primary }} />
                  </div>
                  <div>
                    <AnimatedNumber
                      value={totalPrograms}
                      className="text-2xl font-bold"
                      color={isDark ? "#fff" : "#1A1A1A"}
                    />
                    <p
                      className="text-sm"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Total Programs
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard elevation={2} className="p-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${getSemanticColor("success").primary}20`,
                    }}
                  >
                    <BookOpen className="w-6 h-6" style={{ color: getSemanticColor("success").primary }} />
                  </div>
                  <div>
                    <AnimatedNumber
                      value={activePrograms}
                      className="text-2xl font-bold"
                      color={isDark ? "#fff" : "#1A1A1A"}
                    />
                    <p
                      className="text-sm"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Active Programs
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard elevation={2} className="p-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${getSemanticColor("warning").primary}20`,
                    }}
                  >
                    <BookOpen className="w-6 h-6" style={{ color: getSemanticColor("warning").primary }} />
                  </div>
                  <div>
                    <AnimatedNumber
                      value={totalAssignments}
                      className="text-2xl font-bold"
                      color={isDark ? "#fff" : "#1A1A1A"}
                    />
                    <p
                      className="text-sm"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Total Assignments
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Programs Grid */}
          {programs.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onEdit={() => {
                    window.location.href = `/coach/programs/${program.id}/edit`;
                  }}
                  onOpenDetails={() => {
                    window.location.href = `/coach/programs/${program.id}`;
                  }}
                  onDelete={() => {
                    setProgramToDelete(program);
                    setConfirmImpact(false);
                    setShowDeleteModal(true);
                  }}
                  onAssign={() => openAssignModal(program.id)}
                  assignmentCount={assignmentCountByProgram[program.id] || 0}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {programs.length === 0 && (
            <GlassCard elevation={2} className="py-16 px-6">
              <div className="text-center max-w-lg mx-auto">
                <div className="relative inline-block mb-6">
                  <BookOpen
                    className="w-20 h-20 mx-auto"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                    }}
                  />
                  <div
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: getSemanticColor("success").gradient,
                    }}
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3
                  className="text-2xl font-bold mb-3"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  No programs yet
                </h3>
                <p
                  className="text-lg mb-8"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Create your first workout program with template schedules and
                  progression rules for comprehensive client training.
                </p>
                <Link href="/coach/programs/create">
                  <Button
                    size="lg"
                    className="rounded-xl"
                    style={{
                      background: getSemanticColor("success").gradient,
                      boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
                    }}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Program
                  </Button>
                </Link>
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <GlassCard
            elevation={4}
            className="max-w-2xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-6"
              style={{
                borderBottom: `1px solid ${
                  isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                }`,
              }}
            >
              <h2
                className="text-xl font-bold"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Assign Program
              </h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setClientSearchQuery("");
                  setSelectedClients([]);
                }}
                className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Search */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  }}
                >
                  Search Clients
                </label>
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full p-3 rounded-xl"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                    border: `1px solid ${
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }`,
                    color: isDark ? "#fff" : "#1A1A1A",
                  }}
                />
              </div>

              {/* Clients List */}
              <div className="space-y-2">
                {filteredClients.map((client) => (
                  <label
                    key={client.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.client_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClients([...selectedClients, client.client_id]);
                        } else {
                          setSelectedClients(
                            selectedClients.filter((id) => id !== client.client_id)
                          );
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <span
                      className="font-medium"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      {client.profiles?.first_name} {client.profiles?.last_name}
                    </span>
                  </label>
                ))}
              </div>

              {/* Start Date */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  }}
                >
                  Start Date
                </label>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="w-full p-3 rounded-xl"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                    border: `1px solid ${
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }`,
                    color: isDark ? "#fff" : "#1A1A1A",
                  }}
                />
              </div>

              {/* Notes */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  }}
                >
                  Notes (Optional)
                </label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Add any notes for the client"
                  rows={3}
                  className="w-full p-3 rounded-xl resize-none"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                    border: `1px solid ${
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }`,
                    color: isDark ? "#fff" : "#1A1A1A",
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="flex items-center justify-end gap-3 p-6"
              style={{
                borderTop: `1px solid ${
                  isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                }`,
              }}
            >
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAssignModal(false);
                  setClientSearchQuery("");
                  setSelectedClients([]);
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={submitAssign}
                disabled={selectedClients.length === 0}
                className="rounded-xl"
                style={{
                  background: getSemanticColor("success").gradient,
                  opacity: selectedClients.length === 0 ? 0.5 : 1,
                }}
              >
                Assign to {selectedClients.length} client{selectedClients.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && programToDelete && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <GlassCard elevation={4} className="max-w-md w-full p-6">
            <h2
              className="text-xl font-bold mb-4"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              Delete Program?
            </h2>
            <p
              className="mb-6"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              Are you sure you want to delete "{programToDelete.name}"? This action
              cannot be undone.
            </p>
            <label className="flex items-center gap-2 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmImpact}
                onChange={(e) => setConfirmImpact(e.target.checked)}
                className="w-5 h-5"
              />
              <span
                className="text-sm"
                style={{
                  color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                }}
              >
                I understand this will affect assigned clients
              </span>
            </label>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setProgramToDelete(null);
                  setConfirmImpact(false);
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={!confirmImpact}
                className="rounded-xl"
                style={{
                  background: getSemanticColor("critical").gradient,
                  opacity: !confirmImpact ? 0.5 : 1,
                }}
              >
                Delete Program
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </AnimatedBackground>
  );
}

export default function CoachProgramsPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <ProgramsDashboardContent />
    </ProtectedRoute>
  );
}

