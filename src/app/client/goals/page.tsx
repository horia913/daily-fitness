"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Plus,
  TrendingUp,
  Dumbbell,
  Apple,
  Weight,
  CheckCircle,
  Edit,
  Trash,
  Star,
  Zap,
  Activity,
  Trophy,
  Award,
  Crown,
  Rocket,
  Timer,
  XCircle,
  PauseCircle,
  Filter,
  SortAsc,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Target as TargetIcon,
  ChevronDown,
  Archive,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { GoalCard } from "@/components/goals/GoalCard";
import { CustomGoalForm } from "@/components/goals/CustomGoalForm";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import { withTimeout } from "@/lib/withTimeout";
import { getGoalStats as getGoalStatsFromService } from "@/lib/goalAdherenceService";
const PILLAR_SECTIONS: { id: Goal["pillar"]; label: string; emoji: string }[] = [
  { id: "training", label: "Training", emoji: "🏋️" },
  { id: "nutrition", label: "Nutrition", emoji: "🍎" },
  { id: "checkins", label: "Check-ins", emoji: "📊" },
  { id: "lifestyle", label: "Lifestyle", emoji: "🌿" },
  { id: "general", label: "General", emoji: "⭐" },
];

interface Goal {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  category:
    | "weight_loss"
    | "muscle_gain"
    | "strength"
    | "endurance"
    | "mobility"
    | "body_composition"
    | "performance"
    | "other";
  type: "target" | "habit" | "milestone";
  target_value?: number;
  target_unit?: string;
  current_value?: number;
  start_date: string;
  target_date?: string;
  status: "active" | "in_progress" | "completed" | "paused" | "cancelled";
  priority: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
  progress_percentage?: number;
  goal_template_id?: string; // FK to goal_templates table
  pillar: "training" | "nutrition" | "lifestyle" | "checkins" | "general";
  goal_type?: string | null;
}

interface GoalCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

interface PresetGoal {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  category: string;
  subcategory: string;
  unit: string;
  suggestedUnit: string;
  isAutoTracked?: boolean;
  autoTrackSource?: string;
}

// Database goal template interface (from goal_templates table)
// Note: Goal templates are SYSTEM-ONLY (no coach customization)
interface GoalTemplate {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  category: string;
  subcategory: string | null;
  default_unit: string;
  suggested_unit_display: string | null;
  is_auto_tracked: boolean;
  auto_track_source: string | null;
  is_active: boolean;
}

// Expanded Preset Goals
const PRESET_GOALS: PresetGoal[] = [
  // BODY COMPOSITION GOALS
  {
    id: "fat-loss",
    title: "Fat Loss",
    description: "Reduce body fat percentage",
    emoji: "🔥",
    category: "body_composition",
    subcategory: "Body Composition",
    unit: "%",
    suggestedUnit: "%",
  },
  {
    id: "muscle-gain",
    title: "Muscle Gain",
    description: "Increase muscle mass",
    emoji: "💪",
    category: "muscle",
    subcategory: "Body Composition",
    unit: "kg",
    suggestedUnit: "kg",
  },
  {
    id: "weight-loss",
    title: "Weight Loss",
    description: "Reduce body weight",
    emoji: "⚖️",
    category: "weight",
    subcategory: "Body Composition",
    unit: "kg",
    suggestedUnit: "kg",
  },
  {
    id: "body-recomp",
    title: "Body Recomposition",
    description: "Increase muscle + decrease fat %",
    emoji: "🔄",
    category: "body_composition",
    subcategory: "Body Composition",
    unit: "combined",
    suggestedUnit: "kg muscle / % fat",
  },
  // STRENGTH & PERFORMANCE GOALS
  {
    id: "bench-press",
    title: "Increase Bench Press",
    description: "Improve upper body strength",
    emoji: "💥",
    category: "strength",
    subcategory: "Strength & Performance",
    unit: "kg",
    suggestedUnit: "kg",
  },
  {
    id: "squat",
    title: "Increase Squat",
    description: "Build leg strength",
    emoji: "🦵",
    category: "strength",
    subcategory: "Strength & Performance",
    unit: "kg",
    suggestedUnit: "kg",
  },
  {
    id: "deadlift",
    title: "Increase Deadlift",
    description: "Develop posterior chain strength",
    emoji: "🏋️",
    category: "strength",
    subcategory: "Strength & Performance",
    unit: "kg",
    suggestedUnit: "kg",
  },
  {
    id: "hip-thrust",
    title: "Increase Hip Thrust",
    description: "Build glute and posterior chain strength",
    emoji: "🍑",
    category: "strength",
    subcategory: "Strength & Performance",
    unit: "kg",
    suggestedUnit: "kg",
  },
  // CONSISTENCY & ADHERENCE GOALS
  {
    id: "workout-consistency",
    title: "Workout Consistency",
    description: "Complete X workouts per week",
    emoji: "📅",
    category: "consistency",
    subcategory: "Consistency & Adherence",
    unit: "workouts/week",
    suggestedUnit: "per week",
  },
  {
    id: "nutrition-tracking",
    title: "Nutrition Tracking",
    description: "Log meals X days per week",
    emoji: "🥗",
    category: "consistency",
    subcategory: "Consistency & Adherence",
    unit: "days/week",
    suggestedUnit: "days per week",
  },
  {
    id: "water-intake",
    title: "Water Intake Goal",
    description: "Drink X liters per day",
    emoji: "💧",
    category: "consistency",
    subcategory: "Consistency & Adherence",
    unit: "liters",
    suggestedUnit: "liters per day",
  },
];

export default function ClientGoals() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const { performanceSettings, isDark, getSemanticColor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const loadingRef = useRef(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [presetGoalTemplates, setPresetGoalTemplates] = useState<PresetGoal[]>(
    []
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "completed" | "paused" | "cancelled"
  >("all");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "priority" | "progress"
  >("newest");
  const [showPresetSelection, setShowPresetSelection] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [showCustomGoalForm, setShowCustomGoalForm] = useState(false);
  const [customForm, setCustomForm] = useState({
    targetValue: "",
    targetUnit: "",
    targetDate: "",
    priority: "high",
  });
  const [presetTargets, setPresetTargets] = useState<Record<string, string>>(
    {}
  );
  const [presetDates, setPresetDates] = useState<Record<string, string>>({});
  const [progressUpdates, setProgressUpdates] = useState<
    Record<string, number>
  >({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other" as Goal["category"],
    type: "target" as Goal["type"],
    target_value: "",
    target_unit: "",
    target_date: "",
    priority: "medium" as Goal["priority"],
    pillar: "training" as Goal["pillar"],
  });
  const [addGoalPillar, setAddGoalPillar] = useState<Goal["pillar"]>("general");
  const [addGoalModalPillar, setAddGoalModalPillar] = useState<Goal["pillar"] | null>(null);
  const [completedSectionOpen, setCompletedSectionOpen] = useState(false);

  const goalCategories: GoalCategory[] = [
    {
      id: "body_composition",
      name: "Body Composition",
      icon: Dumbbell,
      color: "text-blue-600",
      description: "Body composition goals",
    },
    {
      id: "muscle_gain",
      name: "Muscle Gain",
      icon: Dumbbell,
      color: "text-green-600",
      description: "Muscle building goals",
    },
    {
      id: "weight_loss",
      name: "Weight Loss",
      icon: Weight,
      color: "text-purple-600",
      description: "Weight management goals",
    },
    {
      id: "strength",
      name: "Strength",
      icon: Zap,
      color: "text-orange-600",
      description: "Strength and power goals",
    },
    {
      id: "endurance",
      name: "Endurance",
      icon: Activity,
      color: "text-red-600",
      description: "Cardio and endurance goals",
    },
    {
      id: "performance",
      name: "Performance",
      icon: Star,
      color: "text-yellow-600",
      description: "Performance and consistency goals",
    },
    {
      id: "mobility",
      name: "Mobility",
      icon: Activity,
      color: "text-indigo-600",
      description: "Mobility and flexibility goals",
    },
    {
      id: "other",
      name: "Other",
      icon: Target,
      color: "text-gray-600",
      description: "Other goals",
    },
  ];

  const loadGoals = useCallback(async () => {
    if (!user) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadingStartedAt(Date.now());
    try {
      await withTimeout(
        (async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("client_id", user.id)
        .order("pillar", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const goalsList = data || [];
      // Fetch habit_logs once for all habit-type goals (client_id = user.id)
      const habitGoalStarts = goalsList.filter((g: Goal) => g.type === "habit" && g.start_date).map((g: Goal) => g.start_date!);
      let habitLogsByDate: Set<string> = new Set();
      if (habitGoalStarts.length > 0) {
        const minStart = habitGoalStarts.reduce((a, b) => (a < b ? a : b)).slice(0, 10);
        const { data: logs } = await supabase
          .from("habit_logs")
          .select("log_date")
          .eq("client_id", user.id)
          .gte("log_date", minStart);
        if (logs?.length) {
          logs.forEach((r: { log_date: string }) => {
            const d = typeof r.log_date === "string" ? r.log_date.slice(0, 10) : r.log_date;
            if (d) habitLogsByDate.add(d);
          });
        }
      }

      // Calculate progress for each goal
      const goalsWithProgress = goalsList.map((goal: Goal) => {
        let progressPercentage = 0;

        if (goal.target_value != null && goal.current_value != null) {
          progressPercentage = Math.min(
            (goal.current_value / goal.target_value) * 100,
            100
          );
        } else if (goal.type === "habit") {
          // Habit progress: days with at least one completion in [start_date, today] / total days in period
          const start = goal.start_date ? new Date(goal.start_date) : new Date();
          const end = new Date();
          const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          const startStr = start.toISOString().slice(0, 10);
          const endStr = end.toISOString().slice(0, 10);
          const daysWithHabit = [...habitLogsByDate].filter((d) => d >= startStr && d <= endStr).length;
          progressPercentage = Math.min(100, Math.round((daysWithHabit / totalDays) * 100));
        } else if (goal.type === "milestone") {
          // For milestone goals, calculate based on time progress
          if (goal.target_date) {
            const startDate = new Date(goal.start_date);
            const targetDate = new Date(goal.target_date);
            const now = new Date();
            const totalDays = Math.ceil(
              (targetDate.getTime() - startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const daysPassed = Math.ceil(
              (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            progressPercentage = Math.min((daysPassed / totalDays) * 100, 100);
          }
        }

        return {
          ...goal,
          progress_percentage: progressPercentage,
        };
      });

      setGoals(goalsWithProgress);
        })(),
        30000,
        "timeout"
      );
    } catch (error: any) {
      console.error("Error loading goals:", error);
      setGoals([]);
      setLoadError(error?.message === "timeout" ? "Loading took too long. Please try again." : (error?.message || "Failed to load goals"));
    } finally {
      setLoading(false);
      setLoadingStartedAt(null);
      loadingRef.current = false;
    }
  }, [user]);


  // Load preset goals from database (with fallback to hardcoded array)
  const loadPresetGoals = useCallback(async () => {
    try {
      // Fetch templates from goal_templates table
      const { data: templates, error } = await supabase
        .from('goal_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('title', { ascending: true });

      if (error) {
        console.warn('Error fetching goal templates from DB, using fallback:', error);
        setPresetGoalTemplates(PRESET_GOALS);
        return;
      }

      if (templates && templates.length > 0) {
        // Map database templates to PresetGoal format
        const mappedTemplates: PresetGoal[] = templates.map((t: GoalTemplate) => ({
          id: t.id,
          title: t.title,
          description: t.description || undefined,
          emoji: t.emoji || '🎯',
          category: t.category,
          subcategory: t.subcategory || t.category,
          unit: t.default_unit,
          suggestedUnit: t.suggested_unit_display || t.default_unit,
          isAutoTracked: t.is_auto_tracked,
          autoTrackSource: t.auto_track_source || undefined,
        }));
        setPresetGoalTemplates(mappedTemplates);
      } else {
        // Fallback to hardcoded if no templates in DB yet
        setPresetGoalTemplates(PRESET_GOALS);
      }
    } catch (error) {
      console.error('Error loading preset goals:', error);
      setPresetGoalTemplates(PRESET_GOALS);
    }
  }, []);

  // Helper function to map preset category to valid database category
  const mapCategoryToValid = (presetCategory: string): Goal["category"] => {
    const categoryMap: Record<string, Goal["category"]> = {
      body_composition: "body_composition", // Already valid ✓
      muscle: "muscle_gain", // Map to muscle_gain ✓
      weight: "weight_loss", // Map to weight_loss ✓
      strength: "strength", // Already valid ✓
      consistency: "performance", // Map to performance ✓
      endurance: "endurance", // Already valid ✓
      mobility: "mobility", // Already valid ✓
      other: "other", // Fallback ✓
    };
    return categoryMap[presetCategory] || "other";
  };

  // Helper function to map title to category (legacy, kept for compatibility)
  const getCategoryFromTitle = (title: string): string => {
    const categoryMap: Record<string, string> = {
      "Fat Loss": "body_composition",
      "Muscle Gain": "muscle_gain",
      "Weight Loss": "weight_loss",
      "Body Recomposition": "body_composition",
    };
    return categoryMap[title] || "other";
  };

  // Create custom goal from preset
  const selectPresetGoal = async (
    presetTitle: string,
    targetValue: number,
    targetDate?: string
  ) => {
    if (!user || !targetValue) {
      addToast({ title: "Please enter a target value", variant: "warning" });
      return;
    }

    try {
      const preset = presetGoalTemplates.find((p) => p.title === presetTitle);
      const category = preset
        ? getCategoryFromTitle(preset.title)
        : getCategoryFromTitle(presetTitle);

      // Check if the preset has a valid UUID (from database) vs hardcoded id
      const isFromDatabase = preset?.id && preset.id.includes('-') && preset.id.length === 36;

      const { data, error } = await supabase.from("goals").insert({
        client_id: user.id,
        coach_id: null,
        title: presetTitle,
        description: preset?.description || `Target: ${targetValue}`,
        category: category,
        pillar: addGoalPillar,
        target_value: targetValue,
        target_unit: preset?.unit || null,
        target_date: targetDate || null,
        current_value: 0,
        status: "active",
        priority: "high",
        start_date: new Date().toISOString().split("T")[0],
        progress_percentage: 0,
        goal_template_id: isFromDatabase ? preset.id : null, // Link to template if from DB
      });

      if (error) throw error;

      // Clear preset inputs
      setPresetTargets((prev) => {
        const newPrev = { ...prev };
        delete newPrev[presetTitle];
        return newPrev;
      });
      setPresetDates((prev) => {
        const newPrev = { ...prev };
        delete newPrev[presetTitle];
        return newPrev;
      });

      await loadGoals();
      addToast({ title: "Goal created successfully!", variant: "success" });
    } catch (error) {
      console.error("Error creating goal from preset:", error);
      addToast({ title: "Failed to create goal. Please try again.", variant: "destructive" });
    }
  };

  // Create custom goal from preset (new simplified handler)
  const handleCreateCustomGoal = async (
    e: React.FormEvent,
    preset: PresetGoal
  ) => {
    e.preventDefault();

    if (!user || !customForm.targetValue) {
      addToast({ title: "Please enter a target value", variant: "warning" });
      return;
    }

    try {
      // Parse target value based on goal type
      let parsedValue: number | null = null;

      // For body recomp, store as description instead
      if (preset.id === "body-recomp") {
        parsedValue = null; // Will store in description
      } else {
        parsedValue = parseFloat(customForm.targetValue);
        if (isNaN(parsedValue)) {
          addToast({ title: "Please enter a valid number", variant: "warning" });
          return;
        }
      }

      const description =
        preset.id === "body-recomp"
          ? `Target: ${customForm.targetValue} ${customForm.targetUnit}`
          : `Target: ${customForm.targetValue} ${
              customForm.targetUnit || preset.suggestedUnit
            }`;

      // Map preset category to valid database category
      const validCategory = mapCategoryToValid(preset.category);

      // Check if the preset has a valid UUID (from database) vs hardcoded id
      const isFromDatabase = preset.id && preset.id.includes('-') && preset.id.length === 36;

      // Build insert data object
      const insertData: any = {
        client_id: user.id,
        coach_id: null,
        title: preset.title,
        description: description,
        category: validCategory,
        pillar: addGoalPillar,
        target_value: parsedValue,
        target_date: customForm.targetDate || null,
        current_value: 0,
        status: "active", // Must be one of: 'active', 'completed', 'paused', 'cancelled'
        priority: customForm.priority,
        start_date: new Date().toISOString().split("T")[0],
        progress_percentage: 0,
        goal_template_id: isFromDatabase ? preset.id : null, // Link to template if from DB
      };

      // Only include target_unit if it has a value
      const targetUnit = customForm.targetUnit || preset.suggestedUnit;
      if (targetUnit && targetUnit.trim() !== "") {
        insertData.target_unit = targetUnit;
      }

      const { error } = await supabase.from("goals").insert(insertData);

      if (error) {
        console.error("Supabase error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        throw error;
      }

      // Success - reload goals and close modals
      await loadGoals();
      setCustomizing(false);
      setSelectedPreset(null);
      setShowPresetSelection(false);
      setCustomForm({
        targetValue: "",
        targetUnit: "",
        targetDate: "",
        priority: "high",
      });
      addToast({ title: "Goal created successfully!", variant: "success" });
    } catch (error: any) {
      console.error("Error creating goal:", error);
      const errorMessage =
        error?.message ||
        "Failed to create goal. Please check the console for details.";
      addToast({ title: `Failed to create goal: ${errorMessage}`, variant: "destructive" });
    }
  };

  // Update goal progress
  const updateGoalProgress = async (
    goalId: string,
    newCurrentValue: number
  ) => {
    try {
      // Get goal to calculate progress percentage
      const { data: goal } = await supabase
        .from("goals")
        .select("target_value, status")
        .eq("id", goalId)
        .single();

      if (!goal || !goal.target_value) return;

      const progressPercent = Math.min(
        (newCurrentValue / goal.target_value) * 100,
        100
      );
      const newStatus = progressPercent >= 100 ? "completed" : "active";

      const { error } = await supabase
        .from("goals")
        .update({
          current_value: newCurrentValue,
          progress_percentage: progressPercent,
          status: newStatus,
          completed_date:
            newStatus === "completed"
              ? new Date().toISOString().split("T")[0]
              : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", goalId);

      if (error) throw error;

      // Clear progress update input
      setProgressUpdates((prev) => {
        const newPrev = { ...prev };
        delete newPrev[goalId];
        return newPrev;
      });

      await loadGoals();
    } catch (error) {
      console.error("Error updating goal progress:", error);
      addToast({ title: "Failed to update progress. Please try again.", variant: "destructive" });
    }
  };

  // Edit goal
  const editGoal = async (
    goalId: string,
    updates: {
      target_value?: number;
      target_date?: string;
      title?: string;
      priority?: string;
    }
  ) => {
    try {
      let data: any = { ...updates, updated_at: new Date().toISOString() };

      // Recalculate progress if target_value changes
      if (updates.target_value) {
        const { data: goal } = await supabase
          .from("goals")
          .select("current_value")
          .eq("id", goalId)
          .single();

        if (goal && goal.current_value) {
          data.progress_percentage = Math.min(
            (goal.current_value / updates.target_value) * 100,
            100
          );
          if (data.progress_percentage >= 100) {
            data.status = "completed";
            data.completed_date = new Date().toISOString().split("T")[0];
          }
        }
      }

      const { error } = await supabase
        .from("goals")
        .update(data)
        .eq("id", goalId)
        .eq("client_id", user?.id);

      if (error) throw error;

      await loadGoals();
      return true;
    } catch (error) {
      console.error("Error editing goal:", error);
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([loadGoals(), loadPresetGoals()]).then(() =>
        setLoading(false)
      );
    }
  }, [user, loadGoals, loadPresetGoals]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const goalData = {
        client_id: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        pillar: formData.pillar,
        type: formData.type,
        target_value: formData.target_value
          ? parseFloat(formData.target_value)
          : null,
        target_unit: formData.target_unit,
        target_date: formData.target_date || null,
        priority: formData.priority,
        status: "active" as const,
        current_value: 0,
      };

      const { error } = await supabase.from("goals").insert(goalData);

      if (error) throw error;

      await loadGoals();
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating goal:", error);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;

    try {
      const goalData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        target_value: formData.target_value
          ? parseFloat(formData.target_value)
          : null,
        target_unit: formData.target_unit,
        target_date: formData.target_date || null,
        priority: formData.priority,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("goals")
        .update(goalData)
        .eq("id", editingGoal.id);

      if (error) throw error;

      await loadGoals();
      resetForm();
      setEditingGoal(null);
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase.from("goals").delete().eq("id", goalId);

      if (error) throw error;

      await loadGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "other",
      type: "target",
      target_value: "",
      target_unit: "",
      target_date: "",
      priority: "medium",
      pillar: "training",
    });
  };

  const startEditing = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || "",
      category: goal.category,
      type: goal.type,
      target_value: goal.target_value?.toString() || "",
      target_unit: goal.target_unit || "",
      target_date: goal.target_date ? goal.target_date.split("T")[0] : "",
      priority: goal.priority,
      pillar: goal.pillar ?? "general",
    });
    setShowCreateForm(true);
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = goalCategories.find((c) => c.id === categoryId);
    return category?.icon || Target;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = goalCategories.find((c) => c.id === categoryId);
    return category?.color || "fc-text-dim";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "fc-text-dim bg-[color:var(--fc-glass-highlight)] border-[color:var(--fc-glass-border)]";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "in_progress":
        return "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800";
      case "completed":
        return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800";
      case "paused":
        return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "cancelled":
        return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800";
      default:
        return "fc-text-dim bg-[color:var(--fc-glass-highlight)] border-[color:var(--fc-glass-border)]";
    }
  };

  const getStatusDisplayText = (status: string) => {
    if (status === "in_progress") return "Active";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getGoalIcon = (goal: Goal) => {
    const CategoryIcon = getCategoryIcon(goal.category);
    const status = goal.status;
    const progress = goal.progress_percentage || 0;

    if (status === "completed") {
      return <Trophy className="w-6 h-6 text-yellow-600" />;
    } else if (progress >= 80) {
      return <Crown className="w-6 h-6 text-purple-600" />;
    } else if (progress >= 50) {
      return <Award className="w-6 h-6 text-blue-600" />;
    } else if (status === "paused") {
      return <PauseCircle className="w-6 h-6 text-yellow-500" />;
    } else if (status === "cancelled") {
      return <XCircle className="w-6 h-6 fc-text-error" />;
    } else {
      return (
        <CategoryIcon
          className={`w-6 h-6 ${getCategoryColor(goal.category)}`}
        />
      );
    }
  };

  const getGoalGradient = (goal: Goal) => {
    const status = goal.status;
    const progress = goal.progress_percentage || 0;

    if (status === "completed") {
      return "from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20";
    } else if (progress >= 80) {
      return "from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20";
    } else if (progress >= 50) {
      return "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20";
    } else if (status === "paused") {
      return "from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20";
    } else if (status === "cancelled") {
      return "from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20";
    } else {
      return "from-[color:var(--fc-glass-highlight)] to-[color:var(--fc-surface)] dark:from-[color:var(--fc-glass-highlight)] dark:to-[color:var(--fc-surface)]";
    }
  };

  const getMotivationalMessage = () => {
    const activeGoals = goals.filter((g) => g.status === "active").length;
    const completedGoals = goals.filter((g) => g.status === "completed").length;
    const avgProgress =
      goals.length > 0
        ? Math.round(
            goals.reduce(
              (acc, goal) => acc + (goal.progress_percentage || 0),
              0
            ) / goals.length
          )
        : 0;

    if (completedGoals > 0) {
      return "You're crushing your goals! 🎉";
    } else if (avgProgress >= 80) {
      return "You're so close to victory! 💪";
    } else if (avgProgress >= 50) {
      return "Great progress! Keep pushing forward! 🚀";
    } else if (activeGoals > 0) {
      return "Every step counts towards your dreams! ✨";
    } else {
      return "Ready to set some amazing goals? 🌟";
    }
  };

  const getDaysUntilDeadline = (targetDate: string) => {
    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // List of preset goal titles that are auto-tracked
  const PRESET_GOAL_TITLES = [
    "Increase Bench Press",
    "Bench Press",
    "Increase Squat",
    "Squat",
    "Increase Deadlift",
    "Deadlift",
    "Increase Hip Thrust",
    "Hip Thrust",
    "Fat Loss",
    "Weight Loss",
    "Muscle Gain",
    "Body Recomposition",
    "Workout Consistency",
    "Nutrition Tracking",
    "Water Intake Goal",
  ];

  // Check if a goal is a preset (auto-tracked) goal
  const isPresetGoal = (goal: Goal): boolean => {
    return PRESET_GOAL_TITLES.some(
      (presetTitle) =>
        goal.title.toLowerCase().includes(presetTitle.toLowerCase()) ||
        presetTitle.toLowerCase().includes(goal.title.toLowerCase())
    );
  };

  // Split goals into preset and custom
  const presetGoalItems = goals.filter((goal) => isPresetGoal(goal));
  const customGoalItems = goals.filter((goal) => !isPresetGoal(goal));

  const filteredAndSortedGoals = (goalList: Goal[]) => {
    let filtered = goalList;

    // Apply status filter (category filter removed — grouping is by pillar now)
    if (filterStatus !== "all") {
      filtered = filtered.filter((goal) => {
        // Treat "in_progress" as "active" for filtering
        const normalizedStatus =
          goal.status === "in_progress" ? "active" : goal.status;
        return normalizedStatus === filterStatus;
      });
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        return filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "oldest":
        return filtered.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "priority":
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return filtered.sort(
          (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
        );
      case "progress":
        return filtered.sort(
          (a, b) => (b.progress_percentage || 0) - (a.progress_percentage || 0)
        );
      default:
        return filtered;
    }
  };

  const getGoalStats = () => {
    const total = goals.length;
    const active = goals.filter(
      (g) => g.status === "active" || g.status === "in_progress"
    ).length;
    const completed = goals.filter((g) => g.status === "completed").length;
    const avgProgress =
      total > 0
        ? Math.round(
            goals.reduce(
              (acc, goal) => acc + (goal.progress_percentage || 0),
              0
            ) / total
          )
        : 0;

    return { total, active, completed, avgProgress };
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="min-h-screen bg-gradient-to-br from-[color:var(--fc-bg-page)] to-[color:var(--fc-surface)] dark:from-[color:var(--fc-bg-page)] dark:to-[color:var(--fc-surface)]">
          <div className="p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header Skeleton */}
              <div className="text-center space-y-4 py-8">
                <div className="animate-pulse">
                  <div className="h-12 bg-[color:var(--fc-glass-highlight)] rounded-2xl w-64 mx-auto mb-4"></div>
                  <div className="h-6 bg-[color:var(--fc-glass-highlight)] rounded-lg w-96 mx-auto mb-6"></div>
                </div>
              </div>

              {/* Stats Cards Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="fc-surface rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                        <div>
                          <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded-lg mb-2"></div>
                          <div className="h-4 bg-[color:var(--fc-glass-highlight)] rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filter Skeleton */}
              <div className="animate-pulse">
                <div className="fc-surface rounded-2xl p-4 shadow-lg">
                  <div className="flex gap-4">
                    <div className="h-10 bg-[color:var(--fc-glass-highlight)] rounded-lg w-32"></div>
                    <div className="h-10 bg-[color:var(--fc-glass-highlight)] rounded-lg w-32"></div>
                  </div>
                </div>
              </div>

              {/* Goal Cards Skeleton */}
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="fc-surface rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[color:var(--fc-glass-highlight)] rounded-xl"></div>
                          <div>
                            <div className="h-6 bg-[color:var(--fc-glass-highlight)] rounded-lg w-48 mb-2"></div>
                            <div className="h-4 bg-[color:var(--fc-glass-highlight)] rounded w-32"></div>
                          </div>
                        </div>
                        <div className="w-16 h-16 bg-[color:var(--fc-glass-highlight)] rounded-full"></div>
                      </div>
                      <div className="h-4 bg-[color:var(--fc-glass-highlight)] rounded w-full mb-2"></div>
                      <div className="h-4 bg-[color:var(--fc-glass-highlight)] rounded w-2/3"></div>
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

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="min-h-screen bg-gradient-to-br from-[color:var(--fc-bg-page)] to-[color:var(--fc-surface)] dark:from-[color:var(--fc-bg-page)] dark:to-[color:var(--fc-surface)] flex items-center justify-center p-4">
          <GlassCard elevation={2} className="fc-glass fc-card p-8 text-center max-w-md">
            <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
            <Button type="button" onClick={() => { setLoadError(null); setLoading(true); loadGoals(); }} className="fc-btn fc-btn-primary">
              Retry
            </Button>
          </GlassCard>
        </div>
      </ProtectedRoute>
    );
  }

  const stats = getGoalStats();
  const goalStatsFromService = getGoalStatsFromService(goals);
  const completedGoalsList = goals.filter((g) => g.status === "completed");
  const activeGoalsList = goals.filter((g) => g.status === "active" || g.status === "in_progress");

  const getActiveGoalsForPillar = (pillar: Goal["pillar"]) => {
    let list = activeGoalsList.filter((g) => (g.pillar ?? "general") === pillar);
    return filteredAndSortedGoals(list);
  };
  const getPillarStats = (pillar: Goal["pillar"]) =>
    goalStatsFromService.byPillar.find((p) => p.pillar === pillar);

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen fc-page min-w-0 overflow-x-hidden px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col min-w-0" style={{ gap: "var(--fc-gap-sections)" }}>
            {/* Header */}
            <header className="flex justify-between items-end flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-12 h-0.5 bg-[color:var(--fc-status-error)]" aria-hidden />
                  <span className="fc-micro fc-text-error font-mono">GOAL CENTER</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight fc-text-primary">
                  My Goals
                </h1>
              </div>
            </header>

            {/* Overall stats */}
            <GlassCard elevation={2} className="fc-glass fc-card rounded-2xl p-6">
              <p className="fc-text-subtle text-sm mb-2">
                Overall: {goalStatsFromService.active} active goals · {goalStatsFromService.overallAdherence}% adherence
              </p>
              <div className="w-full h-2 rounded-full overflow-hidden bg-[color:var(--fc-glass-border)]">
                <div
                  className="h-full rounded-full bg-[color:var(--fc-accent-cyan)] transition-all"
                  style={{ width: `${goalStatsFromService.overallAdherence}%` }}
                />
              </div>
            </GlassCard>

            {/* Status and Sort (no category tabs) */}
            <GlassCard elevation={1} className="fc-glass fc-card p-4 rounded-xl">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="min-w-0">
                  <label className="fc-micro fc-text-subtle mb-2 block">Status</label>
                  <Select value={filterStatus} onValueChange={(v: typeof filterStatus) => setFilterStatus(v)}>
                    <SelectTrigger className="fc-glass-soft border border-[color:var(--fc-glass-border)] w-full sm:w-36">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <label className="fc-micro fc-text-subtle mb-2 block">Sort</label>
                  <Select value={sortBy} onValueChange={(v: typeof sortBy) => setSortBy(v)}>
                    <SelectTrigger className="fc-glass-soft border border-[color:var(--fc-glass-border)] w-full sm:w-36">
                      <SortAsc className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="progress">Progress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </GlassCard>

            {/* Pillar sections */}
            {PILLAR_SECTIONS.map(({ id: pillarId, label, emoji }) => {
              const pillarGoalsList = getActiveGoalsForPillar(pillarId);
              const pillarStat = getPillarStats(pillarId);
              const count = pillarStat?.count ?? 0;
              const adherence = pillarStat?.adherence ?? 0;
              return (
                <section key={pillarId}>
                  <GlassCard elevation={2} className="fc-glass fc-card rounded-2xl p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h2 className="text-lg font-bold fc-text-primary">
                        {emoji} {label}
                        {count > 0 && (
                          <span className="fc-text-dim font-normal ml-2">
                            {count} goal{count !== 1 ? "s" : ""} · {adherence}%
                          </span>
                        )}
                      </h2>
                    </div>
                    {pillarGoalsList.length === 0 ? (
                      <div className="py-4 text-center">
                        <p className="fc-text-dim text-sm mb-3">No goals yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddGoalModalPillar(pillarId)}
                          className="fc-btn fc-btn-secondary"
                        >
                          + Add {label} Goal
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4" style={{ gap: "var(--fc-gap-cards)" }}>
                          {pillarGoalsList.map((goal) => (
                            <GoalCard
                              key={goal.id}
                              goal={goal as Goal}
                              isAutoTracked={isPresetGoal(goal)}
                              onDelete={handleDeleteGoal}
                              onUpdate={updateGoalProgress}
                              onEdit={startEditing}
                            />
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddGoalModalPillar(pillarId)}
                          className="fc-btn fc-btn-secondary"
                        >
                          + Add {label} Goal
                        </Button>
                      </>
                    )}
                  </GlassCard>
                </section>
              );
            })}

            {/* Add goal from pillar section (modal) */}
            {addGoalModalPillar && (
              <AddGoalModal
                open={true}
                onClose={() => setAddGoalModalPillar(null)}
                pillar={addGoalModalPillar}
                onSuccess={() => {
                  loadGoals();
                  setAddGoalModalPillar(null);
                }}
              />
            )}

            {/* Completed goals: collapsible */}
            <section className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => setCompletedSectionOpen((o) => !o)}
                className="w-full flex items-center justify-between p-6 hover:bg-[color:var(--fc-glass-soft)] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg fc-glass-soft border border-[color:var(--fc-glass-border)] flex items-center justify-center">
                    <Archive className="w-5 h-5 fc-text-subtle" />
                  </div>
                  <div>
                    <h3 className="font-bold fc-text-primary">Completed goals</h3>
                    <p className="text-xs fc-text-subtle uppercase font-mono">{completedGoalsList.length} completed</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 fc-text-subtle transition-transform duration-300 ${completedSectionOpen ? "rotate-180" : ""}`} />
              </button>
              <div className={completedSectionOpen ? "block" : "hidden"}>
                <div className="px-6 pb-6 pt-0 space-y-4">
                  {completedGoalsList.length === 0 ? (
                    <p className="text-sm fc-text-dim py-4">No completed goals yet.</p>
                  ) : (
                    filteredAndSortedGoals(completedGoalsList).map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal as Goal}
                        isAutoTracked={isPresetGoal(goal)}
                        compact
                      />
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Floating action button (mockup): add new goal */}
            <div className="fixed bottom-8 right-8 z-40">
              <button
                type="button"
                onClick={() => setShowPresetSelection(true)}
                className="fc-fab group"
                aria-label="Add new goal"
              >
                <Plus className="w-8 h-8 text-white" />
                <span className="absolute right-full mr-3 fc-glass border border-[color:var(--fc-glass-border)] px-4 py-2 rounded-xl text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg fc-text-primary">
                  Add goal
                </span>
              </button>
            </div>

              {/* Custom Goal Form Modal */}
              <CustomGoalForm
                isOpen={showCustomGoalForm}
                onClose={() => setShowCustomGoalForm(false)}
                onSubmit={async (goalData) => {
                  if (!user) return;
                  try {
                    const { pillar: _pillar, ...restGoal } = goalData;
                    const { error } = await supabase.from("goals").insert({
                      ...restGoal,
                      client_id: user.id,
                      pillar: _pillar ?? "general",
                      start_date: new Date().toISOString().split("T")[0],
                    });
                    if (error) throw error;
                    await loadGoals();
                  } catch (error) {
                    console.error("Error creating custom goal:", error);
                    throw error;
                  }
                }}
              />

              {/* Preset Goal Selection Modal */}
              {showPresetSelection && !selectedPreset && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <GlassCard
                    elevation={2}
                    className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8"
                  >
                    <h2
                      className="text-2xl md:text-3xl font-bold text-center mb-2"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Select Your Goal
                    </h2>
                    <p
                      className="text-center mb-4"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(0,0,0,0.7)",
                      }}
                    >
                      Choose what you want to achieve
                    </p>
                    <div className="flex justify-center mb-6">
                      <div className="space-y-2 w-full max-w-xs">
                        <Label className="text-sm font-medium fc-text-subtle">Pillar</Label>
                        <Select
                          value={addGoalPillar}
                          onValueChange={(v) => setAddGoalPillar(v as Goal["pillar"])}
                        >
                          <SelectTrigger className="rounded-xl border-[color:var(--fc-glass-border)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="nutrition">Nutrition</SelectItem>
                            <SelectItem value="checkins">Check-ins (Body Metrics)</SelectItem>
                            <SelectItem value="lifestyle">Lifestyle (Sleep, Wellness)</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Group goals by category */}
                    {[
                      "Body Composition",
                      "Strength & Performance",
                      "Consistency & Adherence",
                    ].map((category) => {
                      const goalsInCategory = PRESET_GOALS.filter(
                        (g) => g.subcategory === category
                      );

                      return (
                        <div key={category} className="mb-10">
                          <h3
                            className="text-lg md:text-xl font-bold mb-4"
                            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                          >
                            {category}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {goalsInCategory.map((preset) => (
                              <button
                                key={preset.id}
                                onClick={() => {
                                  setSelectedPreset(preset.id);
                                  setCustomizing(true);
                                }}
                                className="flex flex-col items-center p-4 rounded-lg border-2 border-transparent hover:border-purple-500 transition-all"
                                style={{
                                  background: isDark
                                    ? "rgba(255,255,255,0.05)"
                                    : "rgba(0,0,0,0.02)",
                                  cursor: "pointer",
                                }}
                              >
                                <span className="text-4xl mb-2">
                                  {preset.emoji}
                                </span>
                                <span
                                  className="font-bold text-center text-sm"
                                  style={{
                                    color: isDark ? "#fff" : "#1A1A1A",
                                  }}
                                >
                                  {preset.title}
                                </span>
                                <span
                                  className="text-xs text-center mt-1"
                                  style={{
                                    color: isDark
                                      ? "rgba(255,255,255,0.6)"
                                      : "rgba(0,0,0,0.6)",
                                  }}
                                >
                                  {preset.description}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <Button
                      onClick={() => {
                        setShowPresetSelection(false);
                        setSelectedPreset(null);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </GlassCard>
                </div>
              )}

              {/* Customization Modal */}
              {customizing && selectedPreset && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <GlassCard
                    elevation={2}
                    className="w-full max-w-md max-h-[90vh] overflow-y-auto p-6 md:p-8"
                  >
                    {(() => {
                      const preset = PRESET_GOALS.find(
                        (p) => p.id === selectedPreset
                      );
                      if (!preset) return null;

                      return (
                        <>
                          <div className="text-center mb-8">
                            <span className="text-5xl block mb-2">
                              {preset.emoji}
                            </span>
                            <h2
                              className="text-2xl font-bold"
                              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                            >
                              {preset.title}
                            </h2>
                          </div>

                          <form
                            onSubmit={(e) => handleCreateCustomGoal(e, preset)}
                          >
                            {/* Target Value Input with Smart Units */}
                            <div className="mb-6">
                              <Label
                                className="block text-sm font-medium mb-2"
                                style={{
                                  color: isDark ? "#fff" : "#1A1A1A",
                                }}
                              >
                                What&apos;s your target?
                              </Label>
                              <div className="flex gap-2">
                                {preset.category === "consistency" ? (
                                  // Consistency goals (workouts per week, days, liters)
                                  <>
                                    <Input
                                      type="number"
                                      placeholder="Enter number"
                                      value={customForm.targetValue}
                                      onChange={(e) =>
                                        setCustomForm({
                                          ...customForm,
                                          targetValue: e.target.value,
                                        })
                                      }
                                      className="flex-1 rounded-xl border-[color:var(--fc-glass-border)]"
                                      required
                                    />
                                    <Select
                                      value={customForm.targetUnit}
                                      onValueChange={(value) =>
                                        setCustomForm({
                                          ...customForm,
                                          targetUnit: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-32 rounded-xl border-[color:var(--fc-glass-border)]">
                                        <SelectValue
                                          placeholder={preset.suggestedUnit}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {preset.id === "workout-consistency" ? (
                                          <>
                                            <SelectItem value="per week">
                                              per week
                                            </SelectItem>
                                            <SelectItem value="per month">
                                              per month
                                            </SelectItem>
                                          </>
                                        ) : preset.id ===
                                          "nutrition-tracking" ? (
                                          <>
                                            <SelectItem value="days/week">
                                              days per week
                                            </SelectItem>
                                            <SelectItem value="days/month">
                                              days per month
                                            </SelectItem>
                                          </>
                                        ) : preset.id === "water-intake" ? (
                                          <>
                                            <SelectItem value="liters">
                                              liters
                                            </SelectItem>
                                            <SelectItem value="glasses">
                                              glasses
                                            </SelectItem>
                                            <SelectItem value="ml">
                                              ml
                                            </SelectItem>
                                          </>
                                        ) : null}
                                      </SelectContent>
                                    </Select>
                                  </>
                                ) : preset.id === "body-recomp" ? (
                                  <>
                                    <Input
                                      type="number"
                                      placeholder="Muscle (kg)"
                                      value={
                                        customForm.targetValue.split("/")[0] ||
                                        ""
                                      }
                                      onChange={(e) => {
                                        const muscle = e.target.value;
                                        const fat =
                                          customForm.targetValue.split(
                                            "/"
                                          )[1] || "0";
                                        setCustomForm({
                                          ...customForm,
                                          targetValue: `${muscle}/${fat}`,
                                        });
                                      }}
                                      className="flex-1 rounded-xl border-[color:var(--fc-glass-border)]"
                                    />
                                    <span
                                      className="flex items-center"
                                      style={{
                                        color: isDark
                                          ? "rgba(255,255,255,0.6)"
                                          : "rgba(0,0,0,0.6)",
                                      }}
                                    >
                                      /
                                    </span>
                                    <Input
                                      type="number"
                                      placeholder="Fat (%)"
                                      value={
                                        customForm.targetValue.split("/")[1] ||
                                        ""
                                      }
                                      onChange={(e) => {
                                        const muscle =
                                          customForm.targetValue.split(
                                            "/"
                                          )[0] || "0";
                                        const fat = e.target.value;
                                        setCustomForm({
                                          ...customForm,
                                          targetValue: `${muscle}/${fat}`,
                                        });
                                      }}
                                      className="flex-1 rounded-xl border-[color:var(--fc-glass-border)]"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Input
                                      type="number"
                                      placeholder="Enter number"
                                      value={customForm.targetValue}
                                      onChange={(e) =>
                                        setCustomForm({
                                          ...customForm,
                                          targetValue: e.target.value,
                                        })
                                      }
                                      className="flex-1 rounded-xl border-[color:var(--fc-glass-border)]"
                                      required
                                    />
                                    <Select
                                      value={customForm.targetUnit}
                                      onValueChange={(value) =>
                                        setCustomForm({
                                          ...customForm,
                                          targetUnit: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-32 rounded-xl border-[color:var(--fc-glass-border)]">
                                        <SelectValue
                                          placeholder={preset.suggestedUnit}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {preset.id === "fat-loss" ||
                                        preset.id === "body-recomp" ? (
                                          <>
                                            <SelectItem value="%">%</SelectItem>
                                            <SelectItem value="kg">
                                              kg
                                            </SelectItem>
                                          </>
                                        ) : (
                                          <>
                                            <SelectItem value="kg">
                                              kg
                                            </SelectItem>
                                            <SelectItem value="lbs">
                                              lbs
                                            </SelectItem>
                                            <SelectItem value="reps">
                                              reps
                                            </SelectItem>
                                          </>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </>
                                )}
                              </div>
                              <p
                                className="text-xs mt-1"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.5)"
                                    : "rgba(0,0,0,0.5)",
                                }}
                              >
                                Suggested: {preset.suggestedUnit}
                              </p>
                            </div>

                            {/* Target Date Input */}
                            <div className="mb-6">
                              <Label
                                className="block text-sm font-medium mb-2"
                                style={{
                                  color: isDark ? "#fff" : "#1A1A1A",
                                }}
                              >
                                When do you want to reach it?{" "}
                                <span
                                  className="text-xs font-normal"
                                  style={{
                                    color: isDark
                                      ? "rgba(255,255,255,0.5)"
                                      : "rgba(0,0,0,0.5)",
                                  }}
                                >
                                  (Optional)
                                </span>
                              </Label>
                              <Input
                                type="date"
                                value={customForm.targetDate}
                                onChange={(e) =>
                                  setCustomForm({
                                    ...customForm,
                                    targetDate: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl border-[color:var(--fc-glass-border)]"
                              />
                            </div>

                            {/* Priority Selection */}
                            <div className="mb-8">
                              <Label
                                className="block text-sm font-medium mb-3"
                                style={{
                                  color: isDark ? "#fff" : "#1A1A1A",
                                }}
                              >
                                Priority (optional)
                              </Label>
                              <div className="flex gap-4">
                                {["low", "medium", "high"].map((level) => (
                                  <label
                                    key={level}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <input
                                      type="radio"
                                      name="priority"
                                      value={level}
                                      checked={customForm.priority === level}
                                      onChange={(e) =>
                                        setCustomForm({
                                          ...customForm,
                                          priority: e.target.value,
                                        })
                                      }
                                      className="w-4 h-4"
                                    />
                                    <span
                                      className="text-sm capitalize"
                                      style={{
                                        color: isDark ? "#fff" : "#1A1A1A",
                                      }}
                                    >
                                      {level}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                className="flex-1"
                                style={{
                                  background:
                                    getSemanticColor("success").gradient,
                                }}
                              >
                                Create Goal
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setCustomizing(false);
                                  setSelectedPreset(null);
                                  setCustomForm({
                                    targetValue: "",
                                    targetUnit: "",
                                    targetDate: "",
                                    priority: "high",
                                  });
                                }}
                                className="flex-1"
                              >
                                Back
                              </Button>
                            </div>
                          </form>
                        </>
                      );
                    })()}
                  </GlassCard>
                </div>
              )}

              {/* Create/Edit Goal Form Modal */}
              {showCreateForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <Card className="fc-surface rounded-2xl shadow-2xl border-0 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <CardHeader className="border-b border-[color:var(--fc-glass-border)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-bold fc-text-primary">
                            {editingGoal ? "Edit Goal" : "Create New Goal"}
                          </CardTitle>
                          <CardDescription className="fc-text-dim">
                            {editingGoal
                              ? "Update your goal details"
                              : "Set a new goal to track your progress"}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowCreateForm(false);
                            setEditingGoal(null);
                            resetForm();
                          }}
                          className="fc-text-dim hover:fc-text-primary"
                        >
                          <XCircle className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <form
                        onSubmit={
                          editingGoal ? handleUpdateGoal : handleCreateGoal
                        }
                        className="space-y-6"
                      >
                        {!editingGoal && (
                          <div className="space-y-2">
                            <Label
                              htmlFor="pillar"
                              className="text-sm font-medium fc-text-primary"
                            >
                              Pillar
                            </Label>
                            <Select
                              value={formData.pillar}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  pillar: value as Goal["pillar"],
                                })
                              }
                            >
                              <SelectTrigger className="rounded-xl border-[color:var(--fc-glass-border)]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="training">Training</SelectItem>
                                <SelectItem value="nutrition">Nutrition</SelectItem>
                                <SelectItem value="checkins">Check-ins (Body Metrics)</SelectItem>
                                <SelectItem value="lifestyle">Lifestyle (Sleep, Wellness)</SelectItem>
                                <SelectItem value="general">General</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="title"
                              className="text-sm font-medium fc-text-primary"
                            >
                              Goal Title
                            </Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  title: e.target.value,
                                })
                              }
                              placeholder="e.g., Complete 30 workouts this month"
                              className="rounded-xl border-[color:var(--fc-glass-border)]"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="category"
                              className="text-sm font-medium fc-text-primary"
                            >
                              Category
                            </Label>
                            <Select
                              value={formData.category}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  category: value as Goal["category"],
                                })
                              }
                            >
                              <SelectTrigger className="rounded-xl border-[color:var(--fc-glass-border)]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {goalCategories.map((category) => (
                                  <SelectItem
                                    key={category.id}
                                    value={category.id}
                                  >
                                    <div className="flex items-center gap-2">
                                      <category.icon
                                        className={`w-4 h-4 ${category.color}`}
                                      />
                                      {category.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="description"
                            className="text-sm font-medium fc-text-primary"
                          >
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                description: e.target.value,
                              })
                            }
                            placeholder="Describe your goal and why it's important to you..."
                            rows={3}
                            className="rounded-xl border-[color:var(--fc-glass-border)]"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="type"
                              className="text-sm font-medium fc-text-primary"
                            >
                              Goal Type
                            </Label>
                            <Select
                              value={formData.type}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  type: value as Goal["type"],
                                })
                              }
                            >
                              <SelectTrigger className="rounded-xl border-[color:var(--fc-glass-border)]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="target">
                                  Target Value
                                </SelectItem>
                                <SelectItem value="habit">Habit</SelectItem>
                                <SelectItem value="milestone">
                                  Milestone
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {formData.type === "target" && (
                            <>
                              <div className="space-y-2">
                                <Label
                                  htmlFor="target_value"
                                  className="text-sm font-medium fc-text-primary"
                                >
                                  Target Value
                                </Label>
                                <Input
                                  id="target_value"
                                  type="number"
                                  value={formData.target_value}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      target_value: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., 30"
                                  className="rounded-xl border-[color:var(--fc-glass-border)]"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label
                                  htmlFor="target_unit"
                                  className="text-sm font-medium fc-text-primary"
                                >
                                  Unit
                                </Label>
                                <Input
                                  id="target_unit"
                                  value={formData.target_unit}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      target_unit: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., workouts, kg, days"
                                  className="rounded-xl border-[color:var(--fc-glass-border)]"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="target_date"
                              className="text-sm font-medium fc-text-primary"
                            >
                              Target Date (Optional)
                            </Label>
                            <Input
                              id="target_date"
                              type="date"
                              value={formData.target_date}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  target_date: e.target.value,
                                })
                              }
                              className="rounded-xl border-[color:var(--fc-glass-border)]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="priority"
                              className="text-sm font-medium fc-text-primary"
                            >
                              Priority
                            </Label>
                            <Select
                              value={formData.priority}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  priority: value as Goal["priority"],
                                })
                              }
                            >
                              <SelectTrigger className="rounded-xl border-[color:var(--fc-glass-border)]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Rocket className="w-4 h-4 mr-2" />
                            {editingGoal ? "Update Goal" : "Create Goal"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCreateForm(false);
                              setEditingGoal(null);
                              resetForm();
                            }}
                            className="px-6 py-3 border-[color:var(--fc-glass-border)] fc-text-primary rounded-xl font-semibold hover:bg-[color:var(--fc-glass-highlight)] transition-all duration-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
