"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MealPlanService, MealPlan } from "@/lib/mealPlanService";
import { DatabaseService, Client } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import MealPlanCard from "@/components/features/nutrition/MealPlanCard";
import MealPlanAssignmentModal from "@/components/features/nutrition/MealPlanAssignmentModal";
import { RefreshCw, Plus, ChefHat, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MealPlansPage() {
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();
  const router = useRouter();

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMealPlanForAssignment, setSelectedMealPlanForAssignment] =
    useState<MealPlan | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadMealPlans();
    }
  }, [user]);

  const loadMealPlans = async () => {
    try {
      if (!user) return;
      setLoading(true);

      const mealPlans = await MealPlanService.getMealPlans(user.id);

      // Calculate actual stats for each meal plan
      const mealPlansWithStats = await Promise.all(
        mealPlans.map(async (plan) => {
          // Get meal count (from meal_items grouped by meal_type)
          const { count: mealCount } = await supabase
            .from("meal_items")
            .select("*", { count: "exact", head: true })
            .eq("meal_plan_id", plan.id);

          // Get assignment count
          const { count: assignmentCount } = await supabase
            .from("meal_plan_assignments")
            .select("*", { count: "exact", head: true })
            .eq("meal_plan_id", plan.id);

          return {
            ...plan,
            meal_count: mealCount || 0,
            usage_count: assignmentCount || 0,
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

  if (loading && mealPlans.length === 0) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"
                    ></div>
                  ))}
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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Link href="/coach/nutrition">
                <Button variant="outline" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className={`text-3xl font-bold ${theme.text}`}>
                  Meal Plans
                </h1>
                <p className={`${theme.textSecondary}`}>
                  Create and manage nutrition plans for your clients
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search meal plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
              <Button
                onClick={loadMealPlans}
                variant="outline"
                className="rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Link href="/coach/nutrition/meal-plans/create">
                <Button className="rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Meal Plan
                </Button>
              </Link>
            </div>

            {/* Meal Plans Grid */}
            {filteredMealPlans.length === 0 ? (
              <div
                className={`rounded-3xl ${theme.card} ${theme.shadow} p-12 text-center`}
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <ChefHat className="w-10 h-10 text-white" />
                </div>
                <h3 className={`text-xl font-bold ${theme.text} mb-2`}>
                  {searchQuery ? "No meal plans found" : "No meal plans found"}
                </h3>
                <p className={`${theme.textSecondary} mb-6`}>
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Create your first meal plan to get started with nutrition planning."}
                </p>
                {!searchQuery && (
                  <Link href="/coach/nutrition/meal-plans/create">
                    <Button className="rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Meal Plan
                    </Button>
                  </Link>
                )}
              </div>
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
        </div>
      </div>

      {/* Assignment Modal */}
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
    </ProtectedRoute>
  );
}
