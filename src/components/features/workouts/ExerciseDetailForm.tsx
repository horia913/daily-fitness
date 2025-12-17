"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Plus,
  Zap,
  Rocket,
  Timer,
  CloudLightning,
  TrendingDown,
  Flame,
  PauseCircle,
  Activity,
  BarChart3,
  TrendingUp,
  Dumbbell,
  Link,
  X,
} from "lucide-react";

interface ExerciseDetailFormProps {
  exercise: any;
  onChange: (updatedExercise: any) => void;
  availableExercises: any[];
  mode?: "inline" | "modal";
  allowTypeChange?: boolean;
  allowStructureEditing?: boolean;
}

const complexGroupLabels: Record<string, string> = {
  superset: "Superset Configuration",
  giant_set: "Giant Set Configuration",
  circuit: "Circuit Configuration",
  tabata: "Tabata Circuit Configuration",
  amrap: "AMRAP Configuration",
  emom: "EMOM Configuration",
  emom_reps: "EMOM Configuration",
  rest_pause: "Rest-Pause Configuration",
  cluster_set: "Cluster Set Configuration",
  drop_set: "Drop Set Configuration",
  pre_exhaustion: "Pre-Exhaustion Configuration",
  for_time: "For Time Configuration",
  ladder: "Ladder Configuration",
  pyramid_set: "Pyramid Set Configuration",
};

export default function ExerciseDetailForm({
  exercise,
  onChange,
  availableExercises,
  mode: _mode = "inline",
  allowTypeChange = true,
  allowStructureEditing = true,
}: ExerciseDetailFormProps) {
  const { isDark, getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const handleNumberChange = (value: string, defaultValue: number = 0) => {
    if (value === "") return "";
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? "" : parsed.toString();
  };

  const updateExercise = (updates: Partial<any> | ((current: any) => any)) => {
    if (typeof updates === "function") {
      onChange(updates(exercise));
      return;
    }
    onChange({
      ...exercise,
      ...updates,
    });
  };

  const ensureArray = <T,>(value: T[] | undefined | null): T[] =>
    Array.isArray(value) ? value : [];

  const exerciseType = exercise.exercise_type || "straight_set";

  const exerciseLabel = useMemo(() => {
    switch (exerciseType) {
      case "superset":
        return "Superset";
      case "giant_set":
        return "Giant Set";
      case "circuit":
        return "Circuit";
      case "tabata":
        return "Tabata";
      default:
        return "Exercise";
    }
  }, [exerciseType]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className={`text-sm font-medium ${theme.text}`}>
            Exercise Type
          </Label>
          <Select
            value={exercise.exercise_type || ""}
            onValueChange={(value) => updateExercise({ exercise_type: value })}
            disabled={!allowTypeChange}
          >
            <SelectTrigger
              className="mt-2 rounded-xl"
              disabled={!allowTypeChange}
            >
              <SelectValue placeholder="Select exercise type" />
            </SelectTrigger>
            <SelectContent className="z-[99999] max-h-60">
              <SelectItem value="straight_set" className="rounded-lg">
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
              <SelectItem value="cluster_set" className="rounded-lg">
                Cluster Set
              </SelectItem>
              <SelectItem value="rest_pause" className="rounded-lg">
                Rest-Pause
              </SelectItem>
              <SelectItem value="pre_exhaustion" className="rounded-lg">
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
              <SelectItem value="circuit" className="rounded-lg">
                Circuit
              </SelectItem>
              <SelectItem value="ladder" className="rounded-lg">
                Ladder
              </SelectItem>
              <SelectItem value="pyramid_set" className="rounded-lg">
                Pyramid Set
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!["tabata", "circuit", "giant_set"].includes(exerciseType) && (
          <div>
            <Label className={`text-sm font-medium ${theme.text}`}>
              {exerciseLabel}
            </Label>
            <SearchableSelect
              value={exercise.exercise_id || ""}
              onValueChange={(value) => updateExercise({ exercise_id: value })}
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
      </div>

      {/* Straight Set */}
      {exerciseType === "straight_set" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className={`text-sm font-medium ${theme.text}`}>
                Sets
              </Label>
              <Input
                type="number"
                value={exercise.sets === "" ? "" : exercise.sets || ""}
                onChange={(e) =>
                  updateExercise({
                    sets: handleNumberChange(e.target.value, 0),
                  })
                }
                min="1"
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label className={`text-sm font-medium ${theme.text}`}>
                Reps
              </Label>
              <Input
                value={exercise.reps || ""}
                onChange={(e) => updateExercise({ reps: e.target.value })}
                placeholder="e.g., 10-12"
                className="mt-2 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className={`text-sm font-medium ${theme.text}`}>
                Rest (seconds)
              </Label>
              <Input
                type="number"
                value={
                  exercise.rest_seconds === ""
                    ? ""
                    : exercise.rest_seconds || ""
                }
                onChange={(e) =>
                  updateExercise({
                    rest_seconds: handleNumberChange(e.target.value, 0),
                  })
                }
                min="0"
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label className={`text-sm font-medium ${theme.text}`}>
                RIR (Reps in Reserve)
              </Label>
              <Input
                type="number"
                value={exercise.rir === "" ? "" : exercise.rir || ""}
                onChange={(e) =>
                  updateExercise({ rir: handleNumberChange(e.target.value, 0) })
                }
                min="0"
                className="mt-2 rounded-xl"
              />
            </div>
          </div>

          <div>
            <Label className={`text-sm font-medium ${theme.text}`}>Tempo</Label>
            <Input
              value={exercise.tempo || ""}
              onChange={(e) => updateExercise({ tempo: e.target.value })}
              placeholder="e.g., 2-0-1-0"
              className="mt-2 rounded-xl"
            />
            <p className={`text-xs ${theme.textSecondary} mt-1`}>
              Format: eccentric-pause-concentric-pause
            </p>
          </div>
        </div>
      )}

      {/* Superset */}
      {exerciseType === "superset" && (
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
              <Label className={`text-sm font-medium ${theme.text}`}>
                Second Exercise
              </Label>
              <SearchableSelect
                value={exercise.superset_exercise_id || ""}
                onValueChange={(value) =>
                  updateExercise({ superset_exercise_id: value })
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
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Sets
                </Label>
                <Input
                  type="number"
                  value={exercise.sets === "" ? "" : exercise.sets || ""}
                  onChange={(e) =>
                    updateExercise({
                      sets: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="1"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Rest Between Supersets
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.rest_seconds === ""
                      ? ""
                      : exercise.rest_seconds || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      rest_seconds: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="0"
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  First Exercise Reps
                </Label>
                <Input
                  value={exercise.reps || ""}
                  onChange={(e) => updateExercise({ reps: e.target.value })}
                  placeholder="e.g., 8-12"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Second Exercise Reps
                </Label>
                <Input
                  value={exercise.superset_reps || ""}
                  onChange={(e) =>
                    updateExercise({ superset_reps: e.target.value })
                  }
                  placeholder="e.g., 8-12"
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AMRAP */}
      {exerciseType === "amrap" && (
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
              <Label className={`text-sm font-medium ${theme.text}`}>
                Duration (minutes)
              </Label>
              <Input
                type="number"
                value={
                  exercise.amrap_duration === ""
                    ? ""
                    : exercise.amrap_duration || ""
                }
                onChange={(e) =>
                  updateExercise({
                    amrap_duration: handleNumberChange(e.target.value, 0),
                  })
                }
                min="1"
                className="mt-2 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* EMOM */}
      {exerciseType === "emom" && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <h4
              className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
            >
              <Timer className="w-4 h-4 text-purple-600" />
              EMOM Configuration
            </h4>
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              Every Minute On the Minute - perform work at the start of each
              minute
            </p>

            <div className="mb-4">
              <Label className={`text-sm font-medium ${theme.text}`}>
                EMOM Mode
              </Label>
              <Select
                value={exercise.emom_mode || ""}
                onValueChange={(value) => updateExercise({ emom_mode: value })}
              >
                <SelectTrigger className="mt-2 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_based">
                    Time-Based (work for X seconds, rest the remainder)
                  </SelectItem>
                  <SelectItem value="rep_based">
                    Rep-Based (complete X reps, rest the remainder)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exercise.emom_mode === "time_based" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className={`text-sm font-medium ${theme.text}`}>
                    Work Duration (seconds)
                  </Label>
                  <Input
                    type="number"
                    value={
                      exercise.work_seconds === ""
                        ? ""
                        : exercise.work_seconds || ""
                    }
                    onChange={(e) =>
                      updateExercise({
                        work_seconds: handleNumberChange(e.target.value, 0),
                      })
                    }
                    min="10"
                    className="mt-2 rounded-xl"
                  />
                </div>
                <div>
                  <Label className={`text-sm font-medium ${theme.text}`}>
                    Total Duration (minutes)
                  </Label>
                  <Input
                    type="number"
                    value={
                      exercise.emom_duration === ""
                        ? ""
                        : exercise.emom_duration || ""
                    }
                    onChange={(e) =>
                      updateExercise({
                        emom_duration: handleNumberChange(e.target.value, 0),
                      })
                    }
                    min="1"
                    className="mt-2 rounded-xl"
                  />
                </div>
              </div>
            )}

            {exercise.emom_mode === "rep_based" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className={`text-sm font-medium ${theme.text}`}>
                    Reps per Minute
                  </Label>
                  <Input
                    type="number"
                    value={
                      exercise.emom_reps === "" ? "" : exercise.emom_reps || ""
                    }
                    onChange={(e) =>
                      updateExercise({
                        emom_reps: handleNumberChange(e.target.value, 0),
                      })
                    }
                    min="1"
                    className="mt-2 rounded-xl"
                  />
                </div>
                <div>
                  <Label className={`text-sm font-medium ${theme.text}`}>
                    Total Duration (minutes)
                  </Label>
                  <Input
                    type="number"
                    value={
                      exercise.emom_duration === ""
                        ? ""
                        : exercise.emom_duration || ""
                    }
                    onChange={(e) =>
                      updateExercise({
                        emom_duration: handleNumberChange(e.target.value, 0),
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

      {/* Tabata */}
      {exerciseType === "tabata" && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <h4
              className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
            >
              <CloudLightning className="w-4 h-4 text-purple-600" />
              Tabata Circuit Configuration
            </h4>
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              High-intensity interval training with multiple exercises - fixed
              timing for all exercises
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Work (seconds)
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.work_seconds === ""
                      ? ""
                      : exercise.work_seconds || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      work_seconds: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="10"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Rest (seconds)
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.rest_seconds === ""
                      ? ""
                      : exercise.rest_seconds || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      rest_seconds: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="5"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Rounds per Set
                </Label>
                <Input
                  type="number"
                  value={exercise.rounds === "" ? "" : exercise.rounds || ""}
                  onChange={(e) =>
                    updateExercise({
                      rounds: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="4"
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Tabata Sets
                </Label>
                {allowStructureEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateExercise((current: any) => {
                        const tabataSets = ensureArray(current.tabata_sets);
                        return {
                          ...current,
                          tabata_sets: [
                            ...tabataSets,
                            {
                              exercises: [],
                              rest_between_sets: "",
                            },
                          ],
                        };
                      })
                    }
                    className="border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Set
                  </Button>
                )}
              </div>

              {ensureArray(exercise.tabata_sets).map(
                (set: any, setIndex: number) => (
                  <div
                    key={setIndex}
                    className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h5 className={`font-medium ${theme.text}`}>
                        Set {setIndex + 1}
                      </h5>
                      {allowStructureEditing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateExercise((current: any) => {
                              const tabataSets = ensureArray(
                                current.tabata_sets
                              );
                              const updated = tabataSets.filter(
                                (_: any, idx: number) => idx !== setIndex
                              );
                              return {
                                ...current,
                                tabata_sets: updated,
                              };
                            })
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      {ensureArray(set?.exercises).map(
                        (setExercise: any, exerciseIndex: number) => (
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
                                  value={setExercise.exercise_id || ""}
                                  onValueChange={(value) =>
                                    updateExercise((current: any) => {
                                      const tabataSets = ensureArray(
                                        current.tabata_sets
                                      );
                                      const setsCopy = tabataSets.map(
                                        (tabataSet: any, idx: number) =>
                                          idx === setIndex
                                            ? {
                                                ...tabataSet,
                                                exercises: ensureArray(
                                                  tabataSet.exercises
                                                ).map(
                                                  (
                                                    item: any,
                                                    innerIdx: number
                                                  ) =>
                                                    innerIdx === exerciseIndex
                                                      ? {
                                                          ...item,
                                                          exercise_id: value,
                                                        }
                                                      : item
                                                ),
                                              }
                                            : tabataSet
                                      );
                                      return {
                                        ...current,
                                        tabata_sets: setsCopy,
                                      };
                                    })
                                  }
                                  placeholder="Search exercise..."
                                  items={availableExercises.map((ex) => ({
                                    id: ex.id,
                                    name: ex.name,
                                    description: ex.description,
                                  }))}
                                />
                              </div>
                              {allowStructureEditing && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateExercise((current: any) => {
                                      const tabataSets = ensureArray(
                                        current.tabata_sets
                                      );
                                      const setsCopy = tabataSets.map(
                                        (tabataSet: any, idx: number) =>
                                          idx === setIndex
                                            ? {
                                                ...tabataSet,
                                                exercises: ensureArray(
                                                  tabataSet.exercises
                                                ).filter(
                                                  (_: any, innerIdx: number) =>
                                                    innerIdx !== exerciseIndex
                                                ),
                                              }
                                            : tabataSet
                                      );
                                      return {
                                        ...current,
                                        tabata_sets: setsCopy,
                                      };
                                    })
                                  }
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      )}

                      {allowStructureEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateExercise((current: any) => {
                              const tabataSets = ensureArray(
                                current.tabata_sets
                              );
                              const setsCopy = tabataSets.map(
                                (tabataSet: any, idx: number) =>
                                  idx === setIndex
                                    ? {
                                        ...tabataSet,
                                        exercises: [
                                          ...ensureArray(tabataSet.exercises),
                                          {
                                            exercise_id: "",
                                            order:
                                              ensureArray(tabataSet.exercises)
                                                .length + 1,
                                            work_seconds: "",
                                            rest_after: "",
                                          },
                                        ],
                                      }
                                    : tabataSet
                              );
                              return {
                                ...current,
                                tabata_sets: setsCopy,
                              };
                            })
                          }
                          className="w-full border-dashed text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Exercise
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label className={`text-xs font-medium ${theme.text}`}>
                        Rest After Set (seconds)
                      </Label>
                      <Input
                        type="number"
                        value={
                          set?.rest_between_sets === ""
                            ? ""
                            : set?.rest_between_sets || ""
                        }
                        onChange={(e) =>
                          updateExercise((current: any) => {
                            const tabataSets = ensureArray(current.tabata_sets);
                            const setsCopy = tabataSets.map(
                              (tabataSet: any, idx: number) =>
                                idx === setIndex
                                  ? {
                                      ...tabataSet,
                                      rest_between_sets: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    }
                                  : tabataSet
                            );
                            return {
                              ...current,
                              tabata_sets: setsCopy,
                            };
                          })
                        }
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

      {/* Drop Set */}
      {exerciseType === "drop_set" && (
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
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Main Reps
                </Label>
                <Input
                  value={exercise.exercise_reps || ""}
                  onChange={(e) =>
                    updateExercise({ exercise_reps: e.target.value })
                  }
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Drop Reps
                </Label>
                <Input
                  value={exercise.drop_set_reps || ""}
                  onChange={(e) =>
                    updateExercise({ drop_set_reps: e.target.value })
                  }
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Weight Drop %
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.drop_percentage === ""
                      ? ""
                      : exercise.drop_percentage || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      drop_percentage: handleNumberChange(e.target.value, 0),
                    })
                  }
                  placeholder="20"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Rest (seconds)
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.rest_seconds === ""
                      ? ""
                      : exercise.rest_seconds || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      rest_seconds: handleNumberChange(e.target.value, 0),
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

      {/* Giant Set */}
      {exerciseType === "giant_set" && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <h4
              className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
            >
              <Flame className="w-4 h-4 text-purple-600" />
              Giant Set Configuration
            </h4>
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              Multiple exercises performed consecutively with no rest between
              them
            </p>

            <div className="space-y-3 mb-4">
              <Label className={`text-sm font-medium ${theme.text}`}>
                Exercises in Giant Set
              </Label>
              {ensureArray(exercise.giant_set_exercises).map(
                (gsExercise: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-8">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <SearchableSelect
                          value={gsExercise.exercise_id || ""}
                          onValueChange={(value) =>
                            updateExercise((current: any) => {
                              const exercisesArr = ensureArray(
                                current.giant_set_exercises
                              );
                              const updated = exercisesArr.map(
                                (item: any, idx: number) =>
                                  idx === index
                                    ? { ...item, exercise_id: value }
                                    : item
                              );
                              return {
                                ...current,
                                giant_set_exercises: updated,
                              };
                            })
                          }
                          placeholder="Search exercise..."
                          items={availableExercises.map((ex) => ({
                            id: ex.id,
                            name: ex.name,
                            description: ex.description,
                          }))}
                        />
                      </div>
                      {allowStructureEditing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateExercise((current: any) => {
                              const exercisesArr = ensureArray(
                                current.giant_set_exercises
                              );
                              return {
                                ...current,
                                giant_set_exercises: exercisesArr.filter(
                                  (_: any, idx: number) => idx !== index
                                ),
                              };
                            })
                          }
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="ml-10">
                      <Label className={`text-xs font-medium ${theme.text}`}>
                        Reps
                      </Label>
                      <Input
                        type="text"
                        value={gsExercise.reps || ""}
                        onChange={(e) =>
                          updateExercise((current: any) => {
                            const exercisesArr = ensureArray(
                              current.giant_set_exercises
                            );
                            const updated = exercisesArr.map(
                              (item: any, idx: number) =>
                                idx === index
                                  ? { ...item, reps: e.target.value }
                                  : item
                            );
                            return {
                              ...current,
                              giant_set_exercises: updated,
                            };
                          })
                        }
                        placeholder="e.g., 10-12"
                        className="mt-1 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )
              )}

              {allowStructureEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    updateExercise((current: any) => {
                      const exercisesArr = ensureArray(
                        current.giant_set_exercises
                      );
                      return {
                        ...current,
                        giant_set_exercises: [
                          ...exercisesArr,
                          {
                            exercise_id: "",
                            reps: "",
                          },
                        ],
                      };
                    })
                  }
                  className="w-full border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exercise to Giant Set
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Sets
                </Label>
                <Input
                  type="number"
                  value={exercise.sets === "" ? "" : exercise.sets || ""}
                  onChange={(e) =>
                    updateExercise({
                      sets: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="1"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Rest Between Giant Sets (seconds)
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.rest_seconds === ""
                      ? ""
                      : exercise.rest_seconds || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      rest_seconds: handleNumberChange(e.target.value, 0),
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

      {/* Cluster Set */}
      {exerciseType === "cluster_set" && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Sets
                </Label>
                <Input
                  type="number"
                  value={exercise.sets === "" ? "" : exercise.sets || ""}
                  onChange={(e) =>
                    updateExercise({
                      sets: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="1"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Reps per Cluster
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.cluster_reps === ""
                      ? ""
                      : exercise.cluster_reps || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      cluster_reps: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="1"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Clusters per Set
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.clusters_per_set === ""
                      ? ""
                      : exercise.clusters_per_set || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      clusters_per_set: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="1"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Intra-Cluster Rest (seconds)
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.intra_cluster_rest === ""
                      ? ""
                      : exercise.intra_cluster_rest || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      intra_cluster_rest: handleNumberChange(e.target.value, 0),
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

      {/* Rest-Pause */}
      {exerciseType === "rest_pause" && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <h4
              className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
            >
              <PauseCircle className="w-4 h-4 text-purple-600" />
              Rest-Pause Set Configuration
            </h4>
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              Perform to near failure, rest briefly, then perform more reps
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Rest-Pause Duration (seconds)
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.rest_pause_duration === ""
                      ? ""
                      : exercise.rest_pause_duration || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      rest_pause_duration: handleNumberChange(
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
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Max Pauses
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.max_rest_pauses === ""
                      ? ""
                      : exercise.max_rest_pauses || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      max_rest_pauses: handleNumberChange(e.target.value, 0),
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

      {/* Pre-Exhaustion */}
      {exerciseType === "pre_exhaustion" && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <h4
              className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
            >
              <Dumbbell className="w-4 h-4 text-purple-600" />
              Pre-Exhaustion Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Isolation Exercise
                </Label>
                <SearchableSelect
                  value={exercise.exercise_id || ""}
                  onValueChange={(value) =>
                    updateExercise({ exercise_id: value })
                  }
                  placeholder="Select isolation exercise"
                  items={availableExercises.map((ex) => ({
                    id: ex.id,
                    name: ex.name,
                    description: ex.description,
                  }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Compound Exercise
                </Label>
                <SearchableSelect
                  value={exercise.compound_exercise_id || ""}
                  onValueChange={(value) =>
                    updateExercise({ compound_exercise_id: value })
                  }
                  placeholder="Select compound exercise"
                  items={availableExercises.map((ex) => ({
                    id: ex.id,
                    name: ex.name,
                    description: ex.description,
                  }))}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Sets
                </Label>
                <Input
                  type="number"
                  value={exercise.sets === "" ? "" : exercise.sets || ""}
                  onChange={(e) =>
                    updateExercise({
                      sets: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="1"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Isolation Reps
                </Label>
                <Input
                  value={exercise.isolation_reps || ""}
                  onChange={(e) =>
                    updateExercise({ isolation_reps: e.target.value })
                  }
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Compound Reps
                </Label>
                <Input
                  value={exercise.compound_reps || ""}
                  onChange={(e) =>
                    updateExercise({ compound_reps: e.target.value })
                  }
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Circuit */}
      {exerciseType === "circuit" && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <h4
              className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
            >
              <Activity className="w-4 h-4 text-purple-600" />
              Circuit Configuration
            </h4>
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              Circuit training with variable timing per exercise - flexible work
              and rest periods
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Rounds
                </Label>
                <Input
                  type="number"
                  value={exercise.sets === "" ? "" : exercise.sets || ""}
                  onChange={(e) =>
                    updateExercise({
                      sets: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="1"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Reps
                </Label>
                <Input
                  value={exercise.reps || ""}
                  onChange={(e) => updateExercise({ reps: e.target.value })}
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Rest (seconds)
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.rest_seconds === ""
                      ? ""
                      : exercise.rest_seconds || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      rest_seconds: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="0"
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Circuit Sets
                </Label>
                {allowStructureEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateExercise((current: any) => {
                        const circuitSets = ensureArray(current.circuit_sets);
                        return {
                          ...current,
                          circuit_sets: [
                            ...circuitSets,
                            {
                              exercises: [],
                              rest_between_sets: "",
                            },
                          ],
                        };
                      })
                    }
                    className="border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Set
                  </Button>
                )}
              </div>

              {ensureArray(exercise.circuit_sets).map(
                (set: any, setIndex: number) => (
                  <div
                    key={setIndex}
                    className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h5 className={`font-medium ${theme.text}`}>
                        Set {setIndex + 1}
                      </h5>
                      {allowStructureEditing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateExercise((current: any) => {
                              const circuitSets = ensureArray(
                                current.circuit_sets
                              );
                              const updated = circuitSets.filter(
                                (_: any, idx: number) => idx !== setIndex
                              );
                              return {
                                ...current,
                                circuit_sets: updated,
                              };
                            })
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      {ensureArray(set?.exercises).map(
                        (setExercise: any, exerciseIndex: number) => (
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
                                  value={setExercise.exercise_id || ""}
                                  onValueChange={(value) =>
                                    updateExercise((current: any) => {
                                      const circuitSets = ensureArray(
                                        current.circuit_sets
                                      );
                                      const setsCopy = circuitSets.map(
                                        (circuitSet: any, idx: number) =>
                                          idx === setIndex
                                            ? {
                                                ...circuitSet,
                                                exercises: ensureArray(
                                                  circuitSet.exercises
                                                ).map(
                                                  (
                                                    item: any,
                                                    innerIdx: number
                                                  ) =>
                                                    innerIdx === exerciseIndex
                                                      ? {
                                                          ...item,
                                                          exercise_id: value,
                                                        }
                                                      : item
                                                ),
                                              }
                                            : circuitSet
                                      );
                                      return {
                                        ...current,
                                        circuit_sets: setsCopy,
                                      };
                                    })
                                  }
                                  placeholder="Search exercise..."
                                  items={availableExercises.map((ex) => ({
                                    id: ex.id,
                                    name: ex.name,
                                    description: ex.description,
                                  }))}
                                />
                              </div>
                              {allowStructureEditing && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateExercise((current: any) => {
                                      const circuitSets = ensureArray(
                                        current.circuit_sets
                                      );
                                      const setsCopy = circuitSets.map(
                                        (circuitSet: any, idx: number) =>
                                          idx === setIndex
                                            ? {
                                                ...circuitSet,
                                                exercises: ensureArray(
                                                  circuitSet.exercises
                                                ).filter(
                                                  (_: any, innerIdx: number) =>
                                                    innerIdx !== exerciseIndex
                                                ),
                                              }
                                            : circuitSet
                                      );
                                      return {
                                        ...current,
                                        circuit_sets: setsCopy,
                                      };
                                    })
                                  }
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label
                                  className={`text-xs font-medium ${theme.text}`}
                                >
                                  Sets
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    setExercise.sets === ""
                                      ? ""
                                      : setExercise.sets || ""
                                  }
                                  onChange={(e) =>
                                    updateExercise((current: any) => {
                                      const circuitSets = ensureArray(
                                        current.circuit_sets
                                      );
                                      const setsCopy = circuitSets.map(
                                        (circuitSet: any, idx: number) =>
                                          idx === setIndex
                                            ? {
                                                ...circuitSet,
                                                exercises: ensureArray(
                                                  circuitSet.exercises
                                                ).map(
                                                  (
                                                    item: any,
                                                    innerIdx: number
                                                  ) =>
                                                    innerIdx === exerciseIndex
                                                      ? {
                                                          ...item,
                                                          sets: handleNumberChange(
                                                            e.target.value,
                                                            0
                                                          ),
                                                        }
                                                      : item
                                                ),
                                              }
                                            : circuitSet
                                      );
                                      return {
                                        ...current,
                                        circuit_sets: setsCopy,
                                      };
                                    })
                                  }
                                  min="1"
                                  className="mt-1 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-xs font-medium ${theme.text}`}
                                >
                                  Reps
                                </Label>
                                <Input
                                  value={setExercise.reps || ""}
                                  onChange={(e) =>
                                    updateExercise((current: any) => {
                                      const circuitSets = ensureArray(
                                        current.circuit_sets
                                      );
                                      const setsCopy = circuitSets.map(
                                        (circuitSet: any, idx: number) =>
                                          idx === setIndex
                                            ? {
                                                ...circuitSet,
                                                exercises: ensureArray(
                                                  circuitSet.exercises
                                                ).map(
                                                  (
                                                    item: any,
                                                    innerIdx: number
                                                  ) =>
                                                    innerIdx === exerciseIndex
                                                      ? {
                                                          ...item,
                                                          reps: e.target.value,
                                                        }
                                                      : item
                                                ),
                                              }
                                            : circuitSet
                                      );
                                      return {
                                        ...current,
                                        circuit_sets: setsCopy,
                                      };
                                    })
                                  }
                                  className="mt-1 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-xs font-medium ${theme.text}`}
                                >
                                  Rest (seconds)
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    setExercise.rest_seconds === ""
                                      ? ""
                                      : setExercise.rest_seconds || ""
                                  }
                                  onChange={(e) =>
                                    updateExercise((current: any) => {
                                      const circuitSets = ensureArray(
                                        current.circuit_sets
                                      );
                                      const setsCopy = circuitSets.map(
                                        (circuitSet: any, idx: number) =>
                                          idx === setIndex
                                            ? {
                                                ...circuitSet,
                                                exercises: ensureArray(
                                                  circuitSet.exercises
                                                ).map(
                                                  (
                                                    item: any,
                                                    innerIdx: number
                                                  ) =>
                                                    innerIdx === exerciseIndex
                                                      ? {
                                                          ...item,
                                                          rest_seconds:
                                                            handleNumberChange(
                                                              e.target.value,
                                                              0
                                                            ),
                                                        }
                                                      : item
                                                ),
                                              }
                                            : circuitSet
                                      );
                                      return {
                                        ...current,
                                        circuit_sets: setsCopy,
                                      };
                                    })
                                  }
                                  min="0"
                                  className="mt-1 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      )}

                      {allowStructureEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateExercise((current: any) => {
                              const circuitSets = ensureArray(
                                current.circuit_sets
                              );
                              const setsCopy = circuitSets.map(
                                (circuitSet: any, idx: number) =>
                                  idx === setIndex
                                    ? {
                                        ...circuitSet,
                                        exercises: [
                                          ...ensureArray(circuitSet.exercises),
                                          {
                                            exercise_id: "",
                                            sets: "",
                                            reps: "",
                                            rest_seconds: "",
                                          },
                                        ],
                                      }
                                    : circuitSet
                              );
                              return {
                                ...current,
                                circuit_sets: setsCopy,
                              };
                            })
                          }
                          className="w-full border-dashed text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Exercise
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label className={`text-xs font-medium ${theme.text}`}>
                        Rest After Set (seconds)
                      </Label>
                      <Input
                        type="number"
                        value={
                          set?.rest_between_sets === ""
                            ? ""
                            : set?.rest_between_sets || ""
                        }
                        onChange={(e) =>
                          updateExercise((current: any) => {
                            const circuitSets = ensureArray(
                              current.circuit_sets
                            );
                            const setsCopy = circuitSets.map(
                              (circuitSet: any, idx: number) =>
                                idx === setIndex
                                  ? {
                                      ...circuitSet,
                                      rest_between_sets: handleNumberChange(
                                        e.target.value,
                                        0
                                      ),
                                    }
                                  : circuitSet
                            );
                            return {
                              ...current,
                              circuit_sets: setsCopy,
                            };
                          })
                        }
                        min="0"
                        placeholder="Rest time after completing this set"
                        className="mt-1 rounded-lg text-sm"
                      />
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>
                        Time to rest after completing all exercises in this set
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* For Time */}
      {exerciseType === "for_time" && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Target Reps
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.target_reps === ""
                      ? ""
                      : exercise.target_reps || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      target_reps: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="0"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Time Cap (minutes)
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.time_cap === "" ? "" : exercise.time_cap || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      time_cap: handleNumberChange(e.target.value, 0),
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

      {/* Ladder */}
      {exerciseType === "ladder" && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <h4
              className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
            >
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Ladder Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Rounds
                </Label>
                <Input
                  type="number"
                  value={exercise.rounds === "" ? "" : exercise.rounds || ""}
                  onChange={(e) =>
                    updateExercise({
                      rounds: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="1"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Start Reps
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.start_reps === "" ? "" : exercise.start_reps || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      start_reps: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="0"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Increment per Round
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.increment === "" ? "" : exercise.increment || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      increment: handleNumberChange(e.target.value, 0),
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

      {/* Pyramid Set */}
      {exerciseType === "pyramid_set" && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <h4
              className={`font-semibold ${theme.text} mb-3 flex flex-wrap items-center gap-2`}
            >
              <BarChart3 className="w-4 h-4 text-purple-600" />
              Pyramid Set Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Sets
                </Label>
                <Input
                  type="number"
                  value={exercise.sets === "" ? "" : exercise.sets || ""}
                  onChange={(e) =>
                    updateExercise({
                      sets: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="1"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  Start Reps
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.start_reps === "" ? "" : exercise.start_reps || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      start_reps: handleNumberChange(e.target.value, 0),
                    })
                  }
                  min="0"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label className={`text-sm font-medium ${theme.text}`}>
                  End Reps
                </Label>
                <Input
                  type="number"
                  value={
                    exercise.end_reps === "" ? "" : exercise.end_reps || ""
                  }
                  onChange={(e) =>
                    updateExercise({
                      end_reps: handleNumberChange(e.target.value, 0),
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

      {/* Load Percentage - Common field for all block types */}
      <div>
        <Label className={`text-sm font-medium ${theme.text}`}>
          Load (% of 1RM)
        </Label>
        <Input
          type="number"
          value={
            exercise.load_percentage === ""
              ? ""
              : exercise.load_percentage || ""
          }
          onChange={(e) =>
            updateExercise({
              load_percentage: e.target.value === "" ? "" : e.target.value,
            })
          }
          placeholder="e.g., 70"
          min="0"
          max="200"
          step="1"
          className="mt-2 rounded-xl"
        />
        <p className={`text-xs ${theme.textSecondary} mt-1`}>
          Percentage of estimated 1RM to use for suggested weight (e.g., 70 =
          70% of 1RM)
        </p>
      </div>

      <div>
        <Label className={`text-sm font-medium ${theme.text}`}>Notes</Label>
        <Textarea
          value={exercise.notes || ""}
          onChange={(e) => updateExercise({ notes: e.target.value })}
          placeholder="Add any notes or instructions..."
          className="mt-2 rounded-xl"
          rows={3}
        />
      </div>
    </div>
  );
}
