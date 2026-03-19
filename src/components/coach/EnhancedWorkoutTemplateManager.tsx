"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useTheme } from "@/contexts/ThemeContext";
import {
  Plus,
  Search,
  Dumbbell,
  Clock,
  Edit,
  Trash2,
  Play,
  Users,
  Copy,
  RefreshCw,
  Star,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Target,
  Zap,
  Heart,
  Activity,
  BookOpen,
  Settings,
  Eye,
  ChevronRight,
  Award,
  TrendingUp,
  BarChart3,
  UserPlus,
  X,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import WorkoutTemplateService, {
  WorkoutTemplate,
  Exercise,
  ExerciseCategory,
} from "@/lib/workoutTemplateService";
import { useAuth } from "@/contexts/AuthContext";
import WorkoutTemplateForm from "@/components/WorkoutTemplateForm";
import WorkoutTemplateDetails from "./WorkoutTemplateDetails";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";

interface EnhancedWorkoutTemplateManagerProps {
  coachId: string;
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

export default function EnhancedWorkoutTemplateManager({
  coachId,
}: EnhancedWorkoutTemplateManagerProps) {
  const { getThemeStyles } = useTheme();
  const { addToast } = useToast();
  const { user } = useAuth();
  const theme = getThemeStyles();

  // State management
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateAssignmentCounts, setTemplateAssignmentCounts] = useState<
    Record<string, number>
  >({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedDuration, setSelectedDuration] = useState("all");
  const [sortBy, setSortBy] = useState<
    "name" | "created" | "usage" | "rating" | "duration"
  >("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<WorkoutTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkoutTemplate | null>(null);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);

  // Assignment states
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTemplateForAssignment, setSelectedTemplateForAssignment] =
    useState<WorkoutTemplate | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const difficultyColors = {
    beginner:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    intermediate:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    advanced: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case "strength":
        return Dumbbell;
      case "cardio":
        return Heart;
      case "hiit":
        return Zap;
      case "flexibility":
        return Activity;
      case "upper body":
        return Target;
      case "lower body":
        return Dumbbell;
      default:
        return Dumbbell;
    }
  };

  // Load assignment counts for all workout templates
  const loadTemplateAssignmentCounts = async () => {
    try {
      const { data: assignments, error } = await supabase
        .from("workout_assignments")
        .select("workout_template_id")
        .eq("coach_id", coachId);

      if (error) {
        console.error("Error loading template assignment counts:", error);
        return;
      }

      // Count assignments per template
      const counts: Record<string, number> = {};
      assignments?.forEach((assignment) => {
        const templateId = assignment.workout_template_id;
        if (templateId) {
          counts[templateId] = (counts[templateId] || 0) + 1;
        }
      });

      console.log("📊 Template assignment counts loaded:", counts);
      setTemplateAssignmentCounts(counts);
    } catch (error) {
      console.error("Error loading template assignment counts:", error);
    }
  };

  useEffect(() => {
    loadData();
    loadTemplateAssignmentCounts();
  }, [coachId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, exercisesData, categoriesData] = await Promise.all([
        WorkoutTemplateService.getWorkoutTemplates(coachId),
        WorkoutTemplateService.getExercises(),
        WorkoutTemplateService.getExerciseCategories(),
      ]);

      setTemplates(templatesData);
      setExercises(exercisesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTemplates = templates
    .filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty =
        selectedDifficulty === "all" ||
        template.difficulty_level === selectedDifficulty;

      let matchesDuration = true;
      if (selectedDuration !== "all") {
        const duration = template.estimated_duration;
        switch (selectedDuration) {
          case "short":
            matchesDuration = duration <= 30;
            break;
          case "medium":
            matchesDuration = duration > 30 && duration <= 60;
            break;
          case "long":
            matchesDuration = duration > 60;
            break;
        }
      }

      return matchesSearch && matchesDifficulty && matchesDuration;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "created":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "usage":
          comparison = (a.usage_count || 0) - (b.usage_count || 0);
          break;
        case "rating":
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case "duration":
          comparison = a.estimated_duration - b.estimated_duration;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const handleCreateTemplate = async (
    templateData: Omit<WorkoutTemplate, "id" | "created_at" | "updated_at">
  ) => {
    try {
      const newTemplate = await WorkoutTemplateService.createWorkoutTemplate({
        ...templateData,
        coach_id: coachId,
      });

      if (newTemplate) {
        setTemplates([newTemplate, ...templates]);
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error("Error creating template:", error);
    }
  };

  const handleUpdateTemplate = async (
    templateId: string,
    updates: Partial<WorkoutTemplate>
  ) => {
    try {
      const updatedTemplate =
        await WorkoutTemplateService.updateWorkoutTemplate(templateId, updates);

      if (updatedTemplate) {
        setTemplates(
          templates.map((t) => (t.id === templateId ? updatedTemplate : t))
        );
        setEditingTemplate(null);
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error("Error updating template:", error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this template? This action cannot be undone."
      )
    )
      return;

    try {
      const success = await WorkoutTemplateService.deleteWorkoutTemplate(
        templateId
      );

      if (success) {
        setTemplates(templates.filter((t) => t.id !== templateId));
      }
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const handleDuplicateTemplate = async (template: WorkoutTemplate) => {
    try {
      const duplicatedTemplate =
        await WorkoutTemplateService.duplicateWorkoutTemplate(
          template.id,
          `${template.name} (Copy)`
        );

      if (duplicatedTemplate) {
        setTemplates([duplicatedTemplate, ...templates]);
      }
    } catch (error) {
      console.error("Error duplicating template:", error);
    }
  };

  // Assignment functions
  const handleAssignTemplate = async (template: WorkoutTemplate) => {
    setSelectedTemplateForAssignment(template);
    setSelectedClients([]);

    // Load clients for this coach
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

          // Load existing assignments for this template to filter out already-assigned clients
          const { data: existingAssignments, error: assignmentsError } =
            await supabase
              .from("workout_assignments")
              .select("client_id")
              .eq("workout_template_id", template.id)
              .eq("coach_id", user.id);

          if (assignmentsError) throw assignmentsError;

          // Filter out clients who already have this template assigned
          const alreadyAssignedClientIds = new Set(
            existingAssignments?.map((a) => a.client_id) || []
          );
          const availableClients = clientsData.filter(
            (client) => !alreadyAssignedClientIds.has(client.client_id)
          );

          console.log(
            "📊 Available clients for template assignment:",
            availableClients.length,
            "out of",
            clientsData.length
          );
          console.log(
            "📊 Already assigned clients:",
            Array.from(alreadyAssignedClientIds)
          );

          if (availableClients.length === 0) {
            addToast({ title: "All clients already have this workout template assigned!", variant: "destructive" });
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
        addToast({ title: "Error loading clients. Please try again.", variant: "destructive" });
        return;
      }
    }

    setShowAssignmentModal(true);
  };

  const assignTemplateToClients = async (
    templateId: string,
    clientIds: string[],
    coachId: string
  ) => {
    try {
      let successCount = 0;
      let failureCount = 0;

      for (const profileId of clientIds) {
        const clientRecord = clients.find(
          (client) =>
            client.client_id === profileId ||
            client.id === profileId ||
            client.profiles?.id === profileId
        );

        if (!clientRecord) {
          console.warn(
            "[WorkoutAssign] Unable to locate client relationship for profile:",
            profileId
          );
          failureCount += 1;
          continue;
        }

        const relationshipId = clientRecord.id;
        const resolvedProfileId = clientRecord.client_id || profileId;

        if (!relationshipId || !resolvedProfileId) {
          console.warn(
            "[WorkoutAssign] Missing relationship/profile ID for client:",
            clientRecord
          );
          failureCount += 1;
          continue;
        }

        const assignment = await WorkoutTemplateService.assignWorkoutToClient(
          relationshipId,
          resolvedProfileId,
          templateId,
          coachId,
          new Date().toISOString().split("T")[0],
          null
        );

        if (assignment) {
          successCount += 1;
        } else {
          failureCount += 1;
        }
      }

      if (failureCount > 0) {
        addToast({
          title: `Assigned ${successCount} workout(s), but ${failureCount} failed. Check console for details.`,
          variant: "destructive",
        });
      } else {
        addToast({ title: "Workout template assigned successfully!", variant: "success" });
      }

      // Refresh template assignment counts
      await loadTemplateAssignmentCounts();

      // Dispatch event to refresh assignment counts
      console.log("📢 Dispatching assignment event for clients:", clientIds);
      clientIds.forEach((clientId) => {
        console.log("📢 Dispatching event for client:", clientId);
        window.dispatchEvent(
          new CustomEvent("assignmentMade", {
            detail: { clientId, type: "workout" },
          })
        );

        // Also use localStorage as backup (works across tabs)
        localStorage.setItem(
          "assignmentMade",
          JSON.stringify({
            clientId,
            type: "workout",
            timestamp: Date.now(),
          })
        );
      });
    } catch (error) {
      console.error("Error assigning template:", error);
      addToast({ title: "Error assigning workout template. Please try again.", variant: "destructive" });
      throw error;
    }
  };

  const openTemplateBuilder = (template: WorkoutTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateBuilder(true);
  };

  const openTemplateDetails = (template: WorkoutTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateDetails(true);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse p-6 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className={`${theme.card} rounded-2xl p-6`}>
              <div className="h-8 bg-[var(--fc-surface-sunken)] rounded mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 bg-[var(--fc-surface-sunken)] rounded-2xl"
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
    <div className="min-h-screen bg-[color:var(--fc-bg-deep)]">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden p-6 sm:py-6 sm:px-5">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
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
                <Dumbbell className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-[28px] font-bold text-[color:var(--fc-text-primary)] mb-2">
                  Workout Templates
                </h1>
                <p className="text-sm font-normal text-[color:var(--fc-text-dim)]">
                  Create and manage exercise blueprints
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
                onClick={() => setShowCreateForm(true)}
                style={{
                  backgroundColor: "var(--fc-accent-purple)",
                  borderRadius: "20px",
                  padding: "16px 32px",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "var(--fc-text-inverse)",
                }}
              >
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-[color:var(--fc-surface-card)] rounded-3xl p-6 mb-5 min-h-[120px] shadow-sm">
              <div className="flex flex-col items-center text-center gap-3">
                <div
                  className="w-14 h-14 rounded-[18px] flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                  }}
                >
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div className="w-full overflow-hidden">
                  <p className="text-4xl font-extrabold leading-tight m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--fc-text-primary)]">
                    {templates.length}
                  </p>
                  <p className="text-sm font-normal m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--fc-text-dim)]">
                    Templates
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[color:var(--fc-surface-card)] rounded-3xl p-6 mb-5 min-h-[120px] shadow-sm">
              <div className="flex flex-col items-center text-center gap-3">
                <div
                  className="w-14 h-14 rounded-[18px] flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
                  }}
                >
                  <Dumbbell className="w-8 h-8 text-white" />
                </div>
                <div className="w-full overflow-hidden">
                  <p className="text-4xl font-extrabold leading-tight m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--fc-text-primary)]">
                    {templates.reduce(
                      (sum, t) => sum + (t.exercises?.length || 0),
                      0
                    )}
                  </p>
                  <p className="text-sm font-normal m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--fc-text-dim)]">
                    Exercises
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[color:var(--fc-surface-card)] rounded-3xl p-6 mb-5 min-h-[120px] shadow-sm">
              <div className="flex flex-col items-center text-center gap-3">
                <div
                  className="w-14 h-14 rounded-[18px] flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)",
                  }}
                >
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <div className="w-full overflow-hidden">
                  <p className="text-4xl font-extrabold leading-tight m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--fc-text-primary)]">
                    {templates.length > 0
                      ? Math.round(
                          templates.reduce(
                            (sum, t) => sum + t.estimated_duration,
                            0
                          ) / templates.length
                        )
                      : 0}
                    m
                  </p>
                  <p className="text-sm font-normal m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--fc-text-dim)]">
                    Avg Duration
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[color:var(--fc-surface-card)] rounded-3xl p-6 mb-5 min-h-[120px] shadow-sm">
              <div className="flex flex-col items-center text-center gap-3">
                <div
                  className="w-14 h-14 rounded-[18px] flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #F093FB 0%, #F5576C 100%)",
                  }}
                >
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div className="w-full overflow-hidden">
                  <p className="text-4xl font-extrabold leading-tight m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--fc-text-primary)]">
                    {templates.reduce(
                      (sum, t) => sum + (t.usage_count || 0),
                      0
                    )}
                  </p>
                  <p className="text-sm font-normal m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--fc-text-dim)]">
                    Total Usage
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 sm:py-6 sm:px-5">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Enhanced Search and Filters */}
          <div className="bg-[color:var(--fc-surface-card)] rounded-3xl p-6 mb-5 shadow-sm">
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 fc-text-dim w-5 h-5" />
                <Input
                  placeholder="Search workout templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    paddingLeft: "48px",
                    height: "48px",
                    borderRadius: "16px",
                    border: "2px solid var(--fc-glass-border)",
                    fontSize: "16px",
                    backgroundColor: "var(--fc-surface-card)",
                  }}
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                  value={selectedDifficulty}
                  onValueChange={setSelectedDifficulty}
                >
                  <SelectTrigger
                    style={{
                      height: "48px",
                      borderRadius: "16px",
                      border: "2px solid var(--fc-glass-border)",
                      backgroundColor: "var(--fc-surface-card)",
                    }}
                  >
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Beginner
                      </div>
                    </SelectItem>
                    <SelectItem value="intermediate">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Intermediate
                      </div>
                    </SelectItem>
                    <SelectItem value="advanced">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Advanced
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedDuration}
                  onValueChange={setSelectedDuration}
                >
                  <SelectTrigger
                    style={{
                      height: "48px",
                      borderRadius: "16px",
                      border: "2px solid var(--fc-glass-border)",
                      backgroundColor: "var(--fc-surface-card)",
                    }}
                  >
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Durations</SelectItem>
                    <SelectItem value="short">Short (≤30 min)</SelectItem>
                    <SelectItem value="medium">Medium (30-60 min)</SelectItem>
                    <SelectItem value="long">Long (&gt;60 min)</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(
                    value: "name" | "created" | "usage" | "rating" | "duration"
                  ) => setSortBy(value)}
                >
                  <SelectTrigger
                    style={{
                      height: "48px",
                      borderRadius: "16px",
                      border: "2px solid var(--fc-glass-border)",
                      backgroundColor: "var(--fc-surface-card)",
                    }}
                  >
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="created">Date Created</SelectItem>
                    <SelectItem value="usage">Usage Count</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    onClick={() => setViewMode("grid")}
                    style={{
                      flex: 1,
                      borderRadius: "20px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    onClick={() => setViewMode("list")}
                    style={{
                      flex: 1,
                      borderRadius: "20px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    <List className="w-4 h-4 mr-2" />
                    List
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                    style={{ padding: "12px", borderRadius: "20px" }}
                  >
                    {sortOrder === "asc" ? (
                      <SortAsc className="w-4 h-4" />
                    ) : (
                      <SortDesc className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Template Grid/List */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedTemplates.map((template) => (
                <WorkoutTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => {
                    setEditingTemplate(template);
                    setShowCreateForm(true);
                  }}
                  onDelete={() => handleDeleteTemplate(template.id)}
                  onDuplicate={() => handleDuplicateTemplate(template)}
                  onOpenBuilder={() => openTemplateDetails(template)}
                  onAssign={() => handleAssignTemplate(template)}
                  assignmentCount={templateAssignmentCounts[template.id] || 0}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedTemplates.map((template) => (
                <WorkoutTemplateListItem
                  key={template.id}
                  template={template}
                  onEdit={() => {
                    setEditingTemplate(template);
                    setShowCreateForm(true);
                  }}
                  onDelete={() => handleDeleteTemplate(template.id)}
                  onDuplicate={() => handleDuplicateTemplate(template)}
                  onOpenBuilder={() => openTemplateDetails(template)}
                  onAssign={() => handleAssignTemplate(template)}
                  assignmentCount={templateAssignmentCounts[template.id] || 0}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredAndSortedTemplates.length === 0 && (
            <div
              className="bg-[color:var(--fc-surface-card)] rounded-3xl p-6 mb-5 text-center shadow-sm"
              style={{
                borderRadius: "24px",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <div className="relative mb-6">
                <BookOpen className="w-20 h-20 fc-text-dim mx-auto" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              </div>
              <h3
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "var(--fc-text-primary)",
                  marginBottom: "12px",
                }}
              >
                {templates.length === 0
                  ? "No templates yet"
                  : "No templates found"}
              </h3>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: "400",
                  color: "var(--fc-text-dim)",
                  marginBottom: "32px",
                  maxWidth: "400px",
                  margin: "0 auto 32px auto",
                }}
              >
                {templates.length === 0
                  ? "Create your first workout template - a reusable exercise blueprint without sets/reps (those are managed by progression rules)."
                  : "Try adjusting your search or filter criteria."}
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                style={{
                  backgroundColor: "var(--fc-accent-purple)",
                  borderRadius: "20px",
                  padding: "16px 32px",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "var(--fc-text-inverse)",
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Template
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <WorkoutTemplateForm
        isOpen={showCreateForm}
        onClose={() => {
          setShowCreateForm(false);
          setEditingTemplate(null);
        }}
        onSuccess={() => {
          setShowCreateForm(false);
          setEditingTemplate(null);
          loadData();
        }}
        template={editingTemplate}
      />

      {showTemplateBuilder && editingTemplate && (
        <WorkoutTemplateForm
          isOpen={showTemplateBuilder}
          onClose={() => {
            setShowTemplateBuilder(false);
            setEditingTemplate(null);
          }}
          onSuccess={() => {
            loadData();
            setShowTemplateBuilder(false);
            setEditingTemplate(null);
          }}
          template={editingTemplate}
        />
      )}

      {showTemplateDetails && selectedTemplate && (
        <WorkoutTemplateDetails
          isOpen={showTemplateDetails}
          onClose={() => {
            setShowTemplateDetails(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
          onEdit={(template) => {
            setShowTemplateDetails(false);
            setSelectedTemplate(null);
            setEditingTemplate(template as WorkoutTemplate);
            setShowTemplateBuilder(true);
          }}
        />
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && selectedTemplateForAssignment && (
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
            className="bg-[color:var(--fc-surface-card)] rounded-3xl border border-[color:var(--fc-glass-border)] shadow-md w-full max-h-[80vh] overflow-hidden"
            style={{
              maxWidth: "28rem",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid var(--fc-glass-border)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "var(--fc-text-primary)",
                    }}
                  >
                    Assign Workout Template
                  </h2>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "var(--fc-text-dim)",
                      marginTop: "4px",
                    }}
                  >
                    Assign &quot;{selectedTemplateForAssignment.name}&quot; to
                    clients
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setSelectedTemplateForAssignment(null);
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
                  <Users className="w-12 h-12 fc-text-dim mx-auto mb-4" />
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "var(--fc-text-dim)",
                    }}
                  >
                    You don&apos;t have any active clients to assign this
                    template to.
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
                              ? "2px solid var(--fc-status-success)"
                              : "2px solid var(--fc-glass-border)",
                            backgroundColor: isSelected ? "color-mix(in srgb, var(--fc-status-success) 20%, transparent)" : "var(--fc-surface-card)",
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
                              borderColor: isSelected ? "var(--fc-status-success)" : "var(--fc-glass-border)",
                              backgroundColor: isSelected
                                ? "var(--fc-status-success)"
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
                                color: "var(--fc-text-primary)",
                              }}
                            >
                              {client.profiles?.first_name}{" "}
                              {client.profiles?.last_name}
                            </div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "400",
                                color: "var(--fc-text-dim)",
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
                      borderTop: "1px solid var(--fc-glass-border)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "var(--fc-text-dim)",
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
                          setSelectedTemplateForAssignment(null);
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
                            addToast({ title: "Please select at least one client.", variant: "destructive" });
                            return;
                          }

                          try {
                            await assignTemplateToClients(
                              selectedTemplateForAssignment.id,
                              selectedClients,
                              user?.id || ""
                            );
                            addToast({
                              title: `Workout template assigned to ${selectedClients.length} client(s) successfully!`,
                              variant: "success",
                            });
                            setShowAssignmentModal(false);
                            setSelectedTemplateForAssignment(null);
                            setSelectedClients([]);
                          } catch (error) {
                            console.error("Error assigning template:", error);
                            addToast({ title: "Error assigning template. Please try again.", variant: "destructive" });
                          }
                        }}
                        disabled={selectedClients.length === 0}
                        style={{
                          backgroundColor: "var(--fc-accent-purple)",
                          borderRadius: "20px",
                          padding: "12px 24px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--fc-text-inverse)",
                        }}
                      >
                        Assign Template
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Template Card Component for Grid View
interface WorkoutTemplateCardProps {
  template: WorkoutTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpenBuilder: () => void;
  onAssign?: () => void;
  assignmentCount?: number;
}

function WorkoutTemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onOpenBuilder,
  onAssign,
  assignmentCount = 0,
}: WorkoutTemplateCardProps) {
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  // Different gradient backgrounds for each card - better distribution
  const gradients = [
    "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30",
    "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30",
    "bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/30",
    "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/30",
    "bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/30",
    "bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/20 dark:to-cyan-900/30",
    "bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/30",
    "bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/30",
    "bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/30",
    "bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/30",
  ];
  // Create a hash from the entire ID for better distribution
  const hash = template.id.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const gradientClass = gradients[Math.abs(hash) % gradients.length];

  const difficultyColors = {
    beginner:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    intermediate:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    advanced: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case "strength":
        return Dumbbell;
      case "cardio":
        return Heart;
      case "hiit":
        return Zap;
      case "flexibility":
        return Activity;
      case "yoga":
        return Activity;
      case "pilates":
        return Activity;
      case "crossfit":
        return Zap;
      case "powerlifting":
        return Dumbbell;
      case "bodybuilding":
        return Dumbbell;
      case "endurance":
        return Activity;
      case "sports":
        return Award;
      case "rehabilitation":
        return Heart;
      default:
        return Dumbbell;
    }
  };

  // Get the primary category from exercises, fallback to template category
  const getPrimaryCategory = () => {
    if (template.exercises && template.exercises.length > 0) {
      const firstExercise = template.exercises[0];
      const category = firstExercise.exercise?.category;
      return (
        (typeof category === 'string' ? category : (category as any)?.name) || template.category || "General"
      );
    }
    return template.category || "General";
  };

  const primaryCategory = getPrimaryCategory();
  const CategoryIcon = getCategoryIcon(primaryCategory);

  return (
    <div
      style={{
        backgroundColor: "var(--fc-surface-card)",
        borderRadius: "24px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
        cursor: "pointer",
      }}
      className="hover:shadow-xl transition-all duration-300"
      onClick={onOpenBuilder}
    >
      <div className="h-full flex flex-col">
        {/* Template Header */}
        <div
          className="relative"
          style={{
            height: "96px",
            background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
          }}
        >
          {/* Category Icon */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CategoryIcon
                className="w-6 h-6 text-white"
              />
            </div>
          </div>

          {/* Difficulty Badge */}
          <div
            className="absolute"
            style={{
              top: "8px",
              left: "8px",
              maxWidth: "calc(100% - 80px)",
              overflow: "hidden",
            }}
          >
            <Badge
              className={`max-w-full whitespace-nowrap overflow-hidden text-ellipsis rounded-xl px-2.5 py-1 text-xs font-semibold border-0 ${
                template.difficulty_level === "beginner"
                  ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                  : template.difficulty_level === "intermediate"
                  ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
                  : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
              }`}
            >
              {template.difficulty_level}
            </Badge>
          </div>

          {/* Duration */}
          <div
            className="absolute"
            style={{
              top: "8px",
              right: "8px",
              maxWidth: "calc(100% - 80px)",
              overflow: "hidden",
            }}
          >
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 backdrop-blur-md rounded-xl max-w-full bg-white/90 dark:bg-black/20 shadow-sm"
            >
              <Clock
                style={{
                  width: "14px",
                  height: "14px",
                  color: "var(--fc-text-dim)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--fc-text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                {template.estimated_duration}m
              </span>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div style={{ padding: "20px" }} className="space-y-4 flex-1">
          {/* Template Name & Description Card */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "var(--fc-glass-highlight)",
              borderRadius: "16px",
              border: "2px solid var(--fc-glass-border)",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "var(--fc-text-primary)",
                marginBottom: "8px",
              }}
            >
              {template.name}
            </h3>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "var(--fc-accent-purple)",
                marginBottom: "8px",
                display: "block",
              }}
            >
              {primaryCategory}
            </span>
            {template.description && (
              <p
                className="line-clamp-2"
                style={{
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "var(--fc-text-dim)",
                  marginTop: "12px",
                }}
              >
                {template.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className="flex flex-col items-center"
              style={{
                padding: "16px",
                backgroundColor: "var(--fc-status-info)",
                borderRadius: "16px",
                border: "2px solid var(--fc-glass-border)",
              }}
            >
              <Dumbbell
                style={{
                  width: "24px",
                  height: "24px",
                  marginBottom: "8px",
                  color: "var(--fc-accent-blue)",
                }}
              />
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "var(--fc-text-primary)",
                }}
              >
                {template.exercises?.length || 0}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "400",
                  color: "var(--fc-text-dim)",
                }}
              >
                exercises
              </span>
            </div>
            <div
              className="flex flex-col items-center"
              style={{
                padding: "16px",
                backgroundColor: "var(--fc-status-success)",
                borderRadius: "16px",
                border: "2px solid var(--fc-glass-border)",
              }}
            >
              <Users
                style={{
                  width: "24px",
                  height: "24px",
                  marginBottom: "8px",
                  color: "var(--fc-status-success)",
                }}
              />
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "var(--fc-text-primary)",
                }}
              >
                {assignmentCount}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "400",
                  color: "var(--fc-text-dim)",
                }}
              >
                clients
              </span>
            </div>
            <div
              className="flex flex-col items-center"
              style={{
                padding: "16px",
                backgroundColor: "var(--fc-status-warning)",
                borderRadius: "16px",
                border: "2px solid var(--fc-glass-border)",
              }}
            >
              <Star
                style={{
                  width: "24px",
                  height: "24px",
                  marginBottom: "8px",
                  color: "var(--fc-status-warning)",
                }}
              />
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "var(--fc-text-primary)",
                }}
              >
                {template.rating || '--'}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "400",
                  color: "var(--fc-text-dim)",
                }}
              >
                rating
              </span>
            </div>
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-2"
            style={{ paddingTop: "12px", borderTop: "2px solid var(--fc-glass-border)" }}
          >
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenBuilder();
              }}
              className="flex-1 text-white rounded-[20px] py-3 px-4 text-sm font-semibold shadow-sm"
              style={{
                background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
              }}
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              <span>Build</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAssign && onAssign();
              }}
              style={{
                borderRadius: "20px",
                padding: "10px",
                border: "2px solid var(--fc-status-success)",
                color: "var(--fc-status-success)",
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
                onEdit();
              }}
              style={{
                borderRadius: "20px",
                padding: "10px",
                border: "2px solid var(--fc-glass-border)",
                backgroundColor: "transparent",
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              style={{
                borderRadius: "20px",
                padding: "10px",
                border: "2px solid var(--fc-glass-border)",
                backgroundColor: "transparent",
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                borderRadius: "20px",
                padding: "10px",
                border: "2px solid var(--fc-status-error)",
                color: "var(--fc-status-error)",
                backgroundColor: "transparent",
              }}
              className="hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template List Item Component for List View
function WorkoutTemplateListItem({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onOpenBuilder,
  onAssign,
  assignmentCount = 0,
}: WorkoutTemplateCardProps) {
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const difficultyColors = {
    beginner:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    intermediate:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    advanced: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  };

  return (
    <Card
      className={`${theme.card} ${theme.shadow} rounded-2xl border-2 hover:shadow-lg transition-all duration-300 cursor-pointer`}
      onClick={onOpenBuilder}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {/* Template Image */}
          <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "var(--fc-surface-sunken)" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
            <div className="w-full h-full flex items-center justify-center">
              <Dumbbell className="w-8 h-8 fc-text-dim" />
            </div>
          </div>

          {/* Template Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className={`font-semibold ${theme.text} text-lg mb-1`}>
                  {template.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm ${theme.textSecondary}`}>
                    {template.category || "General"}
                  </span>
                  <Badge
                    className={`${
                      difficultyColors[
                        template.difficulty_level as keyof typeof difficultyColors
                      ]
                    } border border-green-200 dark:border-green-700/50 shadow-sm text-xs`}
                  >
                    {template.difficulty_level}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs fc-text-dim">
                    <Clock className="w-3 h-3" />
                    <span>{template.estimated_duration}m</span>
                  </div>
                </div>
              </div>
            </div>

            {template.description && (
              <p className={`text-sm ${theme.textSecondary} mb-3 line-clamp-2`}>
                {template.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs fc-text-dim">
              <span>{template.exercises?.length || 0} exercises</span>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{assignmentCount} clients</span>
              </div>
              {template.rating ? (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span>{template.rating}</span>
                </div>
              ) : null}
              <span>
                Created: {new Date(template.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenBuilder();
              }}
              className="rounded-xl"
            >
              <Settings className="w-4 h-4 mr-2" />
              Build
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAssign && onAssign();
              }}
              className="rounded-xl text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded-xl"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="text-green-600 hover:text-green-700 rounded-xl"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600 hover:text-red-700 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Template Builder Component (placeholder - needs full implementation)
interface WorkoutTemplateBuilderProps {
  template: WorkoutTemplate;
  exercises: Exercise[];
  categories: ExerciseCategory[];
  onClose: () => void;
  onSave: () => void;
}

function WorkoutTemplateBuilder({
  template,
  exercises,
  categories,
  onClose,
  onSave,
}: WorkoutTemplateBuilderProps) {
  // This would be a drag-and-drop exercise builder
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Exercise Builder: {template.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Template exercise builder would go here...</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={onSave}>Save Changes</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
