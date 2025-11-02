"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface MealPlan {
  id: string;
  name: string;
  notes?: string;
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
  created_at: string;
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
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const [activeTab, setActiveTab] = useState("meal-plans");
  const [loading, setLoading] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [assignments, setAssignments] = useState<MealPlanAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [showAddFood, setShowAddFood] = useState(false);
  const [showAddMealPlan, setShowAddMealPlan] = useState(false);
  const [showAssignMealPlan, setShowAssignMealPlan] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(
    null
  );
  const [clients, setClients] = useState<
    Array<{
      id: string;
      first_name?: string;
      last_name?: string;
      email: string;
    }>
  >([]);
  const [assignmentForm, setAssignmentForm] = useState({
    client_id: "",
    meal_plan_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
  });

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

      // Load meal plans
      const { data: mealPlansData } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("coach_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      // Load clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("client_id")
        .eq("coach_id", user.id)
        .eq("status", "active");

      const clientsList =
        clientsData?.map((client) => ({
          id: client.client_id,
          first_name: "Client",
          last_name: "Popescu",
          email: "client@test.com",
        })) || [];

      setClients(clientsList);

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
      setMealPlans(mealPlansData || []);
      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error("Error loading nutrition data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteMealPlan = async (mealPlanId: string) => {
    if (!confirm("Are you sure you want to delete this meal plan?")) return;

    try {
      const { error } = await supabase
        .from("meal_plans")
        .delete()
        .eq("id", mealPlanId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error deleting meal plan:", error);
    }
  };

  const handleAssignMealPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !assignmentForm.client_id || !assignmentForm.meal_plan_id) {
      alert("Please select both a client and a meal plan");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("meal_plan_assignments")
        .insert({
          coach_id: user.id,
          client_id: assignmentForm.client_id,
          meal_plan_id: assignmentForm.meal_plan_id,
          start_date: assignmentForm.start_date,
          end_date: assignmentForm.end_date || null,
          notes: assignmentForm.notes || null,
        })
        .select();

      if (error) throw error;

      setAssignmentForm({
        client_id: "",
        meal_plan_id: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        notes: "",
      });
      setShowAssignMealPlan(false);
      loadData();
      alert("Meal plan assigned successfully!");
    } catch (error) {
      console.error("Error assigning meal plan:", error);
      alert("Error assigning meal plan. Please try again.");
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

  const filteredMealPlans = mealPlans.filter(
    (plan) =>
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.notes?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <Card className={`${theme.card} ${theme.shadow} rounded-2xl mb-6`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <Apple className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className={`text-2xl ${theme.text}`}>
                    Nutrition Planning Hub
                  </CardTitle>
                  <p className={`${theme.textSecondary}`}>
                    Create meal plans, manage food databases, and assign
                    nutrition programs to your clients
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Search */}
          <Card className={`${theme.card} ${theme.shadow} rounded-2xl mb-6`}>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search meal plans, foods, and clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList
              className={`grid w-full grid-cols-3 ${theme.card} ${theme.shadow} rounded-xl`}
            >
              <TabsTrigger
                value="meal-plans"
                className="flex items-center gap-2 rounded-xl"
              >
                <ChefHat className="w-4 h-4" />
                <span className="hidden sm:inline">Meal Plans</span>
              </TabsTrigger>
              <TabsTrigger
                value="foods"
                className="flex items-center gap-2 rounded-xl"
              >
                <Utensils className="w-4 h-4" />
                <span className="hidden sm:inline">Food Database</span>
              </TabsTrigger>
              <TabsTrigger
                value="assignments"
                className="flex items-center gap-2 rounded-xl"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Assignments</span>
              </TabsTrigger>
            </TabsList>

            {/* Meal Plans Tab */}
            <TabsContent
              value="meal-plans"
              className="space-y-6 mt-24 sm:mt-28"
            >
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <ChefHat className="w-10 h-10 text-white" />
                </div>
                <h3 className={`text-2xl font-bold ${theme.text} mb-2`}>
                  Meal Plans Management
                </h3>
                <p className={`${theme.textSecondary} mb-6 max-w-md mx-auto`}>
                  Create and manage nutrition plans for your clients. Access the
                  full meal plans interface for detailed meal planning.
                </p>
                <Button
                  onClick={() => router.push("/coach/nutrition/meal-plans")}
                  className="rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                >
                  <ChefHat className="w-4 h-4 mr-2" />
                  Go to Meal Plans
                </Button>
              </div>
            </TabsContent>

            {/* Food Database Tab */}
            <TabsContent value="foods" className="space-y-6 mt-24 sm:mt-28">
              <OptimizedFoodDatabase coachId={user?.id || ""} />
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent
              value="assignments"
              className="space-y-6 mt-24 sm:mt-28"
            >
              <OptimizedNutritionAssignments coachId={user?.id || ""} />
            </TabsContent>
          </Tabs>

          {/* Add Food Modal */}
          {showAddFood && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card
                className={`w-full max-w-md max-h-[90vh] overflow-y-auto ${theme.card} ${theme.shadow} rounded-2xl`}
              >
                <CardHeader>
                  <CardTitle className={`${theme.text}`}>
                    Add New Food
                  </CardTitle>
                  <p className={`${theme.textSecondary}`}>
                    Add a new food item to your database
                  </p>
                </CardHeader>
                <CardContent>
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
                            setFoodForm({ ...foodForm, carbs: e.target.value })
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
                            setFoodForm({ ...foodForm, fiber: e.target.value })
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
                          <SelectItem value="Vegetables">Vegetables</SelectItem>
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add Meal Plan Modal */}
          {showAddMealPlan && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card
                className={`w-full max-w-md ${theme.card} ${theme.shadow} rounded-2xl`}
              >
                <CardHeader>
                  <CardTitle className={`${theme.text}`}>
                    Create Meal Plan
                  </CardTitle>
                  <p className={`${theme.textSecondary}`}>
                    Create a new meal plan
                  </p>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* Meal Plan Assignment Modal */}
          {showAssignMealPlan && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div
                className={`${theme.card} ${theme.shadow} rounded-2xl p-6 w-full max-w-md mx-4`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-xl font-semibold ${theme.text}`}>
                    Assign Meal Plan
                  </h2>
                  <button
                    onClick={() => setShowAssignMealPlan(false)}
                    className={`${theme.textSecondary} hover:${theme.text}`}
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAssignMealPlan} className="space-y-4">
                  <div>
                    <Label htmlFor="client" className={`${theme.text}`}>
                      Select Client
                    </Label>
                    <Select
                      value={assignmentForm.client_id}
                      onValueChange={(value) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          client_id: value,
                        })
                      }
                    >
                      <SelectTrigger
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      >
                        <SelectValue placeholder="Choose a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name && client.last_name
                              ? `${client.first_name} ${client.last_name}`
                              : client.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {clients.length === 0 && (
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>
                        No active clients found. Make sure you have clients
                        assigned to you.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="mealPlan" className={`${theme.text}`}>
                      Select Meal Plan
                    </Label>
                    <Select
                      value={assignmentForm.meal_plan_id}
                      onValueChange={(value) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          meal_plan_id: value,
                        })
                      }
                    >
                      <SelectTrigger
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      >
                        <SelectValue placeholder="Choose a meal plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {mealPlans.map((mealPlan) => (
                          <SelectItem key={mealPlan.id} value={mealPlan.id}>
                            {mealPlan.name}
                            {mealPlan.target_calories &&
                              ` (${mealPlan.target_calories} cal)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mealPlans.length === 0 && (
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>
                        No meal plans found. Create a meal plan first.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate" className={`${theme.text}`}>
                        Start Date
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={assignmentForm.start_date}
                        onChange={(e) =>
                          setAssignmentForm({
                            ...assignmentForm,
                            start_date: e.target.value,
                          })
                        }
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate" className={`${theme.text}`}>
                        End Date (Optional)
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={assignmentForm.end_date}
                        onChange={(e) =>
                          setAssignmentForm({
                            ...assignmentForm,
                            end_date: e.target.value,
                          })
                        }
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className={`${theme.text}`}>
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any special instructions..."
                      rows={3}
                      value={assignmentForm.notes}
                      onChange={(e) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          notes: e.target.value,
                        })
                      }
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAssignMealPlan(false)}
                      className={`flex-1 ${theme.border} ${theme.textSecondary} rounded-xl`}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl"
                      disabled={
                        loading ||
                        !assignmentForm.client_id ||
                        !assignmentForm.meal_plan_id
                      }
                    >
                      {loading ? "Assigning..." : "Assign Meal Plan"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
