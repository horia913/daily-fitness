"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { GoalCard } from "@/components/goals/GoalCard";
import { CustomGoalForm } from "@/components/goals/CustomGoalForm";

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
  const { user } = useAuth();
  const { performanceSettings, isDark, getSemanticColor } = useTheme();
  const [loading, setLoading] = useState(true);
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
  });

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

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate progress for each goal
      const goalsWithProgress = (data || []).map((goal) => {
        let progressPercentage = 0;

        if (goal.target_value && goal.current_value) {
          progressPercentage = Math.min(
            (goal.current_value / goal.target_value) * 100,
            100
          );
        } else if (goal.type === "habit") {
          // For habit goals, calculate based on completion rate
          progressPercentage = Math.random() * 100; // Placeholder - would need actual habit tracking
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
    } catch (error) {
      console.error("Error loading goals:", error);
      // Set fallback data
      setGoals([
        {
          id: "1",
          client_id: user.id,
          title: "Complete 30 workouts this month",
          description: "Maintain consistent workout schedule",
          category: "performance",
          type: "target",
          target_value: 30,
          target_unit: "workouts",
          current_value: 12,
          start_date: new Date().toISOString(),
          target_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "active",
          priority: "high",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          progress_percentage: 40,
        },
        {
          id: "2",
          client_id: user.id,
          title: "Lose 5kg",
          description: "Reach target weight for summer",
          category: "weight_loss",
          type: "target",
          target_value: 5,
          target_unit: "kg",
          current_value: 2,
          start_date: new Date().toISOString(),
          target_date: new Date(
            Date.now() + 60 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "active",
          priority: "medium",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          progress_percentage: 40,
        },
        {
          id: "3",
          client_id: user.id,
          title: "Drink 2L water daily",
          description: "Stay hydrated throughout the day",
          category: "performance",
          type: "habit",
          start_date: new Date().toISOString(),
          status: "active",
          priority: "low",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          progress_percentage: 75,
        },
      ]);
    } finally {
      setLoading(false);
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
        console.log('No goal templates in DB, using hardcoded fallback');
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
      alert("Please enter a target value");
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
      alert("Goal created successfully!");
    } catch (error) {
      console.error("Error creating goal from preset:", error);
      alert("Failed to create goal. Please try again.");
    }
  };

  // Create custom goal from preset (new simplified handler)
  const handleCreateCustomGoal = async (
    e: React.FormEvent,
    preset: PresetGoal
  ) => {
    e.preventDefault();

    if (!user || !customForm.targetValue) {
      alert("Please enter a target value");
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
          alert("Please enter a valid number");
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

      console.log(
        "Creating goal with category:",
        validCategory,
        "from preset category:",
        preset.category
      );
      console.log("Status being sent:", insertData.status);
      console.log("Insert data:", insertData);

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
      alert("Goal created successfully!");
    } catch (error: any) {
      console.error("Error creating goal:", error);
      const errorMessage =
        error?.message ||
        "Failed to create goal. Please check the console for details.";
      alert(`Failed to create goal: ${errorMessage}`);
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
      alert("Failed to update progress. Please try again.");
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
    });
    setShowCreateForm(true);
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = goalCategories.find((c) => c.id === categoryId);
    return category?.icon || Target;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = goalCategories.find((c) => c.id === categoryId);
    return category?.color || "text-slate-600";
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
        return "text-slate-600 bg-slate-50 border-slate-200";
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
        return "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-800";
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
      return <XCircle className="w-6 h-6 text-red-500" />;
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
      return "from-slate-50 to-gray-50 dark:from-slate-800/20 dark:to-gray-800/20";
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

    // Apply category filter
    if (activeTab !== "all") {
      filtered = filtered.filter((goal) => goal.category === activeTab);
    }

    // Apply status filter
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
          <div className="p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header Skeleton */}
              <div className="text-center space-y-4 py-8">
                <div className="animate-pulse">
                  <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl w-64 mx-auto mb-4"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-96 mx-auto mb-6"></div>
                </div>
              </div>

              {/* Stats Cards Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                        <div>
                          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"></div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filter Skeleton */}
              <div className="animate-pulse">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex gap-4">
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32"></div>
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32"></div>
                  </div>
                </div>
              </div>

              {/* Goal Cards Skeleton */}
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                          <div>
                            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 mb-2"></div>
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                          </div>
                        </div>
                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
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

  const stats = getGoalStats();

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-24 md:pb-8">
          <div className="p-4 pb-8">
            <div className="max-w-6xl mx-auto space-y-6">
              <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                        Goal Center
                      </span>
                      <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)]">
                        My Goals
                      </h1>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        {getMotivationalMessage()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowPresetSelection(true)}
                    className="fc-btn fc-btn-primary"
                  >
                    <Target className="w-5 h-5 mr-2" />
                    Select a Goal
                  </Button>
                </div>
              </GlassCard>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Total Goals</p>
                      <p className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                        {stats.total}
                      </p>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Active Goals</p>
                      <p className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                        {stats.active}
                      </p>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Completed</p>
                      <p className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                        {stats.completed}
                      </p>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Avg Progress</p>
                      <p className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                        {stats.avgProgress}%
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              <GlassCard elevation={2} className="fc-glass fc-card p-4">
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="flex flex-col gap-4 lg:flex-row">
                    <div className="flex-1 w-full">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        Category
                      </label>
                      <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 bg-slate-100 dark:bg-slate-700">
                          <TabsTrigger value="all" className="text-xs">
                            All
                          </TabsTrigger>
                          {goalCategories.map((category) => (
                            <TabsTrigger
                              key={category.id}
                              value={category.id}
                              className="text-xs"
                            >
                              <category.icon className="w-3 h-3 mr-1" />
                              {category.name}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                      <div className="flex-1 min-w-0">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Status
                        </label>
                        <Select
                          value={filterStatus}
                          onValueChange={(
                            value:
                              | "all"
                              | "active"
                              | "completed"
                              | "paused"
                              | "cancelled"
                          ) => setFilterStatus(value)}
                        >
                          <SelectTrigger className="w-full">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Filter by Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Sort by
                        </label>
                        <Select
                          value={sortBy}
                          onValueChange={(
                            value: "newest" | "oldest" | "priority" | "progress"
                          ) => setSortBy(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SortAsc className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Sort Goals" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="priority">Priority</SelectItem>
                            <SelectItem value="progress">Progress</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* SECTION 1: PRESET GOALS (Auto-tracked) */}
              <div className="mb-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div>
                    <h2
                      className="text-2xl md:text-3xl font-bold mb-2"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Preset Goals
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Auto-updated from your activities
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowPresetSelection(true)}
                    className="w-full sm:w-auto"
                    size="lg"
                    style={{
                      background: getSemanticColor("success").gradient,
                      boxShadow: `0 4px 12px ${
                        getSemanticColor("success").primary
                      }30`,
                    }}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Preset Goal
                  </Button>
                </div>

                {filteredAndSortedGoals(presetGoalItems).length === 0 ? (
                  <GlassCard elevation={2} className="p-8 text-center">
                    <Target className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">
                      No preset goals yet
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Add a preset goal to track your fitness automatically!
                    </p>
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAndSortedGoals(presetGoalItems).map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal as Goal}
                        isAutoTracked={true}
                        onDelete={handleDeleteGoal}
                        onUpdate={updateGoalProgress}
                        onEdit={startEditing}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: CUSTOM GOALS (Manual-tracked) */}
              <div className="mb-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div>
                    <h2
                      className="text-2xl md:text-3xl font-bold mb-2"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Custom Goals
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Track anything you want (manual updates)
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCustomGoalForm(true)}
                    className="w-full sm:w-auto"
                    size="lg"
                    style={{
                      background:
                        "linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%)",
                      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Custom Goal
                  </Button>
                </div>

                {filteredAndSortedGoals(customGoalItems).length === 0 ? (
                  <GlassCard elevation={2} className="p-8 text-center">
                    <Target className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">
                      No custom goals yet
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Create a custom goal to track anything you want!
                    </p>
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAndSortedGoals(customGoalItems).map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal as Goal}
                        isAutoTracked={false}
                        onDelete={handleDeleteGoal}
                        onUpdate={updateGoalProgress}
                        onEdit={startEditing}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Goal Form Modal */}
              <CustomGoalForm
                isOpen={showCustomGoalForm}
                onClose={() => setShowCustomGoalForm(false)}
                onSubmit={async (goalData) => {
                  if (!user) return;
                  try {
                    const { error } = await supabase.from("goals").insert({
                      client_id: user.id,
                      ...goalData,
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
                      className="text-center mb-8"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(0,0,0,0.7)",
                      }}
                    >
                      Choose what you want to achieve
                    </p>

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
                                      className="flex-1 rounded-xl border-slate-200 dark:border-slate-700"
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
                                      <SelectTrigger className="w-32 rounded-xl border-slate-200 dark:border-slate-700">
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
                                      className="flex-1 rounded-xl border-slate-200 dark:border-slate-700"
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
                                      className="flex-1 rounded-xl border-slate-200 dark:border-slate-700"
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
                                      className="flex-1 rounded-xl border-slate-200 dark:border-slate-700"
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
                                      <SelectTrigger className="w-32 rounded-xl border-slate-200 dark:border-slate-700">
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
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700"
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
                  <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-0 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                            {editingGoal ? "Edit Goal" : "Create New Goal"}
                          </CardTitle>
                          <CardDescription className="text-slate-600 dark:text-slate-300">
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
                          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="title"
                              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                              className="rounded-xl border-slate-200 dark:border-slate-700"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="category"
                              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700">
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
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                            className="rounded-xl border-slate-200 dark:border-slate-700"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="type"
                              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700">
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
                                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                                  className="rounded-xl border-slate-200 dark:border-slate-700"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label
                                  htmlFor="target_unit"
                                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                                  className="rounded-xl border-slate-200 dark:border-slate-700"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="target_date"
                              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                              className="rounded-xl border-slate-200 dark:border-slate-700"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="priority"
                              className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700">
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
                            className="px-6 py-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300"
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
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
