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
} from "lucide-react";
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
    setSelectedProgram(program);
    setShowProgramDetails(true);
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

  const assignProgramToClients = async (
    programId: string,
    clientIds: string[],
    coachId: string
  ) => {
    const assignments = clientIds.map((clientId) => ({
      program_id: programId,
      client_id: clientId,
      coach_id: coachId,
      start_date: new Date().toISOString().split("T")[0],
      current_week: 1,
      current_day_of_week: 1,
      is_active: true,
    }));

    const { error } = await supabase
      .from("program_assignments")
      .insert(assignments);

    if (error) {
      console.error("Error assigning program:", error);
      throw error;
    }

    // Refresh program assignment counts
    await loadProgramAssignmentCounts();

    // Dispatch event to refresh assignment counts
    console.log(
      "📢 Dispatching program assignment event for clients:",
      clientIds
    );
    clientIds.forEach((clientId) => {
      console.log("📢 Dispatching event for client:", clientId);
      window.dispatchEvent(
        new CustomEvent("assignmentMade", {
          detail: { clientId, type: "program" },
        })
      );

      // Also use localStorage as backup (works across tabs)
      localStorage.setItem(
        "assignmentMade",
        JSON.stringify({
          clientId,
          type: "program",
          timestamp: Date.now(),
        })
      );
    });

    alert("Program assigned successfully!");
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
                            await assignProgramToClients(
                              selectedProgramForAssignment.id,
                              selectedClients,
                              user?.id || ""
                            );
                            alert(
                              `Program assigned to ${selectedClients.length} client(s) successfully!`
                            );
                            setShowAssignmentModal(false);
                            setSelectedProgramForAssignment(null);
                            setSelectedClients([]);
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
                  onClick={() => setShowCreateProgram(true)}
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
                  templates={templates}
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
                    onClick={() => setShowCreateProgram(true)}
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

        {/* Modals */}
        {showCreateProgram && (
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
                for (const [key, desired] of desiredByKey.entries()) {
                  const [dayStr, weekStr] = key.split("|");
                  const day = parseInt(dayStr, 10);
                  const week = parseInt(weekStr, 10);
                  const existing = existingByKey.get(key);
                  if (existing) {
                    if (existing.template_id !== desired.template_id) {
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
                      }
                    }
                  } else {
                    const { error: insertErr } = await supabase
                      .from("program_schedule")
                      .insert({
                        program_id: programId,
                        day_of_week: day,
                        week_number: week,
                        template_id: desired.template_id,
                      });
                    if (insertErr) {
                      console.error("Error inserting schedule row:", {
                        day,
                        week,
                        insertErr,
                      });
                    }
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
        )}
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

// Program Card Component
interface ProgramCardProps {
  program: Program;
  templates: WorkoutTemplate[];
  onEdit: () => void;
  onOpenDetails: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  assignmentCount?: number;
}

function ProgramCard({
  program,
  onEdit,
  onOpenDetails,
  onDelete,
  onAssign,
  assignmentCount = 0,
}: ProgramCardProps) {
  // Different gradient backgrounds for each card - optimized for programs
  // const gradients = []
  // Enhanced hash function for better program distribution
  // let hash = 0
  // for (let i = 0; i < program.id.length; i++) {
  //   const char = program.id.charCodeAt(i)
  //   hash = ((hash << 5) - hash) + char
  //   hash = hash & hash // Convert to 32-bit integer
  // }
  // // Add program name to hash for even better distribution
  // for (let i = 0; i < program.name.length; i++) {
  //   const char = program.name.charCodeAt(i)
  //   hash = ((hash << 3) - hash) + char
  //   hash = hash & hash
  // }
  const getTargetAudienceIcon = (audience: string) => {
    switch (audience?.toLowerCase()) {
      case "strength":
        return Dumbbell;
      case "weight_loss":
        return Target;
      case "muscle_gain":
        return Zap;
      case "endurance":
        return Activity;
      case "athletic_performance":
        return Award;
      case "general_fitness":
      default:
        return Users;
    }
  };

  const TargetIcon = getTargetAudienceIcon(program.target_audience);

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "24px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        marginBottom: "20px",
        cursor: "pointer",
      }}
      className="hover:shadow-xl transition-all duration-300"
      onClick={onOpenDetails}
    >
      <div className="h-full flex flex-col">
        {/* Program Header Section */}
        <div
          className="flex items-center gap-4"
          style={{ marginBottom: "20px" }}
        >
          {/* Icon Container */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TargetIcon
              style={{ width: "32px", height: "32px", color: "#FFFFFF" }}
            />
          </div>

          {/* Title and Badge */}
          <div className="flex-1">
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1A1A1A",
                marginBottom: "8px",
              }}
            >
              {program.name}
            </h3>
            <div className="flex items-center gap-2">
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
                }}
              >
                {program.difficulty_level}
              </Badge>
              <div
                className="flex items-center gap-1.5"
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#F3F4F6",
                  borderRadius: "12px",
                }}
              >
                <Calendar
                  style={{ width: "14px", height: "14px", color: "#6B7280" }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6B7280",
                  }}
                >
                  {program.duration_weeks}w
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Program Description */}
        {program.description && (
          <div style={{ marginBottom: "20px" }}>
            <p
              className="line-clamp-2"
              style={{ fontSize: "14px", fontWeight: "400", color: "#6B7280" }}
            >
              {program.description}
            </p>
          </div>
        )}

        {/* Stats */}
        <div
          className="grid grid-cols-3 gap-4"
          style={{ marginBottom: "20px" }}
        >
          <div
            className="flex flex-col items-center"
            style={{
              padding: "16px",
              backgroundColor: "#DBEAFE",
              borderRadius: "16px",
              border: "2px solid #93C5FD",
            }}
          >
            <Calendar
              style={{
                width: "24px",
                height: "24px",
                marginBottom: "8px",
                color: "#2196F3",
              }}
            />
            <span
              style={{ fontSize: "20px", fontWeight: "700", color: "#1A1A1A" }}
            >
              {program.schedule?.length || 0}
            </span>
            <span
              style={{ fontSize: "12px", fontWeight: "400", color: "#6B7280" }}
            >
              workouts
            </span>
          </div>
          <div
            className="flex flex-col items-center"
            style={{
              padding: "16px",
              backgroundColor: "#D1FAE5",
              borderRadius: "16px",
              border: "2px solid #6EE7B7",
            }}
          >
            <Users
              style={{
                width: "24px",
                height: "24px",
                marginBottom: "8px",
                color: "#4CAF50",
              }}
            />
            <span
              style={{ fontSize: "20px", fontWeight: "700", color: "#1A1A1A" }}
            >
              {assignmentCount}
            </span>
            <span
              style={{ fontSize: "12px", fontWeight: "400", color: "#6B7280" }}
            >
              clients
            </span>
          </div>
          <div
            className="flex flex-col items-center"
            style={{
              padding: "16px",
              backgroundColor: "#FEF3C7",
              borderRadius: "16px",
              border: "2px solid #FCD34D",
            }}
          >
            <TrendingUp
              style={{
                width: "24px",
                height: "24px",
                marginBottom: "8px",
                color: "#F59E0B",
              }}
            />
            <span
              style={{ fontSize: "12px", fontWeight: "600", color: "#92400E" }}
            >
              Progress
            </span>
            <span
              style={{ fontSize: "10px", fontWeight: "400", color: "#6B7280" }}
            >
              Tracked
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2"
          style={{ paddingTop: "12px", borderTop: "1px solid #E5E7EB" }}
        >
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex-1"
            style={{
              borderRadius: "20px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: "600",
              backgroundColor: "#4CAF50",
              color: "#FFFFFF",
            }}
          >
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAssign?.();
            }}
            style={{
              borderRadius: "20px",
              padding: "10px",
              border: "2px solid #4CAF50",
              color: "#4CAF50",
              backgroundColor: "transparent",
            }}
            className="hover:bg-green-50"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            style={{
              borderRadius: "20px",
              padding: "10px",
              border: "2px solid #EF4444",
              color: "#EF4444",
              backgroundColor: "transparent",
            }}
            className="hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

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
    is_public: program?.is_public || false,
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

      const { error: exercisesError } = await supabase
        .from("workout_template_exercises")
        .insert(exerciseInserts);

      if (exercisesError) {
        console.error(
          "Failed to insert exercises into new template:",
          exercisesError
        );
        // Clean up the template if exercise insertion failed
        await supabase
          .from("workout_templates")
          .delete()
          .eq("id", newTemplate.id);
        alert("Failed to create replacement template. Please try again.");
        return;
      }

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
            field: r.field,
            change_type: r.change_type,
            amount: r.amount,
            notes: r.notes || null,
          }));
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

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) =>
                    setFormData({ ...formData, is_public: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="is_public" className="text-sm font-medium">
                  Make this program public (visible to other coaches)
                </label>
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
                  Define how exercises progress week by week. Select a week and
                  set progression for each exercise.
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
                    <div className="flex items-center gap-4 relative z-10">
                      <label className="text-sm font-medium">Week:</label>
                      <Select
                        value={String(selectedWeek)}
                        onValueChange={async (v) => {
                          const w = parseInt(v, 10) || 1;
                          setSelectedWeek(w);
                          // Auto-populate empty week from immediately preceding non-empty week
                          autoPopulateWeek(w);
                          await preloadTemplateExercisesForWeek(w);
                        }}
                      >
                        <SelectTrigger className="w-32 rounded-xl pointer-events-auto">
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

                      {/* Copy Previous Week Button */}
                      {selectedWeek > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const previousWeek = selectedWeek - 1;
                            const previousWeekSchedule = schedule.filter(
                              (s) => (s.week_number || 1) === previousWeek
                            );
                            const previousWeekRules = progressionRules.filter(
                              (r) => (r.week_number || 1) === previousWeek
                            );
                            const previousWeekValues =
                              weekValues[previousWeek] || {};

                            if (previousWeekSchedule.length > 0) {
                              // Copy schedule data
                              setSchedule((prev) => {
                                const withoutCurrentWeek = prev.filter(
                                  (s) => (s.week_number || 1) !== selectedWeek
                                );
                                const copiedSchedule = previousWeekSchedule.map(
                                  (s) => ({
                                    ...s,
                                    id: `${program?.id || "new"}-${
                                      s.program_day
                                    }-w${selectedWeek}`,
                                    week_number: selectedWeek,
                                  })
                                );
                                return [
                                  ...withoutCurrentWeek,
                                  ...copiedSchedule,
                                ];
                              });

                              // Copy progression rules
                              if (previousWeekRules.length > 0) {
                                setProgressionRules((prev) => {
                                  const withoutCurrentWeek = prev.filter(
                                    (r) => (r.week_number || 1) !== selectedWeek
                                  );
                                  const copiedRules = previousWeekRules.map(
                                    (r) => ({
                                      ...r,
                                      id: `${r.id}-w${selectedWeek}`,
                                      week_number: selectedWeek,
                                    })
                                  );
                                  return [
                                    ...withoutCurrentWeek,
                                    ...copiedRules,
                                  ];
                                });
                              }

                              // Copy form values
                              if (Object.keys(previousWeekValues).length > 0) {
                                setWeekValues((prev) => ({
                                  ...prev,
                                  [selectedWeek]: { ...previousWeekValues },
                                }));
                              }

                              console.log(
                                `✅ Copied Week ${previousWeek} data to Week ${selectedWeek}`
                              );
                            } else {
                              alert(
                                `No data found in Week ${previousWeek} to copy.`
                              );
                            }
                          }}
                          className="text-xs"
                        >
                          Copy from Week {selectedWeek - 1}
                        </Button>
                      )}
                    </div>

                    {/* Exercises from Scheduled Workouts */}
                    <div className="space-y-4">
                      {schedule
                        .filter((s) => (s.week_number || 1) === selectedWeek)
                        .map((scheduleItem, index) => {
                          const template = templates.find(
                            (t) => t.id === scheduleItem.template_id
                          );
                          if (
                            !template &&
                            !templateExercisesById[scheduleItem.template_id]
                          )
                            return null;

                          return (
                            <Card key={index} className="border-2 rounded-xl">
                              <CardContent className="p-4">
                                <div className="bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 dark:from-blue-700/40 dark:via-purple-700/40 dark:to-pink-700/40 px-4 py-3 border-b border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                                  <h4 className="font-bold text-blue-900 dark:text-blue-100 text-lg">
                                    {dayNames[scheduleItem.program_day - 1]} -{" "}
                                    {template?.name || "Workout Template"}
                                  </h4>
                                </div>

                                <div className="space-y-4">
                                  {(
                                    template?.exercises ||
                                    templateExercisesById[
                                      scheduleItem.template_id
                                    ] ||
                                    []
                                  ).map((exercise, exerciseIndex) => {
                                    const colors = [
                                      "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                                      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                                      "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
                                      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
                                      "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
                                      "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
                                    ];
                                    const colorClass =
                                      colors[exerciseIndex % colors.length];

                                    // Parse complex data from notes (to mirror WorkoutTemplateDetails)
                                    let parsed: any = {
                                      exercise_type: "straight_set",
                                      sets: 3,
                                      reps: "8-12",
                                      rest_seconds: 60,
                                      rir: "",
                                      tempo: "",
                                    };
                                    try {
                                      if (
                                        (exercise as any)?.notes &&
                                        typeof (exercise as any).notes ===
                                          "string"
                                      ) {
                                        parsed = {
                                          ...parsed,
                                          ...JSON.parse(
                                            (exercise as any).notes
                                          ),
                                        };
                                      } else if ((exercise as any)?.config) {
                                        // Use the pre-parsed config if available
                                        parsed = {
                                          ...parsed,
                                          ...(exercise as any).config,
                                        };
                                      }
                                    } catch (_) {
                                      // Keep default values
                                    }
                                    const exerciseType: string | undefined =
                                      (exercise as any)?.exercise_type ||
                                      parsed.exercise_type ||
                                      (exercise as any)?.config
                                        ?.exercise_type ||
                                      "straight_set";

                                    // Debug logging
                                    if (exerciseIndex === 0) {
                                      console.log(
                                        "🔍 Exercise display debug:",
                                        {
                                          exerciseIndex,
                                          exerciseType,
                                          parsed,
                                          config: (exercise as any)?.config,
                                          notes: (exercise as any)?.notes,
                                        }
                                      );
                                    }

                                    // Define multi-exercise types that should show the type name
                                    const multiExerciseTypes = [
                                      "superset",
                                      "circuit",
                                      "giant_set",
                                      "tabata",
                                    ];
                                    const isMultiExercise =
                                      multiExerciseTypes.includes(exerciseType);

                                    const typeLabel =
                                      exerciseType === "tabata"
                                        ? "Tabata Circuit"
                                        : exerciseType === "circuit"
                                        ? "Circuit"
                                        : exerciseType === "superset"
                                        ? "Superset"
                                        : exerciseType === "giant_set"
                                        ? "Giant Set"
                                        : undefined;

                                    // Resolve the base exercise details from global list if missing
                                    const baseExercise =
                                      (exercise as any)?.exercise ||
                                      exercises.find(
                                        (e) =>
                                          e.id ===
                                          (exercise as any)?.exercise_id
                                      );

                                    // For single exercise types, show exercise name; for multi-exercise types, show type name
                                    const displayName = isMultiExercise
                                      ? typeLabel ||
                                        baseExercise?.name ||
                                        (exercise as any)?.name ||
                                        (exercise as any)?.title ||
                                        "Exercise"
                                      : baseExercise?.name ||
                                        (exercise as any)?.name ||
                                        (exercise as any)?.title ||
                                        "Exercise";

                                    return (
                                      <div
                                        key={exerciseIndex}
                                        className={`p-4 ${colorClass} rounded-lg border`}
                                      >
                                        {/* Exercise Header */}
                                        <div className="mb-4">
                                          <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-semibold text-lg">
                                              {displayName}
                                            </h5>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                // Load the current exercise's configuration
                                                const currentExercise =
                                                  (template?.exercises ||
                                                    templateExercisesById[
                                                      scheduleItem.template_id
                                                    ] ||
                                                    [])[exerciseIndex];
                                                let existingConfig = {
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
                                                };

                                                // Try to parse existing configuration from notes
                                                if (currentExercise?.notes) {
                                                  try {
                                                    const parsedConfig =
                                                      JSON.parse(
                                                        currentExercise.notes
                                                      );
                                                    existingConfig = {
                                                      ...existingConfig,
                                                      ...parsedConfig,
                                                    };
                                                    console.log(
                                                      "📋 Loading existing exercise config:",
                                                      existingConfig.exercise_type
                                                    );
                                                  } catch (error) {
                                                    console.error(
                                                      "Failed to parse existing exercise config:",
                                                      error
                                                    );
                                                  }
                                                }

                                                setReplacementContext({
                                                  dayOfWeek:
                                                    scheduleItem.program_day,
                                                  exerciseIndex: exerciseIndex,
                                                  originalExercise:
                                                    baseExercise,
                                                  scheduleItem: scheduleItem,
                                                });
                                                setExerciseConfig(
                                                  existingConfig
                                                );
                                                setShowExerciseReplacementModal(
                                                  true
                                                );
                                              }}
                                              className="text-xs"
                                            >
                                              Replace
                                            </Button>
                                          </div>
                                          {/* Badges row (type/category/equipment) */}
                                          <div className="flex flex-wrap gap-2 mb-2">
                                            {/* Show exercise type badge for single exercises, type name for multi-exercises */}
                                            {!isMultiExercise &&
                                              exerciseType &&
                                              exerciseType !==
                                                "straight_set" && (
                                                <Badge className="text-xs">
                                                  {exerciseType === "drop_set"
                                                    ? "Drop Set"
                                                    : exerciseType === "amrap"
                                                    ? "AMRAP"
                                                    : exerciseType === "emom"
                                                    ? "EMOM"
                                                    : exerciseType ===
                                                        "cluster_set" ||
                                                      exerciseType === "cluster"
                                                    ? "Cluster Set"
                                                    : exerciseType ===
                                                      "rest_pause"
                                                    ? "Rest-Pause"
                                                    : exerciseType ===
                                                      "pre_exhaustion"
                                                    ? "Pre-Exhaustion"
                                                    : exerciseType ===
                                                      "for_time"
                                                    ? "For Time"
                                                    : exerciseType === "pyramid"
                                                    ? "Pyramid"
                                                    : exerciseType === "ladder"
                                                    ? "Ladder"
                                                    : exerciseType}
                                                </Badge>
                                              )}
                                            {isMultiExercise && typeLabel && (
                                              <Badge className="text-xs">
                                                {typeLabel}
                                              </Badge>
                                            )}
                                            {baseExercise?.type && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {baseExercise.type}
                                              </Badge>
                                            )}
                                            {baseExercise?.category && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {typeof baseExercise.category ===
                                                "string"
                                                  ? baseExercise.category
                                                  : baseExercise.category
                                                      ?.name || "Category"}
                                              </Badge>
                                            )}
                                            {baseExercise?.equipment && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {baseExercise.equipment}
                                              </Badge>
                                            )}
                                          </div>
                                          {/* Primary details line */}
                                          <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {(() => {
                                              // Mirror summary style from WorkoutTemplateDetails with minimal cases
                                              const ex: any = exercise;
                                              const p = parsed || {};
                                              const type = exerciseType;
                                              if (type === "tabata") {
                                                const rounds =
                                                  ex.rounds || p.rounds || 8;
                                                const work =
                                                  ex.work_seconds ||
                                                  p.work_seconds ||
                                                  20;
                                                const restAfter =
                                                  ex.rest_after || p.rest_after;
                                                return (
                                                  <>
                                                    Rounds: {rounds} • Work:{" "}
                                                    {work}s
                                                    {restAfter
                                                      ? ` • Rest after: ${restAfter}s`
                                                      : ""}
                                                  </>
                                                );
                                              }
                                              if (type === "circuit") {
                                                const rounds =
                                                  ex.sets || p.sets;
                                                const count =
                                                  ex.circuit_sets?.length ||
                                                  p.circuit_sets?.length ||
                                                  0;
                                                const rest =
                                                  ex.rest_seconds ||
                                                  p.rest_seconds;
                                                return (
                                                  <>
                                                    {rounds
                                                      ? `${rounds} rounds`
                                                      : ""}
                                                    {rounds && " • "}
                                                    {count} exercises
                                                    {rest
                                                      ? ` • ${rest}s rest`
                                                      : ""}
                                                  </>
                                                );
                                              }
                                              if (type === "amrap") {
                                                const dur =
                                                  ex.amrap_duration ||
                                                  p.amrap_duration;
                                                return (
                                                  <>
                                                    {dur
                                                      ? `${dur} min`
                                                      : "AMRAP"}
                                                  </>
                                                );
                                              }
                                              if (type === "emom") {
                                                const dur =
                                                  ex.emom_duration ||
                                                  p.emom_duration;
                                                const reps =
                                                  ex.emom_reps || p.emom_reps;
                                                const work =
                                                  ex.work_seconds ||
                                                  p.work_seconds;
                                                return (
                                                  <>
                                                    {dur
                                                      ? `${dur} min`
                                                      : "EMOM"}
                                                    {reps
                                                      ? ` • ${reps} reps`
                                                      : ""}
                                                    {work
                                                      ? ` • ${work}s work`
                                                      : ""}
                                                  </>
                                                );
                                              }
                                              if (type === "giant_set") {
                                                const sets = ex.sets || p.sets;
                                                const count =
                                                  ex.giant_set_exercises
                                                    ?.length ||
                                                  p.giant_set_exercises
                                                    ?.length ||
                                                  0;
                                                const rest =
                                                  ex.rest_seconds ||
                                                  p.rest_seconds;
                                                return (
                                                  <>
                                                    {sets
                                                      ? `${sets} sets`
                                                      : "Giant Set"}{" "}
                                                    • {count} exercises
                                                    {rest
                                                      ? ` • ${rest}s rest`
                                                      : ""}
                                                  </>
                                                );
                                              }
                                              if (
                                                type === "cluster_set" ||
                                                type === "cluster"
                                              ) {
                                                const clusters =
                                                  ex.sets || p.sets;
                                                const setsPerCluster =
                                                  ex.cluster_sets ||
                                                  p.cluster_sets;
                                                const reps = ex.reps || p.reps;
                                                const restBetweenSets =
                                                  ex.rest_seconds ||
                                                  p.rest_seconds;
                                                const restBetweenClusters =
                                                  ex.cluster_rest ||
                                                  p.cluster_rest;
                                                return (
                                                  <>
                                                    Clusters: {clusters}
                                                    {setsPerCluster
                                                      ? ` × ${setsPerCluster} sets`
                                                      : ""}{" "}
                                                    • Reps: {reps}
                                                    {restBetweenSets
                                                      ? ` • Rest: ${restBetweenSets}s`
                                                      : ""}
                                                    {restBetweenClusters
                                                      ? ` • Cluster rest: ${restBetweenClusters}s`
                                                      : ""}
                                                  </>
                                                );
                                              }
                                              if (type === "drop_set") {
                                                const sets = ex.sets || p.sets;
                                                const reps = ex.reps || p.reps;
                                                const dropPercentage =
                                                  ex.drop_percentage ||
                                                  p.drop_percentage;
                                                const dropReps =
                                                  ex.drop_set_reps ||
                                                  p.drop_set_reps;
                                                const rest =
                                                  ex.rest_seconds ||
                                                  p.rest_seconds;
                                                return (
                                                  <>
                                                    Sets: {sets} • Reps: {reps}
                                                    {dropPercentage
                                                      ? ` • Drop: ${dropPercentage}%`
                                                      : ""}
                                                    {dropReps
                                                      ? ` • Drop reps: ${dropReps}`
                                                      : ""}
                                                    {rest
                                                      ? ` • Rest: ${rest}s`
                                                      : ""}
                                                  </>
                                                );
                                              }
                                              if (type === "superset") {
                                                const sets = ex.sets || p.sets;
                                                const reps = ex.reps || p.reps;
                                                const rest =
                                                  ex.rest_seconds ||
                                                  p.rest_seconds;
                                                return (
                                                  <>
                                                    Sets: {sets} • Reps: {reps}
                                                    {rest
                                                      ? ` • Rest: ${rest}s`
                                                      : ""}
                                                  </>
                                                );
                                              }
                                              // Default straight set summary
                                              if (
                                                typeof p.sets !== "undefined" &&
                                                typeof p.reps !== "undefined" &&
                                                p.reps !== ""
                                              ) {
                                                return (
                                                  <>
                                                    Sets: {p.sets} × Reps:{" "}
                                                    {p.reps}
                                                    {p.rest_seconds
                                                      ? ` • Rest: ${p.rest_seconds}s`
                                                      : ""}
                                                    {p.rir
                                                      ? ` • RIR: ${p.rir}`
                                                      : ""}
                                                    {p.tempo
                                                      ? ` • Tempo: ${p.tempo}`
                                                      : ""}
                                                  </>
                                                );
                                              }
                                              // Fallbacks for time/distance
                                              if (
                                                typeof ex.time_seconds ===
                                                "number"
                                              )
                                                return (
                                                  <>
                                                    Duration: {ex.time_seconds}s
                                                  </>
                                                );
                                              if (
                                                typeof ex.work_time_seconds ===
                                                "number"
                                              )
                                                return (
                                                  <>
                                                    Work: {ex.work_time_seconds}
                                                    s
                                                  </>
                                                );
                                              if (
                                                typeof ex.work_seconds ===
                                                "number"
                                              )
                                                return (
                                                  <>Work: {ex.work_seconds}s</>
                                                );
                                              if (
                                                typeof ex.distance_meters ===
                                                "number"
                                              )
                                                return (
                                                  <>
                                                    Distance:{" "}
                                                    {ex.distance_meters} m
                                                  </>
                                                );
                                              return null;
                                            })()}
                                          </p>
                                        </div>

                                        {/* Progression Inputs - match fields to exercise type */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                          {/* Multi-exercise types: render per-exercise sub-forms */}
                                          {[
                                            "tabata",
                                            "circuit",
                                            "giant_set",
                                            "superset",
                                            "cluster",
                                            "pre_exhaustion",
                                          ].includes(exerciseType || "") && (
                                            <div className="col-span-2 md:col-span-4 space-y-3">
                                              {(() => {
                                                // Collect unique exercise ids across nested structures
                                                const idSet = new Set<string>();
                                                if (
                                                  exerciseType === "tabata" &&
                                                  (parsed.tabata_sets || [])
                                                    .length
                                                ) {
                                                  parsed.tabata_sets.forEach(
                                                    (set: any) =>
                                                      (
                                                        set.exercises || []
                                                      ).forEach(
                                                        (e: any) =>
                                                          e.exercise_id &&
                                                          idSet.add(
                                                            e.exercise_id
                                                          )
                                                      )
                                                  );
                                                }
                                                if (
                                                  exerciseType === "circuit" &&
                                                  (parsed.circuit_sets || [])
                                                    .length
                                                ) {
                                                  parsed.circuit_sets.forEach(
                                                    (set: any) =>
                                                      (
                                                        set.exercises || []
                                                      ).forEach(
                                                        (e: any) =>
                                                          e.exercise_id &&
                                                          idSet.add(
                                                            e.exercise_id
                                                          )
                                                      )
                                                  );
                                                }
                                                if (
                                                  exerciseType ===
                                                    "giant_set" &&
                                                  (
                                                    parsed.giant_set_exercises ||
                                                    []
                                                  ).length
                                                ) {
                                                  parsed.giant_set_exercises.forEach(
                                                    (e: any) =>
                                                      e.exercise_id &&
                                                      idSet.add(e.exercise_id)
                                                  );
                                                }
                                                if (
                                                  exerciseType === "superset" &&
                                                  ((exercise as any)
                                                    .exercise_id ||
                                                    parsed.superset_exercise_id)
                                                ) {
                                                  if (
                                                    (exercise as any)
                                                      .exercise_id
                                                  )
                                                    idSet.add(
                                                      (exercise as any)
                                                        .exercise_id
                                                    );
                                                  if (
                                                    parsed.superset_exercise_id
                                                  )
                                                    idSet.add(
                                                      parsed.superset_exercise_id
                                                    );
                                                }
                                                if (
                                                  exerciseType === "cluster" &&
                                                  (exercise as any).exercise_id
                                                ) {
                                                  idSet.add(
                                                    (exercise as any)
                                                      .exercise_id
                                                  );
                                                }
                                                if (
                                                  exerciseType ===
                                                  "pre_exhaustion"
                                                ) {
                                                  // Add main exercise
                                                  if (
                                                    (exercise as any)
                                                      .exercise_id
                                                  ) {
                                                    idSet.add(
                                                      (exercise as any)
                                                        .exercise_id
                                                    );
                                                  }
                                                  // Add compound exercise
                                                  if (
                                                    (exercise as any)
                                                      .compound_exercise_id
                                                  ) {
                                                    idSet.add(
                                                      (exercise as any)
                                                        .compound_exercise_id
                                                    );
                                                  }
                                                }
                                                const ids = Array.from(idSet);
                                                return ids.map(
                                                  (id: string, idx: number) => {
                                                    const exInfo =
                                                      exercises.find(
                                                        (e) => e.id === id
                                                      );
                                                    return (
                                                      <div
                                                        key={`${id}-${idx}`}
                                                        className="space-y-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                                                      >
                                                        <div className="block md:hidden">
                                                          <span className="text-sm font-medium">
                                                            {exInfo?.name ||
                                                              "Exercise"}
                                                          </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                          <div className="hidden md:block md:col-span-2">
                                                            <span className="text-sm font-medium">
                                                              {exInfo?.name ||
                                                                "Exercise"}
                                                            </span>
                                                          </div>
                                                          {exerciseType ===
                                                          "tabata" ? (
                                                            <div className="col-span-1 md:col-span-2">
                                                              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700 space-y-4">
                                                                <div className="flex items-center justify-between mb-3">
                                                                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                                    <Zap className="w-4 h-4 text-purple-600" />
                                                                    Tabata
                                                                  </h4>
                                                                </div>

                                                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                                                  Fixed timing
                                                                  for all
                                                                  exercises
                                                                </p>

                                                                {/* Tabata Timing - 3 grid */}
                                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      Work (sec)
                                                                    </Label>
                                                                    <Input
                                                                      type="number"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "work_seconds",
                                                                        parsed.work_seconds ||
                                                                          ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "work_seconds",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      min="10"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      Rest (sec)
                                                                    </Label>
                                                                    <Input
                                                                      type="number"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "rest_seconds",
                                                                        parsed.rest_seconds ||
                                                                          ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "rest_seconds",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      min="5"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      Rounds
                                                                    </Label>
                                                                    <Input
                                                                      type="number"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "rounds",
                                                                        parsed.rounds ||
                                                                          ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "rounds",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      min="4"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                </div>

                                                                {/* Add Set Button */}
                                                                <div className="mt-3">
                                                                  <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                      // TODO: Implement add set functionality
                                                                    }}
                                                                    className="w-full border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400"
                                                                  >
                                                                    <span className="text-xs">
                                                                      + Add Set
                                                                    </span>
                                                                  </Button>
                                                                </div>

                                                                {/* Sets List */}
                                                                {(
                                                                  parsed.tabata_sets ||
                                                                  []
                                                                ).length >
                                                                  0 && (
                                                                  <div className="mt-3 space-y-2">
                                                                    {parsed.tabata_sets.map(
                                                                      (
                                                                        set: any,
                                                                        setIndex: number
                                                                      ) => (
                                                                        <div
                                                                          key={
                                                                            setIndex
                                                                          }
                                                                          className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600"
                                                                        >
                                                                          <div className="flex items-center justify-between mb-2">
                                                                            <h5 className="font-medium text-xs text-slate-900 dark:text-slate-100">
                                                                              Set{" "}
                                                                              {setIndex +
                                                                                1}
                                                                            </h5>
                                                                            <Button
                                                                              type="button"
                                                                              variant="ghost"
                                                                              size="sm"
                                                                              onClick={() => {
                                                                                // TODO: Implement remove set functionality
                                                                              }}
                                                                              className="text-red-500 hover:text-red-700 p-1 h-5"
                                                                            >
                                                                              <span className="text-xs">
                                                                                Remove
                                                                              </span>
                                                                            </Button>
                                                                          </div>

                                                                          {/* Exercises in this set */}
                                                                          <div className="space-y-1">
                                                                            {set.exercises?.map(
                                                                              (
                                                                                ex: any,
                                                                                exIndex: number
                                                                              ) => (
                                                                                <div
                                                                                  key={
                                                                                    exIndex
                                                                                  }
                                                                                  className="flex items-center gap-2 text-xs"
                                                                                >
                                                                                  <span className="text-slate-500 w-6">
                                                                                    {exIndex +
                                                                                      1}

                                                                                    .
                                                                                  </span>
                                                                                  <div className="flex-1">
                                                                                    {exercises.find(
                                                                                      (
                                                                                        e
                                                                                      ) =>
                                                                                        e.id ===
                                                                                        ex.exercise_id
                                                                                    )
                                                                                      ?.name ||
                                                                                      "Exercise"}
                                                                                  </div>
                                                                                  <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => {
                                                                                      // TODO: Implement remove exercise functionality
                                                                                    }}
                                                                                    className="text-red-500 hover:text-red-700 p-1 h-5"
                                                                                  >
                                                                                    <span className="text-xs">
                                                                                      Remove
                                                                                    </span>
                                                                                  </Button>
                                                                                </div>
                                                                              )
                                                                            )}
                                                                          </div>

                                                                          {/* Add Exercise Button */}
                                                                          <div className="mt-2">
                                                                            <Button
                                                                              type="button"
                                                                              variant="outline"
                                                                              size="sm"
                                                                              onClick={() => {
                                                                                // TODO: Implement add exercise functionality
                                                                              }}
                                                                              className="w-full border-dashed text-xs"
                                                                            >
                                                                              <span className="text-xs">
                                                                                +
                                                                                Add
                                                                                Exercise
                                                                              </span>
                                                                            </Button>
                                                                          </div>

                                                                          {/* Rest between sets */}
                                                                          <div className="mt-2">
                                                                            <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                              Rest
                                                                              After
                                                                              Set
                                                                              (sec)
                                                                            </Label>
                                                                            <Input
                                                                              type="number"
                                                                              value={getWeekValue(
                                                                                selectedWeek,
                                                                                getExKey(
                                                                                  scheduleItem,
                                                                                  exerciseIndex,
                                                                                  `${id}-${idx}-set-${setIndex}`
                                                                                ),
                                                                                "rest_between_sets",
                                                                                ""
                                                                              )}
                                                                              onChange={(
                                                                                e
                                                                              ) =>
                                                                                setWeekValue(
                                                                                  selectedWeek,
                                                                                  getExKey(
                                                                                    scheduleItem,
                                                                                    exerciseIndex,
                                                                                    `${id}-${idx}-set-${setIndex}`
                                                                                  ),
                                                                                  "rest_between_sets",
                                                                                  e
                                                                                    .target
                                                                                    .value
                                                                                )
                                                                              }
                                                                              min="0"
                                                                              className="mt-1 rounded text-xs h-7"
                                                                            />
                                                                          </div>
                                                                        </div>
                                                                      )
                                                                    )}
                                                                  </div>
                                                                )}
                                                              </div>
                                                            </div>
                                                          ) : exerciseType ===
                                                            "circuit" ? (
                                                            <div className="col-span-1 md:col-span-2">
                                                              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700 space-y-4">
                                                                <div className="flex items-center justify-between mb-3">
                                                                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                                    <Zap className="w-4 h-4 text-yellow-600" />
                                                                    Circuit
                                                                  </h4>
                                                                </div>

                                                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                                                  Multiple
                                                                  exercises in
                                                                  sequence with
                                                                  individual
                                                                  timing
                                                                </p>

                                                                {/* Add Set Button */}
                                                                <div className="mt-3">
                                                                  <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                      // TODO: Implement add set functionality
                                                                    }}
                                                                    className="w-full border-dashed border-yellow-300 dark:border-yellow-600 text-yellow-600 dark:text-yellow-400"
                                                                  >
                                                                    <span className="text-xs">
                                                                      + Add Set
                                                                    </span>
                                                                  </Button>
                                                                </div>

                                                                {/* Sets List */}
                                                                {(
                                                                  parsed.circuit_sets ||
                                                                  []
                                                                ).length >
                                                                  0 && (
                                                                  <div className="mt-3 space-y-2">
                                                                    {parsed.circuit_sets.map(
                                                                      (
                                                                        set: any,
                                                                        setIndex: number
                                                                      ) => (
                                                                        <div
                                                                          key={
                                                                            setIndex
                                                                          }
                                                                          className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600"
                                                                        >
                                                                          <div className="flex items-center justify-between mb-2">
                                                                            <h5 className="font-medium text-xs text-slate-900 dark:text-slate-100">
                                                                              Set{" "}
                                                                              {setIndex +
                                                                                1}
                                                                            </h5>
                                                                            <Button
                                                                              type="button"
                                                                              variant="ghost"
                                                                              size="sm"
                                                                              onClick={() => {
                                                                                // TODO: Implement remove set functionality
                                                                              }}
                                                                              className="text-red-500 hover:text-red-700 p-1 h-5"
                                                                            >
                                                                              <span className="text-xs">
                                                                                Remove
                                                                              </span>
                                                                            </Button>
                                                                          </div>

                                                                          {/* Exercises in this set */}
                                                                          <div className="space-y-1">
                                                                            {set.exercises?.map(
                                                                              (
                                                                                ex: any,
                                                                                exIndex: number
                                                                              ) => (
                                                                                <div
                                                                                  key={
                                                                                    exIndex
                                                                                  }
                                                                                  className="p-2 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600"
                                                                                >
                                                                                  <div className="flex items-center gap-2 mb-2">
                                                                                    <span className="text-xs text-slate-500 w-6">
                                                                                      {exIndex +
                                                                                        1}

                                                                                      .
                                                                                    </span>
                                                                                    <div className="flex-1 text-sm">
                                                                                      {exercises.find(
                                                                                        (
                                                                                          e
                                                                                        ) =>
                                                                                          e.id ===
                                                                                          ex.exercise_id
                                                                                      )
                                                                                        ?.name ||
                                                                                        "Exercise"}
                                                                                    </div>
                                                                                    <Button
                                                                                      type="button"
                                                                                      variant="ghost"
                                                                                      size="sm"
                                                                                      onClick={() => {
                                                                                        // TODO: Implement remove exercise functionality
                                                                                      }}
                                                                                      className="text-red-500 hover:text-red-700 p-1 h-5"
                                                                                    >
                                                                                      <span className="text-xs">
                                                                                        Remove
                                                                                      </span>
                                                                                    </Button>
                                                                                  </div>

                                                                                  {/* Individual exercise work and rest time */}
                                                                                  <div className="grid grid-cols-2 gap-2">
                                                                                    <div>
                                                                                      <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                                        Work
                                                                                        (sec)
                                                                                      </Label>
                                                                                      <Input
                                                                                        type="number"
                                                                                        value={getWeekValue(
                                                                                          selectedWeek,
                                                                                          getExKey(
                                                                                            scheduleItem,
                                                                                            exerciseIndex,
                                                                                            `${id}-${idx}-set-${setIndex}-ex-${exIndex}`
                                                                                          ),
                                                                                          "work_seconds",
                                                                                          ""
                                                                                        )}
                                                                                        onChange={(
                                                                                          e
                                                                                        ) =>
                                                                                          setWeekValue(
                                                                                            selectedWeek,
                                                                                            getExKey(
                                                                                              scheduleItem,
                                                                                              exerciseIndex,
                                                                                              `${id}-${idx}-set-${setIndex}-ex-${exIndex}`
                                                                                            ),
                                                                                            "work_seconds",
                                                                                            e
                                                                                              .target
                                                                                              .value
                                                                                          )
                                                                                        }
                                                                                        min="0"
                                                                                        className="mt-1 rounded text-xs h-7"
                                                                                      />
                                                                                    </div>
                                                                                    <div>
                                                                                      <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                                        Rest
                                                                                        (sec)
                                                                                      </Label>
                                                                                      <Input
                                                                                        type="number"
                                                                                        value={getWeekValue(
                                                                                          selectedWeek,
                                                                                          getExKey(
                                                                                            scheduleItem,
                                                                                            exerciseIndex,
                                                                                            `${id}-${idx}-set-${setIndex}-ex-${exIndex}`
                                                                                          ),
                                                                                          "rest_after",
                                                                                          ""
                                                                                        )}
                                                                                        onChange={(
                                                                                          e
                                                                                        ) =>
                                                                                          setWeekValue(
                                                                                            selectedWeek,
                                                                                            getExKey(
                                                                                              scheduleItem,
                                                                                              exerciseIndex,
                                                                                              `${id}-${idx}-set-${setIndex}-ex-${exIndex}`
                                                                                            ),
                                                                                            "rest_after",
                                                                                            e
                                                                                              .target
                                                                                              .value
                                                                                          )
                                                                                        }
                                                                                        min="0"
                                                                                        className="mt-1 rounded text-xs h-7"
                                                                                      />
                                                                                    </div>
                                                                                  </div>
                                                                                </div>
                                                                              )
                                                                            )}
                                                                          </div>

                                                                          {/* Add Exercise Button */}
                                                                          <div className="mt-2">
                                                                            <Button
                                                                              type="button"
                                                                              variant="outline"
                                                                              size="sm"
                                                                              onClick={() => {
                                                                                // TODO: Implement add exercise functionality
                                                                              }}
                                                                              className="w-full border-dashed text-xs"
                                                                            >
                                                                              <span className="text-xs">
                                                                                +
                                                                                Add
                                                                                Exercise
                                                                              </span>
                                                                            </Button>
                                                                          </div>

                                                                          {/* Rest after this set */}
                                                                          <div className="mt-2">
                                                                            <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                              Rest
                                                                              After
                                                                              Set
                                                                              (sec)
                                                                            </Label>
                                                                            <Input
                                                                              type="number"
                                                                              value={getWeekValue(
                                                                                selectedWeek,
                                                                                getExKey(
                                                                                  scheduleItem,
                                                                                  exerciseIndex,
                                                                                  `${id}-${idx}-set-${setIndex}`
                                                                                ),
                                                                                "rest_between_sets",
                                                                                ""
                                                                              )}
                                                                              onChange={(
                                                                                e
                                                                              ) =>
                                                                                setWeekValue(
                                                                                  selectedWeek,
                                                                                  getExKey(
                                                                                    scheduleItem,
                                                                                    exerciseIndex,
                                                                                    `${id}-${idx}-set-${setIndex}`
                                                                                  ),
                                                                                  "rest_between_sets",
                                                                                  e
                                                                                    .target
                                                                                    .value
                                                                                )
                                                                              }
                                                                              min="0"
                                                                              className="mt-1 rounded text-xs h-7"
                                                                            />
                                                                          </div>
                                                                        </div>
                                                                      )
                                                                    )}
                                                                  </div>
                                                                )}
                                                              </div>
                                                            </div>
                                                          ) : exerciseType ===
                                                            "superset" ? (
                                                            <div className="space-y-1 col-span-1 md:col-span-2">
                                                              <div className="p-1 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-700">
                                                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1 text-xs">
                                                                  <Zap className="w-3 h-3 text-purple-600" />
                                                                  Superset
                                                                </h4>
                                                                <div>
                                                                  <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                    Second
                                                                    Exercise
                                                                  </Label>
                                                                  <SearchableSelect
                                                                    value={getWeekValue(
                                                                      selectedWeek,
                                                                      getExKey(
                                                                        scheduleItem,
                                                                        exerciseIndex,
                                                                        `${id}-${idx}`
                                                                      ),
                                                                      "superset_exercise_id",
                                                                      ""
                                                                    )}
                                                                    onValueChange={(
                                                                      value
                                                                    ) =>
                                                                      setWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "superset_exercise_id",
                                                                        value
                                                                      )
                                                                    }
                                                                    placeholder="Select..."
                                                                    items={exercises.map(
                                                                      (ex) => ({
                                                                        id: ex.id,
                                                                        name: ex.name,
                                                                        description:
                                                                          ex.description,
                                                                      })
                                                                    )}
                                                                    className="mt-1"
                                                                  />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-1">
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      Sets
                                                                    </Label>
                                                                    <Input
                                                                      type="number"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "sets",
                                                                        (
                                                                          exercise as any
                                                                        )
                                                                          .sets ||
                                                                          ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "sets",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      min="1"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      Rest
                                                                    </Label>
                                                                    <Input
                                                                      type="number"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "rest_seconds",
                                                                        (
                                                                          exercise as any
                                                                        )
                                                                          .rest_seconds ||
                                                                          ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "rest_seconds",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      min="0"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-1">
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      First Reps
                                                                    </Label>
                                                                    <Input
                                                                      type="text"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "reps",
                                                                        (
                                                                          exercise as any
                                                                        )
                                                                          .reps ||
                                                                          ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "reps",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      placeholder="8-12"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      Second
                                                                      Reps
                                                                    </Label>
                                                                    <Input
                                                                      type="text"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "superset_reps",
                                                                        ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "superset_reps",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      placeholder="8-12"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          ) : exerciseType ===
                                                            "cluster" ? (
                                                            <div className="space-y-1 col-span-1 md:col-span-2">
                                                              <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                                                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1 text-xs">
                                                                  <Zap className="w-3 h-3 text-blue-600" />
                                                                  Cluster Set
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-1">
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      Clusters
                                                                    </Label>
                                                                    <Input
                                                                      type="number"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "sets",
                                                                        (
                                                                          exercise as any
                                                                        )
                                                                          .sets ||
                                                                          ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "sets",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      min="1"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      Sets/Cluster
                                                                    </Label>
                                                                    <Input
                                                                      type="number"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "cluster_sets",
                                                                        ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "cluster_sets",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      min="1"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-1">
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      Reps
                                                                    </Label>
                                                                    <Input
                                                                      type="text"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "reps",
                                                                        (
                                                                          exercise as any
                                                                        )
                                                                          .reps ||
                                                                          ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "reps",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      placeholder="8-12"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                  <div>
                                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                      Rest (sec)
                                                                    </Label>
                                                                    <Input
                                                                      type="number"
                                                                      value={getWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "rest_seconds",
                                                                        (
                                                                          exercise as any
                                                                        )
                                                                          .rest_seconds ||
                                                                          ""
                                                                      )}
                                                                      onChange={(
                                                                        e
                                                                      ) =>
                                                                        setWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `${id}-${idx}`
                                                                          ),
                                                                          "rest_seconds",
                                                                          e
                                                                            .target
                                                                            .value
                                                                        )
                                                                      }
                                                                      min="0"
                                                                      className="mt-1 rounded text-xs h-7"
                                                                    />
                                                                  </div>
                                                                </div>
                                                                <div>
                                                                  <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                    Cluster Rest
                                                                    (sec)
                                                                  </Label>
                                                                  <Input
                                                                    type="number"
                                                                    value={getWeekValue(
                                                                      selectedWeek,
                                                                      getExKey(
                                                                        scheduleItem,
                                                                        exerciseIndex,
                                                                        `${id}-${idx}`
                                                                      ),
                                                                      "cluster_rest",
                                                                      ""
                                                                    )}
                                                                    onChange={(
                                                                      e
                                                                    ) =>
                                                                      setWeekValue(
                                                                        selectedWeek,
                                                                        getExKey(
                                                                          scheduleItem,
                                                                          exerciseIndex,
                                                                          `${id}-${idx}`
                                                                        ),
                                                                        "cluster_rest",
                                                                        e.target
                                                                          .value
                                                                      )
                                                                    }
                                                                    min="30"
                                                                    className="mt-1 rounded text-xs h-7"
                                                                  />
                                                                </div>
                                                              </div>
                                                            </div>
                                                          ) : exerciseType ===
                                                            "pre_exhaustion" ? (
                                                            <div className="col-span-1 md:col-span-2">
                                                              <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-200 dark:border-pink-700 space-y-4">
                                                                <div className="flex items-center justify-between mb-3">
                                                                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                                    <Zap className="w-4 h-4 text-pink-600" />
                                                                    Pre-Exhaustion
                                                                  </h4>
                                                                </div>

                                                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                                                  Isolation
                                                                  exercise
                                                                  followed by
                                                                  compound
                                                                  movement
                                                                </p>

                                                                {/* Display the two exercises */}
                                                                {exInfo && (
                                                                  <div className="space-y-3">
                                                                    {/* Pre-exhaustion exercise (first one) */}
                                                                    {idx ===
                                                                      0 && (
                                                                      <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                          <span className="text-xs text-slate-500 w-6">
                                                                            1.
                                                                          </span>
                                                                          <div className="flex-1 text-sm">
                                                                            {
                                                                              exInfo.name
                                                                            }
                                                                          </div>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                          <div>
                                                                            <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                              Isolation
                                                                              Reps
                                                                            </Label>
                                                                            <Input
                                                                              type="text"
                                                                              value={getWeekValue(
                                                                                selectedWeek,
                                                                                getExKey(
                                                                                  scheduleItem,
                                                                                  exerciseIndex,
                                                                                  `${id}-${idx}`
                                                                                ),
                                                                                "isolation_reps",
                                                                                ""
                                                                              )}
                                                                              onChange={(
                                                                                e
                                                                              ) =>
                                                                                setWeekValue(
                                                                                  selectedWeek,
                                                                                  getExKey(
                                                                                    scheduleItem,
                                                                                    exerciseIndex,
                                                                                    `${id}-${idx}`
                                                                                  ),
                                                                                  "isolation_reps",
                                                                                  e
                                                                                    .target
                                                                                    .value
                                                                                )
                                                                              }
                                                                              placeholder="12-15"
                                                                              className="mt-1 rounded text-xs h-7"
                                                                            />
                                                                          </div>
                                                                          <div>
                                                                            <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                              Rest
                                                                              (sec)
                                                                            </Label>
                                                                            <Input
                                                                              type="number"
                                                                              value={getWeekValue(
                                                                                selectedWeek,
                                                                                getExKey(
                                                                                  scheduleItem,
                                                                                  exerciseIndex,
                                                                                  `${id}-${idx}`
                                                                                ),
                                                                                "rest_seconds",
                                                                                (
                                                                                  exercise as any
                                                                                )
                                                                                  .rest_seconds ||
                                                                                  ""
                                                                              )}
                                                                              onChange={(
                                                                                e
                                                                              ) =>
                                                                                setWeekValue(
                                                                                  selectedWeek,
                                                                                  getExKey(
                                                                                    scheduleItem,
                                                                                    exerciseIndex,
                                                                                    `${id}-${idx}`
                                                                                  ),
                                                                                  "rest_seconds",
                                                                                  e
                                                                                    .target
                                                                                    .value
                                                                                )
                                                                              }
                                                                              min="0"
                                                                              className="mt-1 rounded text-xs h-7"
                                                                            />
                                                                          </div>
                                                                        </div>
                                                                      </div>
                                                                    )}

                                                                    {/* Compound exercise selection */}
                                                                    <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                                                                      <div className="mb-2">
                                                                        <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                          Select
                                                                          Compound
                                                                          Exercise
                                                                        </Label>
                                                                        <SearchableSelect
                                                                          value={getWeekValue(
                                                                            selectedWeek,
                                                                            getExKey(
                                                                              scheduleItem,
                                                                              exerciseIndex,
                                                                              `compound`
                                                                            ),
                                                                            "compound_exercise_id",
                                                                            parsed.compound_exercise_id ||
                                                                              (
                                                                                exercise as any
                                                                              )
                                                                                .compound_exercise_id ||
                                                                              ""
                                                                          )}
                                                                          onValueChange={(
                                                                            value
                                                                          ) => {
                                                                            setWeekValue(
                                                                              selectedWeek,
                                                                              getExKey(
                                                                                scheduleItem,
                                                                                exerciseIndex,
                                                                                `compound`
                                                                              ),
                                                                              "compound_exercise_id",
                                                                              value
                                                                            );
                                                                          }}
                                                                          placeholder="Select compound exercise..."
                                                                          items={exercises
                                                                            .filter(
                                                                              (
                                                                                ex
                                                                              ) =>
                                                                                ex.id !==
                                                                                (
                                                                                  exercise as any
                                                                                )
                                                                                  .exercise_id
                                                                            )
                                                                            .map(
                                                                              (
                                                                                ex
                                                                              ) => ({
                                                                                id: ex.id,
                                                                                name: ex.name,
                                                                                description:
                                                                                  ex.description,
                                                                              })
                                                                            )}
                                                                          className="mt-1"
                                                                        />
                                                                      </div>
                                                                    </div>

                                                                    {/* Compound exercise display */}
                                                                    {(() => {
                                                                      const compoundExerciseId =
                                                                        getWeekValue(
                                                                          selectedWeek,
                                                                          getExKey(
                                                                            scheduleItem,
                                                                            exerciseIndex,
                                                                            `compound`
                                                                          ),
                                                                          "compound_exercise_id",
                                                                          parsed.compound_exercise_id ||
                                                                            (
                                                                              exercise as any
                                                                            )
                                                                              .compound_exercise_id ||
                                                                            ""
                                                                        );
                                                                      const compoundExercise =
                                                                        exercises.find(
                                                                          (
                                                                            ex
                                                                          ) =>
                                                                            ex.id ===
                                                                            compoundExerciseId
                                                                        );
                                                                      return compoundExercise ? (
                                                                        <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                                                                          <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-xs text-slate-500 w-6">
                                                                              2.
                                                                            </span>
                                                                            <div className="flex-1 text-sm">
                                                                              {
                                                                                compoundExercise.name
                                                                              }
                                                                            </div>
                                                                          </div>
                                                                        </div>
                                                                      ) : null;
                                                                    })()}
                                                                    {idx ===
                                                                      1 &&
                                                                      exInfo && (
                                                                        <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                                                                          <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-xs text-slate-500 w-6">
                                                                              2.
                                                                            </span>
                                                                            <div className="flex-1 text-sm">
                                                                              {
                                                                                exInfo.name
                                                                              }
                                                                            </div>
                                                                          </div>
                                                                          <div className="grid grid-cols-2 gap-2">
                                                                            <div>
                                                                              <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                                Compound
                                                                                Reps
                                                                              </Label>
                                                                              <Input
                                                                                type="text"
                                                                                value={getWeekValue(
                                                                                  selectedWeek,
                                                                                  getExKey(
                                                                                    scheduleItem,
                                                                                    exerciseIndex,
                                                                                    `${id}-${idx}`
                                                                                  ),
                                                                                  "compound_reps",
                                                                                  ""
                                                                                )}
                                                                                onChange={(
                                                                                  e
                                                                                ) =>
                                                                                  setWeekValue(
                                                                                    selectedWeek,
                                                                                    getExKey(
                                                                                      scheduleItem,
                                                                                      exerciseIndex,
                                                                                      `${id}-${idx}`
                                                                                    ),
                                                                                    "compound_reps",
                                                                                    e
                                                                                      .target
                                                                                      .value
                                                                                  )
                                                                                }
                                                                                placeholder="6-8"
                                                                                className="mt-1 rounded text-xs h-7"
                                                                              />
                                                                            </div>
                                                                            <div>
                                                                              <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                                Rest
                                                                                (sec)
                                                                              </Label>
                                                                              <Input
                                                                                type="number"
                                                                                value={getWeekValue(
                                                                                  selectedWeek,
                                                                                  getExKey(
                                                                                    scheduleItem,
                                                                                    exerciseIndex,
                                                                                    `${id}-${idx}`
                                                                                  ),
                                                                                  "rest_seconds",
                                                                                  (
                                                                                    exercise as any
                                                                                  )
                                                                                    .rest_seconds ||
                                                                                    ""
                                                                                )}
                                                                                onChange={(
                                                                                  e
                                                                                ) =>
                                                                                  setWeekValue(
                                                                                    selectedWeek,
                                                                                    getExKey(
                                                                                      scheduleItem,
                                                                                      exerciseIndex,
                                                                                      `${id}-${idx}`
                                                                                    ),
                                                                                    "rest_seconds",
                                                                                    e
                                                                                      .target
                                                                                      .value
                                                                                  )
                                                                                }
                                                                                min="0"
                                                                                className="mt-1 rounded text-xs h-7"
                                                                              />
                                                                            </div>
                                                                          </div>
                                                                        </div>
                                                                      )}
                                                                  </div>
                                                                )}
                                                              </div>
                                                            </div>
                                                          ) : exerciseType ===
                                                            "giant_set" ? (
                                                            <>
                                                              <div>
                                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                                  Reps
                                                                </label>
                                                                <Input
                                                                  className="rounded-lg"
                                                                  value={getWeekValue(
                                                                    selectedWeek,
                                                                    getExKey(
                                                                      scheduleItem,
                                                                      exerciseIndex,
                                                                      `${id}-${idx}`
                                                                    ),
                                                                    "reps",
                                                                    (
                                                                      exercise as any
                                                                    ).reps || ""
                                                                  )}
                                                                  onChange={(
                                                                    e
                                                                  ) =>
                                                                    setWeekValue(
                                                                      selectedWeek,
                                                                      getExKey(
                                                                        scheduleItem,
                                                                        exerciseIndex,
                                                                        `${id}-${idx}`
                                                                      ),
                                                                      "reps",
                                                                      e.target
                                                                        .value
                                                                    )
                                                                  }
                                                                  placeholder="8-10"
                                                                />
                                                              </div>
                                                              <div>
                                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                                  Rest (sec)
                                                                </label>
                                                                <Input
                                                                  type="number"
                                                                  className="rounded-lg"
                                                                  value={getWeekValue(
                                                                    selectedWeek,
                                                                    getExKey(
                                                                      scheduleItem,
                                                                      exerciseIndex,
                                                                      `${id}-${idx}`
                                                                    ),
                                                                    "rest_seconds",
                                                                    (
                                                                      exercise as any
                                                                    )
                                                                      .rest_seconds ||
                                                                      ""
                                                                  )}
                                                                  onChange={(
                                                                    e
                                                                  ) =>
                                                                    setWeekValue(
                                                                      selectedWeek,
                                                                      getExKey(
                                                                        scheduleItem,
                                                                        exerciseIndex,
                                                                        `${id}-${idx}`
                                                                      ),
                                                                      "rest_seconds",
                                                                      e.target
                                                                        .value
                                                                    )
                                                                  }
                                                                  min="0"
                                                                />
                                                              </div>
                                                            </>
                                                          ) : null}
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                );
                                              })()}
                                            </div>
                                          )}
                                          {![
                                            "tabata",
                                            "circuit",
                                            "giant_set",
                                            "superset",
                                            "cluster",
                                            "drop_set",
                                            "amrap",
                                          ].includes(exerciseType || "") &&
                                          exerciseType === "circuit" ? (
                                            <>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Rounds
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "sets",
                                                    (exercise as any).sets ||
                                                      parsed.sets ||
                                                      1
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "sets",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="1"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Work (sec)
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "work_seconds",
                                                    (exercise as any)
                                                      .work_seconds ||
                                                      parsed.work_seconds ||
                                                      ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "work_seconds",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="0"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Rest (sec)
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "rest_seconds",
                                                    (exercise as any)
                                                      .rest_seconds ||
                                                      parsed.rest_seconds ||
                                                      ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "rest_seconds",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="0"
                                                />
                                              </div>
                                            </>
                                          ) : exerciseType === "amrap" ? (
                                            <div className="space-y-1 col-span-2 md:col-span-4">
                                              <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1 text-xs">
                                                  <Zap className="w-3 h-3 text-green-600" />
                                                  AMRAP
                                                </h4>
                                                <div className="grid grid-cols-2 gap-1">
                                                  <div>
                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                      Duration (min)
                                                    </Label>
                                                    <Input
                                                      type="number"
                                                      value={getWeekValue(
                                                        selectedWeek,
                                                        getExKey(
                                                          scheduleItem,
                                                          exerciseIndex
                                                        ),
                                                        "amrap_duration",
                                                        (exercise as any)
                                                          .amrap_duration || ""
                                                      )}
                                                      onChange={(e) =>
                                                        setWeekValue(
                                                          selectedWeek,
                                                          getExKey(
                                                            scheduleItem,
                                                            exerciseIndex
                                                          ),
                                                          "amrap_duration",
                                                          e.target.value
                                                        )
                                                      }
                                                      min="1"
                                                      className="mt-1 rounded text-xs h-7"
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                      Target Reps
                                                    </Label>
                                                    <Input
                                                      type="number"
                                                      value={getWeekValue(
                                                        selectedWeek,
                                                        getExKey(
                                                          scheduleItem,
                                                          exerciseIndex
                                                        ),
                                                        "target_reps",
                                                        (exercise as any)
                                                          .target_reps || ""
                                                      )}
                                                      onChange={(e) =>
                                                        setWeekValue(
                                                          selectedWeek,
                                                          getExKey(
                                                            scheduleItem,
                                                            exerciseIndex
                                                          ),
                                                          "target_reps",
                                                          e.target.value
                                                        )
                                                      }
                                                      min="1"
                                                      className="mt-1 rounded text-xs h-7"
                                                    />
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1">
                                                  <div>
                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                      Reps/Round
                                                    </Label>
                                                    <Input
                                                      type="text"
                                                      value={getWeekValue(
                                                        selectedWeek,
                                                        getExKey(
                                                          scheduleItem,
                                                          exerciseIndex
                                                        ),
                                                        "reps",
                                                        (exercise as any)
                                                          .reps || ""
                                                      )}
                                                      onChange={(e) =>
                                                        setWeekValue(
                                                          selectedWeek,
                                                          getExKey(
                                                            scheduleItem,
                                                            exerciseIndex
                                                          ),
                                                          "reps",
                                                          e.target.value
                                                        )
                                                      }
                                                      placeholder="10"
                                                      className="mt-1 rounded text-xs h-7"
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                      Rest (sec)
                                                    </Label>
                                                    <Input
                                                      type="number"
                                                      value={getWeekValue(
                                                        selectedWeek,
                                                        getExKey(
                                                          scheduleItem,
                                                          exerciseIndex
                                                        ),
                                                        "rest_seconds",
                                                        (exercise as any)
                                                          .rest_seconds || ""
                                                      )}
                                                      onChange={(e) =>
                                                        setWeekValue(
                                                          selectedWeek,
                                                          getExKey(
                                                            scheduleItem,
                                                            exerciseIndex
                                                          ),
                                                          "rest_seconds",
                                                          e.target.value
                                                        )
                                                      }
                                                      min="0"
                                                      className="mt-1 rounded text-xs h-7"
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ) : exerciseType === "emom" ? (
                                            <>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Duration (min)
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "emom_duration",
                                                    (exercise as any)
                                                      .emom_duration ||
                                                      parsed.emom_duration ||
                                                      ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "emom_duration",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="1"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Reps/min
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "emom_reps",
                                                    (exercise as any)
                                                      .emom_reps ||
                                                      parsed.emom_reps ||
                                                      ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "emom_reps",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="0"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Work (sec)
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "work_seconds",
                                                    (exercise as any)
                                                      .work_seconds ||
                                                      parsed.work_seconds ||
                                                      ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "work_seconds",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="0"
                                                />
                                              </div>
                                            </>
                                          ) : exerciseType === "giant_set" ? (
                                            <>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Sets
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "sets",
                                                    (exercise as any).sets ||
                                                      parsed.sets ||
                                                      3
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "sets",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="1"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Rest (sec)
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "rest_seconds",
                                                    (exercise as any)
                                                      .rest_seconds ||
                                                      parsed.rest_seconds ||
                                                      ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "rest_seconds",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="0"
                                                />
                                              </div>
                                            </>
                                          ) : exerciseType === "drop_set" ? (
                                            <div className="space-y-1 col-span-2 md:col-span-4">
                                              <div className="p-1 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-700">
                                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1 text-xs">
                                                  <Zap className="w-3 h-3 text-orange-600" />
                                                  Drop Set
                                                </h4>
                                                <div className="grid grid-cols-2 gap-1">
                                                  <div>
                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                      Sets
                                                    </Label>
                                                    <Input
                                                      type="number"
                                                      value={getWeekValue(
                                                        selectedWeek,
                                                        getExKey(
                                                          scheduleItem,
                                                          exerciseIndex
                                                        ),
                                                        "sets",
                                                        (exercise as any)
                                                          .sets || ""
                                                      )}
                                                      onChange={(e) =>
                                                        setWeekValue(
                                                          selectedWeek,
                                                          getExKey(
                                                            scheduleItem,
                                                            exerciseIndex
                                                          ),
                                                          "sets",
                                                          e.target.value
                                                        )
                                                      }
                                                      min="1"
                                                      className="mt-1 rounded text-xs h-7"
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                      Initial Reps
                                                    </Label>
                                                    <Input
                                                      type="text"
                                                      value={getWeekValue(
                                                        selectedWeek,
                                                        getExKey(
                                                          scheduleItem,
                                                          exerciseIndex
                                                        ),
                                                        "reps",
                                                        (exercise as any)
                                                          .reps || ""
                                                      )}
                                                      onChange={(e) =>
                                                        setWeekValue(
                                                          selectedWeek,
                                                          getExKey(
                                                            scheduleItem,
                                                            exerciseIndex
                                                          ),
                                                          "reps",
                                                          e.target.value
                                                        )
                                                      }
                                                      placeholder="8-10"
                                                      className="mt-1 rounded text-xs h-7"
                                                    />
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1">
                                                  <div>
                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                      Drop %
                                                    </Label>
                                                    <Input
                                                      type="number"
                                                      value={getWeekValue(
                                                        selectedWeek,
                                                        getExKey(
                                                          scheduleItem,
                                                          exerciseIndex
                                                        ),
                                                        "drop_percentage",
                                                        ""
                                                      )}
                                                      onChange={(e) =>
                                                        setWeekValue(
                                                          selectedWeek,
                                                          getExKey(
                                                            scheduleItem,
                                                            exerciseIndex
                                                          ),
                                                          "drop_percentage",
                                                          e.target.value
                                                        )
                                                      }
                                                      placeholder="20"
                                                      className="mt-1 rounded text-xs h-7"
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                      Drop Reps
                                                    </Label>
                                                    <Input
                                                      type="text"
                                                      value={getWeekValue(
                                                        selectedWeek,
                                                        getExKey(
                                                          scheduleItem,
                                                          exerciseIndex
                                                        ),
                                                        "drop_set_reps",
                                                        ""
                                                      )}
                                                      onChange={(e) =>
                                                        setWeekValue(
                                                          selectedWeek,
                                                          getExKey(
                                                            scheduleItem,
                                                            exerciseIndex
                                                          ),
                                                          "drop_set_reps",
                                                          e.target.value
                                                        )
                                                      }
                                                      placeholder="6-8"
                                                      className="mt-1 rounded text-xs h-7"
                                                    />
                                                  </div>
                                                </div>
                                                <div>
                                                  <Label className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                    Rest (sec)
                                                  </Label>
                                                  <Input
                                                    type="number"
                                                    value={getWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "rest_seconds",
                                                      (exercise as any)
                                                        .rest_seconds || ""
                                                    )}
                                                    onChange={(e) =>
                                                      setWeekValue(
                                                        selectedWeek,
                                                        getExKey(
                                                          scheduleItem,
                                                          exerciseIndex
                                                        ),
                                                        "rest_seconds",
                                                        e.target.value
                                                      )
                                                    }
                                                    min="0"
                                                    className="mt-1 rounded text-xs h-7"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          ) : ![
                                              "tabata",
                                              "circuit",
                                              "giant_set",
                                              "superset",
                                              "cluster",
                                              "drop_set",
                                              "amrap",
                                              "pre_exhaustion",
                                            ].includes(exerciseType || "") ? (
                                            <>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Sets
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "sets",
                                                    (exercise as any).sets || ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "sets",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="1"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Reps
                                                </label>
                                                <Input
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "reps",
                                                    (exercise as any).reps || ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "reps",
                                                      e.target.value
                                                    )
                                                  }
                                                  placeholder="8-10"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Rest (sec)
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "rest_seconds",
                                                    (exercise as any)
                                                      .rest_seconds || ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "rest_seconds",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="0"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  RIR
                                                </label>
                                                <Input
                                                  type="number"
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "rir",
                                                    (exercise as any).rir || ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "rir",
                                                      e.target.value
                                                    )
                                                  }
                                                  min="0"
                                                  max="5"
                                                />
                                              </div>
                                              <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                  Tempo
                                                </label>
                                                <Input
                                                  className="rounded-lg"
                                                  value={getWeekValue(
                                                    selectedWeek,
                                                    getExKey(
                                                      scheduleItem,
                                                      exerciseIndex
                                                    ),
                                                    "tempo",
                                                    (exercise as any).tempo ||
                                                      ""
                                                  )}
                                                  onChange={(e) =>
                                                    setWeekValue(
                                                      selectedWeek,
                                                      getExKey(
                                                        scheduleItem,
                                                        exerciseIndex
                                                      ),
                                                      "tempo",
                                                      e.target.value
                                                    )
                                                  }
                                                  placeholder="2-0-1-0"
                                                />
                                              </div>
                                            </>
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
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
              // Derive numeric progression rules from weekValues for the selected week
              const numericFields = new Set([
                "rest_seconds",
                "work_seconds",
                "emom_reps",
                "emom_duration",
                "rounds",
                "sets",
                "rir",
              ]);
              const derivedRules: any[] = [];
              const wv = weekValues[selectedWeek] || {};
              Object.entries(wv).forEach(([exKey, fields]: any) => {
                Object.entries(fields || {}).forEach(([f, v]: any) => {
                  if (numericFields.has(f)) {
                    const num = typeof v === "string" ? parseFloat(v) : v;
                    if (!isNaN(num)) {
                      derivedRules.push({
                        week_number: selectedWeek,
                        exercise_id: null, // template-level rule
                        field: f,
                        change_type: "fixed",
                        amount: num,
                      });
                    }
                  }
                });
              });
              const mergedRules = [
                ...(progressionRules || []),
                ...derivedRules,
              ];
              onSave({
                ...formData,
                schedule,
                progressionRules: mergedRules,
                selectedWeek,
                weekValues,
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
        title="Replace Exercise"
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
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Replace Exercise
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {/* Step 1: Select Exercise */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Step 1: Select New Exercise
            </h3>
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search exercises..."
                value={exerciseSearchTerm}
                onChange={(e) => setExerciseSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
              {exercises
                .filter(
                  (exercise) =>
                    exercise.name
                      .toLowerCase()
                      .includes(exerciseSearchTerm.toLowerCase()) ||
                    exercise.type
                      ?.toLowerCase()
                      .includes(exerciseSearchTerm.toLowerCase()) ||
                    exercise.category?.name
                      ?.toLowerCase()
                      .includes(exerciseSearchTerm.toLowerCase()) ||
                    exercise.equipment
                      ?.toLowerCase()
                      .includes(exerciseSearchTerm.toLowerCase())
                )
                .map((exercise) => (
                  <div
                    key={exercise.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedReplacementExercise?.id === exercise.id
                        ? "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => setSelectedReplacementExercise(exercise)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{exercise.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {exercise.type} •{" "}
                          {exercise.category?.name || exercise.category}
                        </p>
                      </div>
                      {exercise.equipment && (
                        <Badge variant="outline" className="text-xs">
                          {exercise.equipment}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Step 2: Configure Exercise */}
          {selectedReplacementExercise && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Step 2: Configure Exercise Parameters
              </h3>
              <div className="space-y-4">
                {/* Exercise Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Exercise Type
                  </label>
                  <Select
                    value={exerciseConfig.exercise_type}
                    onValueChange={(value) =>
                      setExerciseConfig((prev) => ({
                        ...prev,
                        exercise_type: value,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Select exercise type" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <SelectItem value="straight_set">Straight Set</SelectItem>
                      <SelectItem value="superset">Superset</SelectItem>
                      <SelectItem value="drop_set">Drop Set</SelectItem>
                      <SelectItem value="rest_pause">Rest-Pause</SelectItem>
                      <SelectItem value="cluster">Cluster</SelectItem>
                      <SelectItem value="pyramid">Pyramid</SelectItem>
                      <SelectItem value="ladder">Ladder</SelectItem>
                      <SelectItem value="amrap">
                        AMRAP (As Many Reps As Possible)
                      </SelectItem>
                      <SelectItem value="emom">
                        EMOM (Every Minute On the Minute)
                      </SelectItem>
                      <SelectItem value="tabata">Tabata</SelectItem>
                      <SelectItem value="circuit">Circuit</SelectItem>
                      <SelectItem value="giant_set">Giant Set</SelectItem>
                      <SelectItem value="pre_exhaustion">
                        Pre-Exhaustion
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Exercise Parameters - Dynamic based on exercise type */}
                {exerciseConfig.exercise_type === "cluster" && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Exercise parameters (clusters,
                      sets/cluster, rest time, etc.) will be configured in the
                      Progression Rules tab after saving this replacement.
                    </p>
                  </div>
                )}

                {exerciseConfig.exercise_type === "straight_set" && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Exercise parameters (sets, reps,
                      rest time, etc.) will be configured in the Progression
                      Rules tab after saving this replacement.
                    </p>
                  </div>
                )}

                {exerciseConfig.exercise_type === "superset" && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Exercise parameters (sets, reps,
                      rest time, etc.) will be configured in the Progression
                      Rules tab after saving this replacement.
                    </p>
                  </div>
                )}

                {exerciseConfig.exercise_type === "drop_set" && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Exercise parameters (sets, reps,
                      drop percentage, rest time, etc.) will be configured in
                      the Progression Rules tab after saving this replacement.
                    </p>
                  </div>
                )}

                {exerciseConfig.exercise_type === "amrap" && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Exercise parameters (duration,
                      target reps, rest time, etc.) will be configured in the
                      Progression Rules tab after saving this replacement.
                    </p>
                  </div>
                )}

                {exerciseConfig.exercise_type === "emom" && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Exercise parameters (duration, reps
                      per minute, mode, etc.) will be configured in the
                      Progression Rules tab after saving this replacement.
                    </p>
                  </div>
                )}

                {exerciseConfig.exercise_type === "tabata" && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Tabata parameters (work time, rest
                      time, rounds, etc.) will be configured in the Progression
                      Rules tab after saving this replacement.
                    </p>
                  </div>
                )}

                {false && exerciseConfig.exercise_type === "tabata-removed" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                        <strong>Tabata:</strong> High-intensity intervals with
                        multiple exercises. Each exercise performed for work
                        time, then rest before next exercise.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Rounds
                          </label>
                          <Input
                            type="number"
                            value={exerciseConfig.rounds || 8}
                            onChange={(e) =>
                              setExerciseConfig((prev) => ({
                                ...prev,
                                rounds: parseInt(e.target.value) || 8,
                              }))
                            }
                            min="1"
                            max="20"
                            className="rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Work Time (seconds)
                          </label>
                          <Input
                            type="number"
                            value={exerciseConfig.work_seconds || 20}
                            onChange={(e) =>
                              setExerciseConfig((prev) => ({
                                ...prev,
                                work_seconds: parseInt(e.target.value) || 20,
                              }))
                            }
                            min="10"
                            max="60"
                            className="rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Rest Time (seconds)
                          </label>
                          <Input
                            type="number"
                            value={exerciseConfig.rest_after || 10}
                            onChange={(e) =>
                              setExerciseConfig((prev) => ({
                                ...prev,
                                rest_after: parseInt(e.target.value) || 10,
                              }))
                            }
                            min="5"
                            max="30"
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tabata Exercises */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        Tabata Exercises
                      </h4>

                      {/* Primary Exercise */}
                      <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">
                              1.{" "}
                              {selectedReplacementExercise?.name ||
                                "Primary Exercise"}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedReplacementExercise?.type ||
                                "Exercise Type"}{" "}
                              •{" "}
                              {selectedReplacementExercise?.category?.name ||
                                selectedReplacementExercise?.category ||
                                "Category"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Additional Tabata Exercises */}
                      {exerciseConfig.tabata_exercises.map(
                        (exercise: any, index: number) => (
                          <div
                            key={`tabata-${exercise.id}-${index}`}
                            className="p-3 bg-white dark:bg-gray-800 border rounded-lg"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">
                                  {index + 2}. {exercise.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {exercise.type} •{" "}
                                  {exercise.category?.name || exercise.category}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setExerciseConfig((prev) => ({
                                    ...prev,
                                    tabata_exercises:
                                      prev.tabata_exercises.filter(
                                        (ex: any) => ex.id !== exercise.id
                                      ),
                                  }));
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        )
                      )}

                      {/* Add Exercise Button */}
                      <div className="mt-2">
                        <Select
                          onValueChange={(exerciseId) => {
                            const exercise = exercises.find(
                              (e) => e.id === exerciseId
                            );
                            if (exercise) {
                              setExerciseConfig((prev) => ({
                                ...prev,
                                tabata_exercises: [
                                  ...prev.tabata_exercises,
                                  exercise,
                                ],
                              }));
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Add another exercise to Tabata" />
                          </SelectTrigger>
                          <SelectContent className="z-[10000]">
                            {exercises
                              .filter(
                                (exercise) =>
                                  !exerciseConfig.tabata_exercises.some(
                                    (ex: any) => ex.id === exercise.id
                                  ) &&
                                  exercise.id !==
                                    selectedReplacementExercise?.id
                              )
                              .map((exercise) => (
                                <SelectItem
                                  key={exercise.id}
                                  value={exercise.id}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span>{exercise.name}</span>
                                    <span className="text-xs text-gray-500">
                                      (
                                      {exercise.category?.name ||
                                        exercise.category}
                                      )
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {exerciseConfig.exercise_type === "giant_set" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                        <strong>Giant Set:</strong> 4+ exercises performed in
                        sequence with minimal rest between exercises.
                      </p>
                      <div className="space-y-4">
                        {/* Giant Set Exercises */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Giant Set Exercises
                          </label>
                          <div className="space-y-2">
                            {/* Exercise 1 (Primary) */}
                            <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">
                                    1. {selectedReplacementExercise?.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {selectedReplacementExercise?.type} •{" "}
                                    {selectedReplacementExercise?.category
                                      ?.name ||
                                      selectedReplacementExercise?.category}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Additional Giant Set Exercises */}
                            {exerciseConfig.giant_set_exercises.map(
                              (exercise: any, index: number) => (
                                <div
                                  key={`giant-set-${exercise.id}-${index}`}
                                  className="p-3 bg-white dark:bg-gray-800 border rounded-lg"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <h4 className="font-medium">
                                        {index + 2}. {exercise.name}
                                      </h4>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {exercise.type} •{" "}
                                        {exercise.category?.name ||
                                          exercise.category}
                                      </p>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setExerciseConfig((prev) => ({
                                          ...prev,
                                          giant_set_exercises:
                                            prev.giant_set_exercises.filter(
                                              (ex: any) => ex.id !== exercise.id
                                            ),
                                        }));
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-1 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Reps
                                      </label>
                                      <Input
                                        value={exercise.reps || ""}
                                        onChange={(e) => {
                                          setExerciseConfig((prev) => ({
                                            ...prev,
                                            giant_set_exercises:
                                              prev.giant_set_exercises.map(
                                                (ex: any) =>
                                                  ex.id === exercise.id
                                                    ? {
                                                        ...ex,
                                                        reps: e.target.value,
                                                      }
                                                    : ex
                                              ),
                                          }));
                                        }}
                                        placeholder="8-12"
                                        className="rounded-lg text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )
                            )}

                            {/* Add Exercise Button */}
                            <div className="mt-2">
                              <Select
                                value=""
                                onValueChange={(value) => {
                                  const exercise = exercises.find(
                                    (ex) => ex.id === value
                                  );
                                  if (
                                    exercise &&
                                    !exerciseConfig.giant_set_exercises.some(
                                      (ex: any) => ex.id === exercise.id
                                    )
                                  ) {
                                    setExerciseConfig((prev) => ({
                                      ...prev,
                                      giant_set_exercises: [
                                        ...prev.giant_set_exercises,
                                        exercise,
                                      ],
                                    }));
                                  }
                                }}
                              >
                                <SelectTrigger className="rounded-lg">
                                  <SelectValue placeholder="Add exercise to giant set" />
                                </SelectTrigger>
                                <SelectContent className="z-[10000]">
                                  {exercises
                                    .filter(
                                      (exercise) =>
                                        exercise.id !==
                                          selectedReplacementExercise?.id &&
                                        !exerciseConfig.giant_set_exercises.some(
                                          (ex: any) => ex.id === exercise.id
                                        )
                                    )
                                    .map((exercise) => (
                                      <SelectItem
                                        key={exercise.id}
                                        value={exercise.id}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{exercise.name}</span>
                                          <span className="text-xs text-gray-500">
                                            ({exercise.type})
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Giant Set Parameters */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Sets
                            </label>
                            <Input
                              type="number"
                              value={exerciseConfig.sets}
                              onChange={(e) =>
                                setExerciseConfig((prev) => ({
                                  ...prev,
                                  sets: parseInt(e.target.value) || 3,
                                }))
                              }
                              min="1"
                              className="rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Reps Per Exercise
                            </label>
                            <Input
                              value={exerciseConfig.reps}
                              onChange={(e) =>
                                setExerciseConfig((prev) => ({
                                  ...prev,
                                  reps: e.target.value,
                                }))
                              }
                              placeholder="8-12"
                              className="rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Rest Between Sets (sec)
                            </label>
                            <Input
                              type="number"
                              value={exerciseConfig.rest_seconds}
                              onChange={(e) =>
                                setExerciseConfig((prev) => ({
                                  ...prev,
                                  rest_seconds: parseInt(e.target.value) || 90,
                                }))
                              }
                              min="0"
                              className="rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {exerciseConfig.exercise_type === "circuit" && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Circuit parameters (exercises,
                      sets, work time, rest time, etc.) will be configured in
                      the Progression Rules tab after saving this replacement.
                    </p>
                  </div>
                )}

                {exerciseConfig.exercise_type === "pre_exhaustion" && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Pre-exhaustion parameters
                      (isolation reps, compound reps, rest time, etc.) will be
                      configured in the Progression Rules tab after saving this
                      replacement.
                    </p>
                  </div>
                )}

                {false && exerciseConfig.exercise_type === "circuit-old" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">
                        <strong>Circuit:</strong> Multiple exercises performed
                        in sequence with minimal rest between exercises.
                      </p>
                      <div className="space-y-4">
                        {/* Circuit Exercises */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Circuit Exercises
                          </label>
                          <div className="space-y-2">
                            {/* Exercise 1 (Primary) */}
                            <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">
                                    1. {selectedReplacementExercise?.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {selectedReplacementExercise?.type} •{" "}
                                    {selectedReplacementExercise?.category
                                      ?.name ||
                                      selectedReplacementExercise?.category}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Additional Circuit Exercises */}
                            {exerciseConfig.circuit_exercises.map(
                              (exercise: any, index: number) => (
                                <div
                                  key={`circuit-${exercise.id}-${index}`}
                                  className="p-3 bg-white dark:bg-gray-800 border rounded-lg"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <h4 className="font-medium">
                                        {index + 2}. {exercise.name}
                                      </h4>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {exercise.type} •{" "}
                                        {exercise.category?.name ||
                                          exercise.category}
                                      </p>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setExerciseConfig((prev) => ({
                                          ...prev,
                                          circuit_exercises:
                                            prev.circuit_exercises.filter(
                                              (ex: any) => ex.id !== exercise.id
                                            ),
                                        }));
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Reps
                                      </label>
                                      <Input
                                        value={exercise.reps || ""}
                                        onChange={(e) => {
                                          setExerciseConfig((prev) => ({
                                            ...prev,
                                            circuit_exercises:
                                              prev.circuit_exercises.map(
                                                (ex: any) =>
                                                  ex.id === exercise.id
                                                    ? {
                                                        ...ex,
                                                        reps: e.target.value,
                                                      }
                                                    : ex
                                              ),
                                          }));
                                        }}
                                        placeholder="8-12"
                                        className="rounded-lg text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Work Time (sec)
                                      </label>
                                      <Input
                                        type="number"
                                        value={exercise.work_seconds || 30}
                                        onChange={(e) => {
                                          setExerciseConfig((prev) => ({
                                            ...prev,
                                            circuit_exercises:
                                              prev.circuit_exercises.map(
                                                (ex: any) =>
                                                  ex.id === exercise.id
                                                    ? {
                                                        ...ex,
                                                        work_seconds:
                                                          parseInt(
                                                            e.target.value
                                                          ) || 30,
                                                      }
                                                    : ex
                                              ),
                                          }));
                                        }}
                                        min="10"
                                        max="300"
                                        className="rounded-lg text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Rest After (sec)
                                      </label>
                                      <Input
                                        type="number"
                                        value={exercise.rest_after || 15}
                                        onChange={(e) => {
                                          setExerciseConfig((prev) => ({
                                            ...prev,
                                            circuit_exercises:
                                              prev.circuit_exercises.map(
                                                (ex: any) =>
                                                  ex.id === exercise.id
                                                    ? {
                                                        ...ex,
                                                        rest_after:
                                                          parseInt(
                                                            e.target.value
                                                          ) || 15,
                                                      }
                                                    : ex
                                              ),
                                          }));
                                        }}
                                        min="0"
                                        max="60"
                                        className="rounded-lg text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )
                            )}

                            {/* Add Exercise Button */}
                            <div className="mt-2">
                              <Select
                                value=""
                                onValueChange={(value) => {
                                  const exercise = exercises.find(
                                    (ex) => ex.id === value
                                  );
                                  if (
                                    exercise &&
                                    !exerciseConfig.circuit_exercises.some(
                                      (ex: any) => ex.id === exercise.id
                                    )
                                  ) {
                                    setExerciseConfig((prev) => ({
                                      ...prev,
                                      circuit_exercises: [
                                        ...prev.circuit_exercises,
                                        exercise,
                                      ],
                                    }));
                                  }
                                }}
                              >
                                <SelectTrigger className="rounded-lg">
                                  <SelectValue placeholder="Add exercise to circuit" />
                                </SelectTrigger>
                                <SelectContent className="z-[10000]">
                                  {exercises
                                    .filter(
                                      (exercise) =>
                                        exercise.id !==
                                          selectedReplacementExercise?.id &&
                                        !exerciseConfig.circuit_exercises.some(
                                          (ex: any) => ex.id === exercise.id
                                        )
                                    )
                                    .map((exercise) => (
                                      <SelectItem
                                        key={exercise.id}
                                        value={exercise.id}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{exercise.name}</span>
                                          <span className="text-xs text-gray-500">
                                            ({exercise.type})
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Circuit Parameters */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Rounds
                            </label>
                            <Input
                              type="number"
                              value={exerciseConfig.sets}
                              onChange={(e) =>
                                setExerciseConfig((prev) => ({
                                  ...prev,
                                  sets: parseInt(e.target.value) || 3,
                                }))
                              }
                              min="1"
                              className="rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Work Time (sec)
                            </label>
                            <Input
                              type="number"
                              value={exerciseConfig.work_seconds || 30}
                              onChange={(e) =>
                                setExerciseConfig((prev) => ({
                                  ...prev,
                                  work_seconds: parseInt(e.target.value) || 30,
                                }))
                              }
                              min="10"
                              max="300"
                              className="rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Rest Between Exercises (sec)
                            </label>
                            <Input
                              type="number"
                              value={exerciseConfig.rest_after || 15}
                              onChange={(e) =>
                                setExerciseConfig((prev) => ({
                                  ...prev,
                                  rest_after: parseInt(e.target.value) || 15,
                                }))
                              }
                              min="0"
                              max="60"
                              className="rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Rest After Round (sec)
                            </label>
                            <Input
                              type="number"
                              value={exerciseConfig.rest_seconds}
                              onChange={(e) =>
                                setExerciseConfig((prev) => ({
                                  ...prev,
                                  rest_seconds: parseInt(e.target.value) || 60,
                                }))
                              }
                              min="0"
                              className="rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Default parameters for other exercise types */}
                {![
                  "straight_set",
                  "superset",
                  "drop_set",
                  "amrap",
                  "emom",
                  "tabata",
                  "circuit",
                  "giant_set",
                  "cluster",
                ].includes(exerciseConfig.exercise_type) && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Exercise parameters (sets, reps,
                      rest time, etc.) will be configured in the Progression
                      Rules tab after saving this replacement.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ResponsiveModal>
    </div>
  );
}
