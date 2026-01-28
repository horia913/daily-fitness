"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/ui/GlassCard";
import { MealPlanService, MealPlan } from "@/lib/mealPlanService";
import { DatabaseService, Client } from "@/lib/database";
import MealPlanCard from "@/components/features/nutrition/MealPlanCard";
import MealPlanAssignmentModal from "@/components/features/nutrition/MealPlanAssignmentModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Utensils,
  Users,
  Plus,
  Calendar,
  Target,
  TrendingUp,
  Award,
  Clock,
  BarChart3,
  Search,
  ChefHat,
  Edit,
  Trash,
  Eye,
  ArrowRight,
  Sparkles,
  Apple,
  Calculator,
  Activity,
  Layers,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import MealPlanBuilder from "@/components/MealPlanBuilder";
import { useRouter } from "next/navigation";
import OptimizedFoodDatabase from "@/components/coach/OptimizedFoodDatabase";
import OptimizedNutritionAssignments from "@/components/coach/OptimizedNutritionAssignments";

interface Food {
  id: string;
  name: string;
  brand?: string;
  serving_size: number;
  serving_unit: string;
  calories_per_serving: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  category: string;
}


interface MealPlanAssignment {
  id: string;
  client_id: string;
  meal_plan_id: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  client: {
    first_name: string;
    last_name: string;
  };
  meal_plan: {
    name: string;
  };
}

export default function CoachNutritionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { getThemeStyles, performanceSettings, isDark, getSemanticColor } = useTheme();
  const theme = getThemeStyles();

  const [activeTab, setActiveTab] = useState<"meal-plans" | "foods" | "assignments">("meal-plans");
  const [loading, setLoading] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [assignments, setAssignments] = useState<MealPlanAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMealPlanForAssignment, setSelectedMealPlanForAssignment] = useState<MealPlan | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  // Form states
  const [showAddFood, setShowAddFood] = useState(false);
  const [showAddMealPlan, setShowAddMealPlan] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  // Food form
  const [foodForm, setFoodForm] = useState({
    name: "",
    brand: "",
    serving_size: "",
    serving_unit: "g",
    calories_per_serving: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    category: "General",
  });

  // Meal plan form
  const [mealPlanForm, setMealPlanForm] = useState({
    name: "",
    notes: "",
    target_calories: "",
    target_protein: "",
    target_carbs: "",
    target_fat: "",
  });

  useEffect(() => {
    if (user) {
      loadData();
      loadMealPlans();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load foods
      const { data: foodsData } = await supabase
        .from("foods")
        .select("*")
        .eq("is_active", true)
        .order("name");

      // Load clients
      try {
        const coachClients = await DatabaseService.getClients(user.id);
        setClients(coachClients);
      } catch (error) {
        console.error("Error loading clients:", error);
        setClients([]);
      }

      // Load assignments
      let assignmentsData = [];
      try {
        const { data: fullData } = await supabase
          .from("meal_plan_assignments")
          .select("*")
          .eq("coach_id", user.id)
          .order("created_at", { ascending: false });

        assignmentsData = fullData || [];

        // Enhance assignments with client and meal plan data
        for (let i = 0; i < assignmentsData.length; i++) {
          const assignment = assignmentsData[i];

          const clientData = {
            first_name: "Client",
            last_name: "Popescu",
            email: "client@test.com",
          };

          const { data: mealPlanData } = await supabase
            .from("meal_plans")
            .select("name, target_calories")
            .eq("id", assignment.meal_plan_id)
            .single();

          assignmentsData[i] = {
            ...assignment,
            client: clientData,
            meal_plan: mealPlanData,
          };
        }
      } catch (error) {
        console.log("Meal plan assignments table not ready yet");
        assignmentsData = [];
      }

      setFoods(foodsData || []);
      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error("Error loading nutrition data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMealPlans = async () => {
    try {
      if (!user) return;
      setLoading(true);

      const mealPlansData = await MealPlanService.getMealPlans(user.id);

      // Calculate actual stats for each meal plan
      const mealPlansWithStats = await Promise.all(
        mealPlansData.map(async (plan) => {
          // Get meal count (from meal_plan_items - count distinct meal_type)
          let mealCount = 0;
          try {
            const { data, error } = await supabase
              .from("meal_plan_items")
              .select("meal_type")
              .eq("meal_plan_id", plan.id);

            if (!error && data) {
              // Count unique meal types
              const uniqueMealTypes = new Set(
                data.map((item) => item.meal_type)
              );
              mealCount = uniqueMealTypes.size;
            }
          } catch (error) {
            // Silently fail - meal count is optional
          }

          // Get assignment count
          let assignmentCount = 0;
          try {
            const { count, error } = await supabase
              .from("meal_plan_assignments")
              .select("*", { count: "exact", head: true })
              .eq("meal_plan_id", plan.id);
            if (!error && count !== null) {
              assignmentCount = count;
            }
          } catch (error) {
            console.warn(
              `Error counting assignments for plan ${plan.id}:`,
              error
            );
          }

          return {
            ...plan,
            meal_count: mealCount,
            usage_count: assignmentCount,
          };
        })
      );

      setMealPlans(mealPlansWithStats);
    } catch (error) {
      console.error("Error loading meal plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMealPlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meal plan?")) return;

    try {
      setLoading(true);
      await MealPlanService.deleteMealPlan(id);
      loadMealPlans();
      alert("Meal plan deleted successfully!");
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      alert("Error deleting meal plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMealPlan = async (mealPlan: MealPlan) => {
    setSelectedMealPlanForAssignment(mealPlan);
    setSelectedClients([]);

    // Load clients for this coach
    if (user?.id) {
      try {
        const coachClients = await DatabaseService.getClients(user.id);
        setClients(coachClients);
      } catch (error) {
        console.error("Error loading clients:", error);
        alert("Error loading clients. Please try again.");
        return;
      }
    }

    setShowAssignModal(true);
  };

  const handleAssignmentComplete = () => {
    setShowAssignModal(false);
    setSelectedMealPlanForAssignment(null);
    setSelectedClients([]);
    loadMealPlans(); // Refresh to update usage counts
  };

  const filteredMealPlans = useMemo(() => {
    if (!searchQuery.trim()) return mealPlans;
    const query = searchQuery.toLowerCase();
    return mealPlans.filter(
      (plan) =>
        plan.name.toLowerCase().includes(query) ||
        (plan.description && plan.description.toLowerCase().includes(query))
    );
  }, [mealPlans, searchQuery]);

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("foods").insert({
        name: foodForm.name,
        brand: foodForm.brand || null,
        serving_size: parseFloat(foodForm.serving_size),
        serving_unit: foodForm.serving_unit,
        calories_per_serving: parseFloat(foodForm.calories_per_serving),
        protein: parseFloat(foodForm.protein || "0"),
        carbs: parseFloat(foodForm.carbs || "0"),
        fat: parseFloat(foodForm.fat || "0"),
        fiber: parseFloat(foodForm.fiber || "0"),
        category: foodForm.category,
      });

      if (error) throw error;

      setShowAddFood(false);
      setFoodForm({
        name: "",
        brand: "",
        serving_size: "",
        serving_unit: "g",
        calories_per_serving: "",
        protein: "",
        carbs: "",
        fat: "",
        fiber: "",
        category: "General",
      });
      loadData();
    } catch (error) {
      console.error("Error adding food:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMealPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("meal_plans").insert({
        coach_id: user.id,
        name: mealPlanForm.name,
        notes: mealPlanForm.notes || null,
        target_calories: mealPlanForm.target_calories
          ? parseInt(mealPlanForm.target_calories)
          : null,
        target_protein: mealPlanForm.target_protein
          ? parseFloat(mealPlanForm.target_protein)
          : null,
        target_carbs: mealPlanForm.target_carbs
          ? parseFloat(mealPlanForm.target_carbs)
          : null,
        target_fat: mealPlanForm.target_fat
          ? parseFloat(mealPlanForm.target_fat)
          : null,
      });

      if (error) throw error;

      setShowAddMealPlan(false);
      setMealPlanForm({
        name: "",
        notes: "",
        target_calories: "",
        target_protein: "",
        target_carbs: "",
        target_fat: "",
      });
      loadData();
    } catch (error) {
      console.error("Error adding meal plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignMealPlan = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to unassign this meal plan?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("meal_plan_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
      loadData();
      alert("Meal plan unassigned successfully!");
    } catch (error) {
      console.error("Error unassigning meal plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFoods = foods.filter(
    (food) =>
      food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      food.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      food.category.toLowerCase().includes(searchTerm.toLowerCase())
  );


  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className={`min-h-screen ${theme.background}`}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className={`${theme.card} ${theme.shadow} rounded-2xl p-8`}>
                <div className="animate-pulse">
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
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
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-24">
          <div className="max-w-7xl mx-auto p-6">
            <GlassCard elevation={2} className="fc-glass fc-card mb-6">
              <div className="p-6 sm:p-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[color:var(--fc-aurora-green)]/20">
                    <Apple className="w-8 h-8 text-[color:var(--fc-accent-green)]" />
                  </div>
                  <div>
                    <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                      Nutrition Hub
                    </span>
                    <h1 className="mt-3 text-2xl font-bold text-[color:var(--fc-text-primary)]">
                      Nutrition Planning
                    </h1>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Create meal plans, manage foods, and assign nutrition programs.
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard elevation={1} className="fc-glass fc-card mb-6">
              <div className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search meal plans, foods, and clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-10 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard elevation={2} className="fc-glass fc-card p-2">
              <div className="flex gap-2">
                <Button
                  variant={activeTab === "meal-plans" ? "default" : "ghost"}
                  onClick={() => setActiveTab("meal-plans")}
                  className="flex-1 rounded-xl"
                  style={
                    activeTab === "meal-plans"
                      ? {
                          background: getSemanticColor("trust").gradient,
                          boxShadow: `0 4px 12px ${
                            getSemanticColor("trust").primary
                          }30`,
                        }
                      : {}
                  }
                >
                  <ChefHat className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Meal Plans</span>
                </Button>
                <Button
                  variant={activeTab === "foods" ? "default" : "ghost"}
                  onClick={() => setActiveTab("foods")}
                  className="flex-1 rounded-xl"
                  style={
                    activeTab === "foods"
                      ? {
                          background: getSemanticColor("trust").gradient,
                          boxShadow: `0 4px 12px ${
                            getSemanticColor("trust").primary
                          }30`,
                        }
                      : {}
                  }
                >
                  <Utensils className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Food Database</span>
                </Button>
                <Button
                  variant={activeTab === "assignments" ? "default" : "ghost"}
                  onClick={() => setActiveTab("assignments")}
                  className="flex-1 rounded-xl"
                  style={
                    activeTab === "assignments"
                      ? {
                          background: getSemanticColor("trust").gradient,
                          boxShadow: `0 4px 12px ${
                            getSemanticColor("trust").primary
                          }30`,
                        }
                      : {}
                  }
                >
                  <Users className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Assignments</span>
                </Button>
              </div>
            </GlassCard>

            {/* Tab Content */}
            {activeTab === "meal-plans" && (
              <div className="space-y-6">
                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <GlassCard elevation={1} className="flex-1">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                        style={{ color: isDark ? "#A1A1AA" : "#9CA3AF" }}
                      />
                      <Input
                        placeholder="Search meal plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-xl bg-transparent border-0"
                        style={{
                          color: isDark ? "#fff" : "#1A1A1A",
                        }}
                      />
                    </div>
                  </GlassCard>
                  <Button
                    onClick={loadMealPlans}
                    variant="ghost"
                    className="rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => router.push("/coach/nutrition/meal-plans/create")}
                    className="rounded-xl"
                    style={{
                      background: getSemanticColor("success").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("success").primary
                      }30`,
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Meal Plan
                  </Button>
                </div>

                {/* Meal Plans Grid */}
                {loading && mealPlans.length === 0 ? (
                  <GlassCard elevation={2} className="p-12">
                    <div className="animate-pulse space-y-4">
                      <div className="h-8 bg-white/20 dark:bg-slate-700/20 rounded-xl w-1/4 backdrop-blur-sm"></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-64 bg-white/20 dark:bg-slate-700/20 rounded-2xl backdrop-blur-sm"
                          ></div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                ) : filteredMealPlans.length === 0 ? (
                  <GlassCard elevation={2} className="p-12 text-center">
                    <div
                      className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                      style={{
                        background: getSemanticColor("success").gradient,
                        boxShadow: `0 8px 24px ${
                          getSemanticColor("success").primary
                        }40`,
                      }}
                    >
                      <ChefHat className="w-10 h-10 text-white" />
                    </div>
                    <h3
                      className="text-xl sm:text-2xl font-bold mb-2"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      {searchQuery ? "No meal plans found" : "No meal plans yet"}
                    </h3>
                    <p
                      className="mb-6 max-w-md mx-auto"
                      style={{ color: isDark ? "#A1A1AA" : "#6B7280" }}
                    >
                      {searchQuery
                        ? "Try adjusting your search query"
                        : "Create your first meal plan to get started with nutrition planning."}
                    </p>
                    {!searchQuery && (
                      <Button
                        onClick={() => router.push("/coach/nutrition/meal-plans/create")}
                        className="rounded-xl"
                        style={{
                          background: getSemanticColor("success").gradient,
                          boxShadow: `0 4px 12px ${
                            getSemanticColor("success").primary
                          }30`,
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Meal Plan
                      </Button>
                    )}
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMealPlans.map((plan) => (
                      <MealPlanCard
                        key={plan.id}
                        mealPlan={plan}
                        onEdit={(plan) =>
                          router.push(`/coach/nutrition/meal-plans/${plan.id}/edit`)
                        }
                        onDelete={handleDeleteMealPlan}
                        onAssign={handleAssignMealPlan}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "foods" && (
              <div className="space-y-6">
                <OptimizedFoodDatabase coachId={user?.id || ""} />
              </div>
            )}

            {activeTab === "assignments" && (
              <div className="space-y-6">
                <OptimizedNutritionAssignments coachId={user?.id || ""} />
              </div>
            )}

            {/* Add Food Modal */}
            {showAddFood && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <GlassCard
                  elevation={3}
                  className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl"
                >
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className={`text-xl font-bold ${theme.text}`}>
                      Add New Food
                    </h2>
                    <p className={`${theme.textSecondary}`}>
                      Add a new food item to your database
                    </p>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handleAddFood} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className={`${theme.text}`}>
                          Food Name *
                        </Label>
                        <Input
                          id="name"
                          value={foodForm.name}
                          onChange={(e) =>
                            setFoodForm({ ...foodForm, name: e.target.value })
                          }
                          className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="serving_size"
                            className={`${theme.text}`}
                          >
                            Serving Size *
                          </Label>
                          <Input
                            id="serving_size"
                            type="number"
                            step="0.1"
                            value={foodForm.serving_size}
                            onChange={(e) =>
                              setFoodForm({
                                ...foodForm,
                                serving_size: e.target.value,
                              })
                            }
                            className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="serving_unit"
                            className={`${theme.text}`}
                          >
                            Unit *
                          </Label>
                          <Select
                            value={foodForm.serving_unit}
                            onValueChange={(value) =>
                              setFoodForm({ ...foodForm, serving_unit: value })
                            }
                          >
                            <SelectTrigger
                              className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="cup">cup</SelectItem>
                              <SelectItem value="tbsp">tbsp</SelectItem>
                              <SelectItem value="tsp">tsp</SelectItem>
                              <SelectItem value="piece">piece</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="calories_per_serving"
                          className={`${theme.text}`}
                        >
                          Calories per Serving *
                        </Label>
                        <Input
                          id="calories_per_serving"
                          type="number"
                          step="0.1"
                          value={foodForm.calories_per_serving}
                          onChange={(e) =>
                            setFoodForm({
                              ...foodForm,
                              calories_per_serving: e.target.value,
                            })
                          }
                          className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="protein" className={`${theme.text}`}>
                            Protein (g)
                          </Label>
                          <Input
                            id="protein"
                            type="number"
                            step="0.1"
                            value={foodForm.protein}
                            onChange={(e) =>
                              setFoodForm({
                                ...foodForm,
                                protein: e.target.value,
                              })
                            }
                            className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="carbs" className={`${theme.text}`}>
                            Carbs (g)
                          </Label>
                          <Input
                            id="carbs"
                            type="number"
                            step="0.1"
                            value={foodForm.carbs}
                            onChange={(e) =>
                              setFoodForm({
                                ...foodForm,
                                carbs: e.target.value,
                              })
                            }
                            className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fat" className={`${theme.text}`}>
                            Fat (g)
                          </Label>
                          <Input
                            id="fat"
                            type="number"
                            step="0.1"
                            value={foodForm.fat}
                            onChange={(e) =>
                              setFoodForm({ ...foodForm, fat: e.target.value })
                            }
                            className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fiber" className={`${theme.text}`}>
                            Fiber (g)
                          </Label>
                          <Input
                            id="fiber"
                            type="number"
                            step="0.1"
                            value={foodForm.fiber}
                            onChange={(e) =>
                              setFoodForm({
                                ...foodForm,
                                fiber: e.target.value,
                              })
                            }
                            className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className={`${theme.text}`}>
                          Category
                        </Label>
                        <Select
                          value={foodForm.category}
                          onValueChange={(value) =>
                            setFoodForm({ ...foodForm, category: value })
                          }
                        >
                          <SelectTrigger
                            className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Protein">Protein</SelectItem>
                            <SelectItem value="Grains">Grains</SelectItem>
                            <SelectItem value="Vegetables">
                              Vegetables
                            </SelectItem>
                            <SelectItem value="Fruits">Fruits</SelectItem>
                            <SelectItem value="Dairy">Dairy</SelectItem>
                            <SelectItem value="Nuts">Nuts</SelectItem>
                            <SelectItem value="General">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="submit"
                          disabled={loading}
                          className={`flex-1 ${theme.gradient} ${theme.shadow} rounded-xl`}
                        >
                          {loading ? "Adding..." : "Add Food"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddFood(false)}
                          className={`${theme.border} ${theme.textSecondary} rounded-xl`}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Add Meal Plan Modal */}
            {showAddMealPlan && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <GlassCard
                  elevation={3}
                  className="w-full max-w-md rounded-2xl"
                >
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className={`text-xl font-bold ${theme.text}`}>
                      Create Meal Plan
                    </h2>
                    <p className={`${theme.textSecondary}`}>
                      Create a new meal plan
                    </p>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handleAddMealPlan} className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="meal_plan_name"
                          className={`${theme.text}`}
                        >
                          Meal Plan Name *
                        </Label>
                        <Input
                          id="meal_plan_name"
                          value={mealPlanForm.name}
                          onChange={(e) =>
                            setMealPlanForm({
                              ...mealPlanForm,
                              name: e.target.value,
                            })
                          }
                          className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes" className={`${theme.text}`}>
                          Notes
                        </Label>
                        <Textarea
                          id="notes"
                          value={mealPlanForm.notes}
                          onChange={(e) =>
                            setMealPlanForm({
                              ...mealPlanForm,
                              notes: e.target.value,
                            })
                          }
                          className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="target_calories"
                          className={`${theme.text}`}
                        >
                          Target Calories (per day)
                        </Label>
                        <Input
                          id="target_calories"
                          type="number"
                          value={mealPlanForm.target_calories}
                          onChange={(e) =>
                            setMealPlanForm({
                              ...mealPlanForm,
                              target_calories: e.target.value,
                            })
                          }
                          className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="submit"
                          disabled={loading}
                          className={`flex-1 ${theme.gradient} ${theme.shadow} rounded-xl`}
                        >
                          {loading ? "Creating..." : "Create Meal Plan"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddMealPlan(false)}
                          className={`${theme.border} ${theme.textSecondary} rounded-xl`}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Meal Plan Assignment Modal */}
            {showAssignModal && selectedMealPlanForAssignment && (
              <MealPlanAssignmentModal
                mealPlan={selectedMealPlanForAssignment}
                clients={clients}
                selectedClients={selectedClients}
                onSelectedClientsChange={setSelectedClients}
                onClose={handleAssignmentComplete}
                onComplete={handleAssignmentComplete}
              />
            )}
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
