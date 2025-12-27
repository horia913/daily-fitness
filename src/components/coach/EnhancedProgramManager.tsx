"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useTheme } from "@/contexts/ThemeContext";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import {
  Plus,
  Save,
  X,
  Calendar,
  Clock,
  Dumbbell,
  Target,
  Users,
  Edit,
  Trash2,
  TrendingUp,
  Award,
  Zap,
  CheckCircle,
  Info,
  BookOpen,
  RefreshCw,
  Star,
  Activity,
  UserPlus,
  Replace,
} from "lucide-react";
import ProgramCard from "@/components/features/programs/ProgramCard";
import WorkoutTemplateService, {
  WorkoutTemplate,
  ProgramSchedule,
  ProgressionRule,
  Exercise,
  ExerciseCategory,
  TemplateExercise,
} from "@/lib/workoutTemplateService";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ProgramProgressionService } from "@/lib/programProgressionService";
import ProgramProgressionRulesEditor from "@/components/coach/ProgramProgressionRulesEditor";

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
  schedule?: ProgramSchedule[];
  progression_rules?: ProgressionRule[];
}

interface Client {
  id: string;
  coach_id: string;
  client_id: string;
  status: "active" | "inactive" | "pending";
  created_at: string;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface EnhancedProgramManagerProps {
  coachId: string;
  onProgramsChange?: () => void;
}

export default function EnhancedProgramManager({
  coachId,
}: EnhancedProgramManagerProps) {
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();
  const { user } = useAuth();

  // State management
  const [programs, setPrograms] = useState<Program[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [programAssignmentCounts, setProgramAssignmentCounts] = useState<
    Record<string, number>
  >({});

  // Modal states
  const [showCreateProgram, setShowCreateProgram] = useState(false);

  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showProgramDetails, setShowProgramDetails] = useState(false);

  // Assignment states
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedProgramForAssignment, setSelectedProgramForAssignment] =
    useState<Program | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  // Load assignment counts for all programs
  const loadProgramAssignmentCounts = useCallback(async () => {
    try {
      const { data: assignments, error } = await supabase
        .from("program_assignments")
        .select("program_id")
        .eq("coach_id", coachId);

      if (error) {
        console.error("Error loading program assignment counts:", error);
        return;
      }

      // Count assignments per program
      const counts: Record<string, number> = {};
      assignments?.forEach((assignment) => {
        counts[assignment.program_id] =
          (counts[assignment.program_id] || 0) + 1;
      });

      console.log("📊 Program assignment counts loaded:", counts);
      setProgramAssignmentCounts(counts);
    } catch (error) {
      console.error("Error loading program assignment counts:", error);
    }
  }, [coachId]);

  useEffect(() => {
    loadData();
    loadProgramAssignmentCounts();
  }, [coachId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, exercisesData, categoriesData, programsData] =
        await Promise.all([
          WorkoutTemplateService.getWorkoutTemplates(coachId),
          WorkoutTemplateService.getExercises(),
          WorkoutTemplateService.getExerciseCategories(),
          WorkoutTemplateService.getPrograms(coachId),
        ]);

      setTemplates(
        templatesData.map((template) => ({
          ...template,
          exercises: template.exercises?.map((exercise) => {
            // Parse exercise configuration from notes field
            let config = null;
            if (exercise.notes) {
              try {
                config = JSON.parse(exercise.notes);
              } catch (error) {
                console.error("Failed to parse exercise config:", error);
              }
            }

            return {
              ...exercise,
              config: config,
            };
          }),
        }))
      );
      setExercises(exercisesData);
      setCategories(categoriesData);
      setPrograms(programsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openProgramDetails = (program: Program) => {
    if (program?.id) {
      window.location.href = `/coach/programs/${program.id}`;
    }
  };

  const deleteProgram = async (program: Program) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${program.name}"? This action cannot be undone.`
      )
    ) {
      try {
        const success = await WorkoutTemplateService.deleteProgram(program.id);
        if (success) {
          console.log("🔧 Program deleted successfully");
          loadData(); // Reload the data to refresh the list
        } else {
          alert("Failed to delete program. Please try again.");
        }
      } catch (error) {
        console.error("Error deleting program:", error);
        alert("Error deleting program. Please try again.");
      }
    }
  };

  // Assignment functions
  const handleAssignProgram = async (program: Program) => {
    setSelectedProgramForAssignment(program);
    setSelectedClients([]);
    setShowAssignmentModal(true);

    // Load clients for this coach (async)
    if (user?.id) {
      try {
        // Fetch clients directly using supabase
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .eq("coach_id", user.id)
          .eq("status", "active");

        if (clientsError) throw clientsError;

        if (clientsData && clientsData.length > 0) {
          // Fetch profiles for each client
          const clientIds = clientsData.map((c) => c.client_id);
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("*")
            .in("id", clientIds);

          if (profilesError) throw profilesError;

          // Load existing assignments for this program to filter out already-assigned clients
          const { data: existingAssignments, error: assignmentsError } =
            await supabase
              .from("program_assignments")
              .select("client_id")
              .eq("program_id", program.id)
              .eq("coach_id", user.id);

          if (assignmentsError) throw assignmentsError;

          // Filter out clients who already have this program assigned
          const alreadyAssignedClientIds = new Set(
            existingAssignments?.map((a) => a.client_id) || []
          );
          const availableClients = clientsData.filter(
            (client) => !alreadyAssignedClientIds.has(client.client_id)
          );

          console.log(
            "📊 Available clients for assignment:",
            availableClients.length,
            "out of",
            clientsData.length
          );
          console.log(
            "📊 Already assigned clients:",
            Array.from(alreadyAssignedClientIds)
          );

          if (availableClients.length === 0) {
            alert("All clients already have this program assigned!");
            setShowAssignmentModal(false);
            return;
          }

          // Combine client and profile data for available clients only
          const clientsWithProfiles = availableClients.map((client) => ({
            ...client,
            profiles: profilesData?.find((p) => p.id === client.client_id),
          }));

          setClients(clientsWithProfiles);
        } else {
          setClients([]);
        }
      } catch (error) {
        console.error("Error loading clients:", error);
        alert("Error loading clients. Please try again.");
        // Don't return here, let the modal show even if clients fail to load
      }
    }
  };

  const [assignStartDate, setAssignStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [assignNotes, setAssignNotes] = useState<string>("");
  const [assignNotify, setAssignNotify] = useState<boolean>(false);

  const assignProgramToClients = async (
    programId: string,
    clientIds: string[],
    coachId: string
  ) => {
    const count = await WorkoutTemplateService.assignProgramToClients(
      programId,
      clientIds,
      coachId,
      assignStartDate,
      assignNotes
    );

    // TODO: send notifications if enabled (assignNotify)

    // Refresh program assignment counts
    await loadProgramAssignmentCounts();

    // Dispatch event to refresh assignment counts
    clientIds.forEach((clientId) => {
      window.dispatchEvent(
        new CustomEvent("assignmentMade", {
          detail: { clientId, type: "program" },
        })
      );
      localStorage.setItem(
        "assignmentMade",
        JSON.stringify({ clientId, type: "program", timestamp: Date.now() })
      );
    });

    return count;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse p-6 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
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
      </div>
    );
  }

  return (
    <>
      {/* Assignment Modal */}
      {showAssignmentModal && selectedProgramForAssignment && (
        <div
          style={{
            position: "fixed",
            inset: "0",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "24px",
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
              maxWidth: "28rem",
              width: "100%",
              maxHeight: "80vh",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #E5E7EB" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                    }}
                  >
                    Assign Program
                  </h2>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                      marginTop: "4px",
                    }}
                  >
                    Assign &quot;
                    {selectedProgramForAssignment?.name || "Unknown"}&quot; to
                    clients
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setSelectedProgramForAssignment(null);
                    setSelectedClients([]);
                  }}
                  className="p-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {clients.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6B7280",
                    }}
                  >
                    You don&apos;t have any active clients to assign this
                    program to.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {clients.map((client) => {
                      const isSelected = selectedClients.includes(
                        client.client_id
                      );
                      return (
                        <div
                          key={client.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px",
                            borderRadius: "16px",
                            border: isSelected
                              ? "2px solid #4CAF50"
                              : "2px solid #E5E7EB",
                            backgroundColor: isSelected ? "#F0FDF4" : "#FFFFFF",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClients(
                                selectedClients.filter(
                                  (id) => id !== client.client_id
                                )
                              );
                            } else {
                              setSelectedClients([
                                ...selectedClients,
                                client.client_id,
                              ]);
                            }
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              border: "2px solid",
                              borderColor: isSelected ? "#4CAF50" : "#D1D5DB",
                              backgroundColor: isSelected
                                ? "#4CAF50"
                                : "transparent",
                              transition: "all 0.2s",
                            }}
                          >
                            {isSelected && (
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
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: "16px",
                                fontWeight: "600",
                                color: "#1A1A1A",
                              }}
                            >
                              {client.profiles?.first_name}{" "}
                              {client.profiles?.last_name}
                            </div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "400",
                                color: "#6B7280",
                              }}
                            >
                              {client.profiles?.email}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="text-green-500">
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Start date, notes, notify */}
                  <div className="grid grid-cols-1 gap-3">
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
                        value={assignNotes}
                        onChange={(e) => setAssignNotes(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        rows={2}
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={assignNotify}
                        onChange={(e) => setAssignNotify(e.target.checked)}
                      />
                      Send notification to clients
                    </label>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "16px",
                      borderTop: "1px solid #E5E7EB",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "#6B7280",
                      }}
                    >
                      {selectedClients.length} client
                      {selectedClients.length !== 1 ? "s" : ""} selected
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAssignmentModal(false);
                          setSelectedProgramForAssignment(null);
                          setSelectedClients([]);
                        }}
                        style={{
                          borderRadius: "20px",
                          padding: "12px 24px",
                          fontSize: "14px",
                          fontWeight: "600",
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          if (selectedClients.length === 0) {
                            alert("Please select at least one client.");
                            return;
                          }

                          try {
                            const assigned = await assignProgramToClients(
                              selectedProgramForAssignment.id,
                              selectedClients,
                              user?.id || ""
                            );
                            alert(
                              `Program assigned to ${assigned} client(s) successfully!`
                            );
                            setShowAssignmentModal(false);
                            setSelectedProgramForAssignment(null);
                            setSelectedClients([]);
                            setAssignNotes("");
                          } catch (error) {
                            console.error("Error assigning program:", error);
                            alert("Error assigning program. Please try again.");
                          }
                        }}
                        disabled={selectedClients.length === 0}
                        style={{
                          backgroundColor: "#6C5CE7",
                          borderRadius: "20px",
                          padding: "12px 24px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#FFFFFF",
                        }}
                      >
                        Assign Program
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ minHeight: "100vh", backgroundColor: "#E8E9F3" }}>
        {/* Enhanced Header */}
        <div
          style={{
            padding: "24px 20px",
            backgroundColor: "#E8E9F3",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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
                    style={{ width: "32px", height: "32px", color: "#FFFFFF" }}
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
                  onClick={loadData}
                  style={{
                    borderRadius: "20px",
                    padding: "16px 32px",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
                <Button
                  onClick={() =>
                    (window.location.href = "/coach/programs/create")
                  }
                  style={{
                    backgroundColor: "#6C5CE7",
                    borderRadius: "20px",
                    padding: "16px 32px",
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Create Program
                </Button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  marginBottom: "20px",
                  minHeight: "120px",
                }}
              >
                <div className="flex flex-col items-center text-center gap-3">
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
                  <div style={{ width: "100%", overflow: "hidden" }}>
                    <p
                      style={{
                        fontSize: "40px",
                        fontWeight: "800",
                        color: "#1A1A1A",
                        lineHeight: "1.1",
                        margin: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {programs.length}
                    </p>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "#6B7280",
                        margin: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Programs
                    </p>
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  marginBottom: "20px",
                  minHeight: "120px",
                }}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "18px",
                      background:
                        "linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Calendar
                      style={{
                        width: "32px",
                        height: "32px",
                        color: "#FFFFFF",
                      }}
                    />
                  </div>
                  <div style={{ width: "100%", overflow: "hidden" }}>
                    <p
                      style={{
                        fontSize: "40px",
                        fontWeight: "800",
                        color: "#1A1A1A",
                        lineHeight: "1.1",
                        margin: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {programs.reduce((sum, p) => sum + p.duration_weeks, 0)}
                    </p>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "#6B7280",
                        margin: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Total Weeks
                    </p>
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  marginBottom: "20px",
                  minHeight: "120px",
                }}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "18px",
                      background:
                        "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Users
                      style={{
                        width: "32px",
                        height: "32px",
                        color: "#FFFFFF",
                      }}
                    />
                  </div>
                  <div style={{ width: "100%", overflow: "hidden" }}>
                    <p
                      style={{
                        fontSize: "40px",
                        fontWeight: "800",
                        color: "#1A1A1A",
                        lineHeight: "1.1",
                        margin: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      0
                    </p>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "#6B7280",
                        margin: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Active Clients
                    </p>
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  marginBottom: "20px",
                  minHeight: "120px",
                }}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "18px",
                      background:
                        "linear-gradient(135deg, #F093FB 0%, #F5576C 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <TrendingUp
                      style={{
                        width: "32px",
                        height: "32px",
                        color: "#FFFFFF",
                      }}
                    />
                  </div>
                  <div style={{ width: "100%", overflow: "hidden" }}>
                    <p
                      style={{
                        fontSize: "40px",
                        fontWeight: "800",
                        color: "#1A1A1A",
                        lineHeight: "1.1",
                        margin: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {programs.length > 0
                        ? Math.round(
                            programs.reduce(
                              (sum, p) => sum + p.duration_weeks,
                              0
                            ) / programs.length
                          )
                        : 0}
                    </p>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "#6B7280",
                        margin: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Avg Duration
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Programs List */}
            <div className="space-y-4">
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onEdit={() => {
                    setEditingProgram(program);
                    setShowCreateProgram(true);
                  }}
                  onOpenDetails={() => openProgramDetails(program)}
                  onDelete={() => deleteProgram(program)}
                  onAssign={() => handleAssignProgram(program)}
                  assignmentCount={programAssignmentCounts[program.id] || 0}
                />
              ))}
            </div>

            {/* Empty State */}
            {programs.length === 0 && (
              <Card
                className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}
              >
                <CardContent className="text-center py-16">
                  <div className="relative mb-6">
                    <Calendar className="w-20 h-20 text-slate-400 mx-auto" />
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
                  <Button
                    onClick={() =>
                      (window.location.href = "/coach/programs/create")
                    }
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Program
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modals removed: create/edit/details now use pages */}
        {/* {showCreateProgram && (
          <ProgramCreateForm
            program={editingProgram}
            templates={templates}
            exercises={exercises}
            onTemplatesUpdate={setTemplates}
            onSave={async (data) => {
              try {
                console.log("🔧 Saving program with data:", data);
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) throw new Error("User not authenticated");

                // Extract schedule and progressionRules from data
                const {
                  schedule,
                  progressionRules,
                  selectedWeek,
                  weekValues,
                  ...programData
                } = data;
                console.log("🔧 Program data:", programData);
                console.log("🔧 Schedule:", schedule);
                console.log("🔧 Progression rules:", progressionRules);

                const finalProgramData = {
                  ...programData,
                  difficulty_level: programData.difficulty_level as
                    | "beginner"
                    | "intermediate"
                    | "advanced",
                  coach_id: user.id,
                  is_active: true,
                };
                console.log("🔧 Final program data:", finalProgramData);

                let programId: string;

                if (editingProgram) {
                  console.log(
                    "🔧 Updating existing program:",
                    editingProgram.id
                  );
                  const updatedProgram =
                    await WorkoutTemplateService.updateProgram(
                      editingProgram.id,
                      finalProgramData
                    );
                  console.log("🔧 Update result:", updatedProgram);
                  programId = editingProgram.id;
                } else {
                  console.log("🔧 Creating new program");
                  const newProgram = await WorkoutTemplateService.createProgram(
                    finalProgramData
                  );
                  console.log("🔧 Create result:", newProgram);
                  if (!newProgram) throw new Error("Failed to create program");
                  programId = newProgram.id;
                }

                // Save schedule using only columns that exist in DB (program_id, day_of_week, week_number, template_id)
                console.log("🔧 Persisting program schedule...");
                const { data: existingRows, error: loadExistingError } =
                  await supabase
                    .from("program_schedule")
                    .select("*")
                    .eq("program_id", programId);

                if (loadExistingError) {
                  console.error(
                    "Error loading existing schedule before save:",
                    loadExistingError
                  );
                }

                // Build desired rows differently for create vs edit flows:
                // - Create: if only one week configured, replicate it across all weeks up to duration
                // - Edit: persist only the selected week changes
                let desiredRows: {
                  program_id: string;
                  day_of_week: number;
                  week_number: number;
                  template_id: string;
                }[] = [];
                const inputRows = (schedule || []).map(
                  (item: ProgramSchedule) => ({
                    program_id: programId,
                    day_of_week: (item.program_day ?? 1) - 1,
                    week_number: item.week_number || 1,
                    template_id: item.template_id,
                  })
                );

                const uniqueWeeks = Array.from(
                  new Set(inputRows.map((r) => r.week_number))
                );
                if (!editingProgram) {
                  if (uniqueWeeks.length === 1 && uniqueWeeks[0] === 1) {
                    // Replicate week 1 across total duration
                    for (
                      let w = 1;
                      w <= (programData.duration_weeks || 1);
                      w++
                    ) {
                      desiredRows.push(
                        ...inputRows.map((r) => ({ ...r, week_number: w }))
                      );
                    }
                  } else {
                    desiredRows = inputRows;
                  }
                } else {
                  // Edit: only persist currently selected week rows
                  const selectedW = selectedWeek || 1;
                  desiredRows = inputRows.filter(
                    (r) => r.week_number === selectedW
                  );
                }

                // Build maps for efficient diffing
                const existingByKey = new Map<string, any>();
                (existingRows || []).forEach((r: any) => {
                  const day =
                    typeof r.day_of_week === "number"
                      ? r.day_of_week
                      : typeof r.program_day === "number"
                      ? r.program_day
                      : 0;
                  const week = r.week_number || 1;
                  existingByKey.set(`${day}|${week}`, r);
                });
                const desiredByKey = new Map<
                  string,
                  {
                    program_id: string;
                    day_of_week: number;
                    week_number: number;
                    template_id: string;
                  }
                >();
                desiredRows.forEach((r) =>
                  desiredByKey.set(`${r.day_of_week}|${r.week_number}`, r)
                );

                // Upserts: update if exists (different template), else insert
                // Track schedule IDs for copying workout data
                const schedulesToCopy: Array<{ scheduleId: string; templateId: string; weekNumber: number }> = [];
                
                for (const [key, desired] of desiredByKey.entries()) {
                  const [dayStr, weekStr] = key.split("|");
                  const day = parseInt(dayStr, 10);
                  const week = parseInt(weekStr, 10);
                  const existing = existingByKey.get(key);
                  if (existing) {
                    if (existing.template_id !== desired.template_id) {
                      // Template changed - need to copy new workout data
                      const { error: updateErr } = await supabase
                        .from("program_schedule")
                        .update({ template_id: desired.template_id })
                        .eq("program_id", programId)
                        .eq("day_of_week", day)
                        .eq("week_number", week);
                      if (updateErr) {
                        console.error("Error updating schedule row:", {
                          day,
                          week,
                          updateErr,
                        });
                      } else {
                        // Queue for workout copy
                        schedulesToCopy.push({
                          scheduleId: existing.id,
                          templateId: desired.template_id,
                          weekNumber: week,
                        });
                      }
                    }
                  } else {
                    // New schedule - insert and copy workout data
                    const { data: newSchedule, error: insertErr } = await supabase
                      .from("program_schedule")
                      .insert({
                        program_id: programId,
                        day_of_week: day,
                        week_number: week,
                        template_id: desired.template_id,
                      })
                      .select()
                      .single();
                    if (insertErr) {
                      console.error("Error inserting schedule row:", {
                        day,
                        week,
                        insertErr,
                      });
                    } else if (newSchedule) {
                      // Queue for workout copy
                      schedulesToCopy.push({
                        scheduleId: newSchedule.id,
                        templateId: desired.template_id,
                        weekNumber: week,
                      });
                    }
                  }
                }

                // REQUIREMENT 1: Copy workout data to program_progression_rules
                console.log(`🔄 Copying ${schedulesToCopy.length} workouts to progression rules...`);
                for (const { scheduleId, templateId, weekNumber } of schedulesToCopy) {
                  try {
                    // Delete existing progression rules for this schedule/week first
                    await ProgramProgressionService.deleteProgressionRules(scheduleId, weekNumber);
                    
                    // Copy workout data
                    const success = await ProgramProgressionService.copyWorkoutToProgram(
                      programId,
                      scheduleId,
                      templateId,
                      weekNumber
                    );
                    
                    if (success) {
                      console.log(`✅ Copied workout ${templateId} to schedule ${scheduleId}`);
                    } else {
                      console.warn(`⚠️ Failed to copy workout ${templateId}`);
                    }
                  } catch (copyError) {
                    console.error(`❌ Error copying workout to progression rules:`, copyError);
                  }
                }

                // Deletions: remove days no longer present
                for (const [key, existing] of existingByKey.entries()) {
                  if (!desiredByKey.has(key)) {
                    const [dayStr, weekStr] = key.split("|");
                    const day = parseInt(dayStr, 10);
                    const week = parseInt(weekStr, 10);
                    const { error: deleteErr } = await supabase
                      .from("program_schedule")
                      .delete()
                      .eq("program_id", programId)
                      .eq("day_of_week", day)
                      .eq("week_number", week);
                    if (deleteErr) {
                      console.error("Error deleting schedule row:", {
                        day,
                        week,
                        deleteErr,
                      });
                    }
                  }
                }

                // Convert weekValues to progressionRules and save them
                if (weekValues && Object.keys(weekValues).length > 0) {
                  console.log(
                    "🔧 Converting weekValues to progressionRules:",
                    weekValues
                  );
                  const convertedRules: any[] = [];

                  Object.entries(weekValues).forEach(([weekStr, weekData]) => {
                    const week = parseInt(weekStr, 10);
                    Object.entries(weekData).forEach(([exKey, fields]) => {
                      Object.entries(fields).forEach(([field, value]) => {
                        if (
                          value !== "" &&
                          value !== null &&
                          value !== undefined
                        ) {
                          // Parse exercise key to get template_id and exercise info
                          const [dayStr, templateId, exerciseIndex] =
                            exKey.split("-");
                          convertedRules.push({
                            program_id: programId,
                            week_number: week,
                            exercise_id: null, // We'll need to get this from the template
                            field: field,
                            change_type: "fixed",
                            amount: value,
                            notes: `Week ${week} ${field}`,
                          });
                        }
                      });
                    });
                  });

                  if (convertedRules.length > 0) {
                    console.log(
                      "🔧 Saving converted progression rules:",
                      convertedRules
                    );
                    // Clear existing rules for the selected week
                    const selectedW = selectedWeek || 1;
                    await supabase
                      .from("program_progression_rules")
                      .delete()
                      .eq("program_id", programId)
                      .eq("week_number", selectedW);
                    // Insert new rules
                    const { error: convertedRulesError } = await supabase
                      .from("program_progression_rules")
                      .insert(convertedRules);
                    if (convertedRulesError)
                      console.error(
                        "Error saving converted progression rules:",
                        convertedRulesError
                      );
                  }
                }

                // Save progression rules per-week
                const rulesInput = progressionRules || [];
                if (rulesInput.length > 0) {
                  if (!editingProgram) {
                    // Create: if only week 1 present, replicate to all weeks
                    const ruleWeeks = Array.from(
                      new Set(rulesInput.map((r) => r.week_number || 1))
                    );
                    let rulesToPersist = rulesInput;
                    if (ruleWeeks.length === 1 && ruleWeeks[0] === 1) {
                      const replicated: any[] = [];
                      for (
                        let w = 1;
                        w <= (programData.duration_weeks || 1);
                        w++
                      ) {
                        replicated.push(
                          ...rulesInput.map((r) => ({ ...r, week_number: w }))
                        );
                      }
                      rulesToPersist = replicated;
                    }
                    // Clear then insert
                    await supabase
                      .from("program_progression_rules")
                      .delete()
                      .eq("program_id", programId);
                    const progressionData = rulesToPersist.map((rule: any) => ({
                      ...rule,
                      program_id: programId,
                    }));
                    const { error: progressionError } = await supabase
                      .from("program_progression_rules")
                      .insert(progressionData);
                    if (progressionError)
                      console.error(
                        "Error saving progression rules:",
                        progressionError
                      );
                  } else {
                    // Edit: only replace selected week rules
                    const selectedW = selectedWeek || 1;
                    await supabase
                      .from("program_progression_rules")
                      .delete()
                      .eq("program_id", programId)
                      .eq("week_number", selectedW);
                    const weekRules = rulesInput
                      .filter((r) => (r.week_number || 1) === selectedW)
                      .map((r) => ({ ...r, program_id: programId }));
                    if (weekRules.length > 0) {
                      const { error: progressionError } = await supabase
                        .from("program_progression_rules")
                        .insert(weekRules);
                      if (progressionError)
                        console.error(
                          "Error saving week rules:",
                          progressionError
                        );
                    }
                  }
                }

                // Reload data to show the new/updated program
                console.log("🔧 Program saved successfully, reloading data");
                loadData();
                setShowCreateProgram(false);
                setEditingProgram(null);
              } catch (error) {
                console.error("❌ Error saving program:", error);
                alert("Error saving program. Please try again.");
              }
            }}
            onClose={() => {
              setShowCreateProgram(false);
              setEditingProgram(null);
            }}
          />
        )}

        {showProgramDetails && selectedProgram && (
          <ProgramDetailsModal
            program={selectedProgram}
            templates={templates}
            exercises={exercises}
            categories={categories}
            onClose={() => {
              setShowProgramDetails(false);
              setSelectedProgram(null);
            }}
            onEdit={() => {
              setEditingProgram(selectedProgram);
              setShowProgramDetails(false);
              setShowCreateProgram(true);
            }}
          />
        )} */}
      </div>
    </>
  );
}

// Program Details Modal Component
interface ProgramDetailsModalProps {
  program: Program;
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  categories: ExerciseCategory[];
  onClose: () => void;
  onEdit: () => void;
}

function ProgramDetailsModal({
  program,
  onClose,
  onEdit,
}: ProgramDetailsModalProps) {
  const targetAudienceLabels = {
    general_fitness: "General Fitness",
    weight_loss: "Weight Loss",
    muscle_gain: "Muscle Gain",
    strength: "Strength",
    endurance: "Endurance",
    athletic_performance: "Athletic Performance",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: "0",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "24px",
          border: "1px solid #E5E7EB",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          maxWidth: "min(95vw, 80rem)",
          width: "100%",
          height: "min(88vh, calc(100vh - 4rem))",
          maxHeight: "min(88vh, calc(100vh - 4rem))",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #E5E7EB",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                <Calendar
                  style={{ width: "32px", height: "32px", color: "#FFFFFF" }}
                />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#1A1A1A",
                    marginBottom: "4px",
                  }}
                >
                  {program.name}
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#6B7280",
                  }}
                >
                  Created {new Date(program.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onEdit}
                style={{
                  borderRadius: "20px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: "2px solid #6C5CE7",
                  color: "#6C5CE7",
                  backgroundColor: "transparent",
                }}
              >
                <Edit
                  style={{ width: "16px", height: "16px", marginRight: "8px" }}
                />
                Edit Program
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                style={{ padding: "8px", borderRadius: "12px" }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* Program Overview */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                border: "1px solid #E5E7EB",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#DBEAFE",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px auto",
                }}
              >
                <Clock
                  style={{ width: "24px", height: "24px", color: "#2196F3" }}
                />
              </div>
              <p
                style={{
                  fontSize: "32px",
                  fontWeight: "800",
                  color: "#1A1A1A",
                  lineHeight: "1.1",
                  margin: "0 0 8px 0",
                }}
              >
                {program.duration_weeks}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "#6B7280",
                  margin: "0",
                }}
              >
                Weeks
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                border: "1px solid #E5E7EB",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#D1FAE5",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px auto",
                }}
              >
                <Target
                  style={{ width: "24px", height: "24px", color: "#4CAF50" }}
                />
              </div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1A1A1A",
                  margin: "0 0 8px 0",
                }}
              >
                {
                  targetAudienceLabels[
                    program.target_audience as keyof typeof targetAudienceLabels
                  ]
                }
              </p>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "#6B7280",
                  margin: "0",
                }}
              >
                Target
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                border: "1px solid #E5E7EB",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#FEF3C7",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px auto",
                }}
              >
                <TrendingUp
                  style={{ width: "24px", height: "24px", color: "#F59E0B" }}
                />
              </div>
              <Badge
                style={{
                  backgroundColor:
                    program.difficulty_level === "beginner"
                      ? "#D1FAE5"
                      : program.difficulty_level === "intermediate"
                      ? "#FEF3C7"
                      : "#FEE2E2",
                  color:
                    program.difficulty_level === "beginner"
                      ? "#065F46"
                      : program.difficulty_level === "intermediate"
                      ? "#92400E"
                      : "#991B1B",
                  borderRadius: "12px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  border: "0",
                  marginBottom: "8px",
                }}
              >
                {program.difficulty_level}
              </Badge>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "#6B7280",
                  margin: "0",
                }}
              >
                Level
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                border: "1px solid #E5E7EB",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#EDE7F6",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px auto",
                }}
              >
                <Users
                  style={{ width: "24px", height: "24px", color: "#6C5CE7" }}
                />
              </div>
              <p
                style={{
                  fontSize: "32px",
                  fontWeight: "800",
                  color: "#1A1A1A",
                  lineHeight: "1.1",
                  margin: "0 0 8px 0",
                }}
              >
                0
              </p>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "#6B7280",
                  margin: "0",
                }}
              >
                Active Clients
              </p>
            </div>
          </div>

          {/* Description */}
          {program.description && (
            <div style={{ marginBottom: "32px" }}>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#1A1A1A",
                  marginBottom: "12px",
                }}
              >
                Description
              </h3>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  border: "1px solid #E5E7EB",
                }}
              >
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: "400",
                    color: "#1A1A1A",
                    margin: "0",
                  }}
                >
                  {program.description}
                </p>
              </div>
            </div>
          )}

          {/* Program Schedule */}
          <div style={{ marginBottom: "32px" }}>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#1A1A1A",
                marginBottom: "16px",
              }}
            >
              Weekly Schedule
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              {["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"].map(
                (dayName, dayIndex) => {
                  const scheduledTemplate = program.schedule?.find(
                    (s) => s.program_day === dayIndex + 1
                  );
                  return (
                    <div
                      key={dayIndex}
                      style={{
                        borderRadius: "24px",
                        padding: "1px",
                        background:
                          "linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: "24px",
                          height: "100%",
                          padding: "20px",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "#1A1A1A",
                            marginBottom: "16px",
                            textAlign: "center",
                          }}
                        >
                          {dayName}
                        </h4>
                        {scheduledTemplate ? (
                          <div style={{ textAlign: "center" }}>
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                background:
                                  "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                                borderRadius: "16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 12px auto",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                              }}
                            >
                              <Dumbbell
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  color: "#FFFFFF",
                                }}
                              />
                            </div>
                            <p
                              style={{
                                fontSize: "16px",
                                fontWeight: "600",
                                color: "#1A1A1A",
                                marginBottom: "4px",
                              }}
                            >
                              {scheduledTemplate.template?.name || "Template"}
                            </p>
                            <p
                              style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#4CAF50",
                              }}
                            >
                              Workout Day
                            </p>
                          </div>
                        ) : (
                          <div style={{ textAlign: "center" }}>
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                backgroundColor: "#F3F4F6",
                                borderRadius: "16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 12px auto",
                              }}
                            >
                              <X
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  color: "#9CA3AF",
                                }}
                              />
                            </div>
                            <p
                              style={{
                                fontSize: "16px",
                                fontWeight: "600",
                                color: "#9CA3AF",
                              }}
                            >
                              Rest Day
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Program Stats */}
          <div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#1A1A1A",
                marginBottom: "16px",
              }}
            >
              Program Statistics
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  border: "1px solid #E5E7EB",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: "#1A1A1A",
                    lineHeight: "1.1",
                    margin: "0 0 8px 0",
                  }}
                >
                  {program.schedule?.length || 0}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#6B7280",
                    margin: "0",
                  }}
                >
                  Workout Days
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  border: "1px solid #E5E7EB",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: "#1A1A1A",
                    lineHeight: "1.1",
                    margin: "0 0 8px 0",
                  }}
                >
                  {program.schedule?.filter((s) => s.is_optional).length || 0}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#6B7280",
                    margin: "0",
                  }}
                >
                  Optional Workouts
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  border: "1px solid #E5E7EB",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: "#1A1A1A",
                    lineHeight: "1.1",
                    margin: "0 0 8px 0",
                  }}
                >
                  {program.progression_rules?.length || 0}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#6B7280",
                    margin: "0",
                  }}
                >
                  Progression Rules
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Program Card Component removed; using shared component from features/programs

// Program Create Form (placeholder)
interface ProgramCreateFormProps {
  program?: Program | null;
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  onSave: (data: any) => void;
  onClose: () => void;
  onTemplatesUpdate?: (templates: WorkoutTemplate[]) => void;
}

function ProgramCreateForm({
  program,
  templates,
  exercises,
  onSave,
  onClose,
  onTemplatesUpdate,
}: ProgramCreateFormProps) {
  const [formData, setFormData] = useState({
    name: program?.name || "",
    description: program?.description || "",
    difficulty_level: program?.difficulty_level || "intermediate",
    duration_weeks: program?.duration_weeks || 8,
    target_audience: program?.target_audience || "general_fitness",
  });

  const [schedule, setSchedule] = useState<ProgramSchedule[]>([]);
  const [progressionRules, setProgressionRules] = useState<ProgressionRule[]>(
    []
  );
  // Cache of template exercises to keep Progression tab in sync with Weekly Schedule selections
  const [templateExercisesById, setTemplateExercisesById] = useState<
    Record<string, any[]>
  >({});
  // Per-week form values (progression inputs) keyed by week -> exerciseKey -> field values
  const [weekValues, setWeekValues] = useState<
    Record<number, Record<string, any>>
  >({});
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  
  // State for progression rules editor
  const [selectedScheduleForProgression, setSelectedScheduleForProgression] = useState<ProgramSchedule | null>(null);

  // State for exercise replacement modal
  const [showExerciseReplacementModal, setShowExerciseReplacementModal] =
    useState(false);
  const [replacementContext, setReplacementContext] = useState<{
    dayOfWeek: number;
    exerciseIndex: number;
    originalExercise: any;
    scheduleItem: any;
  } | null>(null);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");
  const [selectedReplacementExercise, setSelectedReplacementExercise] =
    useState<any>(null);
  const [exerciseConfig, setExerciseConfig] = useState<{
    sets: number;
    reps: string;
    rest_seconds: number;
    rir: string;
    tempo: string;
    exercise_type: string;
    superset_exercise_id: string;
    superset_reps: string;
    circuit_exercises: any[];
    giant_set_exercises: any[];
    tabata_exercises: any[];
    rounds: number;
    work_seconds: number;
    rest_seconds_tabata: number;
    drop_percentage: number;
    drop_set_reps: string;
    amrap_duration: number;
    target_reps: number;
    emom_duration: number;
    emom_reps: number;
    emom_mode: string;
    rest_after: number;
    cluster_sets: number;
    cluster_rest: number;
  }>({
    sets: 3,
    reps: "8-12",
    rest_seconds: 60,
    rir: "",
    tempo: "",
    exercise_type: "straight_set",
    superset_exercise_id: "",
    superset_reps: "",
    circuit_exercises: [],
    giant_set_exercises: [],
    tabata_exercises: [],
    rounds: 8,
    work_seconds: 20,
    rest_seconds_tabata: 10,
    drop_percentage: 20,
    drop_set_reps: "8-10",
    amrap_duration: 5,
    target_reps: 10,
    emom_duration: 10,
    emom_reps: 5,
    emom_mode: "fixed",
    rest_after: 15,
    cluster_sets: 2,
    cluster_rest: 90,
  });
  const [activeTab, setActiveTab] = useState<
    "basic" | "schedule" | "progression"
  >("basic");

  const dayNames = [
    "Day 1",
    "Day 2",
    "Day 3",
    "Day 4",
    "Day 5",
    "Day 6",
    "Day 7",
  ];

  // Helper function to parse exercise configuration from notes
  const parseExerciseConfig = (notes: string | null) => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch (error) {
      console.error("Failed to parse exercise config:", error);
      return null;
    }
  };

  // Helpers to manage controlled values per week/exercise/field
  const getExKey = (
    scheduleItem: any,
    exerciseIndex: number,
    nestedId?: string | number
  ) =>
    `${scheduleItem.program_day}-${scheduleItem.template_id}-${
      nestedId ?? exerciseIndex
    }`;
  const getWeekValue = (
    week: number,
    exKey: string,
    field: string,
    fallback: any
  ) => {
    const w = weekValues[week];
    if (w && w[exKey] && typeof w[exKey][field] !== "undefined")
      return w[exKey][field];
    return fallback;
  };
  const setWeekValue = (
    week: number,
    exKey: string,
    field: string,
    value: any
  ) => {
    setWeekValues((prev) => ({
      ...prev,
      [week]: {
        ...(prev[week] || {}),
        [exKey]: {
          ...((prev[week] || {})[exKey] || {}),
          [field]: value,
        },
      },
    }));
  };

  // Load existing schedule when editing a program
  useEffect(() => {
    if (program?.schedule) {
      console.log("🔧 Loading existing schedule:", program.schedule);
      setSchedule(program.schedule);
    }
  }, [program]);

  /**
   * Handles replacing an exercise for a specific week.
   * This function creates a progression rule instead of modifying the base template.
   */
  const handleReplaceExercise = async (
    dayOfWeek: number,
    originalExerciseId: string,
    newExercise: any,
    config?: any
  ) => {
    if (!program?.id) {
      console.error("No program ID available for exercise replacement");
      return;
    }

    try {
      // Find the current schedule item to get the original template
      const scheduleItem = schedule.find(
        (s) =>
          s.program_day === dayOfWeek && (s.week_number || 1) === selectedWeek
      );

      if (!scheduleItem) {
        console.error(
          `No schedule item found for day ${dayOfWeek}, week ${selectedWeek}`
        );
        return;
      }

      // Get the original template to preserve its structure
      const originalTemplate = templates.find(
        (t) => t.id === scheduleItem.template_id
      );
      if (!originalTemplate) {
        console.error(
          `Original template not found for template_id: ${scheduleItem.template_id}`
        );
        return;
      }

      // Create a new template with the replaced exercise
      const newTemplateData = {
        name: `${originalTemplate.name} (Modified)`,
        description: originalTemplate.description || "",
        difficulty_level: originalTemplate.difficulty_level || "intermediate",
        coach_id: originalTemplate.coach_id,
        is_public: false, // Keep it private since it's a modification
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert the new template
      const { data: newTemplate, error: templateError } = await supabase
        .from("workout_templates")
        .insert(newTemplateData)
        .select()
        .single();

      if (templateError || !newTemplate) {
        console.error("Failed to create new template:", templateError);
        alert("Failed to create replacement template. Please try again.");
        return;
      }

      // Copy all exercises from the original template, replacing the target exercise
      const originalExercises = originalTemplate.exercises || [];
      console.log(
        "🔍 Replacing exercise at index:",
        replacementContext?.exerciseIndex
      );
      console.log("🔍 Original exercises count:", originalExercises.length);
      console.log("🔍 New exercise:", newExercise.name);

      const modifiedExercises = originalExercises.map(
        (exercise: any, index: number) => {
          // Replace the exercise at the specified index
          if (index === replacementContext?.exerciseIndex) {
            console.log(
              "✅ Replacing exercise at index:",
              index,
              "with:",
              newExercise.name
            );
            const exerciseData = {
              ...exercise,
              exercise_id: newExercise.id,
              exercise: newExercise,
              sets: config?.sets || exercise.sets || 3,
              reps: config?.reps || exercise.reps || "8-12",
              rest_seconds: config?.rest_seconds || exercise.rest_seconds || 60,
              rir: config?.rir || exercise.rir || "",
              tempo: config?.tempo || exercise.tempo || "",
              exercise_type:
                config?.exercise_type ||
                exercise.exercise_type ||
                "straight_set",
            };

            // Add multi-exercise configuration data
            if (
              config?.exercise_type === "superset" &&
              config?.superset_exercise_id
            ) {
              exerciseData.superset_exercise_id = config.superset_exercise_id;
              exerciseData.superset_reps = config.superset_reps;
            }

            if (
              config?.exercise_type === "giant_set" &&
              config?.giant_set_exercises?.length > 0
            ) {
              exerciseData.giant_set_exercises = config.giant_set_exercises;
            }

            if (
              config?.exercise_type === "circuit" &&
              config?.circuit_exercises?.length > 0
            ) {
              exerciseData.circuit_exercises = config.circuit_exercises;
            }

            if (
              config?.exercise_type === "tabata" &&
              config?.tabata_exercises?.length > 0
            ) {
              exerciseData.tabata_exercises = config.tabata_exercises;
            }

            // Add specific exercise type parameters
            if (config?.exercise_type === "drop_set") {
              exerciseData.drop_percentage = config.drop_percentage;
              exerciseData.drop_set_reps = config.drop_set_reps;
            }

            if (config?.exercise_type === "amrap") {
              exerciseData.amrap_duration = config.amrap_duration;
              exerciseData.target_reps = config.target_reps;
            }

            if (config?.exercise_type === "emom") {
              exerciseData.emom_duration = config.emom_duration;
              exerciseData.emom_reps = config.emom_reps;
              exerciseData.emom_mode = config.emom_mode;
            }

            if (config?.exercise_type === "tabata") {
              exerciseData.rounds = config.rounds;
              exerciseData.work_seconds = config.work_seconds;
              exerciseData.rest_after = config.rest_after;
            }

            return exerciseData;
          }
          console.log(
            "⏭️ Keeping exercise at index:",
            index,
            ":",
            exercise.exercise?.name || exercise.name
          );
          return exercise;
        }
      );

      // Insert the modified exercises into the new template
      const exerciseInserts = modifiedExercises.map(
        (exercise: any, index: number) => {
          console.log(
            "📝 Processing exercise at index:",
            index,
            "exercise_id:",
            exercise.exercise_id,
            "exercise:",
            exercise.exercise?.name || exercise.name
          );

          // For unchanged exercises, preserve their original configuration from notes
          let exerciseConfig;
          if (index === replacementContext?.exerciseIndex) {
            // This is the replaced exercise - use the new configuration
            exerciseConfig = {
              sets: exercise.sets,
              reps: exercise.reps,
              rest_seconds: exercise.rest_seconds,
              rir: exercise.rir,
              tempo: exercise.tempo,
              exercise_type: exercise.exercise_type,
              superset_exercise_id: exercise.superset_exercise_id,
              superset_reps: exercise.superset_reps,
              giant_set_exercises: exercise.giant_set_exercises,
              circuit_exercises: exercise.circuit_exercises,
              tabata_exercises: exercise.tabata_exercises,
              drop_percentage: exercise.drop_percentage,
              drop_set_reps: exercise.drop_set_reps,
              amrap_duration: exercise.amrap_duration,
              target_reps: exercise.target_reps,
              emom_duration: exercise.emom_duration,
              emom_reps: exercise.emom_reps,
              emom_mode: exercise.emom_mode,
              rounds: exercise.rounds,
              work_seconds: exercise.work_seconds,
              rest_after: exercise.rest_after,
            };
            console.log(
              "🔄 Using NEW config for replaced exercise:",
              exerciseConfig.exercise_type
            );
          } else {
            // This is an unchanged exercise - preserve original configuration
            const originalExercise = originalExercises[index];
            if (originalExercise?.notes) {
              try {
                exerciseConfig = JSON.parse(originalExercise.notes);
                console.log(
                  "💾 Preserving ORIGINAL config for unchanged exercise:",
                  exerciseConfig.exercise_type || "straight_set"
                );
              } catch (error) {
                console.error(
                  "Failed to parse original exercise config:",
                  error
                );
                exerciseConfig = {
                  sets: 3,
                  reps: "8-12",
                  rest_seconds: 60,
                  rir: "",
                  tempo: "",
                  exercise_type: "straight_set",
                };
              }
            } else {
              exerciseConfig = {
                sets: 3,
                reps: "8-12",
                rest_seconds: 60,
                rir: "",
                tempo: "",
                exercise_type: "straight_set",
              };
            }
          }

          return {
            template_id: newTemplate.id,
            exercise_id: exercise.exercise_id,
            order_index: index + 1,
            notes: JSON.stringify(exerciseConfig),
          };
        }
      );

      // NOTE: workout_template_exercises is deprecated. Using WorkoutBlockService instead.
      // This code path may need refactoring to use the new block system.
      console.warn(
        "EnhancedProgramManager: workout_template_exercises.insert is deprecated. Use WorkoutBlockService instead."
      );
      // TODO: Refactor to use WorkoutBlockService.createWorkoutBlock
      // Note: exercisesError check removed as this code path is deprecated

      // Update the program_schedule to use the new template
      // Use the week number from the replacement context to ensure we only update the specific week
      const dbTargetWeek =
        replacementContext?.scheduleItem?.week_number || selectedWeek;
      console.log(
        `🎯 Updating schedule for day ${dayOfWeek}, week ${dbTargetWeek} with new template ${newTemplate.id}`
      );
      const { error } = await supabase
        .from("program_schedule")
        .update({
          template_id: newTemplate.id,
          updated_at: new Date().toISOString(),
        })
        .eq("program_id", program.id)
        .eq("day_of_week", dayOfWeek)
        .eq("week_number", dbTargetWeek);

      if (error) {
        console.error("Failed to update program schedule:", error);
        alert("Failed to save exercise replacement. Please try again.");
        return;
      }

      // Update the local state to immediately reflect the change in the UI
      // Use the week number from the replacement context to ensure we only update the specific week
      const stateTargetWeek =
        replacementContext?.scheduleItem?.week_number || selectedWeek;
      updateLocalPlanStateWithReplacement(
        dayOfWeek,
        originalExerciseId,
        newExercise,
        newTemplate.id,
        stateTargetWeek
      );

      // Reload templates to include the new template
      if (onTemplatesUpdate) {
        try {
          const templatesData =
            await WorkoutTemplateService.getWorkoutTemplates(program.coach_id);
          const parsedTemplates = templatesData.map((template) => ({
            ...template,
            exercises: template.exercises?.map((exercise) => {
              // Parse exercise configuration from notes field
              let config = null;
              if (exercise.notes) {
                try {
                  config = JSON.parse(exercise.notes);
                } catch (error) {
                  console.error("Failed to parse exercise config:", error);
                }
              }

              return {
                ...exercise,
                config: config,
              };
            }),
          }));
          onTemplatesUpdate(parsedTemplates);
          console.log("🔄 Templates reloaded after exercise replacement");
        } catch (error) {
          console.error("Failed to reload templates:", error);
        }
      }

      console.log(
        `✅ Exercise replacement saved: ${originalExerciseId} -> ${newExercise.id}`
      );
    } catch (error) {
      console.error("Error in handleReplaceExercise:", error);
      alert(
        "An error occurred while replacing the exercise. Please try again."
      );
    }
  };

  /**
   * Updates the local plan state to reflect exercise replacement in the UI
   */
  const updateLocalPlanStateWithReplacement = (
    dayOfWeek: number,
    originalExerciseId: string,
    newExercise: any,
    newTemplateId: string,
    targetWeek?: number
  ) => {
    // Find the schedule item for this day and week using the replacement context
    const weekToUse =
      targetWeek ||
      replacementContext?.scheduleItem?.week_number ||
      selectedWeek;
    const scheduleItem =
      replacementContext?.scheduleItem ||
      schedule.find(
        (s) => s.program_day === dayOfWeek && (s.week_number || 1) === weekToUse
      );

    if (!scheduleItem) {
      console.error(
        `No schedule item found for day ${dayOfWeek}, week ${weekToUse}`
      );
      return;
    }

    // Update the template_id in the schedule to reflect the new template
    setSchedule((prev) =>
      prev.map((s) => {
        if (s.id === scheduleItem.id) {
          return {
            ...s,
            template_id: newTemplateId, // Use the new template ID
            updated_at: new Date().toISOString(),
          };
        }
        return s;
      })
    );

    // Update the templateExercisesById cache with the new template
    // We'll need to load the exercises for the new template
    setTemplateExercisesById((prev) => ({
      ...prev,
      [newTemplateId]: [], // Initialize empty, will be loaded by useEffect
    }));

    console.log(
      `✅ Updated local state: Day ${dayOfWeek}, Week ${selectedWeek} now uses template ${newTemplateId}`
    );
  };

  // Reliable auto-population function for empty weeks
  const autoPopulateWeek = useCallback(
    (targetWeek: number) => {
      console.log(`🔧 Auto-populating Week ${targetWeek}...`);

      // Check if target week already has workout templates assigned
      const targetWeekSchedule = (schedule || []).filter(
        (s) => (s.week_number || 1) === targetWeek
      );
      const hasTargetWeekWorkoutData = targetWeekSchedule.some(
        (s) => s.template_id && s.template_id !== "rest"
      );

      if (hasTargetWeekWorkoutData && targetWeekSchedule.length > 0) {
        console.log(
          `🔧 Week ${targetWeek} already has complete workout data, skipping auto-populate`
        );
        return;
      }

      // If target week has schedule structure but no workout templates, it needs auto-population
      if (targetWeekSchedule.length > 0 && !hasTargetWeekWorkoutData) {
        console.log(
          `🔧 Week ${targetWeek} has schedule structure but no workout templates, auto-populating from previous week`
        );
      }

      // Find the immediately preceding week that has workout templates
      let sourceWeek = null;
      for (let week = targetWeek - 1; week >= 1; week--) {
        const weekSchedule = (schedule || []).filter(
          (s) => (s.week_number || 1) === week
        );
        const hasWorkoutTemplates = weekSchedule.some(
          (s) => s.template_id && s.template_id !== "rest"
        );
        if (hasWorkoutTemplates) {
          sourceWeek = week;
          break;
        }
      }

      if (!sourceWeek) {
        console.log(
          `🔧 No preceding week with data found for Week ${targetWeek}`
        );
        return;
      }

      console.log(
        `🔧 Auto-populating Week ${targetWeek} from Week ${sourceWeek}`
      );

      // Get source week data
      const sourceWeekData = (schedule || []).filter(
        (s) => (s.week_number || 1) === sourceWeek
      );
      if (sourceWeekData.length === 0) {
        console.log(`🔧 No data found in source Week ${sourceWeek}`);
        return;
      }

      // Clone schedule data for target week
      setSchedule((curr) => {
        const withoutTargetWeek = curr.filter(
          (s) => (s.week_number || 1) !== targetWeek
        );
        const clonedSchedule = sourceWeekData.map((s) => ({
          ...s,
          id: `${program?.id || "new"}-${s.program_day}-w${targetWeek}`,
          week_number: targetWeek,
        }));
        console.log(
          `🔧 Cloned schedule for Week ${targetWeek}:`,
          clonedSchedule
        );
        return [...withoutTargetWeek, ...clonedSchedule];
      });

      // Clone progression rules for target week
      const sourceRules = (progressionRules || []).filter(
        (r) => (r.week_number || 1) === sourceWeek
      );
      if (sourceRules.length > 0) {
        setProgressionRules((curr) => {
          const withoutTargetWeek = curr.filter(
            (r) => (r.week_number || 1) !== targetWeek
          );
          const clonedRules = sourceRules.map((r) => ({
            ...r,
            id: `${r.id}-w${targetWeek}`,
            week_number: targetWeek,
          }));
          console.log(
            `🔧 Cloned progression rules for Week ${targetWeek}:`,
            clonedRules
          );
          return [...withoutTargetWeek, ...clonedRules];
        });
      }

      // Clone weekValues (form inputs) for target week
      setWeekValues((curr) => {
        const sourceValues = curr[sourceWeek] || {};
        if (Object.keys(sourceValues).length === 0) {
          console.log(`🔧 No form values found in source Week ${sourceWeek}`);
          return curr;
        }

        const clonedValues = { ...sourceValues };
        console.log(
          `🔧 Cloned form values for Week ${targetWeek}:`,
          clonedValues
        );

        return {
          ...curr,
          [targetWeek]: clonedValues,
        };
      });

      console.log(
        `🔧 Successfully auto-populated Week ${targetWeek} from Week ${sourceWeek}`
      );
    },
    [program?.id, schedule, progressionRules]
  );

  // Preload exercises for a given week's templates so forms render instantly
  const preloadTemplateExercisesForWeek = useCallback(
    async (week: number) => {
      const templateIds = Array.from(
        new Set(
          (schedule || [])
            .filter((s) => (s.week_number || 1) === week && s.template_id)
            .map((s) => s.template_id as string)
        )
      );
      if (templateIds.length === 0) return;
      const all: Record<string, any[]> = {};
      for (const tid of templateIds) {
        const list = await WorkoutTemplateService.getWorkoutTemplateExercises(
          tid
        );
        if (list && Array.isArray(list)) all[tid] = list;
      }
      if (Object.keys(all).length > 0)
        setTemplateExercisesById((prev) => ({ ...prev, ...all }));
    },
    [schedule]
  );

  // Ensure Progression tab reflects Weekly Schedule changes by loading exercises for selected templates
  useEffect(() => {
    const loadMissingTemplateExercises = async () => {
      try {
        // Collect unique template_ids from current schedule (ignore rest days)
        const neededIds = Array.from(
          new Set(
            (schedule || [])
              .map((s) => s.template_id)
              .filter((id): id is string => !!id && id !== "rest")
          )
        );

        // Determine which template_ids are missing in the cache and in provided templates
        const missingIds = neededIds.filter((id) => {
          const hasInCache = !!templateExercisesById[id];
          const hasInTemplates = !!templates.find(
            (t) => t.id === id && Array.isArray((t as any).exercises)
          );
          return !hasInCache && !hasInTemplates;
        });

        if (missingIds.length === 0) return;

        // Batch load exercises for missing template ids
        const results: Record<string, any[]> = {};
        for (const templateId of missingIds) {
          const { data, error } = await supabase
            .from("workout_template_exercises")
            .select("*")
            .eq("template_id", templateId)
            .order("order_index", { ascending: true });

          if (error) {
            console.error("Error loading template exercises for progression:", {
              templateId,
              error,
            });
            continue;
          }
          results[templateId] = data || [];
        }

        if (Object.keys(results).length > 0) {
          setTemplateExercisesById((prev) => ({ ...prev, ...results }));
        }
      } catch (e) {
        console.error("Unexpected error preloading template exercises:", e);
      }
    };

    loadMissingTemplateExercises();
  }, [schedule, templates]);

  // Autofill schedule and progression rules from DB when editing
  useEffect(() => {
    const loadProgramDetails = async () => {
      if (!program?.id) return;
      try {
        console.log("🔄 Fetching program details for edit:", program.id);

        // Load schedule (use shared service for consistent joins/order)
        const sched = await WorkoutTemplateService.getProgramSchedule(
          program.id
        );
        if (Array.isArray(sched)) {
          const mapped = sched.map((s: any) => {
            const programDay =
              typeof s.program_day === "number"
                ? s.program_day
                : typeof s.day_of_week === "number"
                ? s.day_of_week + 1
                : 1;
            return {
              id: s.id,
              program_id: s.program_id,
              program_day: programDay,
              week_number: s.week_number || 1,
              template_id: s.template_id,
              is_optional: !!s.is_optional,
              is_active: !!s.is_active,
              created_at: s.created_at || new Date().toISOString(),
              updated_at: s.updated_at || new Date().toISOString(),
            };
          });
          console.log("🔁 Setting schedule from DB:", mapped);
          setSchedule(mapped);
          // Always start at Week 1 - the first week should always be Week 1
          setSelectedWeek(1);

          // Don't run auto-populate logic when modal opens - only when manually switching weeks

          // Preload template exercises for all template_ids used in schedule (so forms render with data)
          let templateIds = Array.from(
            new Set(mapped.map((m: any) => m.template_id).filter(Boolean))
          );

          // Fix data integrity: If Week 2 exists but Week 1 doesn't, copy Week 2 to Week 1
          const hasWeek1 = mapped.some((m: any) => (m.week_number || 1) === 1);
          const hasWeek2 = mapped.some((m: any) => (m.week_number || 1) === 2);

          if (!hasWeek1 && hasWeek2) {
            // Week 2 exists but Week 1 doesn't - this is wrong, copy Week 2 to Week 1
            console.log(
              "🔧 Fixing data integrity: Week 2 exists without Week 1, copying Week 2 to Week 1"
            );
            const week2Data = mapped.filter(
              (m: any) => (m.week_number || 1) === 2
            );
            const copiedToWeek1 = week2Data.map((item: any) => ({
              ...item,
              id: `${program?.id || "new"}-${item.program_day}-week1`,
              week_number: 1,
            }));
            // Update the mapped array to include Week 1 data
            mapped.push(...copiedToWeek1);
            templateIds.push(
              ...copiedToWeek1
                .map((item: any) => item.template_id)
                .filter(Boolean)
            );
          } else if (!hasWeek1 && !hasWeek2) {
            // Neither Week 1 nor Week 2 exists - this is a new program, don't auto-fill
            console.log(
              "🔧 New program: No Week 1 or Week 2 data, starting fresh"
            );
          }

          if (templateIds.length > 0) {
            const all: Record<string, any[]> = {};
            for (const tid of templateIds) {
              const list =
                await WorkoutTemplateService.getWorkoutTemplateExercises(
                  tid as string
                );
              all[tid as string] = list || [];
            }
            setTemplateExercisesById((prev) => ({ ...prev, ...all }));
          }

          // Always preload exercises for all available templates so they're ready when user selects templates
          // This ensures Week 1 (and any other empty weeks) have exercises ready
          const allTemplateIds = templates.map((t) => t.id).filter(Boolean);
          if (allTemplateIds.length > 0) {
            const all: Record<string, any[]> = {};
            for (const tid of allTemplateIds) {
              if (!templateExercisesById[tid]) {
                // Only load if not already loaded
                const list =
                  await WorkoutTemplateService.getWorkoutTemplateExercises(
                    tid as string
                  );
                all[tid as string] = list || [];
              }
            }
            if (Object.keys(all).length > 0) {
              setTemplateExercisesById((prev) => ({ ...prev, ...all }));
            }
          }
        }

        // Load progression rules
        const { data: rules, error: rulesError } = await supabase
          .from("program_progression_rules")
          .select("*")
          .eq("program_id", program.id);

        if (!rulesError && Array.isArray(rules)) {
          const mappedRules = rules.map((r: any) => ({
            id: r.id,
            program_id: r.program_id,
            week_number: r.week_number,
            exercise_id: r.exercise_id,
            template_exercise_id: r.template_exercise_id || null,
            field: r.field,
            change_type: r.change_type,
            amount: r.amount,
            sets: r.sets || null,
            reps: r.reps || null,
            rest_time: r.rest_time || null,
            notes: r.notes || null,
          } as any));
          console.log("🔁 Setting progression rules from DB:", mappedRules);
          setProgressionRules(mappedRules);

          // Seed weekValues from saved numeric rules for the first week so fields show persisted values
          const byWeek: Record<number, Record<string, any>> = {};
          mappedRules.forEach((r: any) => {
            const w = r.week_number || 1;
            if (!byWeek[w]) byWeek[w] = {};
          });
          // We cannot reconstruct per-exercise keys from rules without exercise context; keep weekValues empty
          // The controlled inputs will still display fallbacks from templateExercisesById until user edits
        } else if (rulesError) {
          console.error("Failed loading progression rules:", rulesError);
        }
      } catch (e) {
        console.error("Error loading program edit details:", e);
      }
    };

    loadProgramDetails();
  }, [program?.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-[9999]">
      <Card
        className="max-w-2xl w-full h-[88vh] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden"
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div
          className="flex-shrink-0 p-6 border-b"
          style={{ borderBottom: "1px solid #E5E7EB" }}
        >
          <div className="flex items-center gap-4">
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar
                style={{ width: "32px", height: "32px", color: "#FFFFFF" }}
              />
            </div>
            <div
              style={{ fontSize: "28px", fontWeight: "700", color: "#1A1A1A" }}
            >
              {program ? "Edit Program" : "Create New Program"}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pb-4">
          <div
            className="flex space-x-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1"
            style={{
              backgroundColor: "#F3F4F6",
              borderRadius: "16px",
              padding: "4px",
            }}
          >
            <Button
              variant={activeTab === "basic" ? "default" : "ghost"}
              onClick={() => setActiveTab("basic")}
              className="flex-1 rounded-lg"
              style={
                activeTab === "basic"
                  ? {
                      backgroundColor: "#6C5CE7",
                      color: "#FFFFFF",
                      borderRadius: "12px",
                      fontSize: "16px",
                      fontWeight: "600",
                    }
                  : {
                      backgroundColor: "transparent",
                      color: "#6B7280",
                      borderRadius: "12px",
                      fontSize: "16px",
                      fontWeight: "400",
                    }
              }
            >
              Basic Info
            </Button>
            <Button
              variant={activeTab === "schedule" ? "default" : "ghost"}
              onClick={() => setActiveTab("schedule")}
              className="flex-1 rounded-lg"
              style={
                activeTab === "schedule"
                  ? {
                      backgroundColor: "#6C5CE7",
                      color: "#FFFFFF",
                      borderRadius: "12px",
                      fontSize: "16px",
                      fontWeight: "600",
                    }
                  : {
                      backgroundColor: "transparent",
                      color: "#6B7280",
                      borderRadius: "12px",
                      fontSize: "16px",
                      fontWeight: "400",
                    }
              }
            >
              Weekly Schedule
            </Button>
            <Button
              variant={activeTab === "progression" ? "default" : "ghost"}
              onClick={() => setActiveTab("progression")}
              className="flex-1 rounded-lg"
              style={
                activeTab === "progression"
                  ? {
                      backgroundColor: "#6C5CE7",
                      color: "#FFFFFF",
                      borderRadius: "12px",
                      fontSize: "16px",
                      fontWeight: "600",
                    }
                  : {
                      backgroundColor: "transparent",
                      color: "#6B7280",
                      borderRadius: "12px",
                      fontSize: "16px",
                      fontWeight: "400",
                    }
              }
            >
              Progression Rules
            </Button>
          </div>
        </div>

        <CardContent
          className="flex-1 overflow-y-auto space-y-6"
          style={{ padding: "24px", backgroundColor: "#FFFFFF" }}
        >
          {/* Basic Info Tab */}
          {activeTab === "basic" && (
            <div className="space-y-6">
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#6B7280",
                    marginBottom: "8px",
                  }}
                >
                  Program Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter program name..."
                  className="rounded-xl"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "2px solid #E5E7EB",
                    borderRadius: "16px",
                    padding: "16px",
                    fontSize: "16px",
                    fontWeight: "400",
                    color: "#1A1A1A",
                  }}
                />
              </div>

              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#6B7280",
                    marginBottom: "8px",
                  }}
                >
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the program goals and structure..."
                  className="rounded-xl min-h-24"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "2px solid #E5E7EB",
                    borderRadius: "16px",
                    padding: "16px",
                    fontSize: "16px",
                    fontWeight: "400",
                    color: "#1A1A1A",
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Difficulty Level
                  </label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, difficulty_level: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Duration (Weeks)
                  </label>
                  <Input
                    type="number"
                    value={formData.duration_weeks}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_weeks: parseInt(e.target.value) || 8,
                      })
                    }
                    className="rounded-xl"
                    min="1"
                    max="52"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Target Audience
                </label>
                <Select
                  value={formData.target_audience}
                  onValueChange={(value) =>
                    setFormData({ ...formData, target_audience: value })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general_fitness">
                      General Fitness
                    </SelectItem>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="endurance">Endurance</SelectItem>
                    <SelectItem value="athletic_performance">
                      Athletic Performance
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          )}

          {/* Weekly Schedule Tab */}
          {activeTab === "schedule" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Weekly Schedule</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Assign workout templates to each day of the week. This
                  schedule will apply to all {formData.duration_weeks} weeks of
                  the program.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayNames.map((dayName, dayIndex) => (
                    <Card key={dayIndex} className="border-2 rounded-2xl">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-3 text-center">
                          {dayName}
                        </h4>
                        <Select
                          value={
                            schedule.find(
                              (s) =>
                                s.program_day === dayIndex + 1 &&
                                (s.week_number || 1) === selectedWeek
                            )?.template_id || "rest"
                          }
                          onValueChange={async (value) => {
                            if (value === "rest") {
                              setSchedule((prev) =>
                                prev.filter(
                                  (s) =>
                                    !(
                                      s.program_day === dayIndex + 1 &&
                                      (s.week_number || 1) === selectedWeek
                                    )
                                )
                              );
                            } else {
                              const template = templates.find(
                                (t) => t.id === value
                              );
                              if (template) {
                                setSchedule((prev) => [
                                  ...prev.filter(
                                    (s) =>
                                      !(
                                        s.program_day === dayIndex + 1 &&
                                        (s.week_number || 1) === selectedWeek
                                      )
                                  ),
                                  {
                                    id: `${program?.id || "new"}-${dayIndex}`,
                                    program_id: program?.id || "",
                                    program_day: dayIndex + 1,
                                    week_number: selectedWeek,
                                    template_id: value,
                                    is_optional: false,
                                    is_active: true,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                  },
                                ]);
                                // Hydrate exercises for this template immediately for the Progression tab
                                if (
                                  !(template as any).exercises &&
                                  !templateExercisesById[value]
                                ) {
                                  try {
                                    const { data, error } = await supabase
                                      .from("workout_template_exercises")
                                      .select("*")
                                      .eq("template_id", value)
                                      .order("order_index", {
                                        ascending: true,
                                      });
                                    if (!error) {
                                      setTemplateExercisesById((prev) => ({
                                        ...prev,
                                        [value]: data || [],
                                      }));
                                    } else {
                                      console.error(
                                        "Error hydrating template exercises:",
                                        { value, error }
                                      );
                                    }
                                  } catch (e) {
                                    console.error(
                                      "Unexpected error hydrating template exercises:",
                                      e
                                    );
                                  }
                                }
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent
                            className="z-[10000]"
                            position="popper"
                          >
                            <SelectItem value="rest">Rest Day</SelectItem>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">
                                    {template.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Progression Rules Tab */}
          {activeTab === "progression" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Progression Rules
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Edit workout parameters week by week. Changes apply only to this program.
                </p>

                {schedule.filter((s) => (s.week_number || 1) === selectedWeek)
                  .length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-16 h-16 mx-auto mb-4" />
                    <h4 className="text-lg font-medium mb-2">
                      No Workouts Scheduled for Week {selectedWeek}
                    </h4>
                    <p className="text-sm mb-4">
                      Please assign workout templates to days in the Weekly
                      Schedule tab first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Week Selector */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">Week:</label>
                      <Select
                        value={String(selectedWeek)}
                        onValueChange={(v) => {
                          const w = parseInt(v, 10) || 1;
                          setSelectedWeek(w);
                          setSelectedScheduleForProgression(null);
                        }}
                      >
                        <SelectTrigger className="w-32 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]" position="popper">
                          {Array.from(
                            { length: formData.duration_weeks },
                            (_, i) => (
                              <SelectItem
                                key={i + 1}
                                value={(i + 1).toString()}
                              >
                                Week {i + 1}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Day Selector */}
                    <div className="flex flex-wrap gap-2">
                      {schedule
                        .filter((s) => (s.week_number || 1) === selectedWeek)
                        .map((scheduleItem) => {
                          const template = templates.find(
                            (t) => t.id === scheduleItem.template_id
                          );
                          return (
                        <Button
                              key={scheduleItem.id || scheduleItem.template_id}
                              variant={
                                selectedScheduleForProgression?.id === scheduleItem.id
                                  ? "default"
                                  : "outline"
                              }
                          onClick={() => {
                                setSelectedScheduleForProgression(scheduleItem);
                              }}
                              className="rounded-lg"
                            >
                              {dayNames[scheduleItem.program_day - 1]}
                              {template && ` - ${template.name}`}
                            </Button>
                          );
                        })}
                    </div>

                    {/* Progression Rules Editor */}
                    {selectedScheduleForProgression && program?.id && (
                      <ProgramProgressionRulesEditor
                        programId={program.id}
                        programScheduleId={selectedScheduleForProgression.id || `temp-${selectedScheduleForProgression.template_id}-${selectedScheduleForProgression.program_day}`}
                        weekNumber={selectedWeek}
                        exercises={exercises}
                        templates={templates}
                        onUpdate={() => {
                          // Reload schedule to get updated IDs if program was just created
                          // The progression rules are saved automatically, no need to reload here
                        }}
                      />
                    )}

                    {!selectedScheduleForProgression && (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <p>Select a day above to edit progression rules.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <div
          className="flex-shrink-0 flex justify-end gap-2 p-6 pt-4 border-t"
          style={{
            borderTop: "1px solid #E5E7EB",
            padding: "24px",
            paddingTop: "16px",
          }}
        >
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
            style={{
              backgroundColor: "#FFFFFF",
              color: "#6C5CE7",
              border: "2px solid #6C5CE7",
              borderRadius: "20px",
              padding: "16px 32px",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Cancel
                        </Button>
          <Button
            onClick={() => {
              onSave({
                ...formData,
                schedule,
                progressionRules: [],
                selectedWeek,
                weekValues: {},
              });
            }}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            style={{
              backgroundColor: "#6C5CE7",
              color: "#FFFFFF",
              borderRadius: "20px",
              padding: "16px 32px",
              fontSize: "16px",
              fontWeight: "600",
              border: "none",
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            {program ? "Update Program" : "Create Program"}
          </Button>
                    </div>
      </Card>

      {/* Exercise Replacement Modal */}
      <ResponsiveModal
        isOpen={showExerciseReplacementModal}
        onClose={() => {
          setShowExerciseReplacementModal(false);
          setReplacementContext(null);
          setExerciseSearchTerm("");
          setSelectedReplacementExercise(null);
          setExerciseConfig({
            sets: 3,
            reps: "8-12",
            rest_seconds: 60,
            rir: "",
            tempo: "",
                                      exercise_type: "straight_set",
            superset_exercise_id: "",
            superset_reps: "",
            circuit_exercises: [],
            giant_set_exercises: [],
            tabata_exercises: [],
            rounds: 8,
            work_seconds: 20,
            rest_seconds_tabata: 10,
            drop_percentage: 20,
            drop_set_reps: "8-10",
            amrap_duration: 5,
            target_reps: 10,
            emom_duration: 10,
            emom_reps: 5,
            emom_mode: "fixed",
            rest_after: 15,
            cluster_sets: 2,
            cluster_rest: 90,
          });
        }}
        subtitle={
          replacementContext
            ? `Replacing: ${
                replacementContext.originalExercise?.name || "Unknown Exercise"
              } - Day ${replacementContext.dayOfWeek}, Week ${selectedWeek}`
            : ""
        }
        maxWidth="3xl"
        actions={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowExerciseReplacementModal(false);
                setReplacementContext(null);
                setExerciseSearchTerm("");
                setSelectedReplacementExercise(null);
                setExerciseConfig({
                                      sets: 3,
                                      reps: "8-12",
                                      rest_seconds: 60,
                                      rir: "",
                                      tempo: "",
                  exercise_type: "straight_set",
                  superset_exercise_id: "",
                  superset_reps: "",
                  circuit_exercises: [],
                  giant_set_exercises: [],
                  tabata_exercises: [],
                  rounds: 8,
                  work_seconds: 20,
                  rest_seconds_tabata: 10,
                  drop_percentage: 20,
                  drop_set_reps: "8-10",
                  amrap_duration: 5,
                  target_reps: 10,
                  emom_duration: 10,
                  emom_reps: 5,
                  emom_mode: "fixed",
                  rest_after: 15,
                  cluster_sets: 2,
                  cluster_rest: 90,
                });
              }}
            >
              Cancel
            </Button>
            {selectedReplacementExercise && (
              <Button
                onClick={() => {
                  if (replacementContext?.originalExercise) {
                    handleReplaceExercise(
                      replacementContext.dayOfWeek,
                      replacementContext.originalExercise.id,
                      selectedReplacementExercise,
                      exerciseConfig
                    );
                  }
                  setShowExerciseReplacementModal(false);
                  setReplacementContext(null);
                  setExerciseSearchTerm("");
                  setSelectedReplacementExercise(null);
                  setExerciseConfig({
                    sets: 3,
                    reps: "8-12",
                    rest_seconds: 60,
                    rir: "",
                    tempo: "",
                    exercise_type: "straight_set",
                    superset_exercise_id: "",
                    superset_reps: "",
                    circuit_exercises: [],
                    giant_set_exercises: [],
                    tabata_exercises: [],
                    rounds: 8,
                    work_seconds: 20,
                    rest_seconds_tabata: 10,
                    drop_percentage: 20,
                    drop_set_reps: "8-10",
                    amrap_duration: 5,
                    target_reps: 10,
                    emom_duration: 10,
                    emom_reps: 5,
                    emom_mode: "fixed",
                    rest_after: 15,
                    cluster_sets: 2,
                    cluster_rest: 90,
                  });
                }}
              >
                <Replace className="w-4 h-4 mr-2" />
                Replace Exercise
              </Button>
            )}
          </div>
        }
      >
        {/* Modal content - exercise search and selection */}
        <div className="space-y-4">
          <div>
            <Label>Search Exercise</Label>
            <Input
              value={exerciseSearchTerm}
              onChange={(e) => setExerciseSearchTerm(e.target.value)}
              placeholder="Search exercises..."
              className="mt-1"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {exercises
              .filter((ex) =>
                ex.name
                  .toLowerCase()
                  .includes(exerciseSearchTerm.toLowerCase())
              )
              .slice(0, 50)
              .map((ex) => (
                <div
                  key={ex.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedReplacementExercise?.id === ex.id
                      ? "bg-blue-100 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedReplacementExercise(ex)}
                >
                  <div className="font-medium">{ex.name}</div>
                  {ex.description && (
                    <div className="text-sm text-gray-600">{ex.description}</div>
                  )}
                </div>
              ))}
          </div>

          {selectedReplacementExercise && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Selected: <strong>{selectedReplacementExercise.name}</strong>
              </p>
            </div>
          )}
        </div>
      </ResponsiveModal>
    </div>
  );
}
