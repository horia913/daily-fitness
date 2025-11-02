"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { DatabaseService } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Search,
  Filter,
  Mail,
  Calendar,
  TrendingUp,
  Target,
  MessageCircle,
  Edit,
  Eye,
  Dumbbell,
  Apple,
  UserPlus,
  Activity,
  ChevronRight,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// OLD MODAL IMPORTS - Kept for reference, modals replaced with pages
// import ClientDetailModal from '@/components/coach/ClientDetailModal'
// import ClientProfileView from '@/components/coach/client-views/ClientProfileView'
// import ClientWorkoutsView from '@/components/coach/client-views/ClientWorkoutsView'
// import ClientMealsView from '@/components/coach/client-views/ClientMealsView'
// import ClientProgressView from '@/components/coach/client-views/ClientProgressView'
// import ClientAdherenceView from '@/components/coach/client-views/ClientAdherenceView'
// import ClientGoalsView from '@/components/coach/client-views/ClientGoalsView'
// import ClientHabitsView from '@/components/coach/client-views/ClientHabitsView'
// import ClientAnalyticsView from '@/components/coach/client-views/ClientAnalyticsView'
// import ClientClipcards from '@/components/coach/client-views/ClientClipcards'

interface WorkoutAssignment {
  id: string;
  client_id: string;
  workout_template_id: string;
  status: string;
  scheduled_date: string;
  workout_templates?: {
    id: string;
    name: string;
    description?: string;
    difficulty_level?: string;
  };
}

interface MealPlanAssignment {
  id: string;
  client_id: string;
  meal_plan_id: string;
  start_date: string;
  meal_plans?: {
    id: string;
    name: string;
    target_calories?: number;
  };
}

interface Client {
  id: string;
  client_id: string;
  coach_id: string;
  status: string;
  created_at: string;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export default function CoachClients() {
  const { user } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [assignedWorkouts, setAssignedWorkouts] = useState<WorkoutAssignment[]>(
    []
  );
  const [assignedMealPlans, setAssignedMealPlans] = useState<
    MealPlanAssignment[]
  >([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [clientAssignmentCounts, setClientAssignmentCounts] = useState<
    Record<string, { workouts: number; mealPlans: number; goals: number }>
  >({});

  const loadClients = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Loading clients for coach:", user.id);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const clientsPromise = DatabaseService.getClients(user.id);

      const clientsData = await Promise.race([clientsPromise, timeoutPromise]);
      console.log("Loaded clients:", clientsData);
      const clients = Array.isArray(clientsData) ? clientsData : [];
      setClients(clients);

      // Load assignment counts for all clients
      await loadAllClientAssignmentCounts(clients);
    } catch (error) {
      console.error("Error loading clients:", error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshClientAssignmentCounts = useCallback(async () => {
    if (clients.length > 0) {
      await loadAllClientAssignmentCounts(clients);
    }
  }, [clients]);

  const refreshSpecificClientCounts = useCallback(async (clientId: string) => {
    console.log("🔍 Starting to refresh counts for client:", clientId);
    try {
      // Load workout assignments count for specific client
      const { data: workoutAssignments, error: workoutError } = await supabase
        .from("workout_assignments")
        .select("id")
        .eq("client_id", clientId)
        .eq("status", "assigned");

      console.log("💪 Workout assignments query result:", {
        workoutAssignments,
        workoutError,
      });

      // Load meal plan assignments count for specific client
      const { data: mealPlanAssignments, error: mealPlanError } = await supabase
        .from("meal_plan_assignments")
        .select("id")
        .eq("client_id", clientId);

      console.log("🍎 Meal plan assignments query result:", {
        mealPlanAssignments,
        mealPlanError,
      });

      // Load goals count for specific client (if goals table exists)
      let goalsCount = 0;
      try {
        const { data: goals, error: goalsError } = await supabase
          .from("goals")
          .select("id")
          .eq("client_id", clientId)
          .eq("status", "active");

        if (!goalsError && goals) {
          goalsCount = goals.length;
        }
      } catch {
        // Silently handle - table doesn't exist yet
        goalsCount = 0;
      }

      const newCounts = {
        workouts: workoutAssignments?.length || 0,
        mealPlans: mealPlanAssignments?.length || 0,
        goals: goalsCount,
      };

      console.log("📊 New counts for client", clientId, ":", newCounts);

      // Update the specific client's counts
      setClientAssignmentCounts((prev) => {
        const updated = {
          ...prev,
          [clientId]: newCounts,
        };
        console.log("🔄 Updated clientAssignmentCounts:", updated);
        return updated;
      });
    } catch (error) {
      console.log(`❌ Error refreshing counts for client ${clientId}:`, error);
    }
  }, []);

  const loadAllClientAssignmentCounts = async (clients: Client[]) => {
    const counts: Record<
      string,
      { workouts: number; mealPlans: number; goals: number }
    > = {};

    for (const client of clients) {
      if (!client.client_id) continue;

      try {
        // Load workout assignments count
        const { data: workoutAssignments } = await supabase
          .from("workout_assignments")
          .select("id")
          .eq("client_id", client.client_id)
          .eq("status", "assigned");

        // Load meal plan assignments count
        const { data: mealPlanAssignments } = await supabase
          .from("meal_plan_assignments")
          .select("id")
          .eq("client_id", client.client_id);

        // Load goals count (if goals table exists)
        let goalsCount = 0;
        try {
          const { data: goals, error: goalsError } = await supabase
            .from("goals")
            .select("id")
            .eq("client_id", client.client_id)
            .eq("status", "active");

          if (!goalsError && goals) {
            goalsCount = goals.length;
          }
        } catch {
          // Silently handle - table doesn't exist yet
          goalsCount = 0;
        }

        counts[client.client_id] = {
          workouts: workoutAssignments?.length || 0,
          mealPlans: mealPlanAssignments?.length || 0,
          goals: goalsCount,
        };
      } catch (error) {
        console.log(
          `Error loading counts for client ${client.client_id}:`,
          error
        );
        counts[client.client_id] = { workouts: 0, mealPlans: 0, goals: 0 };
      }
    }

    setClientAssignmentCounts(counts);
  };

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Listen for assignment events from other components
  useEffect(() => {
    const handleAssignmentMade = (event: CustomEvent) => {
      console.log("📢 Assignment event received:", event.detail);
      const { clientId } = event.detail;
      if (clientId) {
        console.log("🔄 Refreshing counts for client:", clientId);
        refreshSpecificClientCounts(clientId);
      }
    };

    // Also listen for storage events (more reliable across tabs)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "assignmentMade" && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          console.log("📢 Storage assignment event received:", data);
          if (data.clientId) {
            refreshSpecificClientCounts(data.clientId);
          }
        } catch (error) {
          console.error("Error parsing storage event:", error);
        }
      }
    };

    window.addEventListener(
      "assignmentMade",
      handleAssignmentMade as EventListener
    );
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "assignmentMade",
        handleAssignmentMade as EventListener
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshSpecificClientCounts]);

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 100) return "from-green-500 to-green-600";
    if (compliance >= 90) return "from-green-400 to-green-500";
    if (compliance >= 80) return "from-green-300 to-green-400";
    if (compliance >= 70) return "from-yellow-400 to-green-300";
    if (compliance >= 60) return "from-yellow-500 to-yellow-400";
    if (compliance >= 50) return "from-yellow-500 to-orange-400";
    if (compliance >= 40) return "from-orange-400 to-orange-500";
    if (compliance >= 30) return "from-orange-500 to-red-400";
    if (compliance >= 20) return "from-red-400 to-red-500";
    if (compliance >= 10) return "from-red-500 to-red-600";
    return "from-red-600 to-red-700";
  };

  const getComplianceTextColor = (compliance: number) => {
    if (compliance >= 70) return "text-green-700 dark:text-green-300";
    if (compliance >= 50) return "text-yellow-700 dark:text-yellow-300";
    return "text-red-700 dark:text-red-300";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
      case "inactive":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getClientInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getClientDisplayName = (firstName: string, lastName: string) => {
    return `${firstName} ${lastName}`;
  };

  const handleOpenClientModal = (client: Client) => {
    setSelectedClient(client);
    setShowClientModal(true);
    // Load assignments for this client
    if (client.client_id) {
      loadClientAssignments(client.client_id);
    }
  };

  const loadClientAssignments = async (clientId: string) => {
    try {
      setLoadingAssignments(true);

      // Load workout assignments
      const { data: workoutAssignments, error: workoutError } = await supabase
        .from("workout_assignments")
        .select(
          `
          *,
          workout_templates (
            id,
            name,
            description,
            difficulty_level
          )
        `
        )
        .eq("client_id", clientId)
        .eq("status", "assigned");

      if (workoutError) {
        // Silently handle - table might not exist
        setAssignedWorkouts([]);
      } else {
        setAssignedWorkouts(workoutAssignments || []);
      }

      // Load meal plan assignments
      const { data: mealPlanAssignments, error: mealPlanError } = await supabase
        .from("meal_plan_assignments")
        .select(
          `
          *,
          meal_plans (
            id,
            name,
            target_calories
          )
        `
        )
        .eq("client_id", clientId);

      if (mealPlanError) {
        console.log("No meal plan assignments found or table does not exist");
        setAssignedMealPlans([]);
      } else {
        setAssignedMealPlans(mealPlanAssignments || []);
      }
    } catch (error) {
      console.error("Error loading client assignments:", error);
      setAssignedWorkouts([]);
      setAssignedMealPlans([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    if (!client.profiles) return false;
    const fullName =
      `${client.profiles.first_name} ${client.profiles.last_name}`.toLowerCase();
    const email = client.profiles.email.toLowerCase();
    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase())
    );
  });

  const handleAddClient = () => {
    router.push("/coach/clients/add");
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen" style={{ backgroundColor: "#E8E9F3" }}>
          <div style={{ padding: "24px 20px" }}>
            <div className="max-w-7xl mx-auto space-y-6">
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  padding: "24px",
                }}
              >
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#1A1A1A",
                      marginBottom: "8px",
                    }}
                  >
                    Loading Clients...
                  </h3>
                  <p style={{ fontSize: "14px", color: "#6B7280" }}>
                    Fetching your client data
                  </p>
                </div>
              </div>
              <div className="animate-pulse">
                <div className="space-y-3">
                  <div
                    className="h-20 bg-slate-200 dark:bg-slate-800"
                    style={{ borderRadius: "24px" }}
                  ></div>
                  <div
                    className="h-20 bg-slate-200 dark:bg-slate-800"
                    style={{ borderRadius: "24px" }}
                  ></div>
                  <div
                    className="h-20 bg-slate-200 dark:bg-slate-800"
                    style={{ borderRadius: "24px" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div className="min-h-screen" style={{ backgroundColor: "#E8E9F3" }}>
        <div style={{ padding: "24px 20px" }}>
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1
                    style={{
                      fontSize: "28px",
                      fontWeight: "700",
                      color: "#1A1A1A",
                      marginBottom: "8px",
                    }}
                  >
                    Client Management 👥
                  </h1>
                  <p style={{ fontSize: "14px", color: "#6B7280" }}>
                    Manage your clients and track their progress
                  </p>
                </div>
                <Button
                  onClick={handleAddClient}
                  className="flex items-center gap-2"
                  style={{
                    backgroundColor: "#6C5CE7",
                    color: "#FFFFFF",
                    borderRadius: "20px",
                    padding: "16px 32px",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  Add Client
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <Card
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <CardContent style={{ padding: "24px" }}>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search clients by name or email..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      Filter
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      All Clients
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                }}
              >
                <CardContent style={{ padding: "24px" }}>
                  <div className="flex items-center gap-3">
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
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "32px",
                          fontWeight: "800",
                          lineHeight: "1.1",
                          color: "#1A1A1A",
                        }}
                      >
                        {clients.length}
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "400",
                          color: "#6B7280",
                        }}
                      >
                        Total Clients
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                }}
              >
                <CardContent style={{ padding: "24px" }}>
                  <div className="flex items-center gap-3">
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
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "32px",
                          fontWeight: "800",
                          lineHeight: "1.1",
                          color: "#1A1A1A",
                        }}
                      >
                        {clients.filter((c) => c.status === "active").length}
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "400",
                          color: "#6B7280",
                        }}
                      >
                        Active Clients
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                }}
              >
                <CardContent style={{ padding: "24px" }}>
                  <div className="flex items-center gap-3">
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
                      <Target className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "32px",
                          fontWeight: "800",
                          lineHeight: "1.1",
                          color: "#1A1A1A",
                        }}
                      >
                        85%
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "400",
                          color: "#6B7280",
                        }}
                      >
                        Avg. Compliance
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                }}
              >
                <CardContent style={{ padding: "24px" }}>
                  <div className="flex items-center gap-3">
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
                      <Calendar className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "32px",
                          fontWeight: "800",
                          lineHeight: "1.1",
                          color: "#1A1A1A",
                        }}
                      >
                        3
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "400",
                          color: "#6B7280",
                        }}
                      >
                        Sessions Today
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Client List */}
            <Card
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <CardHeader style={{ padding: "24px", paddingBottom: "16px" }}>
                <CardTitle
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#1A1A1A",
                  }}
                >
                  Client Directory
                </CardTitle>
                <CardDescription style={{ fontSize: "14px", color: "#6B7280" }}>
                  View and manage all your clients
                </CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "24px", paddingTop: "0" }}>
                {filteredClients.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#1A1A1A",
                        marginBottom: "8px",
                      }}
                    >
                      {searchTerm ? "No clients found" : "No clients yet"}
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#6B7280",
                        marginBottom: "24px",
                      }}
                    >
                      {searchTerm
                        ? "Try adjusting your search terms"
                        : "Start by adding your first client"}
                    </p>
                    {!searchTerm && (
                      <Button
                        onClick={handleAddClient}
                        style={{
                          backgroundColor: "#6C5CE7",
                          color: "#FFFFFF",
                          borderRadius: "20px",
                          padding: "16px 32px",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                          fontSize: "16px",
                          fontWeight: "600",
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Your First Client
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredClients.map((client) => {
                      const compliance = 85; // This would come from actual data
                      const complianceGradient = getComplianceColor(compliance);
                      const complianceTextColor =
                        getComplianceTextColor(compliance);

                      return (
                        <Link
                          key={client.id}
                          href={`/coach/clients/${client.client_id}`}
                          className="block border hover:shadow-lg transition-all duration-200 min-h-[140px] relative w-full cursor-pointer"
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: "24px",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                            padding: "24px",
                            marginBottom: "16px",
                          }}
                        >
                          {/* Main Content Row */}
                          <div className="flex items-start gap-6 h-full">
                            <Avatar className="w-14 h-14 flex-shrink-0">
                              {client.profiles?.avatar_url ? (
                                <img
                                  src={client.profiles.avatar_url}
                                  alt={`${client.profiles.first_name} ${client.profiles.last_name}`}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold text-lg">
                                  {client.profiles
                                    ? getClientInitials(
                                        client.profiles.first_name,
                                        client.profiles.last_name
                                      )
                                    : "??"}
                                </AvatarFallback>
                              )}
                            </Avatar>

                            <div className="flex-1">
                              {/* Name and Status */}
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3
                                  style={{
                                    fontSize: "18px",
                                    fontWeight: "600",
                                    color: "#1A1A1A",
                                  }}
                                >
                                  {client.profiles
                                    ? getClientDisplayName(
                                        client.profiles.first_name,
                                        client.profiles.last_name
                                      )
                                    : "Unknown Client"}
                                </h3>
                                <Badge
                                  className={`${getStatusColor(
                                    client.status
                                  )} text-xs flex-shrink-0`}
                                >
                                  {client.status}
                                </Badge>
                              </div>

                              {/* Email */}
                              <p
                                style={{ fontSize: "14px", color: "#6B7280" }}
                                className="truncate mb-3"
                              >
                                {client.profiles?.email || "No email"}
                              </p>

                              {/* Compliance Rate */}
                              <div
                                className={`flex items-center gap-2 text-sm ${complianceTextColor} mt-2`}
                              >
                                <TrendingUp className="w-4 h-4 flex-shrink-0" />
                                <span>Compliance: {compliance}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Stats Row */}
                          <div className="flex items-center gap-8 text-sm text-slate-500 dark:text-slate-400 mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <span className="flex items-center gap-2">
                              <Dumbbell className="w-4 h-4" />
                              <span>
                                Workouts:{" "}
                                {clientAssignmentCounts[client.client_id]
                                  ?.workouts || 0}
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <Apple className="w-4 h-4" />
                              <span>
                                Plans:{" "}
                                {clientAssignmentCounts[client.client_id]
                                  ?.mealPlans || 0}
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              <span>
                                Goals:{" "}
                                {clientAssignmentCounts[client.client_id]
                                  ?.goals || 0}
                              </span>
                            </span>
                          </div>

                          {/* Compliance Color Bar */}
                          <div
                            className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${complianceGradient} rounded-b-xl`}
                          ></div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "20px",
              }}
            >
              <CardHeader style={{ padding: "24px", paddingBottom: "16px" }}>
                <CardTitle
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#1A1A1A",
                  }}
                >
                  Quick Actions
                </CardTitle>
                <CardDescription style={{ fontSize: "14px", color: "#6B7280" }}>
                  Common client management tasks
                </CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "24px", paddingTop: "0" }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    className="h-12 flex flex-col gap-1"
                    style={{ borderRadius: "20px" }}
                    onClick={handleAddClient}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="text-sm">Add Client</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 flex flex-col gap-1"
                    style={{ borderRadius: "20px" }}
                  >
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">Send Email</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 flex flex-col gap-1"
                    style={{ borderRadius: "20px" }}
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Schedule Session</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 flex flex-col gap-1"
                    style={{ borderRadius: "20px" }}
                  >
                    <Target className="w-4 h-4" />
                    <span className="text-sm">Set Goals</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* OLD MODAL CODE - Replaced with page navigation */}
      {false && showClientModal && selectedClient && !selectedFunction && (
        <ClientDetailModal
          client={{
            id: selectedClient.client_id,
            first_name: selectedClient.profiles?.first_name,
            last_name: selectedClient.profiles?.last_name,
            email: selectedClient.profiles?.email,
            avatar_url: selectedClient.profiles?.avatar_url,
          }}
          onClose={() => {
            setShowClientModal(false);
            setSelectedClient(null);
          }}
          onSelectFunction={(functionType) => {
            setSelectedFunction(functionType);
          }}
        />
      )}

      {/* Function-Specific Modals - Replaced with page navigation */}
      {false && showClientModal && selectedClient && selectedFunction && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-4 px-4 sm:px-8 bg-black/50 overflow-y-auto">
          <div
            style={{
              backgroundColor: "#FFFFFF",
              maxWidth: "1600px",
              maxHeight: "min(88vh, calc(100vh - 4rem))",
              height: "min(88vh, calc(100vh - 4rem))",
              borderRadius: "24px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
              display: "flex",
              flexDirection: "column",
            }}
            className="w-full"
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-between flex-shrink-0"
              style={{
                borderTopLeftRadius: "24px",
                borderTopRightRadius: "24px",
                padding: "24px",
              }}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedFunction(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all cursor-pointer"
                  style={{
                    minWidth: "40px",
                    minHeight: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  type="button"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <div>
                  <h2
                    className="text-white capitalize"
                    style={{ fontSize: "28px", fontWeight: "700" }}
                  >
                    {selectedFunction.replace("_", " ")}
                  </h2>
                  <p className="text-white/80" style={{ fontSize: "14px" }}>
                    {selectedClient.profiles?.first_name}{" "}
                    {selectedClient.profiles?.last_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFunction(null);
                  setShowClientModal(false);
                  setSelectedClient(null);
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ padding: "24px", paddingBottom: "48px" }}
            >
              {selectedFunction === "profile" && (
                <ClientProfileView clientId={selectedClient.client_id} />
              )}
              {selectedFunction === "workouts" && (
                <ClientWorkoutsView clientId={selectedClient.client_id} />
              )}
              {selectedFunction === "meals" && (
                <ClientMealsView clientId={selectedClient.client_id} />
              )}
              {selectedFunction === "progress" && (
                <ClientProgressView clientId={selectedClient.client_id} />
              )}
              {selectedFunction === "adherence" && (
                <ClientAdherenceView clientId={selectedClient.client_id} />
              )}
              {selectedFunction === "goals" && (
                <ClientGoalsView clientId={selectedClient.client_id} />
              )}
              {selectedFunction === "habits" && (
                <ClientHabitsView clientId={selectedClient.client_id} />
              )}
              {selectedFunction === "clipcards" && selectedClient && (
                <ClientClipcards
                  clientId={selectedClient.client_id}
                  clientName={
                    `${selectedClient.profiles?.first_name || ""} ${
                      selectedClient.profiles?.last_name || ""
                    }`.trim() || "Client"
                  }
                />
              )}
              {selectedFunction === "analytics" && (
                <ClientAnalyticsView clientId={selectedClient.client_id} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* OLD MODAL - Keeping for reference, will be replaced with function-specific modals */}
      <Dialog
        open={false}
        onOpenChange={(open) => {
          setShowClientModal(open);
          if (!open) {
            setSelectedClient(null);
            setAssignedWorkouts([]);
            setAssignedMealPlans([]);
          }
        }}
      >
        <DialogContent className="max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl z-[9999] rounded-2xl mx-auto">
          <DialogHeader className="pb-3 sm:pb-4 pt-4 sm:pt-6 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl">
            <DialogTitle className="flex items-center gap-2 sm:gap-3">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-blue-100 dark:ring-blue-900/30">
                {selectedClient?.profiles?.avatar_url ? (
                  <img
                    src={selectedClient.profiles.avatar_url}
                    alt={`${selectedClient.profiles.first_name} ${selectedClient.profiles.last_name}`}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm sm:text-lg">
                    {selectedClient?.profiles
                      ? getClientInitials(
                          selectedClient.profiles.first_name,
                          selectedClient.profiles.last_name
                        )
                      : "??"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-white truncate">
                  {selectedClient?.profiles
                    ? `${selectedClient.profiles.first_name} ${selectedClient.profiles.last_name}`
                    : "Unknown Client"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                  {selectedClient?.profiles?.email || "No email"}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                  <Badge
                    className={`${getStatusColor(
                      selectedClient?.status || "inactive"
                    )} text-xs px-1.5 py-0.5 w-fit`}
                  >
                    {selectedClient?.status || "Unknown"}
                  </Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Joined{" "}
                    {selectedClient
                      ? formatDate(selectedClient.created_at)
                      : "Unknown"}
                  </span>
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detailed information about{" "}
              {selectedClient?.profiles
                ? `${selectedClient.profiles.first_name} ${selectedClient.profiles.last_name}`
                : "the selected client"}
              , including contact details, progress metrics, and available
              actions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-2 sm:py-3 px-4 sm:px-6">
            {/* Client Info Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 pb-3 sm:pb-4 pt-4 sm:pt-5 px-4 sm:px-6 rounded-t-lg">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 sm:gap-3 text-slate-800 dark:text-slate-200">
                    <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-6">
                  <div className="flex items-center gap-3 sm:gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex-shrink-0">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Email Address
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium truncate">
                        {selectedClient?.profiles?.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Member Since
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {selectedClient
                          ? formatDate(selectedClient.created_at)
                          : "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex-shrink-0">
                      <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Account Status
                      </p>
                      <Badge
                        className={`${getStatusColor(
                          selectedClient?.status || "inactive"
                        )} text-sm px-3 py-1 mt-1 w-fit`}
                      >
                        {selectedClient?.status || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 pb-3 sm:pb-4 pt-4 sm:pt-5 px-4 sm:px-6 rounded-t-lg">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 sm:gap-3 text-slate-800 dark:text-slate-200">
                    <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    Progress Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-6">
                  <div className="flex items-center gap-3 sm:gap-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Compliance Rate
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                        85%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                      <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Active Workouts
                      </p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {selectedClient?.client_id
                          ? clientAssignmentCounts[selectedClient.client_id]
                              ?.workouts || 0
                          : 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
                      <Apple className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Meal Plans
                      </p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {selectedClient?.client_id
                          ? clientAssignmentCounts[selectedClient.client_id]
                              ?.mealPlans || 0
                          : 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Goals Set
                      </p>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {selectedClient?.client_id
                          ? clientAssignmentCounts[selectedClient.client_id]
                              ?.goals || 0
                          : 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Assigned Workouts/Programs Section */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 pb-3 sm:pb-4 pt-4 sm:pt-5 px-4 sm:px-6 rounded-t-lg">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 sm:gap-3 text-slate-800 dark:text-slate-200">
                  <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Assigned Workouts & Programs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 sm:pt-6">
                {loadingAssignments ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                      Loading assignments...
                    </span>
                  </div>
                ) : assignedWorkouts.length > 0 ? (
                  assignedWorkouts.map((assignment, index) => (
                    <div
                      key={assignment.id || index}
                      className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {assignment.workout_templates?.name ||
                              "Unknown Workout"}
                          </span>
                        </div>
                        <Badge className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {assignment.status || "Active"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Assigned:{" "}
                        {assignment.scheduled_date
                          ? formatDate(assignment.scheduled_date)
                          : "Unknown"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No workout assignments found
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assigned Meal Plans Section */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 pb-3 sm:pb-4 pt-4 sm:pt-5 px-4 sm:px-6 rounded-t-lg">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 sm:gap-3 text-slate-800 dark:text-slate-200">
                  <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Apple className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  Assigned Meal Plans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 sm:pt-6">
                {loadingAssignments ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                      Loading assignments...
                    </span>
                  </div>
                ) : assignedMealPlans.length > 0 ? (
                  assignedMealPlans.map((assignment, index) => (
                    <div
                      key={assignment.id || index}
                      className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {assignment.meal_plans?.name || "Unknown Meal Plan"}
                          </span>
                        </div>
                        <Badge className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          Active
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {assignment.meal_plans?.target_calories
                          ? `${assignment.meal_plans.target_calories} cal/day`
                          : ""}{" "}
                        • Assigned:{" "}
                        {assignment.start_date
                          ? formatDate(assignment.start_date)
                          : "Unknown"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No meal plan assignments found
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button className="flex-1 h-9 sm:h-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm">
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Send Message
              </Button>
              <Link
                href={`/coach/clients/${selectedClient?.client_id}/profile`}
                className="flex-1"
              >
                <Button
                  variant="outline"
                  className="w-full h-9 sm:h-10 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm"
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Edit Profile
                </Button>
              </Link>
              <Link
                href={`/coach/clients/${selectedClient?.client_id}/progress`}
                className="flex-1"
              >
                <Button
                  variant="outline"
                  className="w-full h-9 sm:h-10 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm"
                >
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  View Progress
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
