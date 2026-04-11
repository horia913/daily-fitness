"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService from "@/lib/workoutTemplateService";
import ProgramCard from "@/components/features/programs/ProgramCard";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Plus,
  BookOpen,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/toast-provider";

interface Program {
  id: string;
  name: string;
  description?: string;
  coach_id: string;
  difficulty_level: "beginner" | "intermediate" | "advanced" | "athlete";
  duration_weeks: number;
  target_audience: string;
  category?: string | null;
  is_public?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProgramsDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { getSemanticColor } = useTheme();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState<'active' | 'all'>('active');
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
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [replaceConfirmList, setReplaceConfirmList] = useState<
    { client_id: string; program_name: string }[]
  >([]);
  const [assignStartDate, setAssignStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [assignNotes, setAssignNotes] = useState<string>("");
  const [assignProgressionMode, setAssignProgressionMode] = useState<'auto' | 'coach_managed'>('coach_managed');
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");

  const coachId = user?.id || "";
  const didLoadRef = useRef(false);

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

  const loadPrograms = useCallback(async (signal?: AbortSignal) => {
    if (!coachId) {
      setError('loadPrograms called without coachId');
      setLoading(false);
      return;
    }
    if (signal) {
      if (didLoadRef.current) return;
      if (loadingRef.current) return;
      didLoadRef.current = true;
    }
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const filter = programFilter === 'all' ? 'all' : 'active';
      const res = await fetch(`/api/coach/programs?filter=${filter}`, {
        signal: signal ?? null,
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const { programs: list, assignmentCountByProgram: counts } = await res.json();
      setPrograms(Array.isArray(list) ? list : []);
      setAssignmentCountByProgram(counts && typeof counts === 'object' ? counts : {});
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (signal) didLoadRef.current = false;
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading programs';
      console.error('[ProgramsDashboard] Error loading programs:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [coachId, programFilter]);

  const openAssignModal = useCallback(
    async (programId: string) => {
      setAssignProgramId(programId);
      setSelectedClients([]);
      setAssignNotes("");
      setAssignStartDate(new Date().toISOString().split("T")[0]);
      setClientSearchQuery("");
      setShowAssignModal(true);
      try {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .eq("coach_id", coachId)
          .eq("status", "active");

        if (clientsError) throw clientsError;

        if (clientsData && clientsData.length > 0) {
          const profileIds = clientsData
            .map((c) => c.client_id)
            .filter(Boolean);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, email")
            .in("id", profileIds);

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

  const doAssignAndClose = useCallback(async () => {
    if (!assignProgramId || selectedClients.length === 0) return;
    try {
      await WorkoutTemplateService.assignProgramToClients(
        assignProgramId,
        selectedClients,
        coachId,
        assignStartDate,
        assignNotes,
        assignProgressionMode
      );
      await loadPrograms();
      setShowAssignModal(false);
      setShowReplaceConfirm(false);
      setReplaceConfirmList([]);
      setClientSearchQuery("");
      setSelectedClients([]);
    } catch (error) {
      console.error("Error assigning program:", error);
      addToast({ title: "Error assigning program. Please try again.", variant: "destructive" });
    }
  }, [
    assignProgramId,
    selectedClients,
    coachId,
    assignStartDate,
    assignNotes,
    assignProgressionMode,
    loadPrograms,
  ]);

  const submitAssign = useCallback(async () => {
    if (!assignProgramId || selectedClients.length === 0) return;
    const withActive = await WorkoutTemplateService.getClientsWithActiveProgram(selectedClients);
    if (withActive.length > 0) {
      setReplaceConfirmList(withActive);
      setShowReplaceConfirm(true);
      return;
    }
    await doAssignAndClose();
  }, [assignProgramId, selectedClients, doAssignAndClose]);

  const handleDelete = useCallback(async () => {
    if (!programToDelete || !confirmImpact) return;
    try {
      await WorkoutTemplateService.deleteProgram(programToDelete.id);
      await loadPrograms();
      setShowDeleteModal(false);
      setProgramToDelete(null);
      setConfirmImpact(false);
    } catch (error) {
      console.error("Error deleting program:", error);
      addToast({ title: "Couldn't delete program. Please try again.", variant: "destructive" });
    }
  }, [programToDelete, confirmImpact, loadPrograms, addToast]);

  useEffect(() => {
    if (!coachId) return;
    const ac = new AbortController();
    loadPrograms(ac.signal);
    return () => {
      didLoadRef.current = false;
      loadingRef.current = false;
      ac.abort();
    };
  }, [coachId, programFilter, loadPrograms]);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 15000);
    return () => clearTimeout(t);
  }, [loading]);

  if (!coachId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="fc-card-shell p-6">
          <p className="text-[color:var(--fc-text-dim)]">
            Please sign in to view programs.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-40 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalPrograms = programs.length;
  const activePrograms = programs.filter((p) => p.is_active).length;
  const totalAssignments = Object.values(assignmentCountByProgram).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <>
      <div className="space-y-3">
        <div className="flex min-h-12 items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-[color:var(--fc-text-primary)] sm:text-xl">
            Training Programs
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="fc-ghost"
              size="sm"
              className="h-9"
              onClick={() => loadPrograms()}
            >
              <RefreshCw className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Link href="/coach/programs/create">
              <Button variant="fc-primary" size="sm" className="h-9">
                <Plus className="w-4 h-4 sm:mr-1.5" />
                Create Program
              </Button>
            </Link>
          </div>
        </div>

          {/* Error Banner */}
          {error && (
            <ErrorBanner
              title="Couldn't load programs"
              message="Please check your connection and try again."
              onRetry={() => loadPrograms()}
              onDismiss={() => setError(null)}
            />
          )}

          {/* Stats — single line */}
          {programs.length > 0 && !error && (
            <p className="text-sm text-gray-400">
              {totalPrograms} program{totalPrograms !== 1 ? "s" : ""} ·{" "}
              {activePrograms} active · {totalAssignments} assignment
              {totalAssignments !== 1 ? "s" : ""}
            </p>
          )}

          {/* Filter pills — no card wrapper */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setProgramFilter("active")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                programFilter === "active"
                  ? "bg-[color:var(--fc-domain-workouts)]/25 text-[color:var(--fc-text-primary)] ring-1 ring-[color:var(--fc-domain-workouts)]/40"
                  : "text-gray-400 hover:text-[color:var(--fc-text-primary)]"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setProgramFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                programFilter === "all"
                  ? "bg-[color:var(--fc-domain-workouts)]/25 text-[color:var(--fc-text-primary)] ring-1 ring-[color:var(--fc-domain-workouts)]/40"
                  : "text-gray-400 hover:text-[color:var(--fc-text-primary)]"
              }`}
            >
              All
            </button>
          </div>

          {/* Programs: flat rows below sm, grid from sm */}
          {programs.length > 0 && !error && (
            <>
              <div className="sm:hidden divide-y divide-[color:var(--fc-glass-border)]/50 border-t border-b border-[color:var(--fc-glass-border)]/50">
                {programs.map((program) => (
                  <ProgramCard
                    key={program.id}
                    layout="row"
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
              <div className="hidden sm:grid sm:grid-cols-2 gap-4">
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
            </>
          )}

          {/* Empty State */}
          {programs.length === 0 && !error && !loading && (
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="No active programs yet"
              description="Create your first workout program with template schedules and progression rules for comprehensive client training."
              action={{
                label: "Create Your First Program",
                onClick: () => router.push("/coach/programs/create"),
              }}
            />
          )}
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
          <div className="fc-card-shell max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div
              className="flex items-center justify-between p-6"
              style={{
                borderBottom: "1px solid var(--fc-surface-card-border)",
              }}
            >
              <h2 className="text-xl font-bold fc-text-primary">
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

            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-semibold mb-2 fc-text-primary">
                  Search Clients
                </label>
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full p-3 rounded-xl fc-text-primary"
                  style={{
                    background: "var(--fc-surface-sunken)",
                    border: "1px solid var(--fc-surface-card-border)",
                  }}
                />
              </div>

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
                    <span className="font-medium fc-text-primary">
                      {client.profiles?.first_name} {client.profiles?.last_name}
                    </span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 fc-text-primary">
                  Start Date
                </label>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="w-full p-3 rounded-xl fc-text-primary"
                  style={{
                    background: "var(--fc-surface-sunken)",
                    border: "1px solid var(--fc-surface-card-border)",
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 fc-text-primary">
                  Notes (Optional)
                </label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Add any notes for the client"
                  rows={3}
                  className="w-full p-3 rounded-xl resize-none fc-text-primary"
                  style={{
                    background: "var(--fc-surface-sunken)",
                    border: "1px solid var(--fc-surface-card-border)",
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 fc-text-primary">
                  Progression Mode
                </label>
                <div className="space-y-2">
                  <label
                    className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                    style={{
                      background: assignProgressionMode === 'coach_managed'
                        ? 'var(--fc-surface-card-active, var(--fc-surface-sunken))'
                        : 'var(--fc-surface-sunken)',
                      border: assignProgressionMode === 'coach_managed'
                        ? '2px solid var(--fc-domain-workouts, #6366f1)'
                        : '1px solid var(--fc-surface-card-border)',
                    }}
                  >
                    <input
                      type="radio"
                      name="progressionMode"
                      checked={assignProgressionMode === 'coach_managed'}
                      onChange={() => setAssignProgressionMode('coach_managed')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium fc-text-primary">Coach-managed</p>
                      <p className="text-xs fc-text-dim">You review and advance weekly</p>
                    </div>
                  </label>
                  <label
                    className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                    style={{
                      background: assignProgressionMode === 'auto'
                        ? 'var(--fc-surface-card-active, var(--fc-surface-sunken))'
                        : 'var(--fc-surface-sunken)',
                      border: assignProgressionMode === 'auto'
                        ? '2px solid var(--fc-domain-workouts, #6366f1)'
                        : '1px solid var(--fc-surface-card-border)',
                    }}
                  >
                    <input
                      type="radio"
                      name="progressionMode"
                      checked={assignProgressionMode === 'auto'}
                      onChange={() => setAssignProgressionMode('auto')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium fc-text-primary">Automatic</p>
                      <p className="text-xs fc-text-dim">Weeks unlock when completed</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div
              className="flex items-center justify-end gap-3 p-6"
              style={{
                borderTop: "1px solid var(--fc-surface-card-border)",
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
                Assign to {selectedClients.length} client
                {selectedClients.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showReplaceConfirm && replaceConfirmList.length > 0 && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="fc-card-shell max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2 fc-text-primary">
              Replace active program?
            </h2>
            <p className="mb-6 text-sm fc-text-dim">
              {replaceConfirmList.length === 1 && selectedClients.length === 1
                ? `This client currently has an active program: "${replaceConfirmList[0].program_name}". Assigning a new program will deactivate it. Continue?`
                : `${replaceConfirmList.length} of ${selectedClients.length} selected client(s) have an active program. Assigning will deactivate those programs. Continue?`}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowReplaceConfirm(false);
                  setReplaceConfirmList([]);
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => doAssignAndClose()}
                className="rounded-xl"
                style={{
                  background: getSemanticColor("success").gradient,
                }}
              >
                Replace Program
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && programToDelete && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="fc-card-shell max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 fc-text-primary">
              Delete Program?
            </h2>
            <p className="mb-6 fc-text-dim">
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
              <span className="text-sm fc-text-primary">
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
          </div>
        </div>
      )}
    </>
  );
}

