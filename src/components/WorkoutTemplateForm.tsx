"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { LoadPercentageWeightToggle } from "@/components/ui/LoadPercentageWeightToggle";
import { useToast } from "@/components/ui/toast-provider";
import {
  X,
  Clock,
  Target,
  Plus,
  Save,
  Eye,
  Info,
  Calendar,
  Users,
  Zap,
  Edit,
  Trash2,
  Layers,
  Rocket,
  Timer,
  CloudLightning,
  TrendingDown,
  Flame,
  Link,
  PauseCircle,
  TrendingUp,
  Activity,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import WorkoutBlockBuilder from "@/components/coach/WorkoutBlockBuilder";
import {
  WorkoutBlock,
  WorkoutBlockExercise,
  WorkoutBlockType,
} from "@/types/workoutBlocks";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import VolumeCalculatorWidget from "@/components/coach/VolumeCalculatorWidget";
import {
  isGuidelineCategory,
  getAllowedBlockTypesForVolumeCalculator,
} from "@/lib/coachGuidelinesService";
import ExerciseBlockCard from "@/components/features/workouts/ExerciseBlockCard";
import ExerciseDetailForm from "@/components/features/workouts/ExerciseDetailForm";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { convertBlocksToExercises } from '@/lib/blockConversion';
import { exercisesToWorkoutBlocks } from '@/utils/exercisesToWorkoutBlocks';
import { buildExerciseFromNewExercise } from '@/utils/buildExerciseFromNewExercise';
import { BasicInfoSection } from '@/components/workout-form/BasicInfoSection';
import { ActionButtons } from '@/components/workout-form/ActionButtons';
import { EmptyExerciseState } from '@/components/workout-form/EmptyExerciseState';
import { AddExercisePanel } from '@/components/workout-form/AddExercisePanel';
import { saveWorkoutTemplate } from '@/services/saveWorkoutTemplate';

interface WorkoutTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: any;
  /** When provided, form skips loadWorkoutBlocks and uses these blocks (avoids duplicate fetch on edit page). */
  initialBlocks?: any[];
  renderMode?: "modal" | "page";
  /** Called when dirty state changes (edit page uses this for "Saved" vs "Unsaved changes" indicator). */
  onDirtyChange?: (dirty: boolean) => void;
}

const difficultyLevels = [
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
  { value: "Athlete", label: "Athlete" },
];

const durationOptions = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 75, label: "1 hour 15 min" },
  { value: 90, label: "1 hour 30 min" },
  { value: 120, label: "2 hours" },
];

export default function WorkoutTemplateForm({
  isOpen,
  onClose,
  onSuccess,
  template,
  initialBlocks,
  renderMode = "modal",
  onDirtyChange,
}: WorkoutTemplateFormProps) {
  const { isDark, getThemeStyles } = useTheme();
  const theme = getThemeStyles();
  const { user } = useAuth();
  const { addToast } = useToast();

  const lastSavedSnapshotRef = useRef<string | null>(null);
  const justLoadedRef = useRef(false);

  // Helper function to handle number input changes properly
  const handleNumberChange = (value: string, defaultValue: number = 0) => {
    if (value === "") return ""; // Allow empty string
    const parsed = parseInt(value);
    return isNaN(parsed) ? "" : parsed.toString();
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "", // Stores category name for database
    categoryId: "", // Stores category ID for Select value
    estimated_duration: 60,
    difficulty_level: "Beginner",
  });
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<any[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; color?: string }>
  >([]);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(
    null,
  );
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null,
  );
  const [newExercise, setNewExercise] = useState({
    exercise_id: "",
    exercise_type: "",
    sets: "",
    reps: "",
    rest_seconds: "",
    rir: "",
    tempo: "",
    notes: "",
    // AMRAP specific
    amrap_duration: "",
    // EMOM specific
    work_seconds: "",
    emom_duration: "",
    // Tabata specific
    rounds: "",
    rest_after: "",
    rest_after_set: "", // Block-level rest after set (applies to all sets)
    // Drop set specific
    drop_percentage: "",
    drop_set_reps: "",
    // Superset specific
    superset_exercise_id: "",
    superset_reps: "",
    superset_load_percentage: "", // Load percentage for second exercise in superset
    // Giant set specific
    giant_set_exercises: [] as Array<{
      exercise_id: string;
      sets: string;
      reps: string;
      [key: string]: any;
    }>,
    // Cluster set specific
    cluster_reps: "",
    clusters_per_set: "",
    intra_cluster_rest: "",
    // Rest-pause specific
    rest_pause_duration: "",
    max_rest_pauses: "",

    // Pre-exhaustion specific
    compound_exercise_id: "",
    isolation_reps: "",
    compound_reps: "",
    compound_load_percentage: "", // Load percentage for compound exercise in pre-exhaustion
    // For time specific
    target_reps: "",
    time_cap: "",

    rest_between_rungs: "",
    // EMOM specific
    emom_mode: "",
    emom_reps: "",
    // HR sets specific
    hr_is_intervals: false,
    hr_zone: "",
    hr_percentage_min: "",
    hr_percentage_max: "",
    hr_duration_minutes: "",
    hr_work_duration_minutes: "",
    hr_rest_duration_minutes: "",
    hr_target_rounds: "",
    hr_distance_meters: "",
    hr_set_exercises: [] as Array<Record<string, any>>,
    // Tabata specific
    tabata_sets: [] as Array<{ exercises: any[]; rest_between_sets: string }>,
    // Load percentage / Weight toggle
    load_percentage: "",
    weight_kg: "",
    superset_weight_kg: "", // Weight for second exercise in superset
    compound_weight_kg: "", // Weight for compound exercise in pre-exhaustion
  });

  // Toggle state for Load % / Weight (defaults to "load", UI-only, not persisted)
  const getInitialToggleState = (
    loadValue: any,
    weightValue: any,
  ): "load" | "weight" => {
    const hasWeight =
      weightValue !== null && weightValue !== undefined && weightValue !== "";
    const hasLoad =
      loadValue !== null && loadValue !== undefined && loadValue !== "";
    return hasWeight && !hasLoad ? "weight" : "load";
  };

  // Toggle states for exercises (keyed by exercise index in block)
  const [exerciseToggleModes, setExerciseToggleModes] = useState<
    Record<string, "load" | "weight">
  >({});

  // Helper function to render Load % / Weight field with toggle
  const renderLoadWeightField = (
    loadValue: string | number | null | undefined,
    weightValue: string | number | null | undefined,
    onLoadChange: (value: string) => void,
    onWeightChange: (value: string) => void,
    toggleKey: string, // Unique key for this exercise (e.g., "block-0-exercise-1")
    label: string = "Load % / Weight",
    loadPlaceholder: string = "e.g., 70",
    weightPlaceholder: string = "e.g., 50",
    className?: string,
  ) => {
    const currentMode =
      exerciseToggleModes[toggleKey] ||
      getInitialToggleState(loadValue, weightValue);

    const handleToggle = (mode: "load" | "weight") => {
      setExerciseToggleModes((prev) => ({ ...prev, [toggleKey]: mode }));
      // Clear the unused field when toggling
      if (mode === "load") {
        onWeightChange("");
      } else {
        onLoadChange("");
      }
    };

    return (
      <div className={`mt-1 ${className || ""}`}>
        <div className="flex items-center justify-between mb-2.5 gap-2">
          <Label className={`text-sm font-medium ${theme.text} shrink-0`}>
            {label}
          </Label>
          <LoadPercentageWeightToggle
            value={currentMode}
            onValueChange={handleToggle}
          />
        </div>
        {currentMode === "load" ? (
          <>
            <Input
              type="number"
              value={
                loadValue === "" ||
                loadValue === null ||
                loadValue === undefined
                  ? ""
                  : String(loadValue)
              }
              onChange={(e) => onLoadChange(e.target.value)}
              placeholder={loadPlaceholder}
              min="0"
              max="200"
              step="1"
              className="mt-1 rounded-xl"
            />
            <p className={`text-xs ${theme.textSecondary} mt-1`}>
              Percentage of estimated 1RM (e.g., 70 = 70% of 1RM)
            </p>
          </>
        ) : (
          <>
            <Input
              type="number"
              value={
                weightValue === "" ||
                weightValue === null ||
                weightValue === undefined
                  ? ""
                  : String(weightValue)
              }
              onChange={(e) => onWeightChange(e.target.value)}
              placeholder={weightPlaceholder}
              min="0"
              step="0.1"
              className="mt-1 rounded-xl"
            />
            <p className={`text-xs ${theme.textSecondary} mt-1`}>
              Specific weight in kilograms
            </p>
          </>
        )}
      </div>
    );
  };

  // Helper function to generate block name from exercise names
  const generateBlockName = (
    exerciseIds: string[],
    exerciseType: string,
  ): string => {
    if (exerciseIds.length === 0) {
      console.warn("generateBlockName: No exercise IDs provided");
      return "";
    }

    if (availableExercises.length === 0) {
      console.warn(
        "generateBlockName: availableExercises is empty, cannot generate block name",
      );
      return "";
    }

    // Get exercise names from availableExercises
    const exerciseNames = exerciseIds
      .map((id) => {
        const exercise = availableExercises.find((ex) => ex.id === id);
        if (!exercise) {
          console.warn(
            `generateBlockName: Exercise with ID ${id} not found in availableExercises`,
          );
        }
        return exercise?.name || "";
      })
      .filter((name) => name !== "");

    if (exerciseNames.length === 0) {
      console.warn(
        `generateBlockName: No exercise names found for IDs: ${exerciseIds.join(
          ", ",
        )}`,
      );
      return "";
    }

    // Format based on number of exercises
    if (exerciseNames.length === 1) {
      return exerciseNames[0];
    } else if (exerciseNames.length === 2) {
      return `${exerciseNames[0]} + ${exerciseNames[1]}`;
    } else {
      // For 3+ exercises, show first 2 + "N others"
      const othersCount = exerciseNames.length - 2;
      return `${exerciseNames[0]} + ${exerciseNames[1]} + ${othersCount} other${
        othersCount > 1 ? "s" : ""
      }`;
    }
  };

  // Workout Block System (integrated with exercises)
  const [workoutBlocks, setWorkoutBlocks] = useState<WorkoutBlock[]>([]);
  const [excludeFromRecommendations, setExcludeFromRecommendations] =
    useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const hasLoadedBlocks = useRef(false);
  const previousTemplateId = useRef<string | null>(null);

  // Convert exercises array to WorkoutBlock[] format for volume calculator
  const currentWorkoutBlocks = useMemo(
    () => exercisesToWorkoutBlocks(exercises, template?.id, availableExercises),
    [exercises, template?.id, availableExercises]
  );

  // Determine if volume calculator is active
  const isVolumeCalculatorActive = useMemo(() => {
    return (
      isGuidelineCategory(formData.category) && !excludeFromRecommendations
    );
  }, [formData.category, excludeFromRecommendations]);

  // Get allowed block types for volume calculator
  const allowedBlockTypes = useMemo(() => {
    if (isVolumeCalculatorActive) {
      return getAllowedBlockTypesForVolumeCalculator();
    }
    return undefined;
  }, [isVolumeCalculatorActive]);

  // Save draft to localStorage (debounced)
  const saveDraftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const workoutFlowSectionRef = useRef<HTMLDivElement | null>(null);
  const saveDraft = useCallback(() => {
    if (saveDraftTimeoutRef.current) {
      clearTimeout(saveDraftTimeoutRef.current);
    }
    saveDraftTimeoutRef.current = setTimeout(() => {
      try {
        const storageKey = template?.id
          ? `workout_template_draft_${template.id}`
          : `workout_template_draft_new`;
        const draft = {
          formData,
          exercises,
          newExercise,
          timestamp: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch (error) {
        console.error("Error saving draft to localStorage:", error);
      }
    }, 500); // Debounce: save 500ms after last change
  }, [formData, exercises, newExercise, template?.id]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const storageKey = template?.id
        ? `workout_template_draft_${template.id}`
        : `workout_template_draft_new`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const draft = JSON.parse(stored);
        // Only restore if draft is less than 24 hours old
        if (
          draft.timestamp &&
          Date.now() - draft.timestamp < 24 * 60 * 60 * 1000
        ) {
          if (draft.formData) setFormData(draft.formData);
          if (draft.exercises) setExercises(draft.exercises);
          if (draft.newExercise) setNewExercise(draft.newExercise);
          return true;
        }
      }
    } catch (error) {
      console.error("Error loading draft from localStorage:", error);
    }
    return false;
  }, [template?.id]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      const storageKey = template?.id
        ? `workout_template_draft_${template.id}`
        : `workout_template_draft_new`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Error clearing draft from localStorage:", error);
    }
  }, [template?.id]);

  // Combined workout items (exercises and blocks in chronological order)
  // When blocks are loaded, they're converted to exercises, so we only use exercises to avoid duplicates
  const workoutItems = exercises.map((exercise) => ({
    ...exercise,
    type: "exercise" as const,
  }));

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadAvailableExercises();
      if (template) {
        const categoryName = template.category || "general";
        const categoryObj = categories.find(
          (c) => c.name?.toLowerCase() === categoryName.toLowerCase(),
        );

        setFormData({
          name: template.name || "",
          description: template.description || "",
          category: categoryName,
          categoryId: categoryObj?.id || "",
          estimated_duration: template.estimated_duration || 60,
          difficulty_level: template.difficulty_level
            ? template.difficulty_level.charAt(0).toUpperCase() +
              template.difficulty_level.slice(1).toLowerCase()
            : "Beginner",
        });

        if (previousTemplateId.current !== template.id) {
          hasLoadedBlocks.current = false;
          previousTemplateId.current = template.id || null;
        }

        // When initialBlocks are provided (e.g. edit page), always use them so we don't miss them due to effect timing
        if (initialBlocks !== undefined) {
          setWorkoutBlocks(initialBlocks);
          const convertedExercises = convertBlocksToExercises(initialBlocks);
          setExercises(convertedExercises);
          hasLoadedBlocks.current = true;
          justLoadedRef.current = true;
          if (process.env.NODE_ENV !== "production") {
            console.log(
              "[WorkoutTemplateForm] Using initialBlocks, count:",
              initialBlocks.length,
            );
          }
        } else if (!hasLoadedBlocks.current) {
          loadWorkoutBlocks(template.id);
          hasLoadedBlocks.current = true;
        }
      } else {
        // For new templates, try to load draft first
        const draftLoaded = loadDraft();
        if (!draftLoaded) {
          resetForm();
          setExercises([]);
        }
        setWorkoutBlocks([]);
        hasLoadedBlocks.current = false;
        previousTemplateId.current = null;
      }
    }
  }, [isOpen, template, initialBlocks, loadDraft]);

  // Ensure Category and Difficulty autofill once data arrives
  useEffect(() => {
    if (!isOpen) return;
    if (!template) return;

    const categoryName = template.category || "general";
    // Find category ID from name
    const categoryObj = categories.find(
      (c) => c.name?.toLowerCase() === categoryName.toLowerCase(),
    );

    setFormData((prev) => ({
      ...prev,
      category: categoryName,
      categoryId: categoryObj?.id || "",
      difficulty_level: template.difficulty_level
        ? template.difficulty_level.charAt(0).toUpperCase() +
          template.difficulty_level.slice(1).toLowerCase()
        : prev.difficulty_level || "Beginner",
    }));
  }, [isOpen, template, categories]);

  // Track dirty state for edit page "Saved" indicator
  useEffect(() => {
    if (!onDirtyChange || !template) return;
    const snapshot = () =>
      JSON.stringify({
        formData,
        exercises: exercises.map((e: any) => ({ id: e.id, exercise_id: e.exercise_id, exercise_type: e.exercise_type })),
      });
    if (justLoadedRef.current) {
      lastSavedSnapshotRef.current = snapshot();
      onDirtyChange(false);
      justLoadedRef.current = false;
    } else if (lastSavedSnapshotRef.current !== null) {
      if (snapshot() !== lastSavedSnapshotRef.current) {
        onDirtyChange(true);
      }
    }
  }, [formData, exercises, template, onDirtyChange]);

  // Auto-save draft to localStorage whenever formData, exercises, or newExercise changes
  useEffect(() => {
    if (isOpen && !template) {
      // Only auto-save drafts for new templates (not when editing existing templates)
      saveDraft();
    }
  }, [formData, exercises, newExercise, isOpen, template, saveDraft]);

  // Cleanup: clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current);
      }
    };
  }, []);

  // If template has no category, default to first available when categories load
  useEffect(() => {
    if (!isOpen) return;
    if (!categories.length) return;
    setFormData((prev) => {
      const currentName = prev.category || template?.category || "";
      const categoryObj = categories.find(
        (c) => c.name?.toLowerCase() === currentName.toLowerCase(),
      );
      const fallbackCategory = categories[0];
      return {
        ...prev,
        category: categoryObj?.name || fallbackCategory?.name || "general",
        categoryId: categoryObj?.id || fallbackCategory?.id || "",
      };
    });
  }, [isOpen, categories]);
  const loadCategories = useCallback(async () => {
    try {
      if (!user?.id) {
        console.log("No user found, using fallback categories");
        // Fallback minimal categories to keep UI functional
        setCategories([
          { id: "general", name: "General", color: "#6B7280" },
          { id: "strength", name: "Strength", color: "#EF4444" },
          { id: "cardio", name: "Cardio", color: "#10B981" },
          { id: "hiit", name: "HIIT", color: "#F59E0B" },
          { id: "flexibility", name: "Flexibility", color: "#3B82F6" },
          { id: "functional", name: "Functional", color: "#8B5CF6" },
        ]);
        return;
      }

      const { data, error } = await supabase
        .from("workout_categories")
        .select("id,name,color")
        .eq("coach_id", user.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;

      // If we have categories from database, use them
      if (data && data.length > 0) {
        setCategories(data);
      } else {
        // If no categories exist, use fallback categories
        console.log("No categories found for coach, using fallback categories");
        setCategories([
          { id: "general", name: "General", color: "#6B7280" },
          { id: "strength", name: "Strength", color: "#EF4444" },
          { id: "cardio", name: "Cardio", color: "#10B981" },
          { id: "hiit", name: "HIIT", color: "#F59E0B" },
          { id: "flexibility", name: "Flexibility", color: "#3B82F6" },
          { id: "functional", name: "Functional", color: "#8B5CF6" },
        ]);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      // Fallback minimal categories to keep UI functional
      setCategories([
        { id: "general", name: "General", color: "#6B7280" },
        { id: "strength", name: "Strength", color: "#EF4444" },
        { id: "cardio", name: "Cardio", color: "#10B981" },
        { id: "hiit", name: "HIIT", color: "#F59E0B" },
        { id: "flexibility", name: "Flexibility", color: "#3B82F6" },
        { id: "functional", name: "Functional", color: "#8B5CF6" },
      ]);
    }
  }, [user]);

  const loadAvailableExercises = useCallback(async () => {
    try {
      // Load exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from("exercises")
        .select("*")
        .order("name", { ascending: true });

      if (exercisesError) throw exercisesError;

      // Load muscle groups (optional - if table doesn't exist, continue without it)
      let muscleGroupMap = new Map<string, string>();
      try {
        const { data: muscleGroupsData, error: muscleGroupsError } =
          await supabase.from("muscle_groups").select("id, name");

        if (!muscleGroupsError && muscleGroupsData) {
          muscleGroupsData.forEach((mg: any) => {
            muscleGroupMap.set(mg.id, mg.name);
          });
        }
      } catch (mgError) {
        // Silently continue if muscle_groups table doesn't exist or query fails
        console.warn(
          "Could not load muscle groups (this is optional):",
          mgError,
        );
      }

      // Transform exercises to include primary_muscle_group name
      const exercisesWithMuscleGroups = (exercisesData || []).map(
        (exercise: any) => ({
          ...exercise,
          primary_muscle_group: exercise.primary_muscle_group_id
            ? muscleGroupMap.get(exercise.primary_muscle_group_id) || null
            : null,
        }),
      );

      setAvailableExercises(exercisesWithMuscleGroups);
    } catch (error) {
      console.error("Error loading exercises:", error);
      // Fallback: just set exercises without muscle groups if main query fails
      setAvailableExercises([]);
    }
  }, []);

  // Legacy function - no longer used as we now use workout_set_entries
  // Keeping empty implementation for backward compatibility if needed
  const loadTemplateExercises = useCallback(async (templateId: string) => {
    // The new schema uses workout_set_entries instead of workout_template_exercises
    // This function is kept for backward compatibility but does nothing
    // All exercises are loaded via loadWorkoutBlocks instead
    console.log(
      "🔍 Template exercises are now loaded via workout_set_entries system",
    );
    setExercises([]);
  }, []);

  const loadWorkoutBlocks = useCallback(async (templateId: string) => {
    try {
      if (process.env.NODE_ENV !== "production")
        console.time("[WorkoutTemplateForm] loadWorkoutBlocks");
      const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId);
      if (process.env.NODE_ENV !== "production") {
        console.timeEnd("[WorkoutTemplateForm] loadWorkoutBlocks");
        console.log(
          "[WorkoutTemplateForm] loadWorkoutBlocks rows:",
          blocks?.length ?? 0,
        );
      }
      setWorkoutBlocks(blocks || []);

      // Convert blocks back to exercises for editing
      if (blocks && blocks.length > 0) {
        const convertedExercises = convertBlocksToExercises(blocks);
        setExercises(convertedExercises);
        justLoadedRef.current = true;
      }
    } catch (error) {
      console.error("Error loading workout blocks:", error);
    }
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      categoryId: "",
      estimated_duration: 60,
      difficulty_level: "Beginner",
    });
  };

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    setLoading(true);

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        addToast({ title: "Please sign in to save the template.", variant: "destructive" });
        return;
      }

      const result = await saveWorkoutTemplate({
        supabase,
        userId: authUser.id,
        formData,
        exercises,
        template,
        generateBlockName,
      });

      if (!result.success) {
        addToast({ title: result.error || "Failed to save template", variant: "destructive" });
        return;
      }

      clearDraft();
      if (onDirtyChange) {
        lastSavedSnapshotRef.current = JSON.stringify({
          formData,
          exercises: exercises.map((e: any) => ({ id: e.id, exercise_id: e.exercise_id, exercise_type: e.exercise_type })),
        });
        onDirtyChange(false);
      }
      onSuccess?.();
      onClose();
      resetForm();
    } catch (err) {
      console.error("Error saving template:", err);
      addToast({ title: "An error occurred while saving", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addExercise = () => {
    const result = buildExerciseFromNewExercise(
      newExercise,
      availableExercises,
      exercises,
      editingExerciseId
    );

    if (!result.success) {
      addToast({ title: "Couldn't add exercise. Please try again.", variant: "destructive" });
      return;
    }

    if (editingExerciseId) {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === editingExerciseId ? result.exercise! : ex
        )
      );
    } else {
      setExercises((prev) => [...prev, result.exercise!]);
    }

    setNewExercise({
      exercise_id: "",
      exercise_type: "",
      sets: "",
      reps: "",
      rest_seconds: "",
      rir: "",
      tempo: "",
      notes: "",
      amrap_duration: "",
      work_seconds: "",
      emom_duration: "",
      rounds: "",
      rest_after: "",
      rest_after_set: "",
      drop_percentage: "",
      drop_set_reps: "",
      superset_exercise_id: "",
      superset_reps: "",
      superset_load_percentage: "",
      giant_set_exercises: [] as Array<{
        exercise_id: string;
        sets: string;
        reps: string;
        [key: string]: any;
      }>,
      cluster_reps: "",
      clusters_per_set: "",
      intra_cluster_rest: "",
      rest_pause_duration: "",
      max_rest_pauses: "",
      compound_exercise_id: "",
      isolation_reps: "",
      compound_reps: "",
      compound_load_percentage: "",
      target_reps: "",
      time_cap: "",
      rest_between_rungs: "",
      emom_mode: "",
      emom_reps: "",
      hr_is_intervals: false,
      hr_zone: "",
      hr_percentage_min: "",
      hr_percentage_max: "",
      hr_duration_minutes: "",
      hr_work_duration_minutes: "",
      hr_rest_duration_minutes: "",
      hr_target_rounds: "",
      hr_distance_meters: "",
      hr_set_exercises: [] as Array<Record<string, any>>,
      tabata_sets: [] as Array<{
        exercises: any[];
        rest_between_sets: string;
      }>,
      load_percentage: "",
      weight_kg: "",
      superset_weight_kg: "",
      compound_weight_kg: "",
    });
    setEditingExerciseId(null);
    setShowAddExercise(false);
    setExpandedExerciseId(result.exercise!.id);

    setTimeout(() => {
      workoutFlowSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const toggleExerciseExpanded = useCallback((exerciseId: string) => {
    setExpandedExerciseId((prev) => (prev === exerciseId ? null : exerciseId));
  }, []);

  const removeExercise = (exerciseId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
  };

  const updateExerciseAtIndex = (index: number, updatedExercise: any) => {
    setExercises((prev) =>
      prev.map((ex, idx) =>
        idx === index
          ? {
              ...ex,
              ...updatedExercise,
            }
          : ex,
      ),
    );
  };

  // Drag and drop handler for reordering exercises
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Reorder exercises in state
    const reorderedExercises = Array.from(exercises);
    const [movedExercise] = reorderedExercises.splice(sourceIndex, 1);
    reorderedExercises.splice(destinationIndex, 0, movedExercise);

    // Update order_index for all exercises
    const updatedExercises = reorderedExercises.map((exercise, index) => ({
      ...exercise,
      order_index: index + 1,
    }));

    setExercises(updatedExercises);

    // If we have a template ID, persist the reorder to database
    if (template?.id) {
      try {
        // Get all blocks for this template
        const blocks = await WorkoutBlockService.getWorkoutBlocks(template.id);

        // Map exercises to set entries and update set_order
        const blockOrders = updatedExercises
          .map((exercise, index) => {
            // Find the block that contains this exercise
            const block = blocks.find(
              (b) =>
                b.id === exercise.id ||
                (b.exercises && b.exercises.some((e) => e.id === exercise.id)),
            );
            return {
              blockId: block?.id || exercise.id,
              newOrder: index + 1,
            };
          })
          .filter((bo) => bo.blockId);

        if (blockOrders.length > 0) {
          await WorkoutBlockService.reorderWorkoutBlocks(
            template.id,
            blockOrders,
          );
        }
      } catch (error) {
        console.error("Error reordering exercises:", error);
      }
    }
  };

  const getExerciseTypeDisplay = (exercise: any) => {
    console.log("🔍 Display exercise type check:", {
      exercise_id: exercise.id,
      exercise_type: exercise.exercise_type,
      isTabata: exercise.exercise_type === "tabata",
    });

    switch (exercise.exercise_type) {
      case "tabata":
        return "Tabata";
      case "amrap":
        return "AMRAP";
      case "emom":
        return "EMOM";
      case "superset":
        return "Superset";
      case "drop_set":
        return "Drop Set";
      case "giant_set":
        return "Giant Set";
      case "cluster_set":
        return "Cluster Set";
      case "rest_pause":
        return "Rest-Pause";
      case "pre_exhaustion":
        return "Pre-Exhaustion";
      case "for_time":
        return "For Time";
      default:
        return "Straight Set";
    }
  };

  const editExercise = (exercise: any) => {
    console.log("🔍 Edit exercise clicked:", exercise);
    console.log("🔍 Full exercise object keys:", Object.keys(exercise));
    console.log("🔍 Tabata data being loaded:", {
      tabata_sets: exercise.tabata_sets,
      work_seconds: exercise.work_seconds,
      rest_after: exercise.rest_after,
      rounds: exercise.rounds,
      exercise_type: exercise.exercise_type,
    });
    console.log("🔍 All exercise values:", {
      sets: exercise.sets,
      reps: exercise.reps,
      rest_seconds: exercise.rest_seconds,
      rir: exercise.rir,
      tempo: exercise.tempo,
      work_seconds: exercise.work_seconds,
      rest_after: exercise.rest_after,
      rounds: exercise.rounds,
      tabata_sets: exercise.tabata_sets,
    });
    setEditingExerciseId(exercise.id);
    setNewExercise({
      exercise_id: exercise.exercise_id,
      exercise_type: exercise.exercise_type,
      sets: exercise.sets,
      reps: exercise.reps,
      rest_seconds: exercise.rest_seconds,
      rir: exercise.rir,
      tempo: exercise.tempo,
      notes: exercise.notes || "",
      // AMRAP specific
      amrap_duration: exercise.amrap_duration,
      // EMOM specific
      work_seconds: exercise.work_seconds,
      emom_duration: exercise.emom_duration,
      emom_mode: exercise.emom_mode,
      emom_reps: exercise.emom_reps,
      // HR sets specific
      hr_is_intervals: (exercise as any).hr_is_intervals ?? false,
      hr_zone: (exercise as any).hr_zone ?? "",
      hr_percentage_min: (exercise as any).hr_percentage_min ?? "",
      hr_percentage_max: (exercise as any).hr_percentage_max ?? "",
      hr_duration_minutes: (exercise as any).hr_duration_minutes ?? "",
      hr_work_duration_minutes:
        (exercise as any).hr_work_duration_minutes ?? "",
      hr_rest_duration_minutes:
        (exercise as any).hr_rest_duration_minutes ?? "",
      hr_target_rounds: (exercise as any).hr_target_rounds ?? "",
      hr_distance_meters: (exercise as any).hr_distance_meters ?? "",
      hr_set_exercises: (exercise as any).hr_set_exercises ?? [],
      // Tabata specific
      rounds: exercise.rounds,
      tabata_sets: Array.isArray(exercise.tabata_sets)
        ? exercise.tabata_sets.map((set: any) => ({
            exercises: Array.isArray(set.exercises) ? set.exercises : [],
            rest_between_sets:
              set.rest_between_sets || exercise.rest_after || "",
          }))
        : [],
      rest_after: exercise.rest_after,
      rest_after_set: (exercise as any).rest_after_set || "",
      // Drop set specific
      drop_percentage: exercise.drop_percentage,
      drop_set_reps: exercise.drop_set_reps,
      // Superset specific
      superset_exercise_id: exercise.superset_exercise_id,
      superset_reps: exercise.superset_reps,
      superset_load_percentage:
        (exercise as any).superset_load_percentage || "",
      // Giant set specific
      giant_set_exercises: exercise.giant_set_exercises,
      // Cluster set specific
      cluster_reps: exercise.cluster_reps,
      clusters_per_set: exercise.clusters_per_set,
      intra_cluster_rest: exercise.intra_cluster_rest,
      // Rest-pause specific
      rest_pause_duration: exercise.rest_pause_duration,
      max_rest_pauses: exercise.max_rest_pauses,

      // Pre-exhaustion specific
      compound_exercise_id: exercise.compound_exercise_id,
      isolation_reps: exercise.isolation_reps,
      compound_reps: exercise.compound_reps,
      compound_load_percentage:
        (exercise as any).compound_load_percentage || "",
      // For time specific
      target_reps: exercise.target_reps,
      time_cap: exercise.time_cap,

      rest_between_rungs: exercise.rest_between_rungs,
      // Load percentage
      load_percentage: exercise.load_percentage?.toString() || "",
      weight_kg: exercise.weight_kg?.toString() || "",
      superset_weight_kg:
        (exercise as any).superset_weight_kg?.toString() || "",
      compound_weight_kg:
        (exercise as any).compound_weight_kg?.toString() || "",
    });
    setShowAddExercise(true);
  };

  const isPage = renderMode === "page";
  if (!isPage && !isOpen) return null;

  return (
    <div
      className={`${
        !isPage ? "fixed inset-0 z-[9999]" : ""
      } flex items-start justify-center p-4 ${
        !isPage
          ? isDark
            ? "bg-black/60 backdrop-blur-sm"
            : "bg-black/50 backdrop-blur-sm"
          : ""
      }`}
      onClick={
        !isPage ? (e) => e.target === e.currentTarget && onClose() : undefined
      }
      data-theme={isDark ? "dark" : "light"}
    >
      <div
        className={`relative ${
          isPage
            ? ""
            : `${theme.card} ${theme.shadow} fc-glass fc-card rounded-2xl sm:rounded-3xl border ${theme.border}`
        } w-full flex flex-col transform transition-all duration-300 ease-out ${
          isPage ? "" : "overflow-hidden"
        }`}
        style={{
          animation: !isPage ? "modalSlideIn 0.3s ease-out" : undefined,
          maxWidth: isPage ? "100%" : "min(95vw, 80rem)",
          height: isPage ? "auto" : "min(88vh, calc(100vh - 4rem))",
          maxHeight: isPage ? "none" : "min(88vh, calc(100vh - 4rem))",
        }}
      >
        {/* Header — modal only; page mode uses parent nav */}
        {!isPage && (
        <div
          className={`sticky top-0 ${theme.card} fc-glass fc-card border-b ${theme.border} px-3 py-3 sm:px-4 sm:py-3 rounded-t-3xl`}
        >
          <div className="flex items-center justify-between gap-2 min-h-10">
            <h2 className={`text-lg font-semibold truncate ${theme.text}`}>
              {template ? "Edit template" : "Create template"}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 shrink-0 rounded-lg"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        )}

        <div
          className={`flex-1 ${
            isPage ? "overflow-y-visible" : "overflow-y-auto"
          } ${isPage ? "px-0" : "px-3"} pb-4 ${
            isPage ? "sm:px-0" : "sm:px-6"
          } sm:pb-6`}
        >
          <form
            onSubmit={handleSubmit}
            className={`space-y-3 ${isPage ? "" : "pt-2"}`}
          >
            <BasicInfoSection
              formData={formData}
              setFormData={setFormData}
              categories={categories}
            />

            {/* Volume Calculator Widget */}
            {isGuidelineCategory(formData.category) && (
              <VolumeCalculatorWidget
                blocks={currentWorkoutBlocks}
                category={formData.category}
                difficulty={formData.difficulty_level}
                daysPerWeek={daysPerWeek}
                excludeFromRecommendations={excludeFromRecommendations}
                onToggleExclude={setExcludeFromRecommendations}
                onDaysPerWeekChange={setDaysPerWeek}
              />
            )}


            {/* Wrapper: when Add Exercise is open, form shows first (order 0) then list (order 1) */}
            <div className="flex flex-col">
              {/* Unified Workout Structure - ref so we can scroll here when adding new exercise */}
              <div
                ref={workoutFlowSectionRef}
                className="space-y-3 border-t border-black/5 dark:border-white/5 mt-4 pt-4"
                style={{ order: 1 }}
              >
                <div className="flex flex-wrap w-full items-center gap-2 justify-between">
                  <h3 className={`text-sm font-semibold ${theme.text}`}>
                    Exercises ({workoutItems.length})
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAddExercise(true)}
                    className={`h-8 text-xs px-3 rounded-lg ${theme.primary} shrink-0`}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add exercise
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  {exercises.length > 0 ? (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="exercises-list">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="w-full space-y-2"
                          >
                            {exercises.map((exercise, index) => {
                              // Create unique key combining multiple properties to avoid duplicates
                              // Use order_index if available, otherwise use index
                              const order = exercise.order_index || index + 1;
                              const uniqueKey = exercise.id
                                ? `ex-${exercise.exercise_type || "unknown"}-${
                                    exercise.id
                                  }-${order}`
                                : `ex-${exercise.exercise_type || "unknown"}-${
                                    exercise.exercise_id || "no-id"
                                  }-${order}-${index}`;

                              return (
                                <Draggable
                                  key={uniqueKey}
                                  draggableId={uniqueKey}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={
                                        snapshot.isDragging ? "opacity-50" : ""
                                      }
                                    >
                                      <div className="flex items-start gap-2">
                                        <div className="flex items-center mt-2 text-[color:var(--fc-text-dim)] cursor-grab active:cursor-grabbing flex-shrink-0">
                                          <GripVertical className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                          <ExerciseBlockCard
                                            exercise={exercise}
                                            index={index}
                                            availableExercises={
                                              availableExercises
                                            }
                                            onEdit={editExercise}
                                            onDelete={removeExercise}
                                            renderMode="form"
                                            compact
                                            isExpanded={
                                              expandedExerciseId === exercise.id
                                            }
                                            onToggleExpand={() =>
                                              toggleExerciseExpanded(exercise.id)
                                            }
                                          >
                                            {expandedExerciseId ===
                                              exercise.id && (
                                              <ExerciseDetailForm
                                                exercise={exercise}
                                                onChange={(updated) =>
                                                  updateExerciseAtIndex(
                                                    index,
                                                    updated,
                                                  )
                                                }
                                                availableExercises={
                                                  availableExercises
                                                }
                                                allowedBlockTypes={
                                                  allowedBlockTypes
                                                }
                                                mode="inline"
                                              />
                                            )}
                                          </ExerciseBlockCard>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  ) : (
                    <EmptyExerciseState
                      onAddExercise={() => setShowAddExercise(true)}
                    />
                  )}
                </div>
              </div>

              {/* Add Exercise form - order 0 so it appears above the list when open */}
              {showAddExercise && (
                <AddExercisePanel
                  newExercise={newExercise}
                  setNewExercise={setNewExercise}
                  onClose={() => {
                    setShowAddExercise(false);
                    setEditingExerciseId(null);
                  }}
                  isDark={isDark}
                  isVolumeCalculatorActive={isVolumeCalculatorActive}
                  allowedBlockTypes={allowedBlockTypes}
                  availableExercises={availableExercises}
                  handleNumberChange={handleNumberChange}
                  onAddExercise={addExercise}
                  editingExerciseId={editingExerciseId}
                  renderLoadWeightField={renderLoadWeightField}
                />
              )}
            </div>
          </form>
        </div>

        <ActionButtons
          onCancel={() => {
            clearDraft();
            onClose();
          }}
          onSubmit={(e) => handleSubmit(e ?? ({} as React.FormEvent<HTMLFormElement>))}
          loading={loading}
          template={template}
        />
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
