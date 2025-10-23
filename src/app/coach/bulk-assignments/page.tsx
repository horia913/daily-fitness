"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Target,
  Clock,
  TrendingUp,
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  BarChart3,
  Zap,
  FileText,
  Settings,
  Play,
  Pause,
  Trash2,
  ArrowRight,
  Sparkles,
  Activity,
  Star,
  Copy,
  UserPlus,
  SortAsc,
  MessageCircle,
  Send,
  Flag,
  Timer,
  DollarSign,
  Package,
  Award,
  Gift,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Today,
  Grid,
  List,
  MapPin,
  Phone,
  Mail,
  Video,
  Home,
  Building,
  Coffee,
  Dumbbell,
  Heart,
  Smile,
  ThumbsUp,
  TrendingDown,
  Minus,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Info,
  Trophy,
  Flame,
  Apple,
} from "lucide-react";
import BulkAssignmentComponent from "@/components/BulkAssignment";
import {
  BulkAssignment,
  BulkAssignmentStats,
  BulkAssignmentManager,
} from "@/lib/bulkAssignment";
import { supabase } from "@/lib/supabase";

export default function CoachBulkAssignmentsPage() {
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const [assignments, setAssignments] = useState<BulkAssignment[]>([]);
  const [stats, setStats] = useState<BulkAssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [showBulkAssignment, setShowBulkAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<BulkAssignment | null>(null);

  // Enhanced filtering and sorting states
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  useEffect(() => {
    if (user) {
      loadAssignments();
      loadStats();
    }
  }, [user]);

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bulk_assignments")
        .select("*")
        .eq("coach_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error("Error loading bulk assignments:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Enhanced filtering and sorting functions
  const filteredAssignments = assignments
    .filter((assignment) => {
      const matchesSearch = assignment.operation_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus = !filterStatus || assignment.status === filterStatus;
      const matchesType =
        !filterType || assignment.operation_type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof BulkAssignment];
      let bValue: any = b[sortBy as keyof BulkAssignment];

      if (sortBy === "created_at") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getAssignmentTypeIcon = (type: string) => {
    switch (type) {
      case "program":
        return <Target className="w-4 h-4" />;
      case "workout":
        return <Dumbbell className="w-4 h-4" />;
      case "meal_plan":
        return <Apple className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getAssignmentTypeColor = (type: string) => {
    switch (type) {
      case "program":
        return "bg-gradient-to-r from-purple-500 to-purple-600";
      case "workout":
        return "bg-gradient-to-r from-blue-500 to-blue-600";
      case "meal_plan":
        return "bg-gradient-to-r from-green-500 to-green-600";
      default:
        return "bg-gradient-to-r from-slate-500 to-slate-600";
    }
  };

  const getProgressPercentage = (assignment: BulkAssignment) => {
    return assignment.total_items > 0
      ? (assignment.processed_items / assignment.total_items) * 100
      : 0;
  };

  const getSuccessRate = (assignment: BulkAssignment) => {
    return assignment.processed_items > 0
      ? (assignment.success_items / assignment.processed_items) * 100
      : 0;
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc("get_bulk_assignment_stats", {
        p_coach_id: user?.id,
      });

      if (error) throw error;
      setStats(data?.[0] || null);
    } catch (error) {
      console.error("Error loading bulk assignment stats:", error);
    }
  };

  const handleCreateBulkAssignment = () => {
    setShowBulkAssignment(true);
  };

  const handleViewAssignment = (assignment: BulkAssignment) => {
    setSelectedAssignment(assignment);
  };

  const handleRetryAssignment = async (assignment: BulkAssignment) => {
    if (
      !confirm(
        `Are you sure you want to retry the bulk assignment "${assignment.operation_name}"?`
      )
    ) {
      return;
    }

    try {
      // Reset assignment status and retry
      const { error } = await supabase
        .from("bulk_assignments")
        .update({
          status: "pending",
          processed_items: 0,
          failed_items: 0,
          success_items: 0,
          error_log: [],
        })
        .eq("id", assignment.id);

      if (error) throw error;

      // Reset all items to pending
      await supabase
        .from("bulk_assignment_items")
        .update({ status: "pending", error_message: null })
        .eq("bulk_assignment_id", assignment.id);

      // Process the assignment
      const { error: processError } = await supabase.rpc(
        "process_bulk_program_assignment",
        { p_bulk_assignment_id: assignment.id }
      );

      if (processError) throw processError;

      loadAssignments();
      loadStats();
    } catch (error) {
      console.error("Error retrying bulk assignment:", error);
      alert("Error retrying bulk assignment. Please try again.");
    }
  };

  const handleCancelAssignment = async (assignment: BulkAssignment) => {
    if (
      !confirm(
        `Are you sure you want to cancel the bulk assignment "${assignment.operation_name}"?`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("bulk_assignments")
        .update({ status: "cancelled" })
        .eq("id", assignment.id);

      if (error) throw error;

      // Cancel all pending items
      await supabase
        .from("bulk_assignment_items")
        .update({ status: "skipped" })
        .eq("bulk_assignment_id", assignment.id)
        .eq("status", "pending");

      loadAssignments();
      loadStats();
    } catch (error) {
      console.error("Error cancelling bulk assignment:", error);
      alert("Error cancelling bulk assignment. Please try again.");
    }
  };

  const handleDeleteAssignment = async (assignment: BulkAssignment) => {
    if (
      !confirm(
        `Are you sure you want to delete the bulk assignment "${assignment.operation_name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("bulk_assignments")
        .delete()
        .eq("id", assignment.id);

      if (error) throw error;

      loadAssignments();
      loadStats();
    } catch (error) {
      console.error("Error deleting bulk assignment:", error);
      alert("Error deleting bulk assignment. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "failed":
        return <AlertCircle className="w-4 h-4" />;
      case "processing":
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "cancelled":
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className={`min-h-screen ${theme.background}`}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className={`${theme.card} ${theme.shadow} rounded-2xl p-8`}>
                <div className="animate-pulse">
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-32 ${theme.card} ${theme.shadow} rounded-2xl`}
                  >
                    <div className="animate-pulse p-6">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-48 ${theme.card} ${theme.shadow} rounded-2xl`}
                  >
                    <div className="animate-pulse p-6">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2 mb-4"></div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div className={`min-h-screen ${theme.background}`}>
        {/* Floating Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div
                  className={`p-3 rounded-2xl ${theme.gradient} ${theme.shadow}`}
                >
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h1
                  className={`text-4xl font-bold ${theme.text} bg-gradient-to-r from-purple-600 via-orange-500 to-green-500 bg-clip-text text-transparent`}
                >
                  Bulk Assignment Tools
                </h1>
              </div>
              <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                Efficiently assign workouts, meal plans, and programs to
                multiple clients
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={handleCreateBulkAssignment}
                  className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-lg font-semibold`}
                >
                  <Plus className="w-5 h-5 mr-3" />
                  Create Bulk Assignment
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>

            {/* Enhanced Stats Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                  className={`${theme.card} ${theme.shadow} rounded-2xl hover:scale-105 transition-all duration-300 group`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow} group-hover:scale-110 transition-transform`}
                      >
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div
                          className={`text-3xl font-bold ${theme.text} group-hover:text-blue-600 transition-colors`}
                        >
                          {stats.totalOperations}
                        </div>
                        <div
                          className={`text-sm ${theme.textSecondary} font-medium`}
                        >
                          Total Operations
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`${theme.card} ${theme.shadow} rounded-2xl hover:scale-105 transition-all duration-300 group`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow} group-hover:scale-110 transition-transform`}
                      >
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div
                          className={`text-3xl font-bold ${theme.text} group-hover:text-green-600 transition-colors`}
                        >
                          {stats.completedOperations}
                        </div>
                        <div
                          className={`text-sm ${theme.textSecondary} font-medium`}
                        >
                          Completed
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`${theme.card} ${theme.shadow} rounded-2xl hover:scale-105 transition-all duration-300 group`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow} group-hover:scale-110 transition-transform`}
                      >
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div
                          className={`text-3xl font-bold ${theme.text} group-hover:text-purple-600 transition-colors`}
                        >
                          {stats.totalItemsAssigned}
                        </div>
                        <div
                          className={`text-sm ${theme.textSecondary} font-medium`}
                        >
                          Items Assigned
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`${theme.card} ${theme.shadow} rounded-2xl hover:scale-105 transition-all duration-300 group`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow} group-hover:scale-110 transition-transform`}
                      >
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div
                          className={`text-3xl font-bold ${theme.text} group-hover:text-orange-600 transition-colors`}
                        >
                          {stats.successRate.toFixed(1)}%
                        </div>
                        <div
                          className={`text-sm ${theme.textSecondary} font-medium`}
                        >
                          Success Rate
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Enhanced Filters */}
            <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search
                      className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`}
                    />
                    <Input
                      placeholder="Search bulk assignments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger
                        className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger
                        className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      >
                        <Package className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value="program">Program</SelectItem>
                        <SelectItem value="workout">Workout</SelectItem>
                        <SelectItem value="meal_plan">Meal Plan</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger
                        className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      >
                        <SortAsc className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Date Created</SelectItem>
                        <SelectItem value="operation_name">Name</SelectItem>
                        <SelectItem value="total_items">Items Count</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setViewMode(viewMode === "grid" ? "list" : "grid")
                        }
                        className={`${theme.border} ${theme.text} rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all`}
                      >
                        {viewMode === "grid" ? (
                          <List className="w-4 h-4" />
                        ) : (
                          <Grid className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Assignments List */}
            <div className="space-y-6">
              {filteredAssignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className={`${theme.card} ${theme.shadow} rounded-2xl hover:shadow-2xl transition-all duration-300 group`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`p-2 rounded-lg ${getAssignmentTypeColor(
                              assignment.operation_type
                            )} ${theme.shadow}`}
                          >
                            {getAssignmentTypeIcon(assignment.operation_type)}
                          </div>
                          <CardTitle
                            className={`text-xl font-bold ${theme.text} group-hover:text-purple-600 transition-colors`}
                          >
                            {assignment.operation_name}
                          </CardTitle>
                        </div>
                        <p className={`text-sm ${theme.textSecondary} mb-3`}>
                          {assignment.operation_type} assignment •{" "}
                          {assignment.total_items} items
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge
                            className={`${getStatusColor(
                              assignment.status
                            )} rounded-xl px-3 py-1`}
                          >
                            <div className="flex items-center gap-1">
                              {getStatusIcon(assignment.status)}
                              {assignment.status}
                            </div>
                          </Badge>
                          <Badge variant="outline" className="rounded-xl">
                            {assignment.operation_type}
                          </Badge>
                          <span className={`text-sm ${theme.textSecondary}`}>
                            {new Date(
                              assignment.created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAssignment(assignment)}
                          className={`${theme.border} ${theme.text} rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {assignment.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryAssignment(assignment)}
                            className={`${theme.border} text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all`}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        {assignment.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelAssignment(assignment)}
                            className={`${theme.border} text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-xl transition-all`}
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment)}
                          className={`${theme.border} text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Enhanced Progress */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${theme.text}`}>
                          Progress
                        </span>
                        <span className={`text-sm font-bold ${theme.text}`}>
                          {assignment.processed_items} /{" "}
                          {assignment.total_items} items
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                          style={{
                            width: `${getProgressPercentage(assignment)}%`,
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <span
                          className={`text-sm font-medium ${theme.textSecondary}`}
                        >
                          {getProgressPercentage(assignment).toFixed(1)}%
                          Complete
                        </span>
                      </div>
                    </div>

                    {/* Enhanced Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-700">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {assignment.success_items}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Success
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-red-200 dark:border-red-700">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {assignment.failed_items}
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Failed
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                          {assignment.total_items - assignment.processed_items}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          Pending
                        </div>
                      </div>
                    </div>

                    {/* Success Rate */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${theme.text}`}>
                          Success Rate
                        </span>
                        <span className={`text-sm font-bold ${theme.text}`}>
                          {getSuccessRate(assignment).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${getSuccessRate(assignment)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Enhanced Error Log */}
                    {assignment.error_log &&
                      assignment.error_log.length > 0 && (
                        <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <div className="text-sm font-medium text-red-800 dark:text-red-400">
                              Recent Errors:
                            </div>
                          </div>
                          <div className="space-y-2">
                            {assignment.error_log
                              .slice(0, 3)
                              .map((error, index) => (
                                <div
                                  key={index}
                                  className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2"
                                >
                                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                  {error}
                                </div>
                              ))}
                            {assignment.error_log.length > 3 && (
                              <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                                ... and {assignment.error_log.length - 3} more
                                errors
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredAssignments.length === 0 && (
              <Card
                className={`${theme.card} ${theme.shadow} rounded-2xl text-center py-16`}
              >
                <CardContent>
                  <div
                    className={`p-8 rounded-2xl ${theme.gradient} ${theme.shadow} w-32 h-32 mx-auto mb-8 flex items-center justify-center`}
                  >
                    <Zap className="w-16 h-16 text-white" />
                  </div>
                  <h3 className={`text-2xl font-bold ${theme.text} mb-4`}>
                    {searchTerm || filterStatus || filterType
                      ? "No assignments found"
                      : "No bulk assignments yet"}
                  </h3>
                  <p
                    className={`${theme.textSecondary} text-lg mb-8 max-w-md mx-auto`}
                  >
                    {searchTerm || filterStatus || filterType
                      ? "Try adjusting your search criteria or filters to find what you're looking for."
                      : "Create your first bulk assignment to efficiently manage multiple clients and save time."}
                  </p>
                  {!searchTerm && !filterStatus && !filterType && (
                    <Button
                      onClick={handleCreateBulkAssignment}
                      className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-8 py-3 text-lg font-semibold`}
                    >
                      <Plus className="w-5 h-5 mr-3" />
                      Create Your First Bulk Assignment
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Modals */}
          {showBulkAssignment && (
            <BulkAssignmentComponent
              isOpen={showBulkAssignment}
              onClose={() => setShowBulkAssignment(false)}
              onSuccess={() => {
                loadAssignments();
                loadStats();
                setShowBulkAssignment(false);
              }}
              coachId={user?.id || ""}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
