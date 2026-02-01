"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Search,
  ArrowLeft,
  User,
  Dumbbell,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Clock,
  Target,
  FileText,
} from "lucide-react";
import { DatabaseService } from "@/lib/database";
import { fetchApi } from "@/lib/apiClient";

// ============================================================================
// TYPES
// ============================================================================

interface Client {
  client_id: string;
  coach_id: string;
  status: string;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    email?: string;
  };
}

interface BlockExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  sets?: number;
  reps?: string;
  weight_kg?: number;
  rest_seconds?: number;
  tempo?: string;
  rir?: number;
  notes?: string;
}

interface WorkoutBlock {
  id: string;
  block_type: string;
  block_name?: string;
  block_order: number;
  exercises: BlockExercise[];
}

interface NextWorkoutResponse {
  status: "active" | "completed" | "no_program";
  message?: string;
  client_id: string;
  client_name: string;
  client_avatar_url?: string | null;
  program_assignment_id?: string;
  program_id?: string;
  program_name?: string;
  current_week_index?: number;
  current_day_index?: number;
  is_completed?: boolean;
  week_label?: string;
  day_label?: string;
  position_label?: string;
  total_weeks?: number;
  days_in_current_week?: number;
  template_id?: string;
  workout_name?: string;
  workout_description?: string | null;
  estimated_duration?: number | null;
  blocks?: WorkoutBlock[];
  warning?: string;
  error?: string;
}

interface MarkCompleteResponse {
  success: boolean;
  message: string;
  completed?: {
    week_index: number;
    day_index: number;
    week_label: string;
    day_label: string;
  };
  current_week_index?: number;
  current_day_index?: number;
  is_completed?: boolean;
  next_workout?: {
    week_label: string;
    day_label: string;
    position_label: string;
    template_id: string;
    workout_name: string;
  } | null;
  error?: string;
  warning?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "gym-console-last-client";

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ClientListItem({
  client,
  isSelected,
  onClick,
}: {
  client: Client;
  isSelected: boolean;
  onClick: () => void;
}) {
  const name = client.profiles
    ? `${client.profiles.first_name || ""} ${client.profiles.last_name || ""}`.trim() || "Client"
    : "Client";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
        isSelected
          ? "bg-cyan-500/20 border border-cyan-500/40"
          : "hover:bg-white/5 border border-transparent"
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
        {client.profiles?.avatar_url ? (
          <img
            src={client.profiles.avatar_url}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <User className="w-5 h-5 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[color:var(--fc-text-primary)] truncate">
          {name}
        </p>
        <p className="text-xs text-[color:var(--fc-text-dim)] truncate">
          {client.profiles?.email || "No email"}
        </p>
      </div>
      {isSelected && <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />}
    </button>
  );
}

function ExerciseRow({ exercise }: { exercise: BlockExercise }) {
  const prescription = [];
  if (exercise.sets) prescription.push(`${exercise.sets} sets`);
  if (exercise.reps) prescription.push(`${exercise.reps} reps`);
  if (exercise.weight_kg) prescription.push(`${exercise.weight_kg}kg`);
  if (exercise.rir !== undefined && exercise.rir !== null) prescription.push(`RIR ${exercise.rir}`);
  if (exercise.rest_seconds) prescription.push(`${exercise.rest_seconds}s rest`);
  if (exercise.tempo) prescription.push(`Tempo: ${exercise.tempo}`);

  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
        <Dumbbell className="w-3 h-3 text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[color:var(--fc-text-primary)] text-sm">
          {exercise.exercise_name}
        </p>
        <p className="text-xs text-[color:var(--fc-text-dim)]">
          {prescription.join(" • ") || "No prescription"}
        </p>
        {exercise.notes && (
          <p className="text-xs text-cyan-400 mt-1 italic">
            {exercise.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function BlockCard({ block }: { block: WorkoutBlock }) {
  const blockLabel = block.block_name || block.block_type.replace(/_/g, " ");

  return (
    <div className="p-3 rounded-lg bg-white/5 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs capitalize">
          {blockLabel}
        </Badge>
        <span className="text-xs text-[color:var(--fc-text-dim)]">
          {block.exercises.length} exercise{block.exercises.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="divide-y divide-white/5">
        {block.exercises.map((ex) => (
          <ExerciseRow key={ex.id} exercise={ex} />
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-white/10 rounded w-2/3" />
      <div className="h-6 bg-white/10 rounded w-1/2" />
      <div className="h-4 bg-white/10 rounded w-1/3" />
      <div className="space-y-3 mt-6">
        <div className="h-24 bg-white/10 rounded" />
        <div className="h-24 bg-white/10 rounded" />
        <div className="h-24 bg-white/10 rounded" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function GymConsoleContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const { addToast } = useToast();

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [workoutData, setWorkoutData] = useState<NextWorkoutResponse | null>(null);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [workoutError, setWorkoutError] = useState<string | null>(null);

  const [markingComplete, setMarkingComplete] = useState(false);

  // ============================================================================
  // LOAD CLIENTS
  // ============================================================================

  useEffect(() => {
    async function loadClients() {
      if (!user) return;

      try {
        setClientsLoading(true);
        const data = await DatabaseService.getClients(user.id);
        
        // Filter to active clients only
        const activeClients = data.filter((c) => c.status === "active");
        setClients(activeClients);

        // Restore last selected client from localStorage
        const lastClientId = localStorage.getItem(STORAGE_KEY);
        if (lastClientId && activeClients.some((c) => c.client_id === lastClientId)) {
          setSelectedClientId(lastClientId);
        } else if (activeClients.length > 0) {
          // Auto-select first client
          setSelectedClientId(activeClients[0].client_id);
        }
      } catch (error) {
        console.error("Error loading clients:", error);
        addToast({
          title: "Error",
          description: "Failed to load clients",
          variant: "destructive",
        });
      } finally {
        setClientsLoading(false);
      }
    }

    loadClients();
  }, [user, addToast]);

  // ============================================================================
  // FETCH NEXT WORKOUT
  // ============================================================================

  const fetchNextWorkout = useCallback(async (clientId: string) => {
    setWorkoutLoading(true);
    setWorkoutError(null);

    try {
      const response = await fetchApi(`/api/coach/pickup/next-workout?clientId=${clientId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422) {
          setWorkoutError(data.message || "Program schedule not configured");
        } else {
          setWorkoutError(data.error || "Failed to fetch workout");
        }
        setWorkoutData(null);
        return;
      }

      setWorkoutData(data);

      if (data.warning) {
        addToast({
          title: "Warning",
          description: data.warning,
          variant: "warning",
        });
      }
    } catch (error) {
      console.error("Error fetching next workout:", error);
      setWorkoutError("Failed to fetch workout");
      setWorkoutData(null);
    } finally {
      setWorkoutLoading(false);
    }
  }, [addToast]);

  // Fetch workout when client changes
  useEffect(() => {
    if (selectedClientId) {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, selectedClientId);
      fetchNextWorkout(selectedClientId);
    } else {
      setWorkoutData(null);
      setWorkoutError(null);
    }
  }, [selectedClientId, fetchNextWorkout]);

  // ============================================================================
  // MARK COMPLETE
  // ============================================================================

  const handleMarkComplete = async () => {
    if (!selectedClientId || markingComplete) return;

    setMarkingComplete(true);

    try {
      const response = await fetchApi("/api/coach/pickup/mark-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId }),
      });

      const data: MarkCompleteResponse = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          addToast({
            title: "Already Completed",
            description: data.message || "This day was already marked complete",
            variant: "warning",
          });
        } else {
          addToast({
            title: "Error",
            description: data.error || "Failed to mark complete",
            variant: "destructive",
          });
        }
        return;
      }

      // Success!
      addToast({
        title: "Workout Complete!",
        description: data.message,
        variant: "success",
      });

      // Re-fetch to get updated state
      await fetchNextWorkout(selectedClientId);

    } catch (error) {
      console.error("Error marking complete:", error);
      addToast({
        title: "Error",
        description: "Failed to mark workout complete",
        variant: "destructive",
      });
    } finally {
      setMarkingComplete(false);
    }
  };

  // ============================================================================
  // FILTERED CLIENTS
  // ============================================================================

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;

    const query = searchQuery.toLowerCase();
    return clients.filter((client) => {
      const name = client.profiles
        ? `${client.profiles.first_name || ""} ${client.profiles.last_name || ""}`.toLowerCase()
        : "";
      const email = client.profiles?.email?.toLowerCase() || "";
      return name.includes(query) || email.includes(query);
    });
  }, [clients, searchQuery]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 h-[100dvh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <Link href="/coach">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-cyan-400" />
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Pickup Mode
                </span>
              </div>
              <h1 className="text-lg font-bold text-[color:var(--fc-text-primary)]">
                Gym Console
              </h1>
            </div>
          </div>
        </div>

        {/* Main Content - Two Panel Layout */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-7xl mx-auto flex flex-col lg:flex-row">
            {/* Left Panel - Client List */}
            <div className="lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col">
              {/* Search */}
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--fc-text-dim)]" />
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10"
                  />
                </div>
              </div>

              {/* Client List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {clientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-[color:var(--fc-text-dim)]">
                    {searchQuery ? "No clients match your search" : "No active clients"}
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <ClientListItem
                      key={client.client_id}
                      client={client}
                      isSelected={client.client_id === selectedClientId}
                      onClick={() => setSelectedClientId(client.client_id)}
                    />
                  ))
                )}
              </div>

              {/* Client count */}
              <div className="p-3 border-t border-white/10 text-xs text-[color:var(--fc-text-dim)]">
                {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Right Panel - Workout Preview */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {!selectedClientId ? (
                // No client selected
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <User className="h-16 w-16 text-[color:var(--fc-text-dim)] opacity-30 mb-4" />
                  <h2 className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                    Select a Client
                  </h2>
                  <p className="text-[color:var(--fc-text-dim)] mt-2">
                    Choose a client from the list to view their next workout
                  </p>
                </div>
              ) : workoutLoading ? (
                // Loading
                <GlassCard elevation={1} className="fc-glass fc-card p-6">
                  <LoadingSkeleton />
                </GlassCard>
              ) : workoutError ? (
                // Error state
                <GlassCard elevation={1} className="fc-glass fc-card p-6 border-yellow-500/30">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="h-8 w-8 text-yellow-400 shrink-0" />
                    <div>
                      <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                        Schedule Not Configured
                      </h2>
                      <p className="text-[color:var(--fc-text-dim)] mt-1">
                        {workoutError}
                      </p>
                      <p className="text-sm text-[color:var(--fc-text-dim)] mt-3">
                        Please configure the program schedule before using Pickup Mode.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ) : workoutData?.status === "no_program" ? (
                // No program assigned
                <GlassCard elevation={1} className="fc-glass fc-card p-6">
                  <div className="flex items-start gap-4">
                    <FileText className="h-8 w-8 text-[color:var(--fc-text-dim)] shrink-0" />
                    <div>
                      <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                        No Active Program
                      </h2>
                      <p className="text-[color:var(--fc-text-dim)] mt-1">
                        {workoutData.client_name} does not have an active program assigned.
                      </p>
                      <Link href={`/coach/clients/${selectedClientId}`}>
                        <Button variant="outline" className="mt-4">
                          Assign Program
                        </Button>
                      </Link>
                    </div>
                  </div>
                </GlassCard>
              ) : workoutData?.status === "completed" ? (
                // Program completed
                <GlassCard elevation={1} className="fc-glass fc-card p-6 border-green-500/30">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-8 w-8 text-green-400 shrink-0" />
                    <div>
                      <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                        Program Completed!
                      </h2>
                      <p className="text-[color:var(--fc-text-dim)] mt-1">
                        {workoutData.client_name} has finished <strong>{workoutData.program_name}</strong>
                      </p>
                      <p className="text-sm text-green-400 mt-2">
                        All training days have been completed.
                      </p>
                      <Link href={`/coach/clients/${selectedClientId}`}>
                        <Button variant="outline" className="mt-4">
                          View Client Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </GlassCard>
              ) : workoutData?.status === "active" ? (
                // Active workout preview
                <div className="space-y-4">
                  {/* Header */}
                  <GlassCard elevation={1} className="fc-glass fc-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-[color:var(--fc-text-dim)]">
                          {workoutData.client_name}
                        </p>
                        <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                          {workoutData.program_name}
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                            {workoutData.position_label}
                          </Badge>
                          <span className="text-xs text-[color:var(--fc-text-dim)]">
                            Week {(workoutData.current_week_index || 0) + 1} of {workoutData.total_weeks}
                          </span>
                        </div>
                      </div>
                      {workoutData.estimated_duration && (
                        <div className="flex items-center gap-1 text-[color:var(--fc-text-dim)]">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">{workoutData.estimated_duration} min</span>
                        </div>
                      )}
                    </div>
                  </GlassCard>

                  {/* Workout Template Name */}
                  <GlassCard elevation={1} className="fc-glass fc-card p-4">
                    <div className="flex items-center gap-3">
                      <Dumbbell className="h-5 w-5 text-cyan-400" />
                      <div>
                        <p className="text-sm text-[color:var(--fc-text-dim)]">Today's Workout</p>
                        <p className="font-semibold text-[color:var(--fc-text-primary)]">
                          {workoutData.workout_name}
                        </p>
                        {workoutData.workout_description && (
                          <p className="text-xs text-[color:var(--fc-text-dim)] mt-1">
                            {workoutData.workout_description}
                          </p>
                        )}
                      </div>
                    </div>
                  </GlassCard>

                  {/* Blocks Preview */}
                  {workoutData.blocks && workoutData.blocks.length > 0 ? (
                    <GlassCard elevation={1} className="fc-glass fc-card p-4">
                      <h3 className="text-sm font-medium text-[color:var(--fc-text-dim)] mb-3">
                        Exercises ({workoutData.blocks.reduce((sum, b) => sum + b.exercises.length, 0)})
                      </h3>
                      {workoutData.blocks.map((block) => (
                        <BlockCard key={block.id} block={block} />
                      ))}
                    </GlassCard>
                  ) : (
                    <GlassCard elevation={1} className="fc-glass fc-card p-4">
                      <p className="text-[color:var(--fc-text-dim)] text-sm">
                        No exercises configured for this workout template.
                      </p>
                    </GlassCard>
                  )}

                  {/* Mark Complete Button */}
                  <Button
                    onClick={handleMarkComplete}
                    disabled={markingComplete}
                    className="w-full py-6 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    {markingComplete ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Marking Complete...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Mark Workout Complete
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
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
