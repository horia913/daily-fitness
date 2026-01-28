"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  X,
  Users,
  Dumbbell,
  Search,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  User,
  Clock,
  Target,
  Send,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  preventBackgroundScroll,
  restoreBackgroundScroll,
} from "@/lib/mobile-compatibility";
import WorkoutTemplateService from "@/lib/workoutTemplateService";
import { useTheme } from "@/contexts/ThemeContext";

interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  estimated_duration: number;
  difficulty_level: string;
  category?: {
    name: string;
    color: string;
  };
}

interface Client {
  id: string;
  client_profile_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

interface WorkoutAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedTemplate?: WorkoutTemplate;
}

type Step = "workouts" | "clients" | "review";

export default function WorkoutAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedTemplate,
}: WorkoutAssignmentModalProps) {
  const { isDark, getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const [currentStep, setCurrentStep] = useState<Step>("workouts");
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>(
    []
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [workoutSearch, setWorkoutSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [assignmentForm, setAssignmentForm] = useState({
    scheduledDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setWorkoutTemplates([]);
        setClients([]);
        return;
      }

      // Load workout templates
      const { data: templates, error: templatesError } = await supabase
        .from("workout_templates")
        .select(
          `
          id, name, description, estimated_duration, difficulty_level,
          category:categories(name, color)
        `
        )
        .eq("coach_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (templatesError) {
        console.log("Error loading workout templates:", templatesError);
        setWorkoutTemplates([]);
      } else {
        // Transform the data to match our interface
        const transformedTemplates = (templates || []).map((template) => ({
          ...template,
          category:
            template.category &&
            Array.isArray(template.category) &&
            template.category.length > 0
              ? {
                  name: template.category[0].name || "Uncategorized",
                  color: template.category[0].color || "#6B7280",
                }
              : undefined,
        }));
        setWorkoutTemplates(transformedTemplates);
      }

      // Load clients from Supabase
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("coach_id", user.id)
        .eq("status", "active");

      if (clientsError) {
        console.error("Error loading clients:", clientsError);
        setClients([]);
        setSelectedClients([]);
      } else if (clientsData && clientsData.length > 0) {
        const profileIds = clientsData
          .map((client: any) => client.client_id)
          .filter(Boolean);

        let profilesData: any[] = [];
        if (profileIds.length > 0) {
          const { data: profileRows, error: profileError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, email, avatar_url")
            .in("id", profileIds);

          if (profileError) {
            console.error("Error loading client profiles:", profileError);
          } else if (profileRows) {
            profilesData = profileRows;
          }
        }

        const mergedClients =
          clientsData
            .map((client: any) => {
              const profile =
                profilesData.find((p) => p.id === client.client_id) || null;
              if (!profile) {
                return null;
              }
              return {
                id: client.id,
                client_profile_id: client.client_id,
                first_name: profile.first_name || "",
                last_name: profile.last_name || "",
                email: profile.email || "",
                avatar_url: profile.avatar_url || undefined,
              } as Client & { client_profile_id?: string };
            })
            .filter(
              (
                client: (Client & { client_profile_id?: string }) | null
              ): client is Client & {
                client_profile_id?: string;
              } => !!client && !!client.id && !!client.email
            ) || [];

        setClients(mergedClients);
        setSelectedClients((prev) =>
          mergedClients.length === 0
            ? []
            : prev.filter((id) => mergedClients.some((c) => c.id === id))
        );
      } else {
        setClients([]);
        setSelectedClients([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setWorkoutTemplates([]);
      setClients([]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Set preselected template if provided
      if (preselectedTemplate) {
        setSelectedWorkouts([preselectedTemplate.id]);
        setCurrentStep("clients"); // Skip to client selection if workout is preselected
      } else {
        setCurrentStep("workouts");
      }
      preventBackgroundScroll();
    } else {
      restoreBackgroundScroll();
      // Reset state when closing
      setCurrentStep("workouts");
      setSelectedWorkouts([]);
      setSelectedClients([]);
      setWorkoutSearch("");
      setClientSearch("");
      setAssignmentForm({
        scheduledDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }

    // Cleanup on unmount
    return () => {
      restoreBackgroundScroll();
    };
  }, [isOpen, preselectedTemplate, loadData]);

  // Filter functions
  const filteredWorkouts = workoutTemplates.filter(
    (workout) =>
      workout.name.toLowerCase().includes(workoutSearch.toLowerCase()) ||
      workout.description.toLowerCase().includes(workoutSearch.toLowerCase())
  );

  const filteredClients = clients.filter(
    (client) =>
      `${client.first_name} ${client.last_name}`
        .toLowerCase()
        .includes(clientSearch.toLowerCase()) ||
      client.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Selection handlers
  const toggleWorkoutSelection = (workoutId: string) => {
    setSelectedWorkouts((prev) =>
      prev.includes(workoutId)
        ? prev.filter((id) => id !== workoutId)
        : [...prev, workoutId]
    );
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllWorkouts = () => {
    setSelectedWorkouts(filteredWorkouts.map((w) => w.id));
  };

  const selectAllClients = () => {
    setSelectedClients(filteredClients.map((c) => c.id));
  };

  const clearWorkoutSelection = () => {
    setSelectedWorkouts([]);
  };

  const clearClientSelection = () => {
    setSelectedClients([]);
  };

  const handleAssignWorkouts = async () => {
    if (clients.length === 0) {
      alert(
        "No clients available. Please add clients before assigning workouts."
      );
      return;
    }
    if (selectedWorkouts.length === 0 || selectedClients.length === 0) {
      alert("Please select at least one workout and one client");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let successCount = 0;
      let failureCount = 0;

      for (const workoutId of selectedWorkouts) {
        for (const selectedId of selectedClients) {
          const clientRecord = clients.find(
            (client) =>
              client.id === selectedId ||
              client.client_profile_id === selectedId ||
              (client as any).client_id === selectedId
          );

          if (!clientRecord) {
            console.warn(
              "[WorkoutAssign] Unable to find client record for selection:",
              selectedId
            );
            failureCount += 1;
            continue;
          }

          const relationshipId = clientRecord.id;
          const profileId =
            clientRecord.client_profile_id ||
            (clientRecord as any).client_id ||
            null;

          if (!relationshipId || !profileId) {
            console.warn(
              "[WorkoutAssign] Missing relationship/profile ID for client:",
              clientRecord
            );
            failureCount += 1;
            continue;
          }

          const result = await WorkoutTemplateService.assignWorkoutToClient(
            relationshipId,
            profileId,
            workoutId,
            user.id,
            assignmentForm.scheduledDate,
            assignmentForm.notes ? assignmentForm.notes : null
          );

          if (result) {
            successCount += 1;
          } else {
            failureCount += 1;
          }
        }
      }

      if (failureCount > 0) {
        alert(
          `Assigned ${successCount} workout(s), but ${failureCount} failed. Check console for details.`
        );
      } else {
        alert(
          `Successfully assigned ${successCount} workout(s) to ${selectedClients.length} client(s)!`
        );
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error assigning workouts:", error);
      alert("Error assigning workouts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "workouts":
        return "Select Workouts";
      case "clients":
        return "Select Clients";
      case "review":
        return "Review & Confirm";
      default:
        return "Assign Workouts";
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case "workouts":
        return <Dumbbell className="w-5 h-5" />;
      case "clients":
        return <Users className="w-5 h-5" />;
      case "review":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Send className="w-5 h-5" />;
    }
  };

  const canProceedToNext = () => {
    if (clients.length === 0) return false;
    switch (currentStep) {
      case "workouts":
        return selectedWorkouts.length > 0;
      case "clients":
        return selectedClients.length > 0;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    switch (currentStep) {
      case "workouts":
        setCurrentStep("clients");
        break;
      case "clients":
        setCurrentStep("review");
        break;
      case "review":
        handleAssignWorkouts();
        break;
    }
  };

  const prevStep = () => {
    switch (currentStep) {
      case "clients":
        setCurrentStep("workouts");
        break;
      case "review":
        setCurrentStep("clients");
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${
        isDark ? "bg-black/60 backdrop-blur-sm" : "bg-black/50 backdrop-blur-sm"
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-theme={isDark ? "dark" : "light"}
    >
      <div
        className={`relative ${theme.card} ${theme.shadow} fc-glass fc-card rounded-3xl border ${theme.border} max-w-4xl max-h-[95vh] w-full overflow-hidden transform transition-all duration-300 ease-out`}
        style={{
          animation: "modalSlideIn 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div
          className={`sticky top-0 ${theme.card} fc-glass fc-card border-b ${theme.border} px-6 py-5 rounded-t-3xl`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-2xl ${
                  isDark
                    ? "bg-slate-700"
                    : "bg-gradient-to-br from-purple-100 to-orange-100"
                }`}
              >
                {getStepIcon()}
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${theme.text}`}>
                  {getStepTitle()}
                </h2>
                {preselectedTemplate && currentStep === "workouts" && (
                  <p className={`text-sm ${theme.textSecondary} mt-1`}>
                    Preselected:{" "}
                    <span className="font-medium">
                      {preselectedTemplate.name}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all duration-200 ${
                theme.textSecondary
              } hover:${theme.text} hover:${
                isDark ? "bg-slate-700" : "bg-slate-100"
              }`}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className={`px-6 py-4 border-b ${theme.border}`}>
          <div className="flex items-center justify-center space-x-4">
            {["workouts", "clients", "review"].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    currentStep === step
                      ? `${theme.primary} text-white`
                      : (selectedWorkouts.length > 0 && step === "workouts") ||
                        (selectedClients.length > 0 && step === "clients") ||
                        (currentStep === "review" && step === "review")
                      ? `${theme.success} text-white`
                      : `${theme.textSecondary} ${
                          isDark ? "bg-slate-700" : "bg-slate-100"
                        }`
                  }`}
                >
                  {index + 1}
                </div>
                {index < 2 && (
                  <div
                    className={`w-8 h-0.5 mx-2 ${
                      currentStep === step ||
                      (step === "workouts" && selectedWorkouts.length > 0) ||
                      (step === "clients" && selectedClients.length > 0)
                        ? theme.primary
                        : isDark
                        ? "bg-slate-700"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)] px-6 py-6">
          {currentStep === "workouts" && (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme.textSecondary}`}
                />
                <Input
                  placeholder="Search workouts..."
                  value={workoutSearch}
                  onChange={(e) => setWorkoutSearch(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${theme.textSecondary}`}>
                    {selectedWorkouts.length} of {filteredWorkouts.length}{" "}
                    selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllWorkouts}
                    className="rounded-xl"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearWorkoutSelection}
                    className="rounded-xl"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Workout Cards */}
              <div className="space-y-3">
                {filteredWorkouts.map((workout) => (
                  <Card
                    key={workout.id}
                    className={`${theme.card} fc-glass fc-card border ${
                      theme.border
                    } rounded-2xl hover:shadow-lg transition-all duration-200 cursor-pointer ${
                      selectedWorkouts.includes(workout.id)
                        ? "ring-2 ring-purple-500"
                        : ""
                    }`}
                    onClick={() => toggleWorkoutSelection(workout.id)}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={selectedWorkouts.includes(workout.id)}
                            onChange={() => toggleWorkoutSelection(workout.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <CardTitle
                              className={`text-lg font-bold ${theme.text}`}
                            >
                              {workout.name}
                            </CardTitle>
                            <CardDescription
                              className={`text-sm mt-1 ${theme.textSecondary}`}
                            >
                              {workout.description}
                            </CardDescription>
                            <div className="flex items-center gap-4 mt-3">
                              <div
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                                  isDark ? "bg-slate-700" : "bg-slate-100"
                                }`}
                              >
                                <Clock
                                  className={`w-3 h-3 ${theme.textSecondary}`}
                                />
                                <span
                                  className={`text-xs ${theme.textSecondary}`}
                                >
                                  {workout.estimated_duration} min
                                </span>
                              </div>
                              <div
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                                  isDark ? "bg-slate-700" : "bg-slate-100"
                                }`}
                              >
                                <Target
                                  className={`w-3 h-3 ${theme.textSecondary}`}
                                />
                                <span
                                  className={`text-xs ${theme.textSecondary}`}
                                >
                                  {workout.difficulty_level}
                                </span>
                              </div>
                              {workout.category && (
                                <div
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg"
                                  style={{
                                    backgroundColor: `${workout.category.color}20`,
                                  }}
                                >
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: workout.category.color,
                                    }}
                                  />
                                  <span
                                    className={`text-xs`}
                                    style={{ color: workout.category.color }}
                                  >
                                    {workout.category.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentStep === "clients" && (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme.textSecondary}`}
                />
                <Input
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${theme.textSecondary}`}>
                    {selectedClients.length} of {filteredClients.length}{" "}
                    selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllClients}
                    className="rounded-xl"
                    disabled={clients.length === 0}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearClientSelection}
                    className="rounded-xl"
                    disabled={clients.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Client Cards */}
              <div className="space-y-3">
                {clients.length === 0 ? (
                  <div
                    className="text-center py-8 text-sm rounded-xl"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                    }}
                  >
                    No clients available. Please add clients first.
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div
                    className="text-center py-8 text-sm rounded-xl"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                    }}
                  >
                    {clientSearch.trim()
                      ? "No clients found matching your search."
                      : "No active clients available."}
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <Card
                      key={client.id}
                      className={`${theme.card} fc-glass fc-card border ${
                        theme.border
                      } rounded-2xl hover:shadow-lg transition-all duration-200 cursor-pointer ${
                        selectedClients.includes(client.id)
                          ? "ring-2 ring-purple-500"
                          : ""
                      }`}
                      onClick={() => toggleClientSelection(client.id)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <Checkbox
                              checked={selectedClients.includes(client.id)}
                              onChange={() => toggleClientSelection(client.id)}
                              className="mt-1"
                            />
                            <div className={`flex items-center gap-3 flex-1`}>
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isDark
                                    ? "bg-slate-700"
                                    : "bg-gradient-to-br from-purple-100 to-orange-100"
                                }`}
                              >
                                <User className={`w-5 h-5 ${theme.text}`} />
                              </div>
                              <div className="flex-1">
                                <CardTitle
                                  className={`text-lg font-bold ${theme.text}`}
                                >
                                  {client.first_name} {client.last_name}
                                </CardTitle>
                                <CardDescription
                                  className={`text-sm ${theme.textSecondary}`}
                                >
                                  {client.email}
                                </CardDescription>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {currentStep === "review" && (
            <div className="space-y-6">
              {/* Assignment Summary */}
              <Card
                className={`${theme.card} fc-glass fc-card border ${theme.border} rounded-2xl`}
              >
                <CardHeader className="p-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isDark ? "bg-slate-700" : "bg-green-100"
                      }`}
                    >
                      <CheckCircle
                        className={`w-5 h-5 ${
                          isDark ? "text-green-400" : "text-green-600"
                        }`}
                      />
                    </div>
                    <CardTitle className={`text-xl font-bold ${theme.text}`}>
                      Assignment Summary
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-xl ${
                          isDark ? "bg-slate-700" : "bg-white/60"
                        }`}
                      >
                        <div className={`text-sm ${theme.textSecondary} mb-2`}>
                          Selected Workouts
                        </div>
                        <div className={`font-bold text-lg ${theme.text}`}>
                          {selectedWorkouts.length}
                        </div>
                        <div className="mt-2 space-y-1">
                          {selectedWorkouts.map((workoutId) => {
                            const workout = workoutTemplates.find(
                              (w) => w.id === workoutId
                            );
                            return workout ? (
                              <div
                                key={workoutId}
                                className={`text-sm ${theme.textSecondary}`}
                              >
                                • {workout.name}
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div
                        className={`p-4 rounded-xl ${
                          isDark ? "bg-slate-700" : "bg-white/60"
                        }`}
                      >
                        <div className={`text-sm ${theme.textSecondary} mb-2`}>
                          Selected Clients
                        </div>
                        <div className={`font-bold text-lg ${theme.text}`}>
                          {selectedClients.length}
                        </div>
                        <div className="mt-2 space-y-1">
                          {selectedClients.map((clientId) => {
                            const client = clients.find(
                              (c) => c.id === clientId
                            );
                            return client ? (
                              <div
                                key={clientId}
                                className={`text-sm ${theme.textSecondary}`}
                              >
                                • {client.first_name} {client.last_name}
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`p-4 rounded-xl ${
                        isDark ? "bg-slate-700" : "bg-white/60"
                      }`}
                    >
                      <div className={`text-sm ${theme.textSecondary} mb-2`}>
                        Total Assignments
                      </div>
                      <div className={`font-bold text-2xl ${theme.text}`}>
                        {selectedWorkouts.length * selectedClients.length}
                      </div>
                      <div className={`text-sm ${theme.textSecondary}`}>
                        {selectedWorkouts.length} workout(s) ×{" "}
                        {selectedClients.length} client(s)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Details */}
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="date"
                    className={`text-sm font-medium ${theme.text}`}
                  >
                    Scheduled Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={assignmentForm.scheduledDate}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({
                        ...prev,
                        scheduledDate: e.target.value,
                      }))
                    }
                    className="mt-2 rounded-xl"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="notes"
                    className={`text-sm font-medium ${theme.text}`}
                  >
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any specific instructions or notes for all assignments..."
                    value={assignmentForm.notes}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-2 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          className={`sticky bottom-0 ${theme.card} fc-glass fc-card border-t ${theme.border} px-6 py-4 rounded-b-3xl`}
        >
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={currentStep === "workouts" ? onClose : prevStep}
              className="rounded-xl"
            >
              {currentStep === "workouts" ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </>
              )}
            </Button>
            <Button
              onClick={nextStep}
              disabled={loading || !canProceedToNext()}
              className={`${theme.primary} flex items-center gap-2 rounded-xl`}
            >
              {loading ? (
                "Assigning..."
              ) : currentStep === "review" ? (
                <>
                  <Send className="w-4 h-4" />
                  Assign Workouts
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
