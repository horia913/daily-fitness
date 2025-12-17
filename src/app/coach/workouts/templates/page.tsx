"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Plus,
  Dumbbell,
  Grid3X3,
  List,
  Search,
  Clock,
  BarChart3,
  Users,
  Edit,
  Copy as CopyIcon,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import WorkoutTemplateCard from "@/components/features/workouts/WorkoutTemplateCard";

export default function WorkoutTemplatesPage() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();
  const router = useRouter();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentCountByTemplate, setAssignmentCountByTemplate] = useState<
    Record<string, number>
  >({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [assignStartDate, setAssignStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");

  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedDuration, setSelectedDuration] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const coachId = user?.id || "";

  const loadAssignmentCounts = useCallback(async (cid: string) => {
    try {
      const { data, error } = await supabase
        .from("workout_assignments")
        .select("workout_template_id")
        .eq("coach_id", cid);

      if (error) {
        console.warn("Could not load assignment counts:", error.message);
        return;
      }

      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        const templateId = row.workout_template_id;
        if (templateId) {
          counts[templateId] = (counts[templateId] || 0) + 1;
        }
      });
      setAssignmentCountByTemplate(counts);
    } catch (err) {
      console.warn("Error loading assignment counts:", err);
    }
  }, []);

  const loadTemplates = useCallback(async (cid: string) => {
    setLoading(true);
    try {
      const list = await WorkoutTemplateService.getWorkoutTemplates(cid);
      setTemplates(list || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!coachId) return;
    loadTemplates(coachId);
    loadAssignmentCounts(coachId);
  }, [coachId, loadTemplates, loadAssignmentCounts]);

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

  // Filter and sort templates
  const filteredAndSortedTemplates = useMemo(() => {
    return templates
      .filter((template) => {
        const matchesSearch =
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase());
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
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [templates, searchTerm, selectedDifficulty, selectedDuration]);

  const openAssignModal = useCallback(
    async (templateId: string) => {
      setAssignTemplateId(templateId);
      setSelectedClients([]);
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
          const merged = clientsData
            .map((client) => {
              const profile =
                profilesData?.find((p) => p.id === client.client_id) || null;
              if (!profile) {
                return null;
              }
              return {
                ...client,
                id: client.id,
                client_profile_id: client.client_id,
                profiles: profile,
              };
            })
            .filter(Boolean);
          setClients(merged as any[]);
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
    if (!assignTemplateId || selectedClients.length === 0) return;
    if (!coachId) {
      alert("You must be signed in as a coach to assign workouts.");
      return;
    }

    try {
      let successCount = 0;
      let failureCount = 0;

      for (const selectedId of selectedClients) {
        const clientRecord = clients.find((client) => {
          const possibleIds = [
            client.id,
            client.client_profile_id,
            client.client_id,
          ].filter(Boolean);
          return possibleIds.includes(selectedId);
        });

        if (!clientRecord) {
          console.warn(
            "[WorkoutAssign] Unable to locate client record for selection:",
            selectedId
          );
          failureCount += 1;
          continue;
        }

        const relationshipId = clientRecord.id || clientRecord.client_id;
        const profileId =
          clientRecord.client_profile_id || clientRecord.client_id || null;

        if (!relationshipId || !profileId) {
          console.warn(
            "[WorkoutAssign] Missing relationship/profile ID for client:",
            clientRecord
          );
          failureCount += 1;
          continue;
        }

        const assignment = await WorkoutTemplateService.assignWorkoutToClient(
          relationshipId,
          profileId,
          assignTemplateId,
          coachId,
          assignStartDate,
          null
        );

        if (assignment) {
          successCount += 1;
        } else {
          failureCount += 1;
        }
      }

      if (failureCount > 0) {
        alert(
          `Assigned ${successCount} workout(s), but ${failureCount} failed. Check console for details.`
        );
      } else if (successCount > 0) {
        alert(
          `Workout template assigned to ${selectedClients.length} client(s) successfully!`
        );
      }

      if (successCount > 0) {
        await loadAssignmentCounts(coachId);
      }
      setShowAssignModal(false);
      setClientSearchQuery("");
      setSelectedClients([]);
    } catch (error) {
      console.error("Error assigning template:", error);
      alert("Error assigning template. Please try again.");
    }
  }, [
    assignTemplateId,
    selectedClients,
    coachId,
    assignStartDate,
    loadAssignmentCounts,
    clients,
  ]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return getSemanticColor("success").primary;
      case "intermediate":
        return getSemanticColor("warning").primary;
      case "advanced":
        return getSemanticColor("critical").primary;
      default:
        return getSemanticColor("neutral").primary;
    }
  };

  if (!coachId) {
    return (
      <AnimatedBackground>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <GlassCard elevation={2} className="p-6 max-w-md">
            <p
              className="text-center"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              Please sign in to view workout templates.
            </p>
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  if (loading) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="animate-pulse space-y-6">
              <GlassCard elevation={1} className="p-6">
                <div
                  className="h-8 rounded mb-4"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                  }}
                ></div>
                <div
                  className="h-4 rounded w-2/3"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                  }}
                ></div>
              </GlassCard>
              {[...Array(3)].map((_, i) => (
                <GlassCard key={i} elevation={2} className="p-6">
                  <div
                    className="h-24 rounded"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                    }}
                  ></div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}

        <div className="relative z-10 min-h-screen p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <GlassCard elevation={2} className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: getSemanticColor("trust").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("trust").primary
                      }30`,
                    }}
                  >
                    <Dumbbell className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1
                      className="text-3xl font-bold mb-2"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Workout Templates
                    </h1>
                    <p
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Create and manage workout templates for your clients
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (coachId) {
                        loadTemplates(coachId);
                        loadAssignmentCounts(coachId);
                      }
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Link href="/coach/workouts/templates/create">
                    <Button
                      style={{
                        background: getSemanticColor("energy").gradient,
                        boxShadow: `0 4px 12px ${
                          getSemanticColor("energy").primary
                        }30`,
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </Link>
                </div>
              </div>
            </GlassCard>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <GlassCard elevation={2} className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <Dumbbell
                      className="w-6 h-6"
                      style={{ color: getSemanticColor("trust").primary }}
                    />
                  </div>
                  <div>
                    <AnimatedNumber
                      value={templates.length}
                      className="text-2xl font-bold"
                      color={isDark ? "#fff" : "#1A1A1A"}
                    />
                    <p
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Total Templates
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard elevation={2} className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <Users
                      className="w-6 h-6"
                      style={{ color: getSemanticColor("success").primary }}
                    />
                  </div>
                  <div>
                    <AnimatedNumber
                      value={Object.values(assignmentCountByTemplate).reduce(
                        (a, b) => a + b,
                        0
                      )}
                      className="text-2xl font-bold"
                      color={isDark ? "#fff" : "#1A1A1A"}
                    />
                    <p
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Active Assignments
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard elevation={2} className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <BarChart3
                      className="w-6 h-6"
                      style={{ color: getSemanticColor("warning").primary }}
                    />
                  </div>
                  <div>
                    <AnimatedNumber
                      value={filteredAndSortedTemplates.length}
                      className="text-2xl font-bold"
                      color={isDark ? "#fff" : "#1A1A1A"}
                    />
                    <p
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Showing Now
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Filters and Search */}
            <GlassCard elevation={2} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={selectedDifficulty}
                  onValueChange={setSelectedDifficulty}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={selectedDuration}
                  onValueChange={setSelectedDuration}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Durations</SelectItem>
                    <SelectItem value="short">Short (&lt; 30 min)</SelectItem>
                    <SelectItem value="medium">Medium (30-60 min)</SelectItem>
                    <SelectItem value="long">Long (&gt; 60 min)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    onClick={() => setViewMode("grid")}
                    size="sm"
                    style={
                      viewMode === "grid"
                        ? {
                            background: getSemanticColor("trust").gradient,
                          }
                        : undefined
                    }
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    onClick={() => setViewMode("list")}
                    size="sm"
                    style={
                      viewMode === "list"
                        ? {
                            background: getSemanticColor("trust").gradient,
                          }
                        : undefined
                    }
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Templates List */}
            {filteredAndSortedTemplates.length === 0 ? (
              <GlassCard elevation={2} className="p-12 text-center">
                <Dumbbell
                  className="w-24 h-24 mx-auto mb-6"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                  }}
                />
                <h3
                  className="text-2xl font-bold mb-3"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  {searchTerm ||
                  selectedDifficulty !== "all" ||
                  selectedDuration !== "all"
                    ? "No templates found"
                    : "No workout templates yet"}
                </h3>
                <p
                  className="text-sm mb-6 max-w-md mx-auto"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  {searchTerm ||
                  selectedDifficulty !== "all" ||
                  selectedDuration !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first workout template to get started"}
                </p>
                <Link href="/coach/workouts/templates/create">
                  <Button
                    style={{
                      background: getSemanticColor("energy").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("energy").primary
                      }30`,
                    }}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Template
                  </Button>
                </Link>
              </GlassCard>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-4"
                }
              >
                {filteredAndSortedTemplates.map((template) => (
                  <WorkoutTemplateCard
                    key={template.id}
                    template={template}
                    assignmentCount={
                      assignmentCountByTemplate[template.id] || 0
                    }
                    onEdit={() => {
                      router.push(
                        `/coach/workouts/templates/${template.id}/edit`
                      );
                    }}
                    onOpenDetails={() => {
                      router.push(`/coach/workouts/templates/${template.id}`);
                    }}
                    onDelete={() => {
                      if (confirm("Delete this template?")) {
                        WorkoutTemplateService.deleteWorkoutTemplate(
                          template.id
                        ).then(() => {
                          loadTemplates(coachId);
                        });
                      }
                    }}
                    onDuplicate={async () => {
                      const dup =
                        await WorkoutTemplateService.duplicateWorkoutTemplate(
                          template.id,
                          `${template.name} (Copy)`
                        );
                      if (dup) loadTemplates(coachId);
                    }}
                    onAssign={() => openAssignModal(template.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </AnimatedBackground>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <GlassCard elevation={3} className="max-w-lg w-full">
            <div
              className="p-6"
              style={{
                borderBottom: `1px solid ${
                  isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                }`,
              }}
            >
              <div className="flex items-center justify-between">
                <h2
                  className="text-xl font-bold"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Assign Workout Template
                </h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setClientSearchQuery("");
                    setSelectedClients([]);
                  }}
                  className="p-2 rounded-lg transition-all hover:scale-110"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  }}
                >
                  <X
                    className="w-5 h-5"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Search bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  />
                  <Input
                    type="text"
                    placeholder="Search clients by name or email..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Selected count badge */}
              {selectedClients.length > 0 && (
                <div className="mb-3">
                  <span
                    className="text-sm px-3 py-1 rounded-full"
                    style={{
                      background: `${getSemanticColor("success").primary}20`,
                      color: getSemanticColor("success").primary,
                    }}
                  >
                    {selectedClients.length} client
                    {selectedClients.length !== 1 ? "s" : ""} selected
                  </span>
                </div>
              )}

              {/* Scrollable client list */}
              <div className="space-y-3 max-h-[240px] overflow-y-auto mb-4">
                {filteredClients.length === 0 ? (
                  <div
                    className="text-center py-8 text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  >
                    {clientSearchQuery.trim()
                      ? "No clients found matching your search"
                      : "No active clients available"}
                  </div>
                ) : (
                  filteredClients.map((c) => {
                    const id = c.id || c.client_profile_id || c.client_id;
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
                        className="p-3 rounded-xl cursor-pointer transition-all"
                        style={{
                          background: selected
                            ? `${getSemanticColor("success").primary}10`
                            : isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.05)",
                          border: `2px solid ${
                            selected
                              ? getSemanticColor("success").primary
                              : isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)"
                          }`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div
                              className="font-semibold"
                              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                            >
                              {c.profiles?.first_name || ""}{" "}
                              {c.profiles?.last_name || ""}
                            </div>
                            <div
                              className="text-sm"
                              style={{
                                color: isDark
                                  ? "rgba(255,255,255,0.6)"
                                  : "rgba(0,0,0,0.6)",
                              }}
                            >
                              {c.profiles?.email || ""}
                            </div>
                          </div>
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{
                              background: selected
                                ? getSemanticColor("success").primary
                                : isDark
                                ? "rgba(255,255,255,0.2)"
                                : "rgba(0,0,0,0.2)",
                            }}
                          >
                            {selected && (
                              <svg
                                className="w-4 h-4 text-white"
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
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <label
                  className="text-sm font-medium"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Start date:
                </label>
                <Input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                />
              </div>
            </div>

            <div
              className="p-4 flex items-center justify-end gap-3"
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
              >
                Cancel
              </Button>
              <Button
                disabled={selectedClients.length === 0}
                onClick={submitAssign}
                style={{
                  background:
                    selectedClients.length === 0
                      ? undefined
                      : getSemanticColor("success").gradient,
                  boxShadow:
                    selectedClients.length === 0
                      ? undefined
                      : `0 4px 12px ${getSemanticColor("success").primary}30`,
                }}
              >
                Assign
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </>
  );
}
