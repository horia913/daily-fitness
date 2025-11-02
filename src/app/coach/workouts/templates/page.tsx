"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Plus, Dumbbell, Grid3X3, List, Search } from "lucide-react";
import Link from "next/link";
import WorkoutTemplateCard from "@/components/features/workouts/WorkoutTemplateCard";

export default function WorkoutTemplatesPage() {
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();
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

  const submitAssign = useCallback(async () => {
    if (!assignTemplateId || selectedClients.length === 0) return;
    try {
      const assignments = selectedClients.map((clientId) => ({
        workout_template_id: assignTemplateId,
        client_id: clientId,
        coach_id: coachId,
        scheduled_date: assignStartDate,
        status: "assigned",
      }));

      const { error } = await supabase
        .from("workout_assignments")
        .insert(assignments);

      if (error) throw error;

      alert(
        `Workout template assigned to ${selectedClients.length} client(s) successfully!`
      );
      await loadAssignmentCounts(coachId);
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
  ]);

  if (!coachId) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
            <p className={`${theme.textSecondary}`}>
              Please sign in to view workout templates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
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
    );
  }

  return (
    <>
      <div className={`min-h-screen ${theme.background}`}>
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{ backgroundColor: "#E8E9F3" }}
            >
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                      <Dumbbell
                        style={{
                          width: "32px",
                          height: "32px",
                          color: "#FFFFFF",
                        }}
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
                        Workout Templates
                      </h1>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "400",
                          color: "#6B7280",
                        }}
                      >
                        Create and manage workout templates for your clients
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (coachId) {
                          loadTemplates(coachId);
                          loadAssignmentCounts(coachId);
                        }
                      }}
                      style={{
                        borderRadius: "20px",
                        padding: "12px 20px",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>
                    <Link href="/coach/workouts/templates/create">
                      <Button
                        style={{
                          backgroundColor: "#6C5CE7",
                          borderRadius: "20px",
                          padding: "12px 20px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#FFFFFF",
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Create Template
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div
              className={`${theme.card} ${theme.shadow} rounded-2xl p-4 sm:p-6`}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    onClick={() => setViewMode("list")}
                    size="sm"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Templates List */}
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
                  assignmentCount={assignmentCountByTemplate[template.id] || 0}
                  onEdit={() => {
                    router.push(
                      `/coach/workouts/templates/${template.id}/edit`
                    );
                  }}
                  onOpenDetails={() => {
                    router.push(`/coach/workouts/templates/${template.id}`);
                  }}
                  onDelete={() => {
                    // TODO: Add delete modal
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

            {/* Empty state */}
            {filteredAndSortedTemplates.length === 0 && (
              <div
                className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}
              >
                <div className="text-center py-16 px-6">
                  <Dumbbell className="w-20 h-20 text-slate-400 mx-auto mb-6" />
                  <h3 className={`text-2xl font-semibold ${theme.text} mb-3`}>
                    No workout templates yet
                  </h3>
                  <p
                    className={`text-lg ${theme.textSecondary} mb-8 max-w-md mx-auto`}
                  >
                    Create your first workout template to get started.
                  </p>
                  <Link href="/coach/workouts/templates/create">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-lg">
                      <Plus className="w-5 h-5 mr-2" />
                      Create Your First Template
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              maxWidth: 560,
              width: "100%",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 24, borderBottom: "1px solid #E5E7EB" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Assign Workout Template</h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setClientSearchQuery("");
                    setSelectedClients([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              {/* Search bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Selected count badge */}
              {selectedClients.length > 0 && (
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedClients.length} client
                    {selectedClients.length !== 1 ? "s" : ""} selected
                  </span>
                </div>
              )}

              {/* Scrollable client list */}
              <div className="space-y-3 max-h-[240px] overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {clientSearchQuery.trim()
                      ? "No clients found matching your search"
                      : "No active clients available"}
                  </div>
                ) : (
                  filteredClients.map((c) => {
                    const id = c.client_id || c.id;
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
                        className={`flex items-center justify-between border rounded-xl p-3 cursor-pointer transition-all ${
                          selected
                            ? "border-green-500 bg-green-50 shadow-sm"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {c.profiles?.first_name || ""}{" "}
                            {c.profiles?.last_name || ""}
                          </div>
                          <div className="text-sm text-gray-500">
                            {c.profiles?.email || ""}
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selected
                              ? "bg-green-500 border-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selected && (
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
                      </div>
                    );
                  })
                )}
              </div>
              <div className="grid gap-3 mt-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Start date</label>
                  <input
                    type="date"
                    value={assignStartDate}
                    onChange={(e) => setAssignStartDate(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div
              style={{ padding: 16, borderTop: "1px solid #E5E7EB" }}
              className="flex items-center justify-end gap-2"
            >
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setClientSearchQuery("");
                  setSelectedClients([]);
                }}
                className="px-4 py-2 border rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={selectedClients.length === 0}
                onClick={submitAssign}
                className="px-4 py-2 bg-green-600 text-white rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
