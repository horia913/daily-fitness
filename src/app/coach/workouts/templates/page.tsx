"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";

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
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import WorkoutTemplateCard from "@/components/features/workouts/WorkoutTemplateCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/toast-provider";

export default function WorkoutTemplatesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { getSemanticColor, performanceSettings } = useTheme();
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
  const loadingRef = useRef(false);
  const didLoadRef = useRef(false);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!coachId) return;
    if (didLoadRef.current) return;
    if (loadingRef.current) return;
    didLoadRef.current = true;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/coach/workouts/templates", { signal: signal ?? null });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const { templates: list, assignmentCountByTemplate: counts } = await res.json();
      setTemplates(Array.isArray(list) ? list : []);
      setAssignmentCountByTemplate(counts && typeof counts === "object" ? counts : {});
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        didLoadRef.current = false;
        return;
      }
      console.error("Error loading templates:", err);
      didLoadRef.current = false;
      setTemplates([]);
      setAssignmentCountByTemplate({});
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [coachId]);

  useEffect(() => {
    if (!coachId) return;
    const ac = new AbortController();
    loadData(ac.signal);
    return () => {
      didLoadRef.current = false;
      loadingRef.current = false;
      ac.abort();
    };
  }, [coachId, loadData]);

  const refetch = useCallback(() => {
    didLoadRef.current = false;
    loadData();
  }, [loadData]);

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
      addToast({ title: "You must be signed in as a coach to assign workouts.", variant: "destructive" });
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
        addToast({
          title: `Assigned ${successCount} workout(s), but ${failureCount} failed. Check console for details.`,
          variant: "destructive",
        });
      } else if (successCount > 0) {
        addToast({
          title: `Workout template assigned to ${selectedClients.length} client(s) successfully!`,
          variant: "success",
        });
      }

      if (successCount > 0) {
        refetch();
      }
      setShowAssignModal(false);
      setClientSearchQuery("");
      setSelectedClients([]);
    } catch (error) {
      console.error("Error assigning template:", error);
      addToast({ title: "Error assigning template. Please try again.", variant: "destructive" });
    }
  }, [
    assignTemplateId,
    selectedClients,
    coachId,
    assignStartDate,
    refetch,
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
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 max-w-md">
            <p className="text-center fc-text-dim">
              Please sign in to view workout templates.
            </p>
          </div>
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
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                <div
                  className="h-8 rounded mb-4"
                  style={{
                    background: "var(--fc-surface-sunken)",
                  }}
                ></div>
                <div
                  className="h-4 rounded w-2/3"
                  style={{
                    background: "var(--fc-surface-sunken)",
                  }}
                ></div>
              </div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                  <div
                    className="h-24 rounded"
                    style={{
                      background: "var(--fc-surface-sunken)",
                    }}
                  ></div>
                </div>
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

        <div className="relative z-10 min-h-screen pb-32">
          {/* Back to Programs */}
          <div className="max-w-6xl mx-auto px-4 pt-4 sm:px-6">
            <Link href="/coach/training/programs" className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium mb-2">
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to Programs
            </Link>
          </div>
          {/* Sticky search bar */}
          <nav className="sticky top-0 z-50 fc-glass border-b border-[color:var(--fc-glass-border)] backdrop-blur-md px-4 py-4 sm:px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 fc-text-dim pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 fc-glass border border-[color:var(--fc-glass-border)] rounded-xl fc-text-primary placeholder:fc-text-dim focus:ring-2 focus:ring-[color:var(--fc-domain-workouts)]/50"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide">
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="h-12 fc-glass border border-[color:var(--fc-glass-border)] rounded-xl w-[180px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </nav>

          <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6">
            {/* Header */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10">
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
                    <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                      Template Library
                    </span>
                    <h1 className="mt-3 text-2xl font-bold fc-text-primary">
                      Workout Templates
                    </h1>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Create and manage templates for your clients.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (coachId) {
                        refetch();
                      }
                    }}
                    className="fc-btn fc-btn-ghost"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Link href="/coach/workouts/templates/create">
                    <Button className="fc-btn fc-btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--fc-surface-sunken)",
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
                      color="var(--fc-text-primary)"
                    />
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Total Templates
                    </p>
                  </div>
                </div>
              </div>

              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--fc-surface-sunken)",
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
                      color="var(--fc-text-primary)"
                    />
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Active Assignments
                    </p>
                  </div>
                </div>
              </div>

              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--fc-surface-sunken)",
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
                      color="var(--fc-text-primary)"
                    />
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Showing Now
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 fc-text-dim"
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
            </div>

            {/* Templates List */}
            {filteredAndSortedTemplates.length === 0 ? (
              <EmptyState
                icon={<Dumbbell className="h-8 w-8" />}
                title={
                  searchTerm ||
                  selectedDifficulty !== "all" ||
                  selectedDuration !== "all"
                    ? "No templates found"
                    : "No workout templates yet"
                }
                description={
                  searchTerm ||
                  selectedDifficulty !== "all" ||
                  selectedDuration !== "all"
                    ? "Try adjusting your search or filter criteria to find the templates you're looking for."
                    : "Create your first workout template to get started building your training library."
                }
                action={
                  !searchTerm &&
                  selectedDifficulty === "all" &&
                  selectedDuration === "all"
                    ? {
                        label: "Create Your First Template",
                        onClick: () => router.push("/coach/workouts/templates/create"),
                      }
                    : undefined
                }
              />
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
                          refetch();
                        });
                      }
                    }}
                    onDuplicate={async () => {
                      const dup =
                        await WorkoutTemplateService.duplicateWorkoutTemplate(
                          template.id,
                          `${template.name} (Copy)`
                        );
                      if (dup) refetch();
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
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] max-w-lg w-full">
            <div
              className="p-6"
              style={{
                borderBottom: "1px solid var(--fc-surface-card-border)",
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold fc-text-primary">
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
                    background: "var(--fc-surface-sunken)",
                  }}
                >
                  <X className="w-5 h-5 fc-text-primary" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Search bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 fc-text-dim"
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
                  <div className="text-center py-8 text-sm fc-text-dim">
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
                            : "var(--fc-surface-sunken)",
                          border: `2px solid ${
                            selected
                              ? getSemanticColor("success").primary
                              : "var(--fc-surface-card-border)"
                          }`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold fc-text-primary">
                              {c.profiles?.first_name || ""}{" "}
                              {c.profiles?.last_name || ""}
                            </div>
                            <div className="text-sm fc-text-dim">
                              {c.profiles?.email || ""}
                            </div>
                          </div>
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{
                              background: selected
                                ? getSemanticColor("success").primary
                                : "var(--fc-surface-sunken)",
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
                <label className="text-sm font-medium fc-text-primary">
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
          </div>
        </div>
      )}
    </>
  );
}
