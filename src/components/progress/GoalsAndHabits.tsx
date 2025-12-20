"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Target,
  Plus,
  Trophy,
  Droplets,
  Moon,
  Footprints,
  Dumbbell,
  CheckCircle,
  Camera,
  X,
  Flame,
  TrendingUp,
  Award,
  Trash2,
  Upload,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { GoalsService, Goal as DBGoal } from "@/lib/progressTrackingService";

// ============================================
// INTERFACES
// ============================================

// Local UI Goal type (compatible with DB Goal type)
interface Goal {
  id: string;
  type:
    | "bench_press"
    | "squat"
    | "deadlift"
    | "total_weight_lifted"
    | "workout_count"
    | "body_weight"
    | "body_measurement"
    | "body_fat"
    | "muscle_mass";
  targetValue: number;
  currentValue: number;
  bodyPart?: "chest" | "arms" | "waist" | "hips" | "legs" | "total"; // For body_measurement goals
  deadline?: string;
  createdAt: string;
  completedAt?: string;
}

// Helper to convert DB Goal to UI Goal
const dbGoalToUI = (dbGoal: DBGoal): Goal => ({
  id: dbGoal.id,
  type: dbGoal.goal_type as Goal["type"],
  targetValue: dbGoal.target_value || 0,
  currentValue: dbGoal.current_value || 0,
  deadline: dbGoal.target_date || undefined,
  createdAt: dbGoal.created_at || new Date().toISOString(),
  completedAt: dbGoal.status === "completed" ? dbGoal.updated_at : undefined,
});

// Helper to convert UI Goal to DB Goal for saving
const uiGoalToDB = (
  uiGoal: Partial<Goal>,
  clientId: string
): Partial<DBGoal> => ({
  goal_type: uiGoal.type,
  title: GOAL_TYPES.find((g) => g.type === uiGoal.type)?.label || "Custom Goal",
  description: GOAL_TYPES.find((g) => g.type === uiGoal.type)?.description,
  target_value: uiGoal.targetValue,
  current_value: uiGoal.currentValue,
  target_date: uiGoal.deadline,
  metric_type: uiGoal.type,
  metric_unit: GOAL_TYPES.find((g) => g.type === uiGoal.type)?.unit,
  status: uiGoal.completedAt ? "completed" : "active",
});

interface HabitLog {
  date: string;
  sleep?: { hours: number; quality: 1 | 2 | 3 | 4 | 5 }; // 1=😫, 2=😕, 3=😐, 4=😊, 5=😁
  water?: number; // glasses
  steps?: number;
  cardio?: {
    type: string;
    duration: number; // minutes
    calories: number;
    proofImage: string;
  };
}

interface GoalsAndHabitsProps {
  loading?: boolean;
}

// ============================================
// GOAL TYPE DEFINITIONS
// ============================================

const GOAL_TYPES = [
  {
    type: "bench_press",
    label: "Bench Press PR",
    icon: "🏋️",
    unit: "kg",
    description: "Set a new bench press personal record",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    type: "squat",
    label: "Squat PR",
    icon: "🦵",
    unit: "kg",
    description: "Set a new squat personal record",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    type: "deadlift",
    label: "Deadlift PR",
    icon: "💪",
    unit: "kg",
    description: "Set a new deadlift personal record",
    gradient: "from-orange-500 to-red-600",
  },
  {
    type: "total_weight_lifted",
    label: "Total Volume",
    icon: "⚡",
    unit: "kg",
    description: "Total weight lifted across all workouts",
    gradient: "from-yellow-500 to-orange-600",
  },
  {
    type: "workout_count",
    label: "Workout Count",
    icon: "📝",
    unit: "workouts",
    description: "Complete a certain number of workouts",
    gradient: "from-green-500 to-emerald-600",
  },
  {
    type: "body_weight",
    label: "Body Weight Goal",
    icon: "⚖️",
    unit: "kg",
    description: "Reach target body weight",
    gradient: "from-slate-500 to-slate-600",
  },
  {
    type: "body_measurement",
    label: "Body Measurements",
    icon: "📏",
    unit: "cm",
    description: "Reduce specific body measurements",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    type: "body_fat",
    label: "Body Fat %",
    icon: "🔥",
    unit: "%",
    description: "Reduce body fat percentage",
    gradient: "from-red-500 to-orange-600",
  },
  {
    type: "muscle_mass",
    label: "Muscle Mass",
    icon: "💪",
    unit: "kg",
    description: "Increase muscle mass",
    gradient: "from-indigo-500 to-purple-600",
  },
] as const;

export function GoalsAndHabits({ loading = false }: GoalsAndHabitsProps) {
  const { isDark, getThemeStyles } = useTheme();
  const { user } = useAuth();
  const theme = getThemeStyles();

  const [activeTab, setActiveTab] = useState<"goals" | "habits">("goals");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showLogHabit, setShowLogHabit] = useState(false);
  const [selectedHabitType, setSelectedHabitType] = useState<
    "sleep" | "water" | "steps" | "cardio"
  >("water");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // New goal form
  const [newGoal, setNewGoal] = useState({
    type: "bench_press" as Goal["type"],
    targetValue: 0,
    currentValue: 0,
    bodyPart: "total" as Goal["bodyPart"],
    deadline: "",
  });

  // Habit log forms (still using localStorage for habits - future integration)
  const [habitLogForm, setHabitLogForm] = useState({
    sleep: { hours: 0, quality: 3 as 1 | 2 | 3 | 4 | 5 },
    water: 0,
    steps: 0,
    cardio: { type: "", duration: 0, calories: 0, proofImage: "" },
  });

  // Load goals from database
  useEffect(() => {
    if (user?.id) {
      loadGoals();
    }
  }, [user]);

  const loadGoals = async () => {
    if (!user?.id) return;
    setLoadingGoals(true);
    try {
      const dbGoals = await GoalsService.getClientGoals(user.id);
      setGoals(dbGoals.map(dbGoalToUI));
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setLoadingGoals(false);
    }
  };

  // Load habit logs from localStorage (temporary - habits not in DB yet)
  useEffect(() => {
    const savedHabitLogs = localStorage.getItem("habitLogs");
    if (savedHabitLogs) {
      try {
        setHabitLogs(JSON.parse(savedHabitLogs));
      } catch (e) {
        console.error("Error loading habit logs:", e);
      }
    }
  }, []);

  // Save habit logs to localStorage (temporary)
  useEffect(() => {
    if (habitLogs.length > 0) {
      localStorage.setItem("habitLogs", JSON.stringify(habitLogs));
    }
  }, [habitLogs]);

  // Get today's habit log
  const getTodayLog = (): HabitLog => {
    const today = new Date().toISOString().split("T")[0];
    const existing = habitLogs.find((log) => log.date === today);
    return existing || { date: today };
  };

  const todayLog = getTodayLog();

  const handleCreateGoal = async () => {
    if (!newGoal.targetValue || !user?.id) return;

    setLoadingGoals(true);
    try {
      const dbGoalData = uiGoalToDB(newGoal, user.id);
      const created = await GoalsService.createGoal(user.id, dbGoalData);

      if (created) {
        setGoals([...goals, dbGoalToUI(created)]);
        setNewGoal({
          type: "bench_press",
          targetValue: 0,
          currentValue: 0,
          bodyPart: "total" as Goal["bodyPart"],
          deadline: "",
        });
        setShowCreateGoal(false);
      }
    } catch (error) {
      console.error("Error creating goal:", error);
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleLogHabit = () => {
    const today = new Date().toISOString().split("T")[0];
    const existingIndex = habitLogs.findIndex((log) => log.date === today);

    const updatedLog: HabitLog =
      existingIndex >= 0 ? { ...habitLogs[existingIndex] } : { date: today };

    // Update based on selected habit type
    switch (selectedHabitType) {
      case "sleep":
        updatedLog.sleep = habitLogForm.sleep;
        break;
      case "water":
        updatedLog.water = habitLogForm.water;
        break;
      case "steps":
        updatedLog.steps = habitLogForm.steps;
        break;
      case "cardio":
        updatedLog.cardio = habitLogForm.cardio;
        break;
    }

    if (existingIndex >= 0) {
      const newLogs = [...habitLogs];
      newLogs[existingIndex] = updatedLog;
      setHabitLogs(newLogs);
    } else {
      setHabitLogs([updatedLog, ...habitLogs]);
    }

    // Reset form
    setHabitLogForm({
      sleep: { hours: 0, quality: 3 },
      water: 0,
      steps: 0,
      cardio: { type: "", duration: 0, calories: 0, proofImage: "" },
    });
    setShowLogHabit(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setHabitLogForm({
        ...habitLogForm,
        cardio: { ...habitLogForm.cardio, proofImage: reader.result as string },
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    setLoadingGoals(true);
    try {
      const success = await GoalsService.deleteGoal(goalId);
      if (success) {
        setGoals(goals.filter((g) => g.id !== goalId));
        setSelectedGoal(null);
      }
    } catch (error) {
      console.error("Error deleting goal:", error);
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    setLoadingGoals(true);
    try {
      const success = await GoalsService.completeGoal(goalId);
      if (success) {
        await loadGoals(); // Reload to get updated goal
        setSelectedGoal(null);
      }
    } catch (error) {
      console.error("Error completing goal:", error);
    } finally {
      setLoadingGoals(false);
    }
  };

  const getSleepEmoji = (quality: number) => {
    const emojis = ["😫", "😕", "😐", "😊", "😁"];
    return emojis[quality - 1] || "😐";
  };

  const getGoalInfo = (type: Goal["type"]) => {
    return GOAL_TYPES.find((g) => g.type === type)!;
  };

  // Calculate habit streaks
  const getStreak = (habitType: "sleep" | "water" | "steps" | "cardio") => {
    let streak = 0;
    const sortedLogs = [...habitLogs].sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    for (const log of sortedLogs) {
      const hasData =
        habitType === "sleep"
          ? log.sleep
          : habitType === "water"
          ? log.water
          : habitType === "steps"
          ? log.steps
          : log.cardio;

      if (hasData) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const activeGoals = goals.filter((g) => !g.completedAt);
  const completedGoals = goals.filter((g) => g.completedAt);

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card
          className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
        >
          <CardHeader className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className={`text-2xl font-bold ${theme.text}`}>
                  Goals & Habits
                </CardTitle>
                <p className={`${theme.textSecondary}`}>
                  Track targets and daily wellness
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-3">
              <Button
                onClick={() => setActiveTab("goals")}
                className={cn(
                  "flex-1 rounded-xl transition-all",
                  activeTab === "goals"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : `${isDark ? "bg-slate-700" : "bg-slate-100"} ${
                        theme.text
                      }`
                )}
              >
                <Target className="w-4 h-4 mr-2" />
                Goals
              </Button>
              <Button
                onClick={() => setActiveTab("habits")}
                className={cn(
                  "flex-1 rounded-xl transition-all",
                  activeTab === "habits"
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                    : `${isDark ? "bg-slate-700" : "bg-slate-100"} ${
                        theme.text
                      }`
                )}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Habits
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* ========== GOALS TAB ========== */}
      {activeTab === "goals" && (
        <>
          {/* Create Goal Button */}
          <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
            <Card
              className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
            >
              <CardContent className="p-4">
                <Button
                  onClick={() => setShowCreateGoal(true)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Goal
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
              >
                <CardHeader className="p-6 pb-4">
                  <CardTitle className={`text-xl ${theme.text}`}>
                    Active Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3">
                  {activeGoals.map((goal) => {
                    const goalInfo = getGoalInfo(goal.type);
                    const progress =
                      (goal.currentValue / goal.targetValue) * 100;

                    return (
                      <div
                        key={goal.id}
                        onClick={() => setSelectedGoal(goal)}
                        className={cn(
                          "rounded-xl p-4 border-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg",
                          isDark
                            ? "bg-slate-800 border-slate-700"
                            : "bg-white border-slate-200"
                        )}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
                              goalInfo.gradient
                            )}
                          >
                            <span className="text-2xl">{goalInfo.icon}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-bold ${theme.text} mb-1`}>
                              {goalInfo.label}
                            </h3>
                            <p className={`text-sm ${theme.textSecondary}`}>
                              {goalInfo.description}
                            </p>
                            {goal.deadline && (
                              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 mt-2">
                                Due:{" "}
                                {new Date(goal.deadline).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGoal(goal.id);
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className={theme.textSecondary}>
                              Progress
                            </span>
                            <span className={`font-bold ${theme.text}`}>
                              {goal.currentValue} / {goal.targetValue}{" "}
                              {goalInfo.unit}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                            <div
                              className={cn(
                                "h-full rounded-full bg-gradient-to-r",
                                goalInfo.gradient
                              )}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <p className={`text-xs ${theme.textSecondary}`}>
                            {Math.round(progress)}% complete • Auto-tracked from
                            workouts
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl mb-24">
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
              >
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-green-600" />
                    <CardTitle className={`text-xl ${theme.text}`}>
                      Completed Goals
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3">
                  {completedGoals.map((goal) => {
                    const goalInfo = getGoalInfo(goal.type);
                    return (
                      <div
                        key={goal.id}
                        className="rounded-xl p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{goalInfo.icon}</span>
                          <div className="flex-1">
                            <h3 className={`font-bold ${theme.text} mb-1`}>
                              {goalInfo.label}
                            </h3>
                            <p className={`text-sm ${theme.textSecondary}`}>
                              {goal.targetValue} {goalInfo.unit} •{" "}
                              {new Date(goal.completedAt!).toLocaleDateString()}
                            </p>
                          </div>
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State - Goals */}
          {activeGoals.length === 0 && completedGoals.length === 0 && (
            <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl mb-24">
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
              >
                <CardContent className="p-12">
                  <div className="text-center">
                    <Target
                      className={`w-16 h-16 ${theme.textSecondary} mx-auto mb-4`}
                    />
                    <h3 className={`text-xl font-bold ${theme.text} mb-2`}>
                      No Goals Set Yet
                    </h3>
                    <p className={`${theme.textSecondary} mb-6`}>
                      Create a goal and it will be automatically tracked from
                      your workouts!
                    </p>
                    <Button
                      onClick={() => setShowCreateGoal(true)}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Goal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ========== HABITS TAB ========== */}
      {activeTab === "habits" && (
        <>
          {/* Habit Cards - Preset 4 habits */}
          <div className="grid grid-cols-2 gap-4">
            {/* Water Intake */}
            <div
              onClick={() => {
                setSelectedHabitType("water");
                setShowLogHabit(true);
              }}
              className={cn(
                "rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl cursor-pointer transition-all hover:scale-105"
              )}
            >
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl h-full`}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center">
                      <Droplets className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`font-bold ${theme.text} mb-1`}>
                      Water Intake
                    </h3>
                    <p className={`text-2xl font-bold ${theme.text}`}>
                      {todayLog.water || 0}
                    </p>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      glasses today
                    </p>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 mt-2">
                      <Flame className="w-3 h-3 mr-1" />
                      {getStreak("water")} day streak
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sleep */}
            <div
              onClick={() => {
                setSelectedHabitType("sleep");
                setShowLogHabit(true);
              }}
              className={cn(
                "rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl cursor-pointer transition-all hover:scale-105"
              )}
            >
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl h-full`}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <Moon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`font-bold ${theme.text} mb-1`}>Sleep</h3>
                    <p className={`text-2xl font-bold ${theme.text}`}>
                      {todayLog.sleep?.hours || 0}h{" "}
                      {todayLog.sleep
                        ? getSleepEmoji(todayLog.sleep.quality)
                        : ""}
                    </p>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      logged today
                    </p>
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 mt-2">
                      <Flame className="w-3 h-3 mr-1" />
                      {getStreak("sleep")} day streak
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Steps */}
            <div
              onClick={() => {
                setSelectedHabitType("steps");
                setShowLogHabit(true);
              }}
              className={cn(
                "rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl cursor-pointer transition-all hover:scale-105"
              )}
            >
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl h-full`}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                      <Footprints className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`font-bold ${theme.text} mb-1`}>Steps</h3>
                    <p className={`text-2xl font-bold ${theme.text}`}>
                      {(todayLog.steps || 0).toLocaleString()}
                    </p>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      steps today
                    </p>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mt-2">
                      <Flame className="w-3 h-3 mr-1" />
                      {getStreak("steps")} day streak
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cardio */}
            <div
              onClick={() => {
                setSelectedHabitType("cardio");
                setShowLogHabit(true);
              }}
              className={cn(
                "rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl cursor-pointer transition-all hover:scale-105"
              )}
            >
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl h-full`}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                      <Dumbbell className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`font-bold ${theme.text} mb-1`}>Cardio</h3>
                    <p className={`text-2xl font-bold ${theme.text}`}>
                      {todayLog.cardio?.duration || 0}
                    </p>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      mins today
                    </p>
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 mt-2">
                      <Flame className="w-3 h-3 mr-1" />
                      {getStreak("cardio")} day streak
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Today's Summary */}
          {(todayLog.sleep ||
            todayLog.water ||
            todayLog.steps ||
            todayLog.cardio) && (
            <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl mb-24">
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
              >
                <CardHeader className="p-6 pb-4">
                  <CardTitle className={`text-xl ${theme.text}`}>
                    Today's Wellness Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {todayLog.sleep && (
                      <div
                        className={cn(
                          "rounded-xl p-3 text-center",
                          isDark ? "bg-slate-800" : "bg-slate-50"
                        )}
                      >
                        <Moon
                          className={`w-5 h-5 ${theme.textSecondary} mx-auto mb-1`}
                        />
                        <p className={`text-lg font-bold ${theme.text}`}>
                          {todayLog.sleep.hours}h
                        </p>
                        <p className="text-2xl">
                          {getSleepEmoji(todayLog.sleep.quality)}
                        </p>
                      </div>
                    )}
                    {todayLog.water && (
                      <div
                        className={cn(
                          "rounded-xl p-3 text-center",
                          isDark ? "bg-slate-800" : "bg-slate-50"
                        )}
                      >
                        <Droplets
                          className={`w-5 h-5 ${theme.textSecondary} mx-auto mb-1`}
                        />
                        <p className={`text-lg font-bold ${theme.text}`}>
                          {todayLog.water}
                        </p>
                        <p className={`text-xs ${theme.textSecondary}`}>
                          glasses
                        </p>
                      </div>
                    )}
                    {todayLog.steps && (
                      <div
                        className={cn(
                          "rounded-xl p-3 text-center",
                          isDark ? "bg-slate-800" : "bg-slate-50"
                        )}
                      >
                        <Footprints
                          className={`w-5 h-5 ${theme.textSecondary} mx-auto mb-1`}
                        />
                        <p className={`text-lg font-bold ${theme.text}`}>
                          {todayLog.steps.toLocaleString()}
                        </p>
                        <p className={`text-xs ${theme.textSecondary}`}>
                          steps
                        </p>
                      </div>
                    )}
                    {todayLog.cardio && (
                      <div
                        className={cn(
                          "rounded-xl p-3 text-center",
                          isDark ? "bg-slate-800" : "bg-slate-50"
                        )}
                      >
                        <Dumbbell
                          className={`w-5 h-5 ${theme.textSecondary} mx-auto mb-1`}
                        />
                        <p className={`text-lg font-bold ${theme.text}`}>
                          {todayLog.cardio.duration}min
                        </p>
                        <p className={`text-xs ${theme.textSecondary}`}>
                          {todayLog.cardio.calories} kcal
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State - Goals */}
          {activeGoals.length === 0 && completedGoals.length === 0 && (
            <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl mb-24">
              <Card
                className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}
              >
                <CardContent className="p-12">
                  <div className="text-center">
                    <Target
                      className={`w-16 h-16 ${theme.textSecondary} mx-auto mb-4`}
                    />
                    <h3 className={`text-xl font-bold ${theme.text} mb-2`}>
                      No Goals Set Yet
                    </h3>
                    <p
                      className={`${theme.textSecondary} mb-6 max-w-md mx-auto`}
                    >
                      Set goals like "Bench 100kg" or "Complete 50 workouts" -
                      they'll be tracked automatically from your workout data!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ========== CREATE GOAL MODAL ========== */}
      {showCreateGoal && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowCreateGoal(false)}
        >
          <div
            className={cn(
              "w-full max-w-2xl my-8 rounded-3xl shadow-2xl overflow-hidden",
              isDark ? "bg-slate-900" : "bg-white"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🎯</div>
                  <h2 className="text-2xl font-bold text-white">
                    Create New Goal
                  </h2>
                </div>
                <button
                  onClick={() => setShowCreateGoal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label className={`text-sm ${theme.text} mb-3 block`}>
                  Select Goal Type
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {GOAL_TYPES.map((goalType) => (
                    <Button
                      key={goalType.type}
                      onClick={() =>
                        setNewGoal({
                          type: goalType.type as Goal["type"],
                          targetValue: 0,
                          currentValue: 0,
                          bodyPart: "total" as Goal["bodyPart"],
                          deadline: "",
                        })
                      }
                      className={cn(
                        "h-auto py-4 px-4 rounded-xl transition-all text-left justify-start",
                        newGoal.type === goalType.type
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                          : `${isDark ? "bg-slate-700" : "bg-slate-100"} ${
                              theme.text
                            }`
                      )}
                    >
                      <span className="text-2xl mr-3">{goalType.icon}</span>
                      <div className="flex-1">
                        <p className="font-bold">{goalType.label}</p>
                        <p
                          className={cn(
                            "text-xs",
                            newGoal.type === goalType.type
                              ? "text-white/80"
                              : theme.textSecondary
                          )}
                        >
                          {goalType.description}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Dynamic Form Based on Goal Type */}
              {newGoal.type &&
                (() => {
                  const selectedGoalType = GOAL_TYPES.find(
                    (g) => g.type === newGoal.type
                  )!;

                  return (
                    <div
                      className={cn(
                        "rounded-xl p-4 border-2",
                        isDark
                          ? "bg-slate-800/50 border-slate-700"
                          : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">
                          {selectedGoalType.icon}
                        </span>
                        <h3 className={`font-bold ${theme.text}`}>
                          {selectedGoalType.label} Goal
                        </h3>
                      </div>

                      {/* Strength Goals (Bench, Squat, Deadlift) */}
                      {(newGoal.type === "bench_press" ||
                        newGoal.type === "squat" ||
                        newGoal.type === "deadlift") && (
                        <div className="space-y-3">
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Target Weight
                            </Label>
                            <Input
                              type="number"
                              value={newGoal.targetValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  targetValue: parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g., 100"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              In kilograms (kg)
                            </p>
                          </div>
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Current Personal Record
                            </Label>
                            <Input
                              type="number"
                              value={newGoal.currentValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  currentValue: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="e.g., 80"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              Your best lift so far
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Total Volume Goal */}
                      {newGoal.type === "total_weight_lifted" && (
                        <div className="space-y-3">
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Target Total Volume
                            </Label>
                            <Input
                              type="number"
                              value={newGoal.targetValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  targetValue: parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g., 50000"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              Total weight to lift (kg) - cumulative across all
                              workouts
                            </p>
                          </div>
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Current Total Volume
                            </Label>
                            <Input
                              type="number"
                              value={newGoal.currentValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  currentValue: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="e.g., 25000"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              Your total so far
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Workout Count Goal */}
                      {newGoal.type === "workout_count" && (
                        <div className="space-y-3">
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Target Number of Workouts
                            </Label>
                            <Input
                              type="number"
                              value={newGoal.targetValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  targetValue: parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g., 50"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              Number of workouts to complete
                            </p>
                          </div>
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Current Workouts Completed
                            </Label>
                            <Input
                              type="number"
                              value={newGoal.currentValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  currentValue: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="e.g., 25"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              Workouts logged so far
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Body Weight Goal */}
                      {newGoal.type === "body_weight" && (
                        <div className="space-y-3">
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Target Body Weight
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={newGoal.targetValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  targetValue: parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g., 75"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              Your goal weight in kg
                            </p>
                          </div>
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Current Body Weight
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={newGoal.currentValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  currentValue: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="e.g., 85"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              From your latest check-in
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Body Measurement Goal */}
                      {newGoal.type === "body_measurement" && (
                        <div className="space-y-3">
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Body Part to Track
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: "chest", label: "Chest", icon: "💪" },
                                { value: "arms", label: "Arms", icon: "💪" },
                                { value: "waist", label: "Waist", icon: "📏" },
                                { value: "hips", label: "Hips", icon: "📏" },
                                { value: "legs", label: "Legs", icon: "🦵" },
                                {
                                  value: "total",
                                  label: "Total (All)",
                                  icon: "📊",
                                },
                              ].map((part) => (
                                <Button
                                  key={part.value}
                                  onClick={() =>
                                    setNewGoal({
                                      ...newGoal,
                                      bodyPart: part.value as any,
                                    })
                                  }
                                  className={cn(
                                    "rounded-xl transition-all",
                                    newGoal.bodyPart === part.value
                                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                                      : `${
                                          isDark
                                            ? "bg-slate-700"
                                            : "bg-slate-100"
                                        } ${theme.text}`
                                  )}
                                >
                                  <span className="mr-2">{part.icon}</span>
                                  {part.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              {newGoal.bodyPart === "total"
                                ? "Target Total Reduction"
                                : `Target ${newGoal.bodyPart
                                    ?.charAt(0)
                                    .toUpperCase()}${newGoal.bodyPart?.slice(
                                    1
                                  )} Reduction`}
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={newGoal.targetValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  targetValue: parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g., 10"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              {newGoal.bodyPart === "total"
                                ? "Total cm to lose across all measurements"
                                : `Cm to lose from ${newGoal.bodyPart}`}
                            </p>
                          </div>
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Current Measurement
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={newGoal.currentValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  currentValue: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="e.g., 90"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              {newGoal.bodyPart === "total"
                                ? "Total cm lost so far"
                                : `Current ${newGoal.bodyPart} measurement in cm`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Body Fat % Goal */}
                      {newGoal.type === "body_fat" && (
                        <div className="space-y-3">
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Target Body Fat %
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={newGoal.targetValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  targetValue: parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g., 15"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              Your goal body fat percentage
                            </p>
                          </div>
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Current Body Fat %
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={newGoal.currentValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  currentValue: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="e.g., 22"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              From your latest check-in
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Muscle Mass Goal */}
                      {newGoal.type === "muscle_mass" && (
                        <div className="space-y-3">
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Target Muscle Mass
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={newGoal.targetValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  targetValue: parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g., 65"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              Your goal muscle mass in kg
                            </p>
                          </div>
                          <div>
                            <Label
                              className={`text-sm ${theme.text} mb-2 block`}
                            >
                              Current Muscle Mass
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={newGoal.currentValue || ""}
                              onChange={(e) =>
                                setNewGoal({
                                  ...newGoal,
                                  currentValue: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="e.g., 58"
                              className={cn(
                                "rounded-xl",
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-white border-slate-200"
                              )}
                            />
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              From your latest check-in
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Deadline (Common for all goals) */}
                      <div className="pt-3 mt-3 border-t border-slate-300 dark:border-slate-700">
                        <Label className={`text-sm ${theme.text} mb-2 block`}>
                          Target Deadline (Optional)
                        </Label>
                        <Input
                          type="date"
                          value={newGoal.deadline || ""}
                          onChange={(e) =>
                            setNewGoal({ ...newGoal, deadline: e.target.value })
                          }
                          className={cn(
                            "rounded-xl",
                            isDark
                              ? "bg-slate-800 border-slate-700"
                              : "bg-white border-slate-200"
                          )}
                        />
                        <p className={`text-xs ${theme.textSecondary} mt-1`}>
                          When do you want to achieve this goal?
                        </p>
                      </div>
                    </div>
                  );
                })()}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowCreateGoal(false)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGoal}
                  disabled={!newGoal.targetValue}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl disabled:opacity-50"
                >
                  Create Goal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== LOG HABIT MODAL ========== */}
      {showLogHabit && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowLogHabit(false)}
        >
          <div
            className={cn(
              "w-full max-w-2xl my-8 rounded-3xl shadow-2xl overflow-hidden",
              isDark ? "bg-slate-900" : "bg-white"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "p-6 bg-gradient-to-r rounded-t-3xl",
                selectedHabitType === "water" && "from-blue-500 to-cyan-600",
                selectedHabitType === "sleep" &&
                  "from-indigo-500 to-purple-600",
                selectedHabitType === "steps" &&
                  "from-green-500 to-emerald-600",
                selectedHabitType === "cardio" && "from-orange-500 to-red-600"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">
                    {selectedHabitType === "water" && "💧"}
                    {selectedHabitType === "sleep" && "😴"}
                    {selectedHabitType === "steps" && "👟"}
                    {selectedHabitType === "cardio" && "🏃"}
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Log{" "}
                    {selectedHabitType === "water"
                      ? "Water Intake"
                      : selectedHabitType === "sleep"
                      ? "Sleep"
                      : selectedHabitType === "steps"
                      ? "Steps"
                      : "Cardio"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowLogHabit(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Date Field (Auto-detected, shown for all habits) */}
              <div>
                <Label className={`text-sm ${theme.text} mb-2 block`}>
                  Date
                </Label>
                <Input
                  type="date"
                  value={new Date().toISOString().split("T")[0]}
                  disabled
                  className={cn(
                    "rounded-xl",
                    isDark
                      ? "bg-slate-800 border-slate-700"
                      : "bg-white border-slate-200"
                  )}
                />
                <p className={`text-xs ${theme.textSecondary} mt-1`}>
                  Auto-detected (today)
                </p>
              </div>

              {/* Water Intake Form */}
              {selectedHabitType === "water" && (
                <div>
                  <Label className={`text-sm ${theme.text} mb-2 block`}>
                    Glasses of Water
                  </Label>
                  <Input
                    type="number"
                    value={habitLogForm.water || ""}
                    onChange={(e) =>
                      setHabitLogForm({
                        ...habitLogForm,
                        water: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="8"
                    className={cn(
                      "rounded-xl",
                      isDark
                        ? "bg-slate-800 border-slate-700"
                        : "bg-white border-slate-200"
                    )}
                  />
                  <p className={`text-xs ${theme.textSecondary} mt-2`}>
                    Goal: 8 glasses/day
                  </p>
                </div>
              )}

              {/* Sleep Form */}
              {selectedHabitType === "sleep" && (
                <>
                  <div>
                    <Label className={`text-sm ${theme.text} mb-2 block`}>
                      Hours Slept
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={habitLogForm.sleep.hours || ""}
                      onChange={(e) =>
                        setHabitLogForm({
                          ...habitLogForm,
                          sleep: {
                            ...habitLogForm.sleep,
                            hours: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="8"
                      className={cn(
                        "rounded-xl",
                        isDark
                          ? "bg-slate-800 border-slate-700"
                          : "bg-white border-slate-200"
                      )}
                    />
                  </div>
                  <div>
                    <Label className={`text-sm ${theme.text} mb-2 block`}>
                      Sleep Quality
                    </Label>
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map((quality) => (
                        <Button
                          key={quality}
                          onClick={() =>
                            setHabitLogForm({
                              ...habitLogForm,
                              sleep: {
                                ...habitLogForm.sleep,
                                quality: quality as any,
                              },
                            })
                          }
                          className={cn(
                            "text-4xl p-4 rounded-xl transition-all",
                            habitLogForm.sleep.quality === quality
                              ? "bg-purple-500 scale-125 shadow-lg"
                              : `${isDark ? "bg-slate-700" : "bg-slate-100"}`
                          )}
                        >
                          {getSleepEmoji(quality)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Steps Form */}
              {selectedHabitType === "steps" && (
                <div>
                  <Label className={`text-sm ${theme.text} mb-2 block`}>
                    Steps Today
                  </Label>
                  <Input
                    type="number"
                    value={habitLogForm.steps || ""}
                    onChange={(e) =>
                      setHabitLogForm({
                        ...habitLogForm,
                        steps: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="10000"
                    className={cn(
                      "rounded-xl",
                      isDark
                        ? "bg-slate-800 border-slate-700"
                        : "bg-white border-slate-200"
                    )}
                  />
                  <p className={`text-xs ${theme.textSecondary} mt-2`}>
                    Goal: 10,000 steps/day
                  </p>
                </div>
              )}

              {/* Cardio Form */}
              {selectedHabitType === "cardio" && (
                <>
                  <div>
                    <Label className={`text-sm ${theme.text} mb-2 block`}>
                      Activity Type
                    </Label>
                    <Input
                      value={habitLogForm.cardio.type || ""}
                      onChange={(e) =>
                        setHabitLogForm({
                          ...habitLogForm,
                          cardio: {
                            ...habitLogForm.cardio,
                            type: e.target.value,
                          },
                        })
                      }
                      placeholder="Running, Cycling, Swimming..."
                      className={cn(
                        "rounded-xl",
                        isDark
                          ? "bg-slate-800 border-slate-700"
                          : "bg-white border-slate-200"
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className={`text-sm ${theme.text} mb-2 block`}>
                        Duration (minutes)
                      </Label>
                      <Input
                        type="number"
                        value={habitLogForm.cardio.duration || ""}
                        onChange={(e) =>
                          setHabitLogForm({
                            ...habitLogForm,
                            cardio: {
                              ...habitLogForm.cardio,
                              duration: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="30"
                        className={cn(
                          "rounded-xl",
                          isDark
                            ? "bg-slate-800 border-slate-700"
                            : "bg-white border-slate-200"
                        )}
                      />
                    </div>
                    <div>
                      <Label className={`text-sm ${theme.text} mb-2 block`}>
                        Calories Burned
                      </Label>
                      <Input
                        type="number"
                        value={habitLogForm.cardio.calories || ""}
                        onChange={(e) =>
                          setHabitLogForm({
                            ...habitLogForm,
                            cardio: {
                              ...habitLogForm.cardio,
                              calories: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="250"
                        className={cn(
                          "rounded-xl",
                          isDark
                            ? "bg-slate-800 border-slate-700"
                            : "bg-white border-slate-200"
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className={`text-sm ${theme.text} mb-2 block`}>
                      Proof Screenshot (Required)
                    </Label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-orange-500",
                        isDark
                          ? "border-slate-700 bg-slate-800"
                          : "border-slate-300 bg-slate-50"
                      )}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="cardio-proof"
                      />
                      <label htmlFor="cardio-proof" className="cursor-pointer">
                        {habitLogForm.cardio.proofImage ? (
                          <div>
                            <img
                              src={habitLogForm.cardio.proofImage}
                              alt="Proof"
                              className="w-full h-48 object-cover rounded-lg mb-2"
                            />
                            <p className={`text-sm ${theme.text}`}>
                              ✓ Screenshot uploaded
                            </p>
                          </div>
                        ) : (
                          <div>
                            <Camera
                              className={`w-12 h-12 ${theme.textSecondary} mx-auto mb-2`}
                            />
                            <p className={theme.text}>Upload Screenshot</p>
                            <p
                              className={`text-xs ${theme.textSecondary} mt-1`}
                            >
                              Required for verification
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowLogHabit(false)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLogHabit}
                  disabled={
                    selectedHabitType === "cardio" &&
                    (!habitLogForm.cardio.type ||
                      !habitLogForm.cardio.duration ||
                      !habitLogForm.cardio.proofImage)
                  }
                  className={cn(
                    "flex-1 rounded-xl text-white disabled:opacity-50 bg-gradient-to-r",
                    selectedHabitType === "water" &&
                      "from-blue-500 to-cyan-600",
                    selectedHabitType === "sleep" &&
                      "from-indigo-500 to-purple-600",
                    selectedHabitType === "steps" &&
                      "from-green-500 to-emerald-600",
                    selectedHabitType === "cardio" &&
                      "from-orange-500 to-red-600"
                  )}
                >
                  Log{" "}
                  {selectedHabitType === "water"
                    ? "Water"
                    : selectedHabitType === "sleep"
                    ? "Sleep"
                    : selectedHabitType === "steps"
                    ? "Steps"
                    : "Cardio"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Details Modal - Simplified, no manual updates since it's auto-tracked */}
      {selectedGoal && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={() => setSelectedGoal(null)}
        >
          <div
            className={cn(
              "w-full max-w-2xl my-8 rounded-3xl shadow-2xl overflow-hidden",
              isDark ? "bg-slate-900" : "bg-white"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const goalInfo = getGoalInfo(selectedGoal.type);
              const progress =
                (selectedGoal.currentValue / selectedGoal.targetValue) * 100;

              return (
                <>
                  <div
                    className={cn(
                      "p-6 bg-gradient-to-r rounded-t-3xl",
                      goalInfo.gradient
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-6xl">{goalInfo.icon}</div>
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">
                            {goalInfo.label}
                          </h2>
                          <p className="text-white/90 text-sm">
                            Auto-tracked from workouts
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedGoal(null)}
                        className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div
                      className={cn(
                        "rounded-xl p-5",
                        isDark ? "bg-slate-800" : "bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-3xl font-bold ${theme.text}`}>
                          {selectedGoal.currentValue}
                        </span>
                        <span className={`text-lg ${theme.textSecondary}`}>
                          / {selectedGoal.targetValue} {goalInfo.unit}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                        <div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r",
                            goalInfo.gradient
                          )}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <p className={`text-sm ${theme.textSecondary} mt-2`}>
                        {Math.round(progress)}% complete
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleDeleteGoal(selectedGoal.id)}
                        variant="outline"
                        className="flex-1 rounded-xl text-red-600 border-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                      <Button
                        onClick={() => setSelectedGoal(null)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
