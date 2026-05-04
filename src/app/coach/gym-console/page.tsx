"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { ChevronLeft, User, CheckCircle, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { fetchApi } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import type { ClientStatus, ClientForModal } from "./gymConsoleTypes";
import { formatUpdatedLabel } from "./gymConsoleUtils";
import { GymConsoleClientCard } from "./GymConsoleClientCard";
import { GymConsoleQuickLogModal } from "./GymConsoleQuickLogModal";
import { GymConsoleDetailDrawer } from "./GymConsoleDetailDrawer";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import styles from "./gymConsole.module.css";

const STORAGE_KEY_CLIENTS = "gym-console-clients";
const NOTES_KEY_PREFIX = "gym-console-notes-";
const MAX_CONSOLE_CLIENTS = 6;

function partitionConsoleIds(
  consoleClientIds: string[],
  statusByClientId: Map<string, ClientStatus>
): { lifting: string[]; pending: string[]; done: string[]; noProg: string[] } {
  const lifting: string[] = [];
  const pending: string[] = [];
  const done: string[] = [];
  const noProg: string[] = [];
  for (const clientId of consoleClientIds) {
    const s = statusByClientId.get(clientId);
    if (!s) {
      pending.push(clientId);
      continue;
    }
    if (s.status === "active_session" || s.status === "idle_session") {
      lifting.push(clientId);
    } else if (s.nextWorkout && s.status !== "program_completed" && s.status !== "no_program") {
      pending.push(clientId);
    } else if (s.status === "program_completed") {
      done.push(clientId);
    } else if (s.status === "no_program") {
      noProg.push(clientId);
    } else {
      pending.push(clientId);
    }
  }
  return { lifting, pending, done, noProg };
}

function AddClientModal({
  open,
  onClose,
  currentIds,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  currentIds: string[];
  onSave: (ids: string[]) => void;
}) {
  const [list, setList] = useState<ClientForModal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentIds));

  useEffect(() => {
    setSelected(new Set(currentIds));
  }, [currentIds, open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchApi("/api/coach/clients")
      .then((res) => res.json())
      .then((body) => {
        const arr = Array.isArray(body.clients) ? body.clients : [];
        setList(arr.filter((c: ClientForModal) => c.status === "active"));
      })
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_CONSOLE_CLIENTS) next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selected));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-md max-h-[min(80vh,36rem)] gap-0 p-4 flex flex-col overflow-hidden sm:max-w-md"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
          <DialogTitle className="m-0 p-0 text-left text-lg font-semibold text-[color:var(--fc-text-primary)]">
            Add clients to console
          </DialogTitle>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="mb-2 text-xs text-[color:var(--fc-text-dim)]">Select up to {MAX_CONSOLE_CLIENTS} clients.</p>
        {loading ? (
          <div className="flex flex-1 justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent-cyan)]" aria-hidden />
          </div>
        ) : (
          <ul className="mb-4 flex-1 space-y-1 overflow-y-auto">
            {list.map((c) => {
              const name = c.profiles
                ? `${c.profiles.first_name ?? ""} ${c.profiles.last_name ?? ""}`.trim() || "Client"
                : "Client";
              const isSelected = selected.has(c.client_id);
              const disabled = !isSelected && selected.size >= MAX_CONSOLE_CLIENTS;
              return (
                <li key={c.client_id}>
                  <button
                    type="button"
                    onClick={() => !disabled && toggle(c.client_id)}
                    disabled={disabled}
                    className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm ${
                      isSelected
                        ? "border border-[color:color-mix(in_srgb,var(--fc-accent-cyan)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--fc-accent-cyan)_20%,transparent)]"
                        : "border border-transparent hover:bg-[color:var(--fc-glass-highlight)]"
                    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <User className="h-4 w-4 shrink-0 text-[color:var(--fc-text-dim)]" />
                    <span className="flex-1 truncate text-[color:var(--fc-text-primary)]">{name}</span>
                    {isSelected && <CheckCircle className="h-4 w-4 shrink-0 text-[color:var(--fc-accent-cyan)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex shrink-0 gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GymConsoleContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();
  const isGymConsoleMobileLayout = useMediaQuery("(max-width: 768px)");

  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const [consoleClientIds, setConsoleClientIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CLIENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_CONSOLE_CLIENTS) : [];
    } catch {
      return [];
    }
  });

  const [statusList, setStatusList] = useState<ClientStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewDetailClientId, setViewDetailClientId] = useState<string | null>(null);
  const [viewDetailClientName, setViewDetailClientName] = useState("");

  useEffect(() => {
    if (!viewDetailClientId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [viewDetailClientId]);

  const [actionLoading, setActionLoading] = useState<{ skip?: string; mark?: string; start?: string }>({});
  const [quickLogClient, setQuickLogClient] = useState<{
    clientId: string;
    clientName: string;
    workoutLogId: string;
    workoutAssignmentId: string;
    sessionId: string;
    initialSelected?: { blockId: string; exerciseId: string; exerciseName: string } | null;
  } | null>(null);
  const [prHighlight, setPrHighlight] = useState<{ clientId: string; exerciseId: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!user || consoleClientIds.length === 0) {
      setStatusList([]);
      return;
    }
    setStatusLoading(true);
    try {
      const res = await fetchApi("/api/coach/gym-console/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: consoleClientIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to fetch status");
      setStatusList(Array.isArray(data.clients) ? data.clients : []);
      setLastFetchedAt(Date.now());
      setTick(Date.now());
    } catch (e) {
      console.error(e);
      addToast({ title: "Error", description: "Failed to load console status", variant: "destructive" });
      setStatusList([]);
    } finally {
      setStatusLoading(false);
    }
  }, [user, consoleClientIds, addToast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const saveConsoleClients = (ids: string[]) => {
    const next = ids.slice(0, MAX_CONSOLE_CLIENTS);
    setConsoleClientIds(next);
    try {
      localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const getNote = (clientId: string) => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(NOTES_KEY_PREFIX + clientId) ?? "";
    } catch {
      return "";
    }
  };

  const setNote = (clientId: string, value: string) => {
    try {
      localStorage.setItem(NOTES_KEY_PREFIX + clientId, value);
    } catch {
      /* ignore */
    }
  };

  const handleSkipDay = async (status: ClientStatus) => {
    const paId = status.programAssignmentId ?? status.nextWorkout?.programAssignmentId;
    const scheduleId = status.nextWorkout?.scheduleId;
    if (!paId || !scheduleId) return;
    if (!confirm(`Skip this training day for ${status.clientName}? They will move to the next workout.`)) return;
    setActionLoading((prev) => ({ ...prev, skip: status.clientId }));
    try {
      const res = await fetchApi("/api/coach/program-assignments/skip-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programAssignmentId: paId, programScheduleId: scheduleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to skip day");
      addToast({ title: "Day skipped", description: data.message, variant: "success" });
      await fetchStatus();
    } catch (e) {
      addToast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to skip day",
        variant: "destructive",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, skip: undefined }));
    }
  };

  const handleMarkComplete = async (clientId: string) => {
    setActionLoading((prev) => ({ ...prev, mark: clientId }));
    try {
      const res = await fetchApi("/api/coach/pickup/mark-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          addToast({
            title: "Already completed",
            description: data.message ?? "Already marked complete",
            variant: "warning",
          });
        } else throw new Error(data?.error ?? "Failed to mark complete");
      } else {
        addToast({ title: "Workout complete", description: data.message, variant: "success" });
      }
      await fetchStatus();
    } catch (e) {
      addToast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to mark complete",
        variant: "destructive",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, mark: undefined }));
    }
  };

  const handleStartWorkout = async (clientId: string) => {
    setActionLoading((prev) => ({ ...prev, start: clientId }));
    try {
      const res = await fetchApi("/api/coach/gym-console/start-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? "Failed to start workout");
      addToast({ title: "Workout started", description: "Session created for client", variant: "success" });
      await fetchStatus();
    } catch (e) {
      addToast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to start workout",
        variant: "destructive",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, start: undefined }));
    }
  };

  const handleView = async (status: ClientStatus) => {
    if (status.activeSession) {
      setViewDetailClientId(status.clientId);
      setViewDetailClientName(status.clientName);
      return;
    }
    if (!status.nextWorkout) {
      setViewDetailClientId(status.clientId);
      setViewDetailClientName(status.clientName);
      return;
    }
    const workoutName = status.nextWorkout.workoutName;
    if (!confirm(`Start "${workoutName}" for ${status.clientName}?`)) return;
    setActionLoading((prev) => ({ ...prev, start: status.clientId }));
    try {
      const res = await fetchApi("/api/coach/gym-console/start-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: status.clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? "Failed to start workout");
      addToast({ title: "Workout started", description: "Session created for client", variant: "success" });
      await fetchStatus();
      setViewDetailClientId(status.clientId);
      setViewDetailClientName(status.clientName);
    } catch (e) {
      addToast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to start workout",
        variant: "destructive",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, start: undefined }));
    }
  };

  const statusByClientId = useMemo(() => new Map(statusList.map((s) => [s.clientId, s])), [statusList]);
  const secondsAgo = lastFetchedAt != null ? Math.floor((Date.now() - lastFetchedAt) / 1000) : null;
  const { lifting, pending, done, noProg } = useMemo(
    () => partitionConsoleIds(consoleClientIds, statusByClientId),
    [consoleClientIds, statusByClientId]
  );

  const renderSection = (
    key: string,
    title: string,
    dotClass: string,
    ids: string[],
    section: "lifting" | "pending" | "done" | "noprog"
  ) => {
    if (ids.length === 0) return null;
    return (
      <section key={key} className="mb-5">
        <div className={styles.sectionHeader}>
          <span className={cn(styles.sectionDot, dotClass)} aria-hidden />
          <span className={styles.sectionTitle}>{title}</span>
          <span className={styles.sectionCount}>· {ids.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 px-4 md:grid-cols-2 lg:grid-cols-3">
          {ids.map((clientId) => {
            const status = statusByClientId.get(clientId);
            if (!status) {
              return (
                <div
                  key={clientId}
                  className="flex min-h-[100px] items-center justify-center rounded-[18px] border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] p-4"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent-cyan)]" />
                </div>
              );
            }
            return (
              <GymConsoleClientCard
                key={clientId}
                section={section}
                status={status}
                note={getNote(clientId)}
                onNoteChange={(v) => setNote(clientId, v)}
                onView={() => handleView(status)}
                onSkipDay={() => handleSkipDay(status)}
                onMarkComplete={() => handleMarkComplete(clientId)}
                onStartWorkout={() => handleStartWorkout(clientId)}
                onLogSet={() => {
                  if (status.activeSession?.workoutLogId) {
                    setQuickLogClient({
                      clientId,
                      clientName: status.clientName,
                      workoutLogId: status.activeSession.workoutLogId,
                      workoutAssignmentId: status.activeSession.workoutAssignmentId,
                      sessionId: status.activeSession.sessionId,
                    });
                  }
                }}
                onAssignProgram={() => {
                  window.location.href = `/coach/clients/${clientId}`;
                }}
                skipLoading={actionLoading.skip === clientId}
                markLoading={actionLoading.mark === clientId}
                startLoading={actionLoading.start === clientId}
                now={tick}
              />
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 flex h-[100dvh] flex-col">
        <header className="sticky top-0 z-20 border-b border-[color:var(--fc-glass-border)] bg-[color:color-mix(in_srgb,var(--fc-bg-deep)_88%,transparent)] backdrop-blur-md">
          <div className={styles.topBar}>
            <Link href="/coach/training" className={styles.backLink}>
              <ChevronLeft className="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" aria-hidden />
              Back to Training
            </Link>
            <button
              type="button"
              className={styles.refreshPill}
              onClick={() => void fetchStatus()}
              disabled={statusLoading}
            >
              {statusLoading ? (
                <Loader2 className="h-2 w-2 animate-spin md:h-2.5 md:w-2.5" aria-hidden />
              ) : (
                <RefreshCw className="h-2 w-2 md:h-2.5 md:w-2.5" aria-hidden />
              )}
              Refresh
            </button>
          </div>

          <div className={styles.headerBlock}>
            <div className={styles.eyebrowRow}>
              <span className={styles.livePulse} aria-hidden />
              <span className={styles.eyebrowLabel}>Live · Gym session</span>
            </div>
            <div className={styles.titleRow}>
              <h1 className={styles.consoleTitle}>Gym Console</h1>
              <div className={styles.titleMeta} title={formatUpdatedLabel(secondsAgo)}>
                <span className={styles.titleMetaCount}>{consoleClientIds.length}</span>
                <span className={styles.titleMetaSep} aria-hidden>
                  ·
                </span>
                <span className={styles.titleMetaRest}>{formatUpdatedLabel(secondsAgo)}</span>
              </div>
            </div>
          </div>

          {consoleClientIds.length > 0 ? (
            <div className={styles.statsBar}>
              <div className={styles.statsCell}>
                <span className={styles.statsValue} style={{ color: "var(--fc-state-lifting)" }}>
                  {lifting.length}
                </span>
                <span className={styles.statsLabel}>Lifting</span>
              </div>
              <div className={styles.statsCell}>
                <span className={styles.statsValue} style={{ color: "var(--fc-state-pending)" }}>
                  {pending.length}
                </span>
                <span className={styles.statsLabel}>Pending</span>
              </div>
              <div className={styles.statsCell}>
                <span className={styles.statsValue} style={{ color: "var(--fc-state-done)" }}>
                  {done.length}
                </span>
                <span className={styles.statsLabel}>Done</span>
              </div>
              <div className={styles.statsCell}>
                <span className={styles.statsValue} style={{ color: "var(--fc-state-noprog)" }}>
                  {noProg.length}
                </span>
                <span className={styles.statsLabel}>No prog</span>
              </div>
            </div>
          ) : null}
        </header>

        <div className="min-w-0 flex-1 overflow-auto overflow-x-hidden">
          <div className="mx-auto max-w-7xl pb-28 pt-2 sm:pb-6">
            {consoleClientIds.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <User className="mx-auto mb-4 h-12 w-12 text-[color:var(--fc-text-dim)]" />
                <h2 className="mb-2 text-lg font-semibold text-[color:var(--fc-text-primary)]">No clients on the console</h2>
                <p className="mb-4 max-w-md text-sm text-[color:var(--fc-text-dim)]">
                  Add up to {MAX_CONSOLE_CLIENTS} clients from your roster to see live workout status, log sets, and mark
                  workouts complete during floor coaching.
                </p>
                <Button className="fc-btn fc-btn-primary mb-3" onClick={() => setAddModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add clients to console
                </Button>
                <Link href="/coach/clients" className="text-sm font-medium text-[color:var(--fc-accent-cyan)] hover:underline">
                  Browse client roster →
                </Link>
              </div>
            ) : (
              <>
                {renderSection("lift", "Currently lifting", styles.sectionDotLifting, lifting, "lifting")}
                {renderSection("pend", "Hasn't started yet", styles.sectionDotPending, pending, "pending")}
                {renderSection("done", "Done today", styles.sectionDotDone, done, "done")}
                {renderSection("nop", "No program assigned", styles.sectionDotNoprog, noProg, "noprog")}
                <button type="button" className={styles.addClientBtn} onClick={() => setAddModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add client to console
                </button>
              </>
            )}
          </div>
        </div>

        {viewDetailClientId && typeof document !== "undefined" &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[10005] bg-black/60"
                onClick={() => {
                  setViewDetailClientId(null);
                  setViewDetailClientName("");
                }}
                aria-hidden
              />
              <div
                role="dialog"
                aria-modal="true"
                className={cn(
                  "fixed z-[10010] overflow-hidden shadow-2xl",
                  isGymConsoleMobileLayout
                    ? "inset-0 rounded-none"
                    : "inset-y-0 right-0 left-auto w-full max-w-md rounded-none"
                )}
              >
                {(() => {
                  const detailStatus = statusList.find((s) => s.clientId === viewDetailClientId);
                  const session = detailStatus?.activeSession;
                  const canLog = !!session?.workoutLogId && !!session?.workoutAssignmentId && !!session?.sessionId;
                  return (
                    <GymConsoleDetailDrawer
                      clientId={viewDetailClientId}
                      clientName={viewDetailClientName}
                      canLog={canLog}
                      layout={isGymConsoleMobileLayout ? "fullscreen" : "drawer"}
                      onLogExercise={(sel) => {
                        if (!session) return;
                        setQuickLogClient({
                          clientId: viewDetailClientId,
                          clientName: viewDetailClientName,
                          workoutLogId: session.workoutLogId,
                          workoutAssignmentId: session.workoutAssignmentId,
                          sessionId: session.sessionId,
                          initialSelected: sel,
                        });
                        setViewDetailClientId(null);
                        setViewDetailClientName("");
                      }}
                      onClose={() => {
                        setViewDetailClientId(null);
                        setViewDetailClientName("");
                      }}
                    />
                  );
                })()}
              </div>
            </>,
            document.body
          )}

        <AddClientModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          currentIds={consoleClientIds}
          onSave={saveConsoleClients}
        />

        {quickLogClient ? (
          <GymConsoleQuickLogModal
            open={!!quickLogClient}
            onClose={() => setQuickLogClient(null)}
            clientId={quickLogClient.clientId}
            clientName={quickLogClient.clientName}
            workoutLogId={quickLogClient.workoutLogId}
            workoutAssignmentId={quickLogClient.workoutAssignmentId}
            sessionId={quickLogClient.sessionId}
            initialSelected={quickLogClient.initialSelected ?? null}
            onSuccess={(info) => {
              void fetchStatus();
              if (info?.hadPr && info.exerciseId) {
                const cid = quickLogClient.clientId;
                const eid = info.exerciseId;
                setPrHighlight({ clientId: cid, exerciseId: eid });
                window.setTimeout(() => {
                  setPrHighlight((h) => (h?.clientId === cid && h?.exerciseId === eid ? null : h));
                }, 12_000);
              }
            }}
          />
        ) : null}
      </div>
    </AnimatedBackground>
  );
}

export default function GymConsolePage() {
  return (
    <ProtectedRoute allowedRoles={["coach", "admin"]}>
      <GymConsoleContent />
    </ProtectedRoute>
  );
}
