"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Dumbbell,
  CheckCircle,
  Loader2,
  Target,
  Plus,
  RefreshCw,
  Eye,
  SkipForward,
  Play,
  Pencil,
  X,
} from "lucide-react";
import { fetchApi } from "@/lib/apiClient";

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEY_CLIENTS = "gym-console-clients";
const NOTES_KEY_PREFIX = "gym-console-notes-";
const POLL_INTERVAL_MS = 30_000;
const MAX_CONSOLE_CLIENTS = 6;

// ============================================================================
// TYPES
// ============================================================================

interface ClientStatus {
  clientId: string;
  clientName: string;
  programName: string | null;
  programAssignmentId: string | null;
  currentWeek: number | null;
  currentDay: number | null;
  nextWorkout: {
    workoutName: string;
    templateId: string;
    scheduleId: string;
    programAssignmentId: string;
    blockCount: number;
    exerciseCount: number;
  } | null;
  activeSession: {
    sessionId: string;
    workoutLogId: string;
    workoutAssignmentId: string;
    startedAt: string;
    currentBlock: number;
    currentExercise: string;
    currentSet: string;
    lastSetLoggedAt: string;
    isIdle: boolean;
  } | null;
  status: "active_session" | "idle_session" | "no_session" | "no_program" | "program_completed";
}

interface ClientForModal {
  client_id: string;
  coach_id: string;
  status: string;
  profiles?: { id: string; first_name?: string; last_name?: string; email?: string };
}

interface BlockExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  sets?: number;
  reps?: string;
  weight_kg?: number;
}

interface WorkoutBlock {
  id: string;
  set_type?: string;
  set_name?: string;
  block_type?: string;
  block_name?: string;
  set_order?: number;
  exercises: BlockExercise[];
}

interface NextWorkoutResponse {
  status: "active" | "completed" | "no_program";
  client_name?: string;
  program_name?: string;
  position_label?: string;
  workout_name?: string;
  blocks?: WorkoutBlock[];
  template_id?: string;
  [key: string]: unknown;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatNameFirstLastInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "Client";
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0)}.`;
}

function getStatusDot(status: ClientStatus["status"]) {
  if (status === "active_session") return "bg-green-500";
  if (status === "idle_session") return "bg-amber-500";
  return "bg-white/40";
}

// ============================================================================
// CLIENT CARD
// ============================================================================

function ClientCard({
  status,
  note,
  onNoteChange,
  onView,
  onSkipDay,
  onMarkComplete,
  onStartWorkout,
  onLogSet,
  skipLoading,
  markLoading,
  startLoading,
}: {
  status: ClientStatus;
  note: string;
  onNoteChange: (value: string) => void;
  onView: () => void;
  onSkipDay: () => void;
  onMarkComplete: () => void;
  onStartWorkout: () => void;
  onLogSet: () => void;
  skipLoading: boolean;
  markLoading: boolean;
  startLoading: boolean;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState(note);
  const hasSession = status.status === "active_session" || status.status === "idle_session";
  const hasNextWorkout = status.nextWorkout && status.status !== "program_completed" && status.status !== "no_program";
  const canSkipDay = hasNextWorkout && (status.nextWorkout?.programAssignmentId && status.nextWorkout?.scheduleId);

  useEffect(() => {
    setNoteInput(note);
  }, [note]);

  const saveNote = () => {
    onNoteChange(noteInput.trim());
    setEditingNote(false);
  };

  const weekDay =
    status.currentWeek != null && status.currentDay != null
      ? `Week ${status.currentWeek}, Day ${status.currentDay}`
      : null;
  const workoutLabel = status.activeSession
    ? status.nextWorkout?.workoutName ?? "—"
    : status.nextWorkout?.workoutName ?? (status.status === "program_completed" ? "Program complete" : status.status === "no_program" ? "No program" : "—");
  const blockSetLabel =
    status.activeSession &&
    `${status.activeSession.currentBlock > 0 ? `Block ${status.activeSession.currentBlock}/${status.nextWorkout?.blockCount ?? "?"}` : ""} ${status.activeSession.currentExercise} · Set ${status.activeSession.currentSet}`.trim();

  return (
    <GlassCard elevation={1} className="fc-glass fc-card p-4 flex flex-col min-h-[200px]">
      <div className="flex items-start gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${getStatusDot(status.status)}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[color:var(--fc-text-primary)] truncate">
            {formatNameFirstLastInitial(status.clientName)}
          </p>
          {weekDay && (
            <p className="text-xs text-[color:var(--fc-text-dim)]">{weekDay}</p>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <p className="text-sm font-medium text-[color:var(--fc-text-primary)] truncate">{workoutLabel}</p>
        {blockSetLabel && (
          <p className="text-xs text-[color:var(--fc-text-dim)] truncate mt-0.5">{blockSetLabel}</p>
        )}
      </div>
      {/* Coach note */}
      <div className="mt-2 pt-2 border-t border-white/10">
        {editingNote ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onBlur={saveNote}
              onKeyDown={(e) => e.key === "Enter" && saveNote()}
              placeholder="Note for this client..."
              className="flex-1 min-w-0 text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-[color:var(--fc-text-primary)]"
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={saveNote}>
              <CheckCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className="w-full text-left flex items-center gap-1 text-xs text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
          >
            <Pencil className="h-3 w-3 shrink-0" />
            <span className="truncate flex-1">{note || "Add note..."}</span>
          </button>
        )}
      </div>
      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        <Button variant="outline" size="sm" className="text-xs" onClick={onView}>
          <Eye className="h-3.5 w-3.5 mr-1" />
          View
        </Button>
        {canSkipDay && (
          <Button variant="outline" size="sm" className="text-xs" onClick={onSkipDay} disabled={skipLoading}>
            {skipLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5 mr-1" />}
            Skip Day
          </Button>
        )}
        {hasSession && (
          <>
            <Button size="sm" className="text-xs bg-cyan-600 hover:bg-cyan-700" onClick={onLogSet} disabled={!status.activeSession?.workoutLogId}>
              <Dumbbell className="h-3.5 w-3.5 mr-1" />
              Log Set
            </Button>
            <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700" onClick={onMarkComplete} disabled={markLoading}>
              {markLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
              Mark Complete
            </Button>
          </>
        )}
        {!hasSession && hasNextWorkout && (
          <Button size="sm" className="text-xs bg-cyan-600 hover:bg-cyan-700" onClick={onStartWorkout} disabled={startLoading}>
            {startLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
            Start Workout
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================================================
// VIEW DETAIL PANEL (slide-over content)
// ============================================================================

function ViewDetailPanel({
  clientId,
  clientName,
  onClose,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<NextWorkoutResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchApi(`/api/coach/pickup/next-workout?clientId=${clientId}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) {
          if (body.error) setError(body.error || "Failed to load");
          else setData(body);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div className="h-full flex flex-col bg-[color:var(--fc-surface)] border-l border-[color:var(--fc-glass-border)]">
      <div className="p-4 border-b border-[color:var(--fc-glass-border)] flex items-center justify-between">
        <h2 className="font-semibold text-[color:var(--fc-text-primary)]">{clientName}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        )}
        {error && (
          <p className="text-sm text-amber-500">{error}</p>
        )}
        {!loading && !error && data?.status === "active" && data.blocks && data.blocks.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-[color:var(--fc-text-dim)]">
              {data.program_name} · {data.position_label}
            </p>
            <p className="font-medium text-[color:var(--fc-text-primary)]">{data.workout_name}</p>
            {data.blocks.map((block) => (
              <div key={block.id} className="p-3 rounded-lg bg-white/5">
                <p className="text-xs font-medium text-[color:var(--fc-text-dim)] mb-2">
                  {block.block_name ?? block.set_name ?? (block.block_type ?? block.set_type ?? "").replace(/_/g, " ")} · {block.exercises.length} exercise(s)
                </p>
                <ul className="space-y-1">
                  {block.exercises.map((ex) => (
                    <li key={ex.id} className="flex items-center gap-2 text-sm text-[color:var(--fc-text-primary)]">
                      <Dumbbell className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      {ex.exercise_name}
                      {(ex.sets || ex.reps) && (
                        <span className="text-xs text-[color:var(--fc-text-dim)]">
                          {ex.sets && `${ex.sets} sets`}
                          {ex.reps && ` · ${ex.reps} reps`}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {!loading && !error && data?.status === "no_program" && (
          <p className="text-sm text-[color:var(--fc-text-dim)]">No active program.</p>
        )}
        {!loading && !error && data?.status === "completed" && (
          <p className="text-sm text-green-400">Program completed.</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// QUICK LOG SET MODAL
// ============================================================================

function QuickLogModal({
  open,
  onClose,
  clientId,
  clientName,
  workoutLogId,
  workoutAssignmentId,
  sessionId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  workoutLogId: string;
  workoutAssignmentId: string;
  sessionId: string;
  onSuccess: () => void;
}) {
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<{ blockId: string; exerciseId: string; exerciseName: string } | null>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const { addToast } = useToast();

  useEffect(() => {
    if (!open || !clientId) return;
    setLoading(true);
    setBlocks([]);
    setSelected(null);
    setWeight("");
    setReps("");
    fetchApi(`/api/coach/pickup/next-workout?clientId=${clientId}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.blocks && Array.isArray(body.blocks)) {
          setBlocks(body.blocks);
        }
      })
      .catch(() => addToast({ title: "Failed to load exercises", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, clientId, addToast]);

  const exerciseOptions: { blockId: string; exerciseId: string; exerciseName: string }[] = [];
  for (const block of blocks) {
    for (const ex of block.exercises || []) {
      if (ex.exercise_id && ex.exercise_name) {
        exerciseOptions.push({
          blockId: block.id,
          exerciseId: ex.exercise_id,
          exerciseName: ex.exercise_name,
        });
      }
    }
  }

  const handleSubmit = async () => {
    if (!selected || !weight.trim() || !reps.trim()) {
      addToast({ title: "Enter weight and reps", variant: "destructive" });
      return;
    }
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (isNaN(w) || w < 0 || isNaN(r) || r <= 0) {
      addToast({ title: "Invalid weight or reps", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchApi("/api/log-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          workout_log_id: workoutLogId,
          workout_assignment_id: workoutAssignmentId,
          session_id: sessionId,
          set_entry_id: selected.blockId,
          exercise_id: selected.exerciseId,
          weight: w,
          reps: r,
          set_type: "straight_set",
          set_number: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to log set");
      addToast({ title: "Set logged", description: `${selected.exerciseName}: ${w}kg × ${r} reps`, variant: "success" });
      onSuccess();
      onClose();
    } catch (e) {
      addToast({ title: "Error", description: e instanceof Error ? e.message : "Failed to log set", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="fc-glass fc-card p-4 w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">Log Set — {clientName}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[color:var(--fc-text-dim)] block mb-1">Exercise</label>
              <select
                value={selected ? `${selected.blockId}:${selected.exerciseId}` : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    setSelected(null);
                    return;
                  }
                  const opt = exerciseOptions.find((o) => `${o.blockId}:${o.exerciseId}` === v);
                  setSelected(opt ?? null);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[color:var(--fc-text-primary)]"
              >
                <option value="">Select exercise</option>
                {exerciseOptions.map((o) => (
                  <option key={`${o.blockId}:${o.exerciseId}`} value={`${o.blockId}:${o.exerciseId}`}>
                    {o.exerciseName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[color:var(--fc-text-dim)] block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0"
                  step="0.5"
                  min="0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[color:var(--fc-text-primary)]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[color:var(--fc-text-dim)] block mb-1">Reps</label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="0"
                  step="1"
                  min="1"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[color:var(--fc-text-primary)]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                onClick={handleSubmit}
                disabled={submitting || !selected}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Set"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ADD CLIENT MODAL
// ============================================================================

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
    fetch("/api/coach/clients")
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="fc-glass fc-card p-4 w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">Add clients to console</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-[color:var(--fc-text-dim)] mb-2">Select up to {MAX_CONSOLE_CLIENTS} clients.</p>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto space-y-1 mb-4">
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
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm ${
                      isSelected ? "bg-cyan-500/20 border border-cyan-500/40" : "hover:bg-white/5 border border-transparent"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <User className="h-4 w-4 shrink-0 text-[color:var(--fc-text-dim)]" />
                    <span className="text-[color:var(--fc-text-primary)] truncate">{name}</span>
                    {isSelected && <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN
// ============================================================================

function GymConsoleContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();

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
  const [actionLoading, setActionLoading] = useState<{ skip?: string; mark?: string; start?: string }>({});
  const [quickLogClient, setQuickLogClient] = useState<{
    clientId: string;
    clientName: string;
    workoutLogId: string;
    workoutAssignmentId: string;
    sessionId: string;
  } | null>(null);

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
    } catch {}
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
    } catch {}
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
      addToast({ title: "Error", description: e instanceof Error ? e.message : "Failed to skip day", variant: "destructive" });
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
          addToast({ title: "Already completed", description: data.message ?? "Already marked complete", variant: "warning" });
        } else throw new Error(data?.error ?? "Failed to mark complete");
      } else {
        addToast({ title: "Workout complete", description: data.message, variant: "success" });
      }
      await fetchStatus();
    } catch (e) {
      addToast({ title: "Error", description: e instanceof Error ? e.message : "Failed to mark complete", variant: "destructive" });
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
      addToast({ title: "Error", description: e instanceof Error ? e.message : "Failed to start workout", variant: "destructive" });
    } finally {
      setActionLoading((prev) => ({ ...prev, start: undefined }));
    }
  };

  const statusByClientId = new Map(statusList.map((s) => [s.clientId, s]));
  const secondsAgo = lastFetchedAt ? Math.floor((Date.now() - lastFetchedAt) / 1000) : null;

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 h-[100dvh] flex flex-col">
        <div className="px-4 py-3 border-b border-[color:var(--fc-glass-border)] fc-glass">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
            <Link
              href="/coach/programs"
              className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Training
            </Link>
            <Link href="/coach">
              <Button variant="ghost" size="icon" className="shrink-0 fc-btn fc-btn-ghost">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)]">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                  Gym Console
                </h1>
                <p className="text-xs text-[color:var(--fc-text-dim)]">
                  {consoleClientIds.length} client{consoleClientIds.length !== 1 ? "s" : ""} active
                  {secondsAgo != null && (
                    <span className="ml-2">· Last updated {secondsAgo}s ago</span>
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0"
              onClick={fetchStatus}
              disabled={statusLoading}
            >
              {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto overflow-x-hidden min-w-0">
          <div className="max-w-7xl mx-auto p-4 min-w-0">
            {consoleClientIds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <User className="h-16 w-16 text-[color:var(--fc-text-dim)] opacity-30 mb-4" />
                <h2 className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                  No clients in console
                </h2>
                <p className="text-[color:var(--fc-text-dim)] mt-2 max-w-sm">
                  Add up to 6 clients to manage them during a live gym session.
                </p>
                <Button className="mt-6" onClick={() => setAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add clients to console
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {consoleClientIds.map((clientId) => {
                    const status = statusByClientId.get(clientId);
                    if (!status) {
                      return (
                        <GlassCard key={clientId} elevation={1} className="fc-glass fc-card p-4 min-h-[200px] flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                        </GlassCard>
                      );
                    }
                    return (
                      <ClientCard
                        key={clientId}
                        status={status}
                        note={getNote(clientId)}
                        onNoteChange={(v) => setNote(clientId, v)}
                        onView={() => {
                          setViewDetailClientId(clientId);
                          setViewDetailClientName(status.clientName);
                        }}
                        onSkipDay={() => handleSkipDay(status)}
                        onMarkComplete={() => handleMarkComplete(clientId)}
                        onStartWorkout={() => handleStartWorkout(clientId)}
                        onLogSet={() => {
                          const s = statusByClientId.get(clientId);
                          if (s?.activeSession?.workoutLogId) {
                            setQuickLogClient({
                              clientId,
                              clientName: s.clientName,
                              workoutLogId: s.activeSession.workoutLogId,
                              workoutAssignmentId: s.activeSession.workoutAssignmentId,
                              sessionId: s.activeSession.sessionId,
                            });
                          }
                        }}
                        skipLoading={actionLoading.skip === clientId}
                        markLoading={actionLoading.mark === clientId}
                        startLoading={actionLoading.start === clientId}
                      />
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" onClick={() => setAddModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add client to console
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* View detail slide-over */}
        {viewDetailClientId && (
          <div className="fixed inset-y-0 right-0 w-full max-w-md z-40 shadow-xl">
            <ViewDetailPanel
              clientId={viewDetailClientId}
              clientName={viewDetailClientName}
              onClose={() => {
                setViewDetailClientId(null);
                setViewDetailClientName("");
              }}
            />
          </div>
        )}

        <AddClientModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          currentIds={consoleClientIds}
          onSave={saveConsoleClients}
        />

        {quickLogClient && (
          <QuickLogModal
            open={!!quickLogClient}
            onClose={() => setQuickLogClient(null)}
            clientId={quickLogClient.clientId}
            clientName={quickLogClient.clientName}
            workoutLogId={quickLogClient.workoutLogId}
            workoutAssignmentId={quickLogClient.workoutAssignmentId}
            sessionId={quickLogClient.sessionId}
            onSuccess={fetchStatus}
          />
        )}
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
