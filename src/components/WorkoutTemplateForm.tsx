"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  X,
  Clock,
  Target,
  Dumbbell,
  Plus,
  Save,
  Eye,
  Info,
  Calendar,
  Users,
  Zap,
  CheckCircle,
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
import WorkoutBlockBuilder from "@/components/coach/WorkoutBlockBuilder";
import { WorkoutBlock } from "@/types/workoutBlocks";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import ExerciseBlockCard from "@/components/features/workouts/ExerciseBlockCard";
import ExerciseDetailForm from "@/components/features/workouts/ExerciseDetailForm";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";

interface WorkoutTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: any;
  renderMode?: "modal" | "page";
}

const difficultyLevels = [
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
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
  renderMode = "modal",
}: WorkoutTemplateFormProps) {
  const { isDark, getThemeStyles } = useTheme();
  const theme = getThemeStyles();

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
  const [showPreview, setShowPreview] = useState(false);
  const [exercises, setExercises] = useState<any[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; color?: string }>
  >([]);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(
    null
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
    // Tabata specific
    tabata_sets: [] as Array<{ exercises: any[]; rest_between_sets: string }>,
    // Load percentage
    load_percentage: "",
  });

  // Workout Block System (integrated with exercises)
  const [workoutBlocks, setWorkoutBlocks] = useState<WorkoutBlock[]>([]);
  const hasLoadedBlocks = useRef(false);
  const previousTemplateId = useRef<string | null>(null);

  // Save draft to localStorage (debounced)
  const saveDraftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
          (c) => c.name?.toLowerCase() === categoryName.toLowerCase()
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

        if (!hasLoadedBlocks.current) {
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
  }, [isOpen, template, loadDraft]);

  // Ensure Category and Difficulty autofill once data arrives
  useEffect(() => {
    if (!isOpen) return;
    if (!template) return;

    const categoryName = template.category || "general";
    // Find category ID from name
    const categoryObj = categories.find(
      (c) => c.name?.toLowerCase() === categoryName.toLowerCase()
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
        (c) => c.name?.toLowerCase() === currentName.toLowerCase()
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
      const { data, error } = await supabase
        .from("workout_categories")
        .select("id,name,color")
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
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
  }, []);

  const loadAvailableExercises = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setAvailableExercises(data || []);
    } catch (error) {
      console.error("Error loading exercises:", error);
      // Fallback exercises
      setAvailableExercises([
        {
          id: "1",
          name: "Push-ups",
          description: "Classic bodyweight exercise",
        },
        {
          id: "2",
          name: "Squats",
          description: "Fundamental lower body exercise",
        },
        { id: "3", name: "Plank", description: "Core strengthening exercise" },
        { id: "4", name: "Lunges", description: "Single-leg strengthening" },
        { id: "5", name: "Burpees", description: "Full-body cardio exercise" },
      ]);
    }
  }, []);

  // Legacy function - no longer used as we now use workout_blocks
  // Keeping empty implementation for backward compatibility if needed
  const loadTemplateExercises = useCallback(async (templateId: string) => {
    // The new schema uses workout_blocks instead of workout_template_exercises
    // This function is kept for backward compatibility but does nothing
    // All exercises are loaded via loadWorkoutBlocks instead
    console.log(
      "🔍 Template exercises are now loaded via workout_blocks system"
    );
    setExercises([]);
  }, []);

  const loadWorkoutBlocks = useCallback(async (templateId: string) => {
    try {
      const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId);
      setWorkoutBlocks(blocks || []);

      // Convert blocks back to exercises for editing
      if (blocks && blocks.length > 0) {
        const convertedExercises: any[] = [];

        blocks.forEach((block, blockIndex) => {
          // Get first exercise and its special table data
          const firstExercise = block.exercises?.[0];
          const firstExerciseId = firstExercise?.exercise_id;
          const firstExerciseOrder = firstExercise?.exercise_order || 1;

          // Get time protocol for this block/exercise (for time-based blocks)
          const timeProtocol =
            block.time_protocols?.find(
              (tp: any) =>
                tp.exercise_id === firstExerciseId &&
                tp.exercise_order === firstExerciseOrder
            ) || block.time_protocols?.[0]; // Fallback to first if not found

          // Get special table data from first exercise
          const dropSet = firstExercise?.drop_sets?.[0];
          const clusterSet = firstExercise?.cluster_sets?.[0];
          const restPauseSet = firstExercise?.rest_pause_sets?.[0];
          const pyramidSets = firstExercise?.pyramid_sets || [];
          const ladderSets = firstExercise?.ladder_sets || [];

          // Create exercise object from block
          // IMPORTANT: Preserve block.id so we can update existing blocks instead of deleting/recreating
          const exercise: any = {
            id: block.id, // Preserve original block ID for smart updates
            originalBlockId: block.id, // Keep reference to original block ID
            exercise_type: block.block_type,
            exercise_id: firstExerciseId,
            order_index: blockIndex + 1, // Add order_index for uniqueness
            sets: block.total_sets?.toString() || "",
            reps: block.reps_per_set || "",
            rest_seconds: block.rest_seconds?.toString() || "",
            notes: block.block_notes || "",
            block_name: block.block_name,
            // RIR, Tempo, Notes from first exercise (for blocks that support these)
            rir: firstExercise?.rir?.toString() || "",
            tempo: firstExercise?.tempo || "",
            // Time protocol data (from special table)
            rounds: timeProtocol?.rounds?.toString() || undefined,
            work_seconds: timeProtocol?.work_seconds?.toString() || undefined,
            rest_after: timeProtocol?.rest_seconds?.toString() || undefined,
            amrap_duration:
              timeProtocol?.total_duration_minutes?.toString() || undefined,
            emom_duration:
              timeProtocol?.total_duration_minutes?.toString() || undefined,
            emom_reps: timeProtocol?.reps_per_round?.toString() || undefined,
            emom_mode: timeProtocol?.emom_mode || "",
            target_reps: timeProtocol?.target_reps?.toString() || undefined,
            time_cap: timeProtocol?.time_cap_minutes?.toString() || undefined,
            // Drop set specific (from special table)
            drop_percentage:
              (dropSet as any)?.drop_percentage?.toString() || "",
            drop_set_reps: dropSet?.reps || "",
            // Load percentage (from exercise data)
            load_percentage: firstExercise?.load_percentage?.toString() || "",
          };

          // Handle complex block types with nested exercises
          const blockType = block.block_type as string;
          if (blockType === "circuit" || blockType === "tabata") {
            // Convert exercises to proper set structure
            // Each exercise in the block becomes an exercise in the sets
            const exercisesArray =
              block.exercises?.map((ex, idx) => ({
                exercise_id: ex.exercise_id,
                // For circuit/tabata: don't set individual sets - rounds are in block.total_sets
                sets: ex.sets?.toString() || "",
                reps: ex.reps || block.reps_per_set || "",
                rest_seconds:
                  ex.rest_seconds?.toString() ||
                  block.rest_seconds?.toString() ||
                  "",
                load_percentage: ex.load_percentage?.toString() || "",
              })) || [];

            if (blockType === "tabata") {
              // Tabata uses tabata_sets - structure: [{ exercises: [...], rest_between_sets: "..." }]
              // Get time protocol data for tabata (use first exercise's protocol as default)
              const tabataProtocol =
                block.time_protocols?.find(
                  (tp: any) => tp.protocol_type === "tabata"
                ) || timeProtocol;

              const restAfter =
                tabataProtocol?.rest_seconds?.toString() ||
                block.rest_seconds?.toString() ||
                "10";
              exercise.rest_after = String(restAfter);

              // Load rest_after_set from time_protocols (block-level field)
              // Use the first protocol's rest_after_set value (should be the same for all)
              const restAfterSet =
                tabataProtocol?.rest_after_set?.toString() || "10";
              (exercise as any).rest_after_set = String(restAfterSet);

              exercise.rounds =
                tabataProtocol?.rounds?.toString() ||
                block.total_sets?.toString() ||
                "8";
              exercise.work_seconds =
                tabataProtocol?.work_seconds?.toString() || "20";

              // Build tabata_sets from exercises and their time protocols
              // Group exercises by set number from time_protocols
              const exerciseProtocols =
                block.time_protocols?.filter(
                  (tp: any) => tp.protocol_type === "tabata"
                ) || [];

              // Group exercises by set number
              const setsMap = new Map<number, any[]>();
              exercisesArray.forEach((ex: any, exIdx: number) => {
                const exProtocol = exerciseProtocols.find(
                  (tp: any) =>
                    tp.exercise_id === ex.exercise_id &&
                    tp.exercise_order === exIdx + 1
                );
                const setNumber = exProtocol?.set || 1; // Default to set 1 if not found
                if (!setsMap.has(setNumber)) {
                  setsMap.set(setNumber, []);
                }
                setsMap.get(setNumber)!.push({
                  ...ex,
                  work_seconds:
                    exProtocol?.work_seconds?.toString() ||
                    exercise.work_seconds,
                  rest_after: exProtocol?.rest_seconds?.toString() || restAfter,
                });
              });

              // Convert map to array of sets
              exercise.tabata_sets = Array.from(setsMap.entries())
                .sort(([a], [b]) => a - b)
                .map(([setNum, exercises]) => ({
                  exercises,
                  rest_between_sets: String(restAfter),
                }));

              // Also set circuit_sets for compatibility
              exercise.circuit_sets = exercise.tabata_sets;
            }
            // Circuit removed - skip loading circuit blocks
          } else if (block.block_type === "drop_set") {
            // For dropset, main reps come from first exercise, not block.reps_per_set
            exercise.reps = firstExercise?.reps || block.reps_per_set || "";
            // Load drop set data from special table (fallback to block_parameters for old data)
            if (dropSet) {
              // Calculate drop percentage from first drop if needed
              const initialWeight = firstExercise?.weight_kg || 0;
              const dropWeight = dropSet.weight_kg || 0;
              if (initialWeight > 0 && dropWeight > 0) {
                const calculatedPercentage = Math.round(
                  ((initialWeight - dropWeight) / initialWeight) * 100
                );
                exercise.drop_percentage = String(calculatedPercentage);
              }
              exercise.drop_set_reps = dropSet.reps || "";
            }
          } else if (block.block_type === "cluster_set") {
            // Load cluster set data from special table
            if (clusterSet) {
              exercise.cluster_reps =
                clusterSet.reps_per_cluster?.toString() || exercise.reps || "";
              exercise.clusters_per_set =
                clusterSet.clusters_per_set?.toString() || "";
              exercise.intra_cluster_rest =
                clusterSet.intra_cluster_rest?.toString() || "15";
            }
          } else if (block.block_type === "rest_pause") {
            // Load rest pause data from special table
            if (restPauseSet) {
              exercise.rest_pause_duration =
                restPauseSet.rest_pause_duration?.toString() || "15";
              exercise.max_rest_pauses =
                restPauseSet.max_rest_pauses?.toString() || "3";
            }
          } else if (block.block_type === "pyramid_set") {
            // Load pyramid set data from special table
            if (pyramidSets.length > 0) {
              // Use first pyramid step as base
              exercise.weight_kg = pyramidSets[0]?.weight_kg?.toString() || "";
              exercise.reps = pyramidSets[0]?.reps || "";
            }
          } else if (block.block_type === "ladder") {
            // Load ladder set data from special table
            if (ladderSets.length > 0) {
              // Use first ladder step as base
              exercise.weight_kg = ladderSets[0]?.weight_kg?.toString() || "";
              exercise.reps = ladderSets[0]?.reps?.toString() || "";
            }
          } else if (block.block_type === "giant_set") {
            exercise.giant_set_exercises =
              block.exercises?.map((ex) => ({
                exercise_id: ex.exercise_id,
                sets: ex.sets?.toString() || block.total_sets?.toString() || "",
                reps: ex.reps || block.reps_per_set || "",
                load_percentage: ex.load_percentage?.toString() || "",
              })) || [];
          } else if (block.block_type === "superset") {
            if (block.exercises && block.exercises.length >= 2) {
              exercise.superset_exercise_id = block.exercises[1].exercise_id;
              exercise.superset_reps =
                block.exercises[1].reps || block.reps_per_set || "";
              // Load percentage for first exercise (already loaded at line 425)
              // Load percentage for second exercise (individual for each exercise in superset)
              (exercise as any).superset_load_percentage =
                block.exercises[1].load_percentage?.toString() || "";
            }
          } else if (block.block_type === "pre_exhaustion") {
            if (block.exercises && block.exercises.length >= 2) {
              exercise.compound_exercise_id = block.exercises[1].exercise_id;
              exercise.isolation_reps = block.exercises[0].reps || "";
              exercise.compound_reps = block.exercises[1].reps || "";
              // Load percentage for isolation exercise (first exercise)
              exercise.load_percentage =
                block.exercises[0].load_percentage?.toString() || "";
              // Load percentage for compound exercise (second exercise)
              (exercise as any).compound_load_percentage =
                block.exercises[1].load_percentage?.toString() || "";
            }
          }

          convertedExercises.push(exercise);
        });

        // Set exercises for display in the form
        setExercises(convertedExercises);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Validate required fields
      if (!formData.name || formData.name.trim() === "") {
        throw new Error("Workout name is required");
      }

      // Clean the form data to ensure proper data types and match database schema
      const cleanFormData = {
        name: formData.name.trim(),
        description: formData.description || "",
        difficulty_level: (
          formData.difficulty_level || "intermediate"
        ).toLowerCase(),
        estimated_duration:
          formData.estimated_duration === 0 || !formData.estimated_duration
            ? 60
            : formData.estimated_duration || 60,
        category: formData.category || "general",
      };

      const templateData = {
        ...cleanFormData,
        coach_id: user.id,
        is_active: true,
        // Removed created_at and updated_at - let database handle with DEFAULT values
      };

      let savedTemplateId: string;

      try {
        if (template) {
          const { data, error } = await supabase
            .from("workout_templates")
            .update(templateData)
            .eq("id", template.id)
            .select("id");

          if (error) {
            console.error("🚨 Update error details:", error);
            throw error;
          }
          savedTemplateId = data[0].id;
        } else {
          const { data, error } = await supabase
            .from("workout_templates")
            .insert(templateData)
            .select("id");

          if (error) {
            console.error("🚨 Insert error details:", error);
            console.error("🚨 Insert error message:", error.message);
            console.error("🚨 Insert error details:", error.details);
            console.error("🚨 Insert error hint:", error.hint);
            throw error;
          }
          savedTemplateId = data[0].id;
        }

        // Save workout blocks and exercises using SMART UPDATE strategy
        // This preserves block IDs to maintain referential integrity with historical workout data
        if (savedTemplateId) {
          console.log(
            "🔍 Saving blocks and exercises for template (SMART UPDATE):",
            savedTemplateId
          );

          // Get existing blocks for this template
          const existingBlocks = await WorkoutBlockService.getWorkoutBlocks(
            savedTemplateId
          );
          const existingBlockIds = new Set(existingBlocks.map((b) => b.id));
          const newExerciseIds = new Set(
            exercises.map((e) => e.id).filter((id): id is string => Boolean(id))
          );

          // Delete blocks that were removed (exist in DB but not in new exercises)
          const blocksToDelete = existingBlocks.filter(
            (block) => !newExerciseIds.has(block.id)
          );
          for (const block of blocksToDelete) {
            console.log(`🗑️ Deleting removed block: ${block.id}`);
            await WorkoutBlockService.deleteWorkoutBlock(block.id);
          }
          if (blocksToDelete.length > 0) {
            console.log(`🔍 Deleted ${blocksToDelete.length} removed block(s)`);
          }

          // Process each exercise: UPDATE if block exists, CREATE if new
          if (exercises.length > 0) {
            for (let i = 0; i < exercises.length; i++) {
              const exercise = exercises[i];
              const exerciseType = exercise.exercise_type || "straight_set";
              const isUpdate = exercise.id && existingBlockIds.has(exercise.id);

              // All block types now use relational tables - no block_parameters needed

              // SMART UPDATE: Create new block OR update existing block
              let block: WorkoutBlock | null = null;

              if (isUpdate && exercise.id) {
                // UPDATE existing block (preserves block ID for referential integrity)
                console.log(`🔄 Updating existing block: ${exercise.id}`);

                // Delete special table data first (will be recreated below)
                await WorkoutBlockService.deleteBlockSpecialData(exercise.id);

                // Update the block itself
                block = await WorkoutBlockService.updateWorkoutBlock(
                  exercise.id,
                  {
                    block_type: exerciseType as any,
                    block_order: i + 1,
                    block_name:
                      exercise.block_name || exercise.notes || undefined,
                    block_notes: exercise.notes || undefined,
                    total_sets: exercise.sets
                      ? parseInt(exercise.sets)
                      : undefined,
                    reps_per_set: exercise.reps || undefined,
                    rest_seconds: exercise.rest_seconds
                      ? Math.round(parseFloat(exercise.rest_seconds))
                      : undefined,
                    duration_seconds: exercise.amrap_duration
                      ? parseInt(exercise.amrap_duration) * 60
                      : exercise.emom_duration
                      ? parseInt(exercise.emom_duration) * 60
                      : undefined,
                  }
                );
              } else {
                // CREATE new block
                console.log(`➕ Creating new block for exercise ${i + 1}`);
                block = await WorkoutBlockService.createWorkoutBlock(
                  savedTemplateId,
                  exerciseType as any,
                  i + 1, // block_order
                  {
                    block_name:
                      exercise.block_name || exercise.notes || undefined,
                    block_notes: exercise.notes || undefined,
                    total_sets: exercise.sets
                      ? parseInt(exercise.sets)
                      : undefined,
                    reps_per_set: exercise.reps || undefined,
                    rest_seconds: exercise.rest_seconds
                      ? Math.round(parseFloat(exercise.rest_seconds))
                      : undefined,
                    duration_seconds: exercise.amrap_duration
                      ? parseInt(exercise.amrap_duration) * 60
                      : exercise.emom_duration
                      ? parseInt(exercise.emom_duration) * 60
                      : undefined,
                  }
                );
              }

              if (block) {
                // Add main exercise to block
                let mainExerciseId: string | null = null;
                let mainExerciseOrder = 1;

                if (exercise.exercise_id) {
                  const addedExercise =
                    await WorkoutBlockService.addExerciseToBlock(
                      block.id,
                      exercise.exercise_id,
                      1,
                      {
                        sets: exercise.sets
                          ? parseInt(exercise.sets)
                          : undefined,
                        reps: exercise.reps || undefined,
                        // For superset: NO rest_seconds for exercises (they're done back-to-back)
                        // rest_seconds in workout_blocks is for rest AFTER completing the superset
                        rest_seconds:
                          exerciseType === "superset"
                            ? undefined
                            : exercise.rest_seconds
                            ? Math.round(parseFloat(exercise.rest_seconds))
                            : undefined,
                        rir: exercise.rir ? parseInt(exercise.rir) : undefined,
                        tempo: exercise.tempo || undefined,
                        notes: exercise.notes || undefined,
                        load_percentage: exercise.load_percentage
                          ? parseFloat(exercise.load_percentage)
                          : undefined,
                      }
                    );
                  if (addedExercise) {
                    mainExerciseId = exercise.exercise_id;
                  }
                }

                // Add additional exercises for complex types
                if (
                  exerciseType === "superset" &&
                  exercise.superset_exercise_id
                ) {
                  // Superset exercises have NO rest between them (like giant set)
                  // rest_seconds in workout_blocks is for rest AFTER completing the superset
                  await WorkoutBlockService.addExerciseToBlock(
                    block.id,
                    exercise.superset_exercise_id,
                    2,
                    {
                      sets: exercise.sets ? parseInt(exercise.sets) : undefined,
                      reps:
                        exercise.superset_reps || exercise.reps || undefined,
                      // NO rest_seconds for superset exercises (they're done back-to-back)
                      rest_seconds: undefined,
                      // Load percentage for second exercise (individual for each exercise in superset)
                      load_percentage: (exercise as any)
                        .superset_load_percentage
                        ? parseFloat((exercise as any).superset_load_percentage)
                        : undefined,
                    }
                  );
                }

                if (
                  exerciseType === "giant_set" &&
                  exercise.giant_set_exercises &&
                  Array.isArray(exercise.giant_set_exercises)
                ) {
                  for (
                    let j = 0;
                    j < exercise.giant_set_exercises.length;
                    j++
                  ) {
                    const giantEx = exercise.giant_set_exercises[j];
                    if (giantEx.exercise_id) {
                      await WorkoutBlockService.addExerciseToBlock(
                        block.id,
                        giantEx.exercise_id,
                        j + 1,
                        {
                          sets:
                            giantEx.sets || exercise.sets
                              ? parseInt(giantEx.sets || exercise.sets)
                              : undefined,
                          reps: giantEx.reps || exercise.reps || undefined,
                          rest_seconds: exercise.rest_seconds
                            ? parseInt(exercise.rest_seconds)
                            : undefined,
                          // Load percentage can be set individually for each exercise in giant set
                          load_percentage: giantEx.load_percentage
                            ? parseFloat(giantEx.load_percentage)
                            : exercise.load_percentage
                            ? parseFloat(exercise.load_percentage)
                            : undefined,
                        }
                      );
                    }
                  }
                }

                if (exerciseType === "pre_exhaustion") {
                  if (exercise.exercise_id) {
                    await WorkoutBlockService.addExerciseToBlock(
                      block.id,
                      exercise.exercise_id,
                      1,
                      {
                        sets: exercise.sets
                          ? parseInt(exercise.sets)
                          : undefined,
                        reps: exercise.isolation_reps || undefined,
                        load_percentage: exercise.load_percentage
                          ? parseFloat(exercise.load_percentage)
                          : undefined,
                      }
                    );
                  }
                  if (exercise.compound_exercise_id) {
                    await WorkoutBlockService.addExerciseToBlock(
                      block.id,
                      exercise.compound_exercise_id,
                      2,
                      {
                        sets: exercise.sets
                          ? parseInt(exercise.sets)
                          : undefined,
                        reps: exercise.compound_reps || undefined,
                        load_percentage: exercise.load_percentage
                          ? parseFloat(exercise.load_percentage)
                          : undefined,
                      }
                    );
                  }
                }

                // Create special table records for block types that need them
                if (mainExerciseId && exerciseType === "drop_set") {
                  // Create drop set records
                  const initialWeight = exercise.weight_kg
                    ? parseFloat(exercise.weight_kg)
                    : 0;
                  const dropPercentage = exercise.drop_percentage
                    ? parseInt(exercise.drop_percentage)
                    : 20;

                  // First drop (initial weight reduced)
                  const firstDropWeight =
                    initialWeight * (1 - dropPercentage / 100);
                  await WorkoutBlockService.createDropSet(
                    block.id,
                    mainExerciseId,
                    mainExerciseOrder,
                    1, // drop_order
                    firstDropWeight,
                    exercise.drop_set_reps || exercise.reps || "8-10"
                    // rest_seconds removed - rest is stored in workout_blocks.rest_seconds
                  );
                }

                if (mainExerciseId && exerciseType === "cluster_set") {
                  // Create cluster set record
                  await WorkoutBlockService.createClusterSet(
                    block.id,
                    mainExerciseId,
                    mainExerciseOrder,
                    exercise.cluster_reps
                      ? parseInt(exercise.cluster_reps)
                      : parseInt(exercise.reps || "10"),
                    exercise.clusters_per_set
                      ? parseInt(exercise.clusters_per_set)
                      : 3,
                    exercise.intra_cluster_rest
                      ? parseInt(exercise.intra_cluster_rest)
                      : 15,
                    exercise.rest_seconds
                      ? Math.round(parseFloat(exercise.rest_seconds))
                      : 120
                  );
                }

                if (mainExerciseId && exerciseType === "rest_pause") {
                  // Create rest pause record
                  await WorkoutBlockService.createRestPauseSet(
                    block.id,
                    mainExerciseId,
                    mainExerciseOrder,
                    exercise.weight_kg ? parseFloat(exercise.weight_kg) : 0,
                    // initialReps removed - reps are tracked in workout_blocks table
                    exercise.rest_pause_duration
                      ? parseInt(exercise.rest_pause_duration)
                      : 15,
                    exercise.max_rest_pauses
                      ? parseInt(exercise.max_rest_pauses)
                      : 3
                  );
                }

                // DEPRECATED: pyramid_set and ladder_set block types are being removed
                // Use giant_set with various load_percentages instead to achieve pyramid/ladder effects
                // if (mainExerciseId && exerciseType === "pyramid_set") {
                //   // ... pyramid set logic removed ...
                // }
                // if (mainExerciseId && exerciseType === "ladder") {
                //   // ... ladder set logic removed ...
                // }

                // Time-based protocols (AMRAP, EMOM, FOR_TIME)
                if (
                  mainExerciseId &&
                  (exerciseType === "amrap" ||
                    exerciseType === "emom" ||
                    exerciseType === "for_time")
                ) {
                  await WorkoutBlockService.createTimeProtocol(
                    block.id,
                    mainExerciseId,
                    mainExerciseOrder,
                    exerciseType as "amrap" | "emom" | "for_time",
                    {
                      total_duration_minutes:
                        exerciseType === "amrap"
                          ? exercise.amrap_duration
                            ? parseInt(exercise.amrap_duration)
                            : 10
                          : exerciseType === "emom"
                          ? exercise.emom_duration
                            ? parseInt(exercise.emom_duration)
                            : 10
                          : undefined,
                      work_seconds:
                        exerciseType === "emom"
                          ? exercise.work_seconds
                            ? parseInt(exercise.work_seconds)
                            : 30
                          : undefined,
                      rest_seconds:
                        exerciseType === "emom"
                          ? exercise.rest_after
                            ? parseInt(exercise.rest_after)
                            : 30
                          : undefined,
                      reps_per_round:
                        exerciseType === "emom" && exercise.emom_reps
                          ? parseInt(exercise.emom_reps)
                          : undefined,
                      target_reps: exercise.target_reps
                        ? parseInt(exercise.target_reps)
                        : undefined,
                      time_cap_minutes:
                        exerciseType === "for_time" && exercise.time_cap
                          ? parseInt(exercise.time_cap)
                          : undefined,
                    }
                  );
                }

                if (exerciseType === "tabata") {
                  try {
                    // Tabata uses tabata_sets
                    // Structure: [{ exercises: [{ exercise_id, sets, reps, ... }], rest_between_sets: "..." }]
                    const setsArray = Array.isArray(exercise.tabata_sets)
                      ? exercise.tabata_sets
                      : [];

                    console.log(
                      `🔍 Processing tabata with ${setsArray.length} sets:`,
                      {
                        blockId: block.id,
                        exerciseType: "tabata",
                        setsCount: setsArray.length,
                        setsArray: setsArray.map((s: any) => ({
                          exercisesCount: s.exercises?.length || 0,
                          rest_between_sets: s.rest_between_sets,
                        })),
                      }
                    );

                    if (setsArray && setsArray.length > 0) {
                      // For tabata, use the block-level rest_after_set field that applies to ALL sets
                      let tabataRestAfterSet: string | undefined = undefined;
                      if (exerciseType === "tabata") {
                        // Use the block-level rest_after_set field (set at the same level as rounds and work time)
                        tabataRestAfterSet =
                          exercise.rest_after_set ||
                          exercise.rest_after ||
                          exercise.rest_seconds ||
                          "10";
                      }

                      // Collect all exercises from all sets
                      let exerciseOrder = 1;
                      for (
                        let setIdx = 0;
                        setIdx < setsArray.length;
                        setIdx++
                      ) {
                        const set = setsArray[setIdx];
                        const exercisesInSet = Array.isArray(set.exercises)
                          ? set.exercises
                          : [];

                        for (
                          let exIdx = 0;
                          exIdx < exercisesInSet.length;
                          exIdx++
                        ) {
                          const setEx = exercisesInSet[exIdx];
                          if (setEx.exercise_id) {
                            const currentExerciseOrder = exerciseOrder++;
                            const addedExercise =
                              await WorkoutBlockService.addExerciseToBlock(
                                block.id,
                                setEx.exercise_id,
                                currentExerciseOrder,
                                {
                                  sets:
                                    setEx.sets || exercise.sets
                                      ? parseInt(setEx.sets || exercise.sets)
                                      : undefined,
                                  reps:
                                    setEx.reps || exercise.reps || undefined,
                                  // rest_seconds in workout_block_exercises = rest after THIS exercise (per exercise)
                                  rest_seconds:
                                    exerciseType === "tabata"
                                      ? 10 // Tabata: short rest between exercises (typically 10s)
                                      : setEx.rest_after
                                      ? Math.round(
                                          parseFloat(String(setEx.rest_after))
                                        )
                                      : exercise.rest_seconds
                                      ? Math.round(
                                          parseFloat(
                                            String(exercise.rest_seconds)
                                          )
                                        )
                                      : undefined,
                                  // Load percentage can be set individually for each exercise
                                  load_percentage: setEx.load_percentage
                                    ? parseFloat(String(setEx.load_percentage))
                                    : exercise.load_percentage
                                    ? parseFloat(
                                        String(exercise.load_percentage)
                                      )
                                    : undefined,
                                }
                              );

                            if (!addedExercise) {
                              console.error(
                                `❌ Failed to add exercise to block:`,
                                {
                                  blockId: block.id,
                                  exerciseId: setEx.exercise_id,
                                  exerciseOrder: currentExerciseOrder,
                                  setIndex: setIdx + 1,
                                }
                              );
                              throw new Error(
                                `Failed to add exercise ${setEx.exercise_id} to circuit block`
                              );
                            }

                            // Create time protocol for this exercise
                            const timeProtocolResult =
                              await WorkoutBlockService.createTimeProtocol(
                                block.id,
                                setEx.exercise_id,
                                currentExerciseOrder,
                                exerciseType as "tabata" | "circuit",
                                {
                                  work_seconds:
                                    exerciseType === "tabata"
                                      ? exercise.work_seconds
                                        ? parseInt(exercise.work_seconds)
                                        : 20
                                      : setEx.work_seconds
                                      ? parseInt(setEx.work_seconds)
                                      : exercise.work_seconds
                                      ? parseInt(exercise.work_seconds)
                                      : undefined,
                                  // rest_seconds = rest after THIS exercise (per exercise)
                                  rest_seconds:
                                    exerciseType === "tabata"
                                      ? 10 // Tabata: short rest between exercises (typically 10s)
                                      : setEx.rest_after
                                      ? Math.round(
                                          parseFloat(String(setEx.rest_after))
                                        )
                                      : undefined,
                                  // rest_after_set = rest after completing ALL exercises in the set (per set)
                                  // For TABATA: use the general rest_after_set for ALL sets (same value)
                                  // For CIRCUIT: use per-set rest_between_sets
                                  rest_after_set:
                                    exerciseType === "tabata" &&
                                    tabataRestAfterSet
                                      ? Math.round(
                                          parseFloat(String(tabataRestAfterSet))
                                        )
                                      : undefined,
                                  // For TABATA: rounds IS stored in time_protocols
                                  rounds:
                                    exerciseType === "tabata"
                                      ? exercise.rounds
                                        ? parseInt(exercise.rounds)
                                        : 8
                                      : undefined,
                                  set: setIdx + 1, // Store set number (1-indexed)
                                }
                              );

                            if (!timeProtocolResult) {
                              console.error(
                                `❌ Failed to create time protocol for ${exerciseType} exercise:`,
                                {
                                  blockId: block.id,
                                  exerciseId: setEx.exercise_id,
                                  exerciseOrder: currentExerciseOrder,
                                  setIndex: setIdx + 1,
                                }
                              );
                            }
                          }
                        }
                      }
                    } else {
                      console.warn(`⚠️ tabata has no sets configured:`, {
                        blockId: block.id,
                        exerciseType: "tabata",
                        hasTabataSets: !!exercise.tabata_sets,
                      });
                    }
                  } catch (tabataError) {
                    console.error(`❌ Error saving tabata block:`, {
                      blockId: block.id,
                      exerciseType: "tabata",
                      error: tabataError,
                      exercise: {
                        id: exercise.id,
                        exercise_id: exercise.exercise_id,
                        sets: exercise.sets,
                        tabata_sets: exercise.tabata_sets,
                      },
                    });
                    throw tabataError; // Re-throw to be caught by outer try-catch
                  }
                }

                console.log(
                  `🔍 ${isUpdate ? "Updated" : "Created"} block ${i + 1}/${
                    exercises.length
                  }:`,
                  block.id
                );
              } else {
                console.error(
                  `❌ Failed to ${
                    isUpdate ? "update" : "create"
                  } block for exercise ${i + 1}`
                );
              }
            }
            console.log(
              "🔍 Successfully saved all blocks and exercises (SMART UPDATE - preserves block IDs)"
            );
          } else {
            console.log("🔍 No exercises to save");
          }
        }
      } catch (dbError) {
        console.error("🚨 Database error details:", dbError);
        console.log("Database not ready, using localStorage fallback");

        // Clear localStorage cache to force fresh data
        const userKey = `workout_templates_${user.id}`;
        localStorage.removeItem(userKey);
        console.log("🧹 Cleared localStorage cache for fresh data");

        const savedTemplates = localStorage.getItem(userKey);
        let templates = savedTemplates ? JSON.parse(savedTemplates) : [];

        if (template) {
          templates = templates.map((t: any) =>
            t.id === template.id
              ? { ...templateData, id: template.id, exercises }
              : t
          );
        } else {
          templates.push({
            ...templateData,
            id: Date.now().toString(),
            exercises,
          });
        }

        localStorage.setItem(
          `workout_templates_${user.id}`,
          JSON.stringify(templates)
        );
      }

      // Clear draft after successful save
      clearDraft();
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Error saving template. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addExercise = async () => {
    // For Tabata and Circuit, check if they have sets with exercises
    if (newExercise.exercise_type === "tabata") {
      if (!newExercise.tabata_sets || newExercise.tabata_sets.length === 0) {
        console.log("❌ No Tabata sets configured");
        alert("Please add at least one Tabata set with exercises");
        return;
      }
      // Check if any set has exercises
      const hasExercises = newExercise.tabata_sets.some(
        (set) => set.exercises && set.exercises.length > 0
      );
      if (!hasExercises) {
        console.log("❌ No exercises in Tabata sets");
        alert("Please add exercises to your Tabata sets");
        return;
      }

      // For Tabata exercises, use the first exercise from the first set as the main exercise_id
      const firstSet = newExercise.tabata_sets.find(
        (set) => set.exercises && set.exercises.length > 0
      );
      if (firstSet && firstSet.exercises && firstSet.exercises.length > 0) {
        newExercise.exercise_id = firstSet.exercises[0].exercise_id;
        console.log(
          "🔍 Tabata exercise - using first exercise as main exercise_id:",
          newExercise.exercise_id
        );
      } else {
        console.log(
          "❌ No valid exercises found in Tabata sets for exercise_id"
        );
        alert(
          "Please ensure at least one Tabata set has a valid exercise selected"
        );
        return;
      }
    } else if (newExercise.exercise_type === "circuit") {
      // Circuit removed - skip validation
      console.log("⚠️ Circuit block type is deprecated");
      return;
    } else if (newExercise.exercise_type === "giant_set") {
      if (
        !newExercise.giant_set_exercises ||
        newExercise.giant_set_exercises.length === 0
      ) {
        console.log("❌ No Giant Set exercises configured");
        alert("Please add at least one exercise to your Giant Set");
        return;
      }

      // For Giant Set exercises, use the first exercise as the main exercise_id
      const firstExercise = newExercise.giant_set_exercises.find(
        (ex) => ex.exercise_id
      );
      if (firstExercise && firstExercise.exercise_id) {
        newExercise.exercise_id = firstExercise.exercise_id;
        console.log(
          "🔍 Giant Set exercise - using first exercise as main exercise_id:",
          newExercise.exercise_id
        );
      } else {
        console.log("❌ No valid exercises found in Giant Set for exercise_id");
        alert(
          "Please ensure at least one exercise is selected in your Giant Set"
        );
        return;
      }
    } else if (newExercise.exercise_type === "superset") {
      if (!newExercise.exercise_id || !newExercise.superset_exercise_id) {
        console.log(
          "❌ Superset requires both main exercise and second exercise"
        );
        alert("Please select both exercises for your Superset");
        return;
      }
      // Superset already has exercise_id set, so no need to change it
      console.log(
        "🔍 Superset exercise - main exercise_id:",
        newExercise.exercise_id,
        "second exercise_id:",
        newExercise.superset_exercise_id
      );
    } else {
      // For other exercise types, check for main exercise_id
      if (!newExercise.exercise_id) {
        console.log("❌ No exercise selected - exercise_id is empty");
        return;
      }
    }

    try {
      let selectedExercise = null;

      // For complex exercise types, we don't need a main selectedExercise
      if (
        ["tabata", "circuit", "giant_set", "superset"].includes(
          newExercise.exercise_type
        )
      ) {
        console.log(
          "🔍 Complex exercise type - no main selectedExercise needed"
        );
      } else {
        selectedExercise = availableExercises.find(
          (ex) => ex.id === newExercise.exercise_id
        );
        console.log("🔍 Selected exercise:", selectedExercise);

        if (!selectedExercise) {
          console.log("❌ Selected exercise not found in available exercises");
          return;
        }
      }

      // Helper function to clean numeric values
      const cleanNumeric = (value: any, defaultValue: any = null) => {
        if (value === "" || value === null || value === undefined)
          return defaultValue;
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      // Helper function to preserve empty strings for form fields
      const cleanNumericForForm = (value: any) => {
        if (value === "" || value === null || value === undefined) return "";
        // Use Math.round to ensure we get the exact integer value
        const parsed = Math.round(parseFloat(value));
        return isNaN(parsed) ? "" : parsed.toString();
      };

      // Helper function to clean string fields
      const cleanStringForForm = (value: any) => {
        if (value === null || value === undefined) return "";
        return value.toString();
      };

      const newWorkoutExercise = {
        id: `temp-${Date.now()}`,
        exercise_id: newExercise.exercise_id,
        exercise_type: newExercise.exercise_type || "",
        order_index: exercises.length + 1,
        sets: cleanNumericForForm(newExercise.sets),
        reps: cleanStringForForm(newExercise.reps),
        rest_seconds: cleanNumericForForm(newExercise.rest_seconds),
        rir: cleanNumericForForm(newExercise.rir),
        tempo: cleanStringForForm(newExercise.tempo),
        notes: newExercise.notes,
        // AMRAP specific
        amrap_duration: cleanNumericForForm(newExercise.amrap_duration),
        // EMOM specific
        work_seconds: cleanNumericForForm(newExercise.work_seconds),
        emom_duration: cleanNumericForForm(newExercise.emom_duration),
        emom_mode: newExercise.emom_mode,
        emom_reps: cleanNumericForForm(newExercise.emom_reps),
        // Tabata specific
        rounds: cleanNumericForForm(newExercise.rounds),
        tabata_sets: newExercise.tabata_sets,
        rest_after: cleanNumericForForm(newExercise.rest_after),
        rest_after_set: cleanNumericForForm(
          (newExercise as any).rest_after_set
        ),
        // Drop set specific
        drop_percentage: cleanNumericForForm(newExercise.drop_percentage),
        drop_set_reps: cleanStringForForm(newExercise.drop_set_reps),
        // Superset specific
        superset_exercise_id: newExercise.superset_exercise_id,
        superset_reps: cleanStringForForm(newExercise.superset_reps),
        superset_load_percentage: cleanNumericForForm(
          (newExercise as any).superset_load_percentage
        ),
        // Giant set specific
        giant_set_exercises: newExercise.giant_set_exercises,
        // Cluster set specific
        cluster_reps: cleanNumericForForm(newExercise.cluster_reps),
        clusters_per_set: cleanNumericForForm(newExercise.clusters_per_set),
        intra_cluster_rest: cleanNumericForForm(newExercise.intra_cluster_rest),
        // Rest-pause specific
        rest_pause_duration: cleanNumericForForm(
          newExercise.rest_pause_duration
        ),
        max_rest_pauses: cleanNumericForForm(newExercise.max_rest_pauses),

        // Pre-exhaustion specific
        compound_exercise_id: newExercise.compound_exercise_id,
        isolation_reps: cleanStringForForm(newExercise.isolation_reps),
        compound_reps: cleanStringForForm(newExercise.compound_reps),
        compound_load_percentage: cleanNumericForForm(
          (newExercise as any).compound_load_percentage
        ),
        // For time specific
        target_reps: cleanNumericForForm(newExercise.target_reps),
        time_cap: cleanNumericForForm(newExercise.time_cap),

        // Load percentage
        load_percentage: cleanNumericForForm(newExercise.load_percentage),
        exercise: selectedExercise || null,
      };

      console.log("🔍 Adding/Updating exercise:", newWorkoutExercise);

      if (editingExerciseId) {
        // Update existing exercise
        console.log("🔍 Updating exercise with ID:", editingExerciseId);
        console.log("🔍 New exercise data:", newWorkoutExercise);
        setExercises((prev) => {
          const updated = prev.map((ex) =>
            ex.id === editingExerciseId
              ? { ...newWorkoutExercise, id: editingExerciseId }
              : ex
          );
          console.log("🔍 Updated existing exercise in array:", updated);
          console.log("🔍 Before update exercises:", prev);
          console.log("🔍 After update exercises:", updated);
          return updated;
        });
        setEditingExerciseId(null);
      } else {
        // Add new exercise
        setExercises((prev) => {
          const updated = [...prev, newWorkoutExercise];
          console.log("🔍 Added new exercise to array:", updated);
          return updated;
        });
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
        tabata_sets: [] as Array<{
          exercises: any[];
          rest_between_sets: string;
        }>,
        load_percentage: "",
      });
      setShowAddExercise(false);
      setEditingExerciseId(null);
    } catch (error) {
      console.error("Error adding exercise:", error);
    }
  };

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
          : ex
      )
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

        // Map exercises to blocks and update block_order
        const blockOrders = updatedExercises
          .map((exercise, index) => {
            // Find the block that contains this exercise
            const block = blocks.find(
              (b) =>
                b.id === exercise.id ||
                (b.exercises && b.exercises.some((e) => e.id === exercise.id))
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
            blockOrders
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
        return "Tabata Circuit";
      case "circuit":
        return "Circuit";
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
            : `${theme.card} ${theme.shadow} rounded-2xl sm:rounded-3xl border ${theme.border}`
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
        {/* Header */}
        <div
          className={`${isPage ? "mb-6" : "sticky top-0"} ${
            isPage ? "" : `${theme.card} border-b ${theme.border}`
          } px-3 py-3 sm:px-6 sm:py-5 ${isPage ? "" : "rounded-t-3xl"}`}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-lg`}
              >
                <Dumbbell className={`w-6 h-6 text-white`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${theme.text}`}>
                  {template
                    ? "Edit Workout Template"
                    : "Create New Workout Template"}
                </h2>
                <p className={`text-xs ${theme.textSecondary}`}>
                  {template
                    ? "Update template details"
                    : "Design a new workout template for your clients"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all duration-200 ${
                theme.textSecondary
              } hover:${theme.text} hover:${
                isDark ? "bg-slate-700" : "bg-slate-100"
              }`}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div
          className={`flex-1 ${
            isPage ? "overflow-y-visible" : "overflow-y-auto"
          } ${isPage ? "px-0" : "px-3"} pb-4 ${
            isPage ? "sm:px-0" : "sm:px-6"
          } sm:pb-6`}
        >
          <form
            onSubmit={handleSubmit}
            className={`space-y-2 sm:space-y-3 ${isPage ? "" : "pt-3"}`}
          >
            {/* Enhanced Schema Status Banner */}
            <div
              className={`${theme.card} border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 rounded-xl p-4 mb-6`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-800">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    Enhanced Training Programs
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Now using improved schema with dedicated exercise types and
                    progress tracking
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <Card
              className={`${theme.card} border ${theme.border} rounded-2xl`}
            >
              <CardHeader className="p-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-lg`}
                  >
                    <Info className={`w-4 h-4 text-white`} />
                  </div>
                  <CardTitle className={`text-lg font-bold ${theme.text}`}>
                    Template Details
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-0 space-y-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className={`text-sm font-medium ${theme.text}`}
                  >
                    Template Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Upper Body Strength"
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className={`text-sm font-medium ${theme.text}`}
                  >
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Brief description of this workout template..."
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Template Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Category Selection */}
              <Card
                className={`${theme.card} border ${theme.border} rounded-xl`}
              >
                <CardHeader className="p-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`p-1 rounded-md bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-md`}
                    >
                      <Target className={`w-3 h-3 text-white`} />
                    </div>
                    <CardTitle
                      className={`text-sm font-semibold ${theme.text}`}
                    >
                      Category
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <Select
                    value={formData.categoryId}
                    onValueChange={(categoryId) => {
                      const selectedCategory = categories.find(
                        (c) => c.id === categoryId
                      );
                      setFormData((prev) => ({
                        ...prev,
                        categoryId: categoryId,
                        category: selectedCategory?.name || "general",
                      }));
                    }}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat.id}
                          value={cat.id}
                          className="rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: cat.color || "#6B7280",
                              }}
                            />
                            {cat.name || "Category"}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Duration Selection */}
              <Card
                className={`${theme.card} border ${theme.border} rounded-xl`}
              >
                <CardHeader className="p-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`p-1 rounded-md bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-md`}
                    >
                      <Clock className={`w-3 h-3 text-white`} />
                    </div>
                    <CardTitle
                      className={`text-sm font-semibold ${theme.text}`}
                    >
                      Duration
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <Select
                    value={formData.estimated_duration.toString()}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimated_duration: parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value.toString()}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Difficulty Level */}
              <Card
                className={`${theme.card} border ${theme.border} rounded-xl`}
              >
                <CardHeader className="p-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`p-1 rounded-md bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-md`}
                    >
                      <Zap className={`w-3 h-3 text-white`} />
                    </div>
                    <CardTitle
                      className={`text-sm font-semibold ${theme.text}`}
                    >
                      Difficulty
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        difficulty_level: value,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            {level.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* Template Preview - Hidden to save space */}
            {false && (
              <Card
                className={`${theme.card} border ${theme.border} rounded-2xl`}
              >
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg`}
                      >
                        <Eye className={`w-5 h-5 text-white`} />
                      </div>
                      <CardTitle className={`text-lg font-bold ${theme.text}`}>
                        Template Preview
                      </CardTitle>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className={`p-2 rounded-xl transition-all duration-200 ${
                        theme.textSecondary
                      } hover:${theme.text} hover:${
                        isDark ? "bg-slate-700" : "bg-slate-100"
                      }`}
                    >
                      {showPreview ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {(() => {
                  console.log("🔍 Preview section check:", {
                    showPreview,
                    exercisesCount: exercises.length,
                  });
                  return (
                    showPreview && (
                      <CardContent className="p-6 pt-0">
                        <div
                          className={`p-6 border ${theme.border} rounded-2xl ${
                            isDark
                              ? "bg-slate-800"
                              : "bg-gradient-to-br from-slate-50 to-slate-100"
                          }`}
                        >
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3
                                  className={`text-xl font-bold ${theme.text}`}
                                >
                                  {formData.name || "Template Name"}
                                </h3>
                                <p
                                  className={`text-sm ${theme.textSecondary} mt-1`}
                                >
                                  {formData.description ||
                                    "Template description will appear here"}
                                </p>
                              </div>
                              <div
                                className={`flex items-center gap-1 px-3 py-1 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white"
                                }`}
                              >
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor:
                                      categories.find(
                                        (c) =>
                                          c.id === formData.category ||
                                          c.name === formData.category
                                      )?.color || "#6B7280",
                                  }}
                                />
                                <span
                                  className={`text-xs font-medium ${theme.textSecondary}`}
                                >
                                  {categories.find(
                                    (c) =>
                                      c.id === formData.category ||
                                      c.name === formData.category
                                  )?.name ||
                                    formData.category ||
                                    "Category"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <div
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white"
                                }`}
                              >
                                <Clock
                                  className={`w-4 h-4 ${theme.textSecondary}`}
                                />
                                <span
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  {formData.estimated_duration} min
                                </span>
                              </div>
                              <div
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                                  isDark ? "bg-slate-700" : "bg-white"
                                }`}
                              >
                                <Target
                                  className={`w-4 h-4 ${theme.textSecondary}`}
                                />
                                <span
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  {formData.difficulty_level}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`p-4 rounded-xl ${
                                isDark ? "bg-slate-700" : "bg-white"
                              } border ${theme.border}`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Plus
                                  className={`w-4 h-4 ${theme.textSecondary}`}
                                />
                                <span
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Exercises ({exercises.length})
                                </span>
                              </div>
                              {(() => {
                                console.log("🔍 Exercise list debug:", {
                                  exercisesCount: exercises.length,
                                  exercises: exercises.map((ex) => ({
                                    id: ex.id,
                                    type: ex.exercise_type,
                                    name: ex.exercise?.name || "No exercise",
                                  })),
                                });
                                return null;
                              })()}
                              {exercises.length > 0 ? (
                                <div className="space-y-2">
                                  {exercises.map((exercise, index) => {
                                    console.log(
                                      "🔍 Rendering exercise:",
                                      exercise.id,
                                      "type:",
                                      exercise.exercise_type
                                    );
                                    return (
                                      <div
                                        key={exercise.id}
                                        className={`p-3 rounded-lg border ${
                                          theme.border
                                        } ${
                                          isDark
                                            ? "bg-slate-600"
                                            : "bg-slate-50"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`text-sm font-medium ${theme.text}`}
                                              >
                                                {index + 1}.{" "}
                                                {getExerciseTypeDisplay(
                                                  exercise
                                                )}
                                              </span>
                                              {exercise.exercise_type ===
                                                "tabata" &&
                                                exercise.tabata_sets && (
                                                  <span
                                                    className={`text-xs px-2 py-1 rounded-full ${
                                                      isDark
                                                        ? "bg-purple-600"
                                                        : "bg-purple-100"
                                                    } text-purple-600 dark:text-purple-300`}
                                                  >
                                                    {
                                                      exercise.tabata_sets
                                                        .length
                                                    }{" "}
                                                    sets
                                                  </span>
                                                )}
                                            </div>
                                            {exercise.exercise_type ===
                                              "tabata" &&
                                              exercise.tabata_sets &&
                                              Array.isArray(
                                                exercise.tabata_sets
                                              ) && (
                                                <div
                                                  className={`text-xs ${theme.textSecondary} mt-1`}
                                                >
                                                  {exercise.tabata_sets
                                                    .filter((set: any) =>
                                                      Array.isArray(
                                                        set.exercises
                                                      )
                                                    )
                                                    .map(
                                                      (set: any) =>
                                                        set.exercises?.length ||
                                                        0
                                                    )
                                                    .reduce(
                                                      (a: number, b: number) =>
                                                        a + b,
                                                      0
                                                    )}{" "}
                                                  exercises total
                                                </div>
                                              )}
                                            {exercise.exercise_type ===
                                              "circuit" &&
                                              exercise.circuit_sets &&
                                              Array.isArray(
                                                exercise.circuit_sets
                                              ) && (
                                                <div
                                                  className={`text-xs ${theme.textSecondary} mt-1`}
                                                >
                                                  {exercise.circuit_sets.length}{" "}
                                                  sets •{" "}
                                                  {exercise.circuit_sets
                                                    .filter((set: any) =>
                                                      Array.isArray(
                                                        set.exercises
                                                      )
                                                    )
                                                    .map(
                                                      (set: any) =>
                                                        set.exercises?.length ||
                                                        0
                                                    )
                                                    .reduce(
                                                      (a: number, b: number) =>
                                                        a + b,
                                                      0
                                                    )}{" "}
                                                  exercises total
                                                </div>
                                              )}
                                            {exercise.exercise_type ===
                                              "emom" &&
                                              exercise.emom_mode ===
                                                "rep_based" &&
                                              exercise.emom_reps && (
                                                <div
                                                  className={`text-xs ${theme.textSecondary} mt-1`}
                                                >
                                                  {exercise.emom_reps} reps/min
                                                  •{" "}
                                                  {exercise.emom_duration || 0}{" "}
                                                  min
                                                </div>
                                              )}
                                            {exercise.exercise_type ===
                                              "emom" &&
                                              exercise.emom_mode ===
                                                "time_based" &&
                                              exercise.work_seconds && (
                                                <div
                                                  className={`text-xs ${theme.textSecondary} mt-1`}
                                                >
                                                  {exercise.work_seconds}s work
                                                  •{" "}
                                                  {exercise.emom_duration || 0}{" "}
                                                  min
                                                </div>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                editExercise(exercise)
                                              }
                                              className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                removeExercise(exercise.id)
                                              }
                                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className={`text-sm ${theme.textSecondary}`}>
                                  No exercises added yet
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )
                  );
                })()}
              </Card>
            )}

            {/* Unified Workout Structure */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row w-full items-start sm:items-center gap-3 sm:gap-2 sm:justify-between">
                <h3 className={`text-xl font-bold ${theme.text}`}>
                  Workout Flow ({workoutItems.length} items)
                </h3>
                <Button
                  type="button"
                  onClick={() => setShowAddExercise(true)}
                  className={`${theme.primary} ${theme.shadow} rounded-xl px-6 py-3 hover:scale-105 transition-all duration-200 w-full sm:w-auto justify-center`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exercise
                </Button>
              </div>

              {exercises.length > 0 ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="exercises-list">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="w-full space-y-3"
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
                                    <div className="hidden sm:flex mt-4 cursor-grab active:cursor-grabbing flex-shrink-0">
                                      <GripVertical className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="flex-1">
                                      <ExerciseBlockCard
                                        exercise={exercise}
                                        index={index}
                                        availableExercises={availableExercises}
                                        onDelete={removeExercise}
                                        renderMode="form"
                                      >
                                        <ExerciseDetailForm
                                          exercise={exercise}
                                          onChange={(updated) =>
                                            updateExerciseAtIndex(
                                              index,
                                              updated
                                            )
                                          }
                                          availableExercises={
                                            availableExercises
                                          }
                                          mode="inline"
                                        />
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
                <div
                  className={`p-6 border-2 border-dashed ${theme.border} rounded-2xl text-center`}
                >
                  <Dumbbell
                    className={`w-12 h-12 mx-auto mb-4 ${theme.textSecondary}`}
                  />
                  <h3 className={`text-lg font-bold ${theme.text} mb-2`}>
                    Empty Workout
                  </h3>
                  <p className={`text-sm ${theme.textSecondary} mb-4`}>
                    Start building your workout by adding exercises and blocks
                    in any order you want!
                  </p>
                  <Button
                    type="button"
                    onClick={() => setShowAddExercise(true)}
                    className={`${theme.primary} ${theme.shadow} rounded-xl px-6 py-3 hover:scale-105 transition-all duration-200 w-full sm:w-auto justify-center`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Exercise
                  </Button>
                </div>
              )}
            </div>

            {/* Add Exercise Modal */}
            {showAddExercise && (
              <Card
                className={`${theme.card} border ${theme.border} rounded-2xl`}
              >
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          isDark ? "bg-slate-700" : "bg-green-100"
                        }`}
                      >
                        <Plus
                          className={`w-5 h-5 ${
                            isDark ? "text-green-400" : "text-green-600"
                          }`}
                        />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>
                        Add Exercise
                      </CardTitle>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddExercise(false);
                        setEditingExerciseId(null);
                      }}
                      className={`p-2 rounded-xl transition-all duration-200 ${
                        theme.textSecondary
                      } hover:${theme.text} hover:${
                        isDark ? "bg-slate-700" : "bg-slate-100"
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <div className="space-y-6">
                    <div>
                      <Label
                        htmlFor="exercise-type"
                        className={`text-sm font-medium ${theme.text}`}
                      >
                        Exercise Type
                      </Label>
                      <Select
                        value={newExercise.exercise_type || ""}
                        onValueChange={(value) => {
                          console.log("🔍 Exercise type changed to:", value);
                          setNewExercise({
                            ...newExercise,
                            exercise_type: value,
                          });
                        }}
                      >
                        <SelectTrigger className="mt-2 rounded-xl">
                          <SelectValue placeholder="Select exercise type" />
                        </SelectTrigger>
                        <SelectContent className="z-[99999] max-h-60">
                          <SelectItem
                            value="straight_set"
                            className="rounded-lg"
                          >
                            Straight Set
                          </SelectItem>
                          <SelectItem value="superset" className="rounded-lg">
                            Superset
                          </SelectItem>
                          <SelectItem value="giant_set" className="rounded-lg">
                            Giant Set
                          </SelectItem>
                          <SelectItem value="drop_set" className="rounded-lg">
                            Drop Set
                          </SelectItem>
                          <SelectItem
                            value="cluster_set"
                            className="rounded-lg"
                          >
                            Cluster Set
                          </SelectItem>
                          <SelectItem value="rest_pause" className="rounded-lg">
                            Rest-Pause
                          </SelectItem>

                          <SelectItem
                            value="pre_exhaustion"
                            className="rounded-lg"
                          >
                            Pre-Exhaustion
                          </SelectItem>
                          <SelectItem value="amrap" className="rounded-lg">
                            AMRAP
                          </SelectItem>
                          <SelectItem value="emom" className="rounded-lg">
                            EMOM
                          </SelectItem>
                          <SelectItem value="tabata" className="rounded-lg">
                            Tabata
                          </SelectItem>
                          <SelectItem value="for_time" className="rounded-lg">
                            For Time
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hide main exercise selector for Tabata and Giant Set */}
                    {!["tabata", "giant_set"].includes(
                      newExercise.exercise_type
                    ) && (
                      <div>
                        <Label
                          htmlFor="exercise"
                          className={`text-sm font-medium ${theme.text}`}
                        >
                          Exercise
                        </Label>
                        <SearchableSelect
                          value={newExercise.exercise_id}
                          onValueChange={(value) => {
                            console.log("🔍 Exercise selected:", value);
                            setNewExercise({
                              ...newExercise,
                              exercise_id: value,
                            });
                          }}
                          placeholder="Search and select an exercise..."
                          items={availableExercises.map((ex) => ({
                            id: ex.id,
                            name: ex.name,
                            description: ex.description,
                          }))}
                          className="mt-2"
                        />
                      </div>
                    )}

                    {/* Dynamic form fields based on exercise type */}
                    {newExercise.exercise_type === "straight_set" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor="sets"
                              className={`text-sm font-medium ${theme.text}`}
                            >
                              Sets
                            </Label>
                            <Input
                              id="sets"
                              type="number"
                              value={
                                newExercise.sets === "" ? "" : newExercise.sets
                              }
                              onChange={(e) =>
                                setNewExercise({
                                  ...newExercise,
                                  sets: handleNumberChange(e.target.value, 0),
                                })
                              }
                              min="1"
                              className="mt-2 rounded-xl"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor="reps"
                              className={`text-sm font-medium ${theme.text}`}
                            >
                              Reps
                            </Label>
                            <Input
                              id="reps"
                              value={newExercise.reps}
                              onChange={(e) =>
                                setNewExercise({
                                  ...newExercise,
                                  reps: e.target.value,
                                })
                              }
                              placeholder="e.g., 10-12"
                              className="mt-2 rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor="rest"
                              className={`text-sm font-medium ${theme.text}`}
                            >
                              Rest (seconds)
                            </Label>
                            <Input
                              id="rest"
                              type="number"
                              value={
                                newExercise.rest_seconds === ""
                                  ? ""
                                  : newExercise.rest_seconds
                              }
                              onChange={(e) =>
                                setNewExercise({
                                  ...newExercise,
                                  rest_seconds: handleNumberChange(
                                    e.target.value,
                                    0
                                  ),
                                })
                              }
                              min="0"
                              className="mt-2 rounded-xl"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor="rir"
                              className={`text-sm font-medium ${theme.text}`}
                            >
                              RIR (Reps in Reserve)
                            </Label>
                            <Input
                              id="rir"
                              type="number"
                              value={
                                newExercise.rir === "" ? "" : newExercise.rir
                              }
                              onChange={(e) =>
                                setNewExercise({
                                  ...newExercise,
                                  rir: handleNumberChange(e.target.value, 0),
                                })
                              }
                              min="0"
                              className="mt-2 rounded-xl"
                            />
                          </div>
                        </div>

                        <div>
                          <Label
                            htmlFor="tempo"
                            className={`text-sm font-medium ${theme.text}`}
                          >
                            Tempo
                          </Label>
                          <Input
                            id="tempo"
                            value={newExercise.tempo}
                            onChange={(e) =>
                              setNewExercise({
                                ...newExercise,
                                tempo: e.target.value,
                              })
                            }
                            placeholder="e.g., 2-0-1-0"
                            className="mt-2 rounded-xl"
                          />
                          <p className={`text-xs ${theme.textSecondary} mt-1`}>
                            Format: eccentric-pause-concentric-pause
                          </p>
                        </div>
                      </div>
                    )}

                    {newExercise.exercise_type === "superset" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                          <h4
                            className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
                          >
                            <Zap className="w-4 h-4 text-purple-600" />
                            Superset Configuration
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} mb-4`}>
                            Select the second exercise for your superset pair
                          </p>
                          <div>
                            <Label
                              htmlFor="superset-exercise"
                              className={`text-sm font-medium ${theme.text}`}
                            >
                              Second Exercise
                            </Label>
                            <SearchableSelect
                              value={newExercise.superset_exercise_id}
                              onValueChange={(value) =>
                                setNewExercise({
                                  ...newExercise,
                                  superset_exercise_id: value,
                                })
                              }
                              placeholder="Search and select second exercise..."
                              items={availableExercises.map((ex) => ({
                                id: ex.id,
                                name: ex.name,
                                description: ex.description,
                              }))}
                              className="mt-2"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Sets
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.sets === ""
                                    ? ""
                                    : newExercise.sets
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    sets: handleNumberChange(e.target.value, 0),
                                  })
                                }
                                min="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Rest Between Supersets
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.rest_seconds === ""
                                    ? ""
                                    : newExercise.rest_seconds
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    rest_seconds: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="0"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                First Exercise Reps
                              </Label>
                              <Input
                                type="text"
                                value={newExercise.reps || ""}
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    reps: e.target.value,
                                  })
                                }
                                placeholder="e.g., 8-12"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Second Exercise Reps
                              </Label>
                              <Input
                                type="text"
                                value={newExercise.superset_reps || ""}
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    superset_reps: e.target.value,
                                  })
                                }
                                placeholder="e.g., 8-12"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>

                          {/* Load Percentage Fields */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                First Exercise Load %
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.load_percentage === ""
                                    ? ""
                                    : newExercise.load_percentage
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    load_percentage: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                placeholder="e.g., 85"
                                min="0"
                                max="100"
                                step="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Second Exercise Load %
                              </Label>
                              <Input
                                type="number"
                                value={
                                  (newExercise as any)
                                    .superset_load_percentage === ""
                                    ? ""
                                    : (newExercise as any)
                                        .superset_load_percentage
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    superset_load_percentage:
                                      handleNumberChange(e.target.value, 0),
                                  })
                                }
                                placeholder="e.g., 85"
                                min="0"
                                max="100"
                                step="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {newExercise.exercise_type === "amrap" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                          <h4
                            className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
                          >
                            <Rocket className="w-4 h-4 text-purple-600" />
                            AMRAP Configuration
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} mb-4`}>
                            As Many Rounds As Possible - set the time duration
                          </p>
                          <div>
                            <Label
                              htmlFor="amrap-duration"
                              className={`text-sm font-medium ${theme.text}`}
                            >
                              Duration (minutes)
                            </Label>
                            <Input
                              id="amrap-duration"
                              type="number"
                              value={
                                newExercise.amrap_duration === ""
                                  ? ""
                                  : newExercise.amrap_duration
                              }
                              onChange={(e) =>
                                setNewExercise({
                                  ...newExercise,
                                  amrap_duration: handleNumberChange(
                                    e.target.value,
                                    0
                                  ),
                                })
                              }
                              min="1"
                              className="mt-2 rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {newExercise.exercise_type === "emom" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                          <h4
                            className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
                          >
                            <Timer className="w-4 h-4 text-purple-600" />
                            EMOM Configuration
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} mb-4`}>
                            Every Minute On the Minute - perform work at the
                            start of each minute
                          </p>

                          {/* EMOM Mode Selection */}
                          <div className="mb-4">
                            <Label
                              className={`text-sm font-medium ${theme.text}`}
                            >
                              EMOM Mode
                            </Label>
                            <Select
                              value={newExercise.emom_mode || ""}
                              onValueChange={(value) =>
                                setNewExercise({
                                  ...newExercise,
                                  emom_mode: value,
                                })
                              }
                            >
                              <SelectTrigger className="mt-2 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="time_based">
                                  Time-Based (work for X seconds, rest the
                                  remainder)
                                </SelectItem>
                                <SelectItem value="rep_based">
                                  Rep-Based (complete X reps, rest the
                                  remainder)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {newExercise.emom_mode === "time_based" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Work Duration (seconds)
                                </Label>
                                <Input
                                  type="number"
                                  value={newExercise.work_seconds || ""}
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      work_seconds: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    })
                                  }
                                  min="10"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Total Duration (minutes)
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.emom_duration === ""
                                      ? ""
                                      : newExercise.emom_duration
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      emom_duration: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                            </div>
                          )}

                          {newExercise.emom_mode === "rep_based" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Reps per Minute
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.emom_reps === ""
                                      ? ""
                                      : newExercise.emom_reps
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      emom_reps: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Total Duration (minutes)
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.emom_duration === ""
                                      ? ""
                                      : newExercise.emom_duration
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      emom_duration: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {newExercise.exercise_type === "tabata" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                          <h4
                            className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
                          >
                            <CloudLightning className="w-4 h-4 text-purple-600" />
                            Tabata Circuit Configuration
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} mb-4`}>
                            High-intensity interval training with multiple
                            exercises - fixed timing for all exercises
                          </p>

                          {/* Tabata Timing */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Work (seconds)
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.work_seconds === ""
                                    ? ""
                                    : newExercise.work_seconds
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    work_seconds: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="10"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Rest (seconds)
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.rest_seconds === ""
                                    ? ""
                                    : newExercise.rest_seconds
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    rest_seconds: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="5"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Rounds per Set
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.rounds === ""
                                    ? ""
                                    : newExercise.rounds
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    rounds: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="4"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Rest After Set (seconds)
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.rest_after_set === ""
                                    ? ""
                                    : newExercise.rest_after_set
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    rest_after_set: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="0"
                                placeholder="e.g., 60"
                                className="mt-2 rounded-xl"
                              />
                              <p
                                className={`text-xs ${theme.textSecondary} mt-1`}
                              >
                                Rest time after completing all exercises in each
                                set
                              </p>
                            </div>
                          </div>

                          {/* Sets */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Tabata Sets
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updated = [
                                    ...(newExercise.tabata_sets || []),
                                    {
                                      exercises: [],
                                      rest_between_sets: "",
                                    },
                                  ];
                                  setNewExercise({
                                    ...newExercise,
                                    tabata_sets: updated,
                                  });
                                }}
                                className="border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Set
                              </Button>
                            </div>

                            {(newExercise.tabata_sets || []).map(
                              (set, setIndex) => (
                                <div
                                  key={setIndex}
                                  className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h5 className={`font-medium ${theme.text}`}>
                                      Set {setIndex + 1}
                                    </h5>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const updated = [
                                          ...(newExercise.tabata_sets || []),
                                        ];
                                        updated.splice(setIndex, 1);
                                        setNewExercise({
                                          ...newExercise,
                                          tabata_sets: updated,
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>

                                  {/* Exercises in this set */}
                                  <div className="space-y-2 mb-3">
                                    {(Array.isArray(set.exercises)
                                      ? set.exercises
                                      : []
                                    ).map((exercise, exerciseIndex) => (
                                      <div
                                        key={exerciseIndex}
                                        className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                                      >
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                          <span className="text-xs text-slate-500 w-6">
                                            {exerciseIndex + 1}.
                                          </span>
                                          <div className="flex-1">
                                            <SearchableSelect
                                              value={exercise.exercise_id || ""}
                                              onValueChange={(value) => {
                                                const updated = [
                                                  ...(newExercise.tabata_sets ||
                                                    []),
                                                ];
                                                updated[setIndex].exercises[
                                                  exerciseIndex
                                                ].exercise_id = value;
                                                setNewExercise({
                                                  ...newExercise,
                                                  tabata_sets: updated,
                                                });
                                              }}
                                              placeholder="Search exercise..."
                                              items={availableExercises.map(
                                                (ex) => ({
                                                  id: ex.id,
                                                  name: ex.name,
                                                  description: ex.description,
                                                })
                                              )}
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              const updated = [
                                                ...(newExercise.tabata_sets ||
                                                  []),
                                              ];
                                              updated[
                                                setIndex
                                              ].exercises.splice(
                                                exerciseIndex,
                                                1
                                              );
                                              setNewExercise({
                                                ...newExercise,
                                                tabata_sets: updated,
                                              });
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const updated = [
                                          ...(newExercise.tabata_sets || []),
                                        ];
                                        updated[setIndex].exercises.push({
                                          exercise_id: "",
                                          order:
                                            updated[setIndex].exercises.length +
                                            1,
                                          work_seconds: "",
                                          rest_after: "",
                                        });
                                        setNewExercise({
                                          ...newExercise,
                                          tabata_sets: updated,
                                        });
                                      }}
                                      className="w-full border-dashed text-xs"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add Exercise
                                    </Button>
                                  </div>

                                  {/* Rest between sets */}
                                  <div>
                                    <Label
                                      className={`text-xs font-medium ${theme.text}`}
                                    >
                                      Rest After Set (seconds)
                                    </Label>
                                    <Input
                                      type="number"
                                      value={
                                        set.rest_between_sets === ""
                                          ? ""
                                          : set.rest_between_sets
                                      }
                                      onChange={(e) => {
                                        const updated = [
                                          ...(newExercise.tabata_sets || []),
                                        ];
                                        updated[setIndex].rest_between_sets =
                                          handleNumberChange(e.target.value, 0);
                                        setNewExercise({
                                          ...newExercise,
                                          tabata_sets: updated,
                                        });
                                      }}
                                      min="0"
                                      className="mt-1 rounded-lg text-sm"
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {newExercise.exercise_type === "drop_set" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                          <h4
                            className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
                          >
                            <TrendingDown className="w-4 h-4 text-purple-600" />
                            Drop Set Configuration
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} mb-4`}>
                            Perform to failure, then immediately reduce weight
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Sets
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.sets === ""
                                    ? ""
                                    : newExercise.sets
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    sets: handleNumberChange(e.target.value, 0),
                                  })
                                }
                                min="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Weight Reduction (%)
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.drop_percentage === "" ||
                                  newExercise.drop_percentage === undefined ||
                                  newExercise.drop_percentage === null
                                    ? ""
                                    : String(newExercise.drop_percentage)
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    drop_percentage: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="10"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Exercise Reps
                              </Label>
                              <Input
                                type="text"
                                value={newExercise.reps || ""}
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    reps: e.target.value,
                                  })
                                }
                                placeholder="e.g., 8-12"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Drop Set Reps
                              </Label>
                              <Input
                                type="text"
                                value={newExercise.drop_set_reps || ""}
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    drop_set_reps: e.target.value,
                                  })
                                }
                                placeholder="e.g., 6-10"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {newExercise.exercise_type === "giant_set" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                          <h4
                            className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
                          >
                            <Flame className="w-4 h-4 text-purple-600" />
                            Giant Set Configuration
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} mb-4`}>
                            Multiple exercises performed consecutively with no
                            rest between them
                          </p>

                          {/* Exercise List */}
                          <div className="space-y-3 mb-4">
                            <Label
                              className={`text-sm font-medium ${theme.text}`}
                            >
                              Exercises in Giant Set
                            </Label>
                            {(newExercise.giant_set_exercises || []).map(
                              (exercise, index) => (
                                <div
                                  key={index}
                                  className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-8">
                                      {index + 1}.
                                    </span>
                                    <div className="flex-1">
                                      <SearchableSelect
                                        value={exercise.exercise_id || ""}
                                        onValueChange={(value) => {
                                          const updated = [
                                            ...(newExercise.giant_set_exercises ||
                                              []),
                                          ];
                                          updated[index].exercise_id = value;
                                          setNewExercise({
                                            ...newExercise,
                                            giant_set_exercises: updated,
                                          });
                                        }}
                                        placeholder="Search exercise..."
                                        items={availableExercises.map((ex) => ({
                                          id: ex.id,
                                          name: ex.name,
                                          description: ex.description,
                                        }))}
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const updated = [
                                          ...(newExercise.giant_set_exercises ||
                                            []),
                                        ];
                                        updated.splice(index, 1);
                                        setNewExercise({
                                          ...newExercise,
                                          giant_set_exercises: updated,
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <div className="ml-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <Label
                                        className={`text-xs font-medium ${theme.text}`}
                                      >
                                        Reps
                                      </Label>
                                      <Input
                                        type="text"
                                        value={exercise.reps || ""}
                                        onChange={(e) => {
                                          const updated = [
                                            ...(newExercise.giant_set_exercises ||
                                              []),
                                          ];
                                          updated[index].reps = e.target.value;
                                          setNewExercise({
                                            ...newExercise,
                                            giant_set_exercises: updated,
                                          });
                                        }}
                                        placeholder="e.g., 10-12"
                                        className="mt-1 rounded-lg text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label
                                        className={`text-xs font-medium ${theme.text}`}
                                      >
                                        Load %
                                      </Label>
                                      <Input
                                        type="number"
                                        value={exercise.load_percentage || ""}
                                        onChange={(e) => {
                                          const updated = [
                                            ...(newExercise.giant_set_exercises ||
                                              []),
                                          ];
                                          updated[index].load_percentage =
                                            handleNumberChange(
                                              e.target.value,
                                              0
                                            );
                                          setNewExercise({
                                            ...newExercise,
                                            giant_set_exercises: updated,
                                          });
                                        }}
                                        placeholder="e.g., 85"
                                        min="0"
                                        max="100"
                                        step="1"
                                        className="mt-1 rounded-lg text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )
                            )}

                            {/* Add Exercise Button */}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const updated = [
                                  ...(newExercise.giant_set_exercises || []),
                                  {
                                    exercise_id: "",
                                    sets: "",
                                    reps: "",
                                    load_percentage: "",
                                  },
                                ];
                                setNewExercise({
                                  ...newExercise,
                                  giant_set_exercises: updated,
                                });
                              }}
                              className="w-full border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Exercise to Giant Set
                            </Button>
                          </div>

                          {/* Sets and Rest */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Sets
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.sets === ""
                                    ? ""
                                    : newExercise.sets
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    sets: handleNumberChange(e.target.value, 0),
                                  })
                                }
                                min="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Rest Between Giant Sets
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.rest_seconds === ""
                                    ? ""
                                    : newExercise.rest_seconds
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    rest_seconds: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="0"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {newExercise.exercise_type === "cluster_set" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                          <h4
                            className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
                          >
                            <Link className="w-4 h-4 text-purple-600" />
                            Cluster Set Configuration
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} mb-4`}>
                            Short intra-set rests between small sets of reps
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Sets
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.sets === ""
                                    ? ""
                                    : newExercise.sets
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    sets: handleNumberChange(e.target.value, 0),
                                  })
                                }
                                min="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Rest Between Sets (sec)
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.rest_seconds === ""
                                    ? ""
                                    : newExercise.rest_seconds
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    rest_seconds: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="0"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Reps per Cluster
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.cluster_reps === ""
                                    ? ""
                                    : newExercise.cluster_reps
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    cluster_reps: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Clusters per Set
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.clusters_per_set === ""
                                    ? ""
                                    : newExercise.clusters_per_set
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    clusters_per_set: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Intra-Cluster Rest (sec)
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.intra_cluster_rest === ""
                                    ? ""
                                    : newExercise.intra_cluster_rest
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    intra_cluster_rest: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="5"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {newExercise.exercise_type === "rest_pause" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                          <h4
                            className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
                          >
                            <PauseCircle className="w-4 h-4 text-purple-600" />
                            Rest-Pause Set Configuration
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} mb-4`}>
                            Perform to near failure, rest briefly, then perform
                            more reps
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Sets
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.sets === ""
                                    ? ""
                                    : newExercise.sets
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    sets: handleNumberChange(e.target.value, 0),
                                  })
                                }
                                min="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Rest Between Sets (sec)
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.rest_seconds === ""
                                    ? ""
                                    : newExercise.rest_seconds
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    rest_seconds: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="0"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Rest-Pause Duration (sec)
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.rest_pause_duration === ""
                                    ? ""
                                    : newExercise.rest_pause_duration
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    rest_pause_duration: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="10"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Max Rest-Pauses
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.max_rest_pauses === ""
                                    ? ""
                                    : newExercise.max_rest_pauses
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    max_rest_pauses: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {newExercise.exercise_type === "pre_exhaustion" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                          <h4
                            className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
                          >
                            <Dumbbell className="w-4 h-4 text-purple-600" />
                            Pre-Exhaustion Configuration
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} mb-4`}>
                            Isolation exercise followed by a compound exercise
                            for the same muscle
                          </p>
                          <div className="space-y-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Compound Exercise
                              </Label>
                              <SearchableSelect
                                value={newExercise.compound_exercise_id}
                                onValueChange={(value) =>
                                  setNewExercise({
                                    ...newExercise,
                                    compound_exercise_id: value,
                                  })
                                }
                                placeholder="Search and select compound exercise..."
                                items={availableExercises.map((ex) => ({
                                  id: ex.id,
                                  name: ex.name,
                                  description: ex.description,
                                }))}
                                className="mt-2"
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Sets
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.sets === ""
                                      ? ""
                                      : newExercise.sets
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      sets: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Isolation Reps
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.isolation_reps === ""
                                      ? ""
                                      : newExercise.isolation_reps
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      isolation_reps: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Compound Reps
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.compound_reps === ""
                                      ? ""
                                      : newExercise.compound_reps
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      compound_reps: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Rest Between Pairs
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.rest_seconds === ""
                                      ? ""
                                      : newExercise.rest_seconds
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      rest_seconds: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    })
                                  }
                                  min="0"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                            </div>

                            {/* Load Percentage Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Isolation Exercise Load %
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.load_percentage === ""
                                      ? ""
                                      : newExercise.load_percentage
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      load_percentage: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    })
                                  }
                                  placeholder="e.g., 85"
                                  min="0"
                                  max="100"
                                  step="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme.text}`}
                                >
                                  Compound Exercise Load %
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    (newExercise as any)
                                      .compound_load_percentage === ""
                                      ? ""
                                      : (newExercise as any)
                                          .compound_load_percentage
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      compound_load_percentage:
                                        handleNumberChange(e.target.value, 0),
                                    })
                                  }
                                  placeholder="e.g., 85"
                                  min="0"
                                  max="100"
                                  step="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {newExercise.exercise_type === "for_time" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                          <h4
                            className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
                          >
                            <Activity className="w-4 h-4 text-purple-600" />
                            For Time Configuration
                          </h4>
                          <p className={`text-sm ${theme.textSecondary} mb-4`}>
                            Complete a set amount of work as fast as possible
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Target Reps
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.target_reps === ""
                                    ? ""
                                    : newExercise.target_reps
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    target_reps: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme.text}`}
                              >
                                Time Cap (minutes)
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.time_cap === ""
                                    ? ""
                                    : newExercise.time_cap
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    time_cap: handleNumberChange(
                                      e.target.value,
                                      0
                                    ),
                                  })
                                }
                                min="1"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Common fields for all types */}
                    {/* Hide general load percentage for blocks with individual load percentage fields (superset, giant_set, pre_exhaustion) and time-based blocks (tabata, emom) */}
                    {![
                      "superset",
                      "giant_set",
                      "pre_exhaustion",
                      "tabata",
                      "emom",
                    ].includes(newExercise.exercise_type) && (
                      <div>
                        <Label
                          htmlFor="load_percentage"
                          className={`text-sm font-medium ${theme.text}`}
                        >
                          Load (% of 1RM)
                        </Label>
                        <Input
                          id="load_percentage"
                          type="number"
                          value={
                            newExercise.load_percentage === ""
                              ? ""
                              : newExercise.load_percentage || ""
                          }
                          onChange={(e) =>
                            setNewExercise({
                              ...newExercise,
                              load_percentage:
                                e.target.value === "" ? "" : e.target.value,
                            })
                          }
                          placeholder="e.g., 70"
                          min="0"
                          max="200"
                          step="1"
                          className="mt-2 rounded-xl"
                        />
                        <p className={`text-xs ${theme.textSecondary} mt-1`}>
                          Percentage of estimated 1RM to use for suggested
                          weight (e.g., 70 = 70% of 1RM)
                        </p>
                      </div>
                    )}

                    <div>
                      <Label
                        htmlFor="notes"
                        className={`text-sm font-medium ${theme.text}`}
                      >
                        Notes
                      </Label>
                      <Textarea
                        id="notes"
                        value={newExercise.notes}
                        onChange={(e) =>
                          setNewExercise({
                            ...newExercise,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Add any notes or instructions..."
                        className="mt-2 rounded-xl"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        onClick={() => {
                          addExercise();
                        }}
                        className={`${theme.success} flex items-center gap-2 rounded-xl`}
                      >
                        <Plus className="w-4 h-4" />
                        {editingExerciseId ? "Update Exercise" : "Add Exercise"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddExercise(false);
                          setEditingExerciseId(null);
                        }}
                        className="rounded-xl"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </div>

        {/* Action Buttons */}
        <div
          className={`flex-shrink-0 ${theme.card} border-t ${theme.border} px-6 py-4 rounded-b-3xl`}
        >
          <div className="w-full flex flex-col sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearDraft();
                onClose();
              }}
              className="rounded-xl w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className={`${theme.primary} flex items-center gap-2 rounded-xl w-full sm:w-auto justify-center`}
            >
              <Save className="w-4 h-4" />
              {loading
                ? "Saving..."
                : template
                ? "Update Template"
                : "Create Template"}
            </Button>
          </div>
        </div>
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
