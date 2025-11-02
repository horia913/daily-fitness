"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService from "@/lib/workoutTemplateService";
import ProgramCard from "@/components/features/programs/ProgramCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, BookOpen } from "lucide-react";
import Link from "next/link";

interface Program {
  id: string;
  name: string;
  description?: string;
  coach_id: string;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  duration_weeks: number;
  target_audience: string;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function CoachProgramsPage() {
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

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

  useEffect(() => {
    if (!coachId) return;
    loadPrograms(coachId);
    loadAssignmentCounts(coachId);
  }, [coachId, loadPrograms, loadAssignmentCounts]);

  if (!coachId) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
            <p className={`${theme.textSecondary}`}>
              Please sign in to view programs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
          <div className={`${theme.card} rounded-2xl p-6`}>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`min-h-screen ${theme.background}`}>
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{ backgroundColor: "#E8E9F3" }}
            >
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "18px",
                        background:
                          "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <BookOpen
                        style={{
                          width: "32px",
                          height: "32px",
                          color: "#FFFFFF",
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1
                        style={{
                          fontSize: "28px",
                          fontWeight: "700",
                          color: "#1A1A1A",
                          marginBottom: "8px",
                        }}
                      >
                        Training Programs
                      </h1>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "400",
                          color: "#6B7280",
                        }}
                      >
                        Create and manage structured training programs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (coachId) {
                          loadPrograms(coachId);
                          loadAssignmentCounts(coachId);
                        }
                      }}
                      style={{
                        borderRadius: "20px",
                        padding: "12px 20px",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>
                    <Link href="/coach/programs/create">
                      <Button
                        style={{
                          backgroundColor: "#6C5CE7",
                          borderRadius: "20px",
                          padding: "12px 20px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#FFFFFF",
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Create Program
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Programs List */}
            <div className="space-y-4">
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

            {/* Empty state */}
            {programs.length === 0 && (
              <div
                className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}
              >
                <div className="text-center py-16 px-6">
                  <div className="relative mb-6">
                    <BookOpen className="w-20 h-20 text-slate-400 mx-auto" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <h3 className={`text-2xl font-semibold ${theme.text} mb-3`}>
                    No programs yet
                  </h3>
                  <p
                    className={`text-lg ${theme.textSecondary} mb-8 max-w-md mx-auto`}
                  >
                    Create your first workout program with template schedules
                    and progression rules for comprehensive client training.
                  </p>
                  <Link href="/coach/programs/create">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-lg">
                      <Plus className="w-5 h-5 mr-2" />
                      Create Your First Program
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showAssignModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              maxWidth: 560,
              width: "100%",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 24, borderBottom: "1px solid #E5E7EB" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Assign Program</h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setClientSearchQuery("");
                    setSelectedClients([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              {/* Search bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Selected count badge */}
              {selectedClients.length > 0 && (
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedClients.length} client
                    {selectedClients.length !== 1 ? "s" : ""} selected
                  </span>
                </div>
              )}

              {/* Scrollable client list (shows ~3 items) */}
              <div className="space-y-3 max-h-[240px] overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {clientSearchQuery.trim()
                      ? "No clients found matching your search"
                      : "No active clients available"}
                  </div>
                ) : (
                  filteredClients.map((c) => {
                    const id = c.client_id || c.id;
                    const selected = selectedClients.includes(id);
                    return (
                      <div
                        key={id}
                        onClick={() =>
                          setSelectedClients((prev) =>
                            selected
                              ? prev.filter((x) => x !== id)
                              : [...prev, id]
                          )
                        }
                        className={`flex items-center justify-between border rounded-xl p-3 cursor-pointer transition-all ${
                          selected
                            ? "border-green-500 bg-green-50 shadow-sm"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {c.profiles?.first_name || ""}{" "}
                            {c.profiles?.last_name || ""}
                          </div>
                          <div className="text-sm text-gray-500">
                            {c.profiles?.email || ""}
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selected
                              ? "bg-green-500 border-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="grid gap-3 mt-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Start date</label>
                  <input
                    type="date"
                    value={assignStartDate}
                    onChange={(e) => setAssignStartDate(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div
              style={{ padding: 16, borderTop: "1px solid #E5E7EB" }}
              className="flex items-center justify-end gap-2"
            >
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setClientSearchQuery("");
                  setSelectedClients([]);
                }}
                className="px-4 py-2 border rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={selectedClients.length === 0}
                onClick={submitAssign}
                className="px-4 py-2 bg-green-600 text-white rounded-xl"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && programToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              maxWidth: 520,
              width: "100%",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 24, borderBottom: "1px solid #E5E7EB" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Delete Program</h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProgramToDelete(null);
                    setConfirmImpact(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <p className="text-sm text-gray-700 mb-2">
                You are about to delete:
              </p>
              <p className="font-semibold text-gray-900 mb-4">
                {programToDelete.name}
              </p>
              {(assignmentCountByProgram[programToDelete.id] || 0) > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    This program has{" "}
                    {assignmentCountByProgram[programToDelete.id] || 0} active
                    assignment(s). Deleting will not remove past client data,
                    but clients will no longer see this program.
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={confirmImpact}
                      onChange={(e) => setConfirmImpact(e.target.checked)}
                    />
                    I understand and want to delete this program.
                  </label>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  This action will disable the program (soft delete). You can
                  recreate it later if needed.
                </p>
              )}
            </div>
            <div
              style={{ padding: 16, borderTop: "1px solid #E5E7EB" }}
              className="flex items-center justify-end gap-2"
            >
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setProgramToDelete(null);
                  setConfirmImpact(false);
                }}
                className="px-4 py-2 border rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!programToDelete) return;
                  if (
                    (assignmentCountByProgram[programToDelete.id] || 0) > 0 &&
                    !confirmImpact
                  )
                    return;
                  const deleted = await WorkoutTemplateService.deleteProgram(
                    programToDelete.id
                  );
                  if (deleted) {
                    alert("Program deleted successfully");
                    setShowDeleteModal(false);
                    setProgramToDelete(null);
                    setConfirmImpact(false);
                    if (coachId) {
                      await loadPrograms(coachId);
                      await loadAssignmentCounts(coachId);
                    }
                  } else {
                    alert("Failed to delete program");
                  }
                }}
                className={`px-4 py-2 rounded-xl text-white ${
                  (assignmentCountByProgram[programToDelete.id] || 0) > 0 &&
                  !confirmImpact
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={
                  (assignmentCountByProgram[programToDelete.id] || 0) > 0 &&
                  !confirmImpact
                }
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
