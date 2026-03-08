'use client';

import React from 'react';
import {
  Card,
  CardContent,
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Dumbbell,
  Zap,
  Rocket,
  Timer,
  CloudLightning,
  TrendingDown,
  Flame,
  Link,
  PauseCircle,
  Activity,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export interface AddExercisePanelProps {
  newExercise: any;
  setNewExercise: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  isDark: boolean;
  isVolumeCalculatorActive: boolean;
  allowedBlockTypes: string[] | null | undefined;
  availableExercises: any[];
  handleNumberChange: (value: string, defaultValue?: number) => string;
  onAddExercise: () => void | Promise<void>;
  editingExerciseId: string | null;
  renderLoadWeightField: (
    loadValue: string | number | null | undefined,
    weightValue: string | number | null | undefined,
    onLoadChange: (value: string) => void,
    onWeightChange: (value: string) => void,
    toggleKey: string,
    label?: string,
    loadPlaceholder?: string,
    weightPlaceholder?: string,
    className?: string
  ) => React.ReactNode;
}

export function AddExercisePanel({
  newExercise,
  setNewExercise,
  onClose,
  isDark,
  isVolumeCalculatorActive,
  allowedBlockTypes,
  availableExercises,
  handleNumberChange,
  onAddExercise,
  editingExerciseId,
  renderLoadWeightField,
}: AddExercisePanelProps) {
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles?.() ?? {};

  return (
              <div style={{ order: 0 }} className="w-full">
                <Card
                  className={`${theme?.card ?? ''} fc-glass fc-card border ${theme?.border ?? ''} rounded-2xl`}
                >
                  <CardHeader className="px-3 py-4 sm:p-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl ${
                            isDark
                              ? "bg-[color:var(--fc-surface-sunken)]"
                              : "bg-green-100"
                          }`}
                        >
                          <Plus
                            className={`w-5 h-5 ${
                              isDark ? "text-green-400" : "text-green-600"
                            }`}
                          />
                        </div>
                        <CardTitle
                          className={`text-lg sm:text-xl font-bold ${theme?.text ?? ''}`}
                        >
                          Add Exercise
                        </CardTitle>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className={`min-w-11 min-h-11 p-3 rounded-xl transition-all duration-200 ${
                          theme?.textSecondary ?? ''
                        } hover:${theme?.text ?? ''} hover:${
                          isDark
                            ? "bg-[color:var(--fc-surface-sunken)]"
                            : "bg-[color:var(--fc-surface-sunken)]"
                        }`}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label
                            htmlFor="exercise-type"
                            className={`text-sm font-medium ${theme?.text ?? ''}`}
                          >
                            Exercise Type
                          </Label>
                          {isVolumeCalculatorActive && (
                            <Badge className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              Volume Calculator Active
                            </Badge>
                          )}
                        </div>
                        <Select
                          value={newExercise.exercise_type || ""}
                          onValueChange={(value) => {
                            console.log(
                              "🔍 Exercise type changed to:",
                              value,
                            );
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
                            {/* Informational message when filtering */}
                            {isVolumeCalculatorActive &&
                              allowedBlockTypes && (
                                <div className="px-2 py-1.5 text-xs text-blue-600 dark:text-blue-400 border-b border-blue-200 dark:border-blue-800">
                                  Volume calculator active - only resistance
                                  training blocks shown
                                </div>
                              )}
                            <SelectGroup>
                              <SelectLabel className="text-xs font-bold uppercase tracking-wider px-2 py-1.5 text-[color:var(--fc-text-dim)]">
                                Standard
                              </SelectLabel>
                              <SelectItem
                                value="straight_set"
                                className="rounded-lg"
                                disabled={
                                  isVolumeCalculatorActive &&
                                  !allowedBlockTypes?.includes("straight_set")
                                }
                              >
                                Straight Set
                              </SelectItem>
                              <SelectItem
                                value="superset"
                                className="rounded-lg"
                                disabled={
                                  isVolumeCalculatorActive &&
                                  !allowedBlockTypes?.includes("superset")
                                }
                              >
                                Superset
                              </SelectItem>
                              <SelectItem
                                value="giant_set"
                                className="rounded-lg"
                                disabled={
                                  isVolumeCalculatorActive &&
                                  !allowedBlockTypes?.includes("giant_set")
                                }
                              >
                                Giant Set
                              </SelectItem>
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel className="text-xs font-bold uppercase tracking-wider px-2 py-1.5 text-[color:var(--fc-text-dim)]">
                                Advanced Techniques
                              </SelectLabel>
                              <SelectItem
                                value="drop_set"
                                className="rounded-lg"
                                disabled={
                                  isVolumeCalculatorActive &&
                                  !allowedBlockTypes?.includes("drop_set")
                                }
                              >
                                Drop Set
                              </SelectItem>
                              <SelectItem
                                value="cluster_set"
                                className="rounded-lg"
                                disabled={
                                  isVolumeCalculatorActive &&
                                  !allowedBlockTypes?.includes("cluster_set")
                                }
                              >
                                Cluster Set
                              </SelectItem>
                              <SelectItem
                                value="rest_pause"
                                className="rounded-lg"
                                disabled={
                                  isVolumeCalculatorActive &&
                                  !allowedBlockTypes?.includes("rest_pause")
                                }
                              >
                                Rest-Pause
                              </SelectItem>
                              <SelectItem
                                value="pre_exhaustion"
                                className="rounded-lg"
                                disabled={
                                  isVolumeCalculatorActive &&
                                  !allowedBlockTypes?.includes("pre_exhaustion")
                                }
                              >
                                Pre-Exhaustion
                              </SelectItem>
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel className="text-xs font-bold uppercase tracking-wider px-2 py-1.5 text-[color:var(--fc-text-dim)]">
                                Time-Based
                              </SelectLabel>
                              <SelectItem
                                value="hr_sets"
                                className="rounded-lg"
                                disabled={
                                  isVolumeCalculatorActive &&
                                  !allowedBlockTypes?.includes("hr_sets")
                                }
                              >
                                HR Sets
                              </SelectItem>
                              {(!isVolumeCalculatorActive ||
                                !allowedBlockTypes) && (
                                <>
                                  <SelectItem
                                    value="amrap"
                                    className="rounded-lg"
                                  >
                                    AMRAP
                                  </SelectItem>
                                  <SelectItem
                                    value="emom"
                                    className="rounded-lg"
                                  >
                                    EMOM
                                  </SelectItem>
                                  <SelectItem
                                    value="tabata"
                                    className="rounded-lg"
                                  >
                                    Tabata
                                  </SelectItem>
                                  <SelectItem
                                    value="for_time"
                                    className="rounded-lg"
                                  >
                                    For Time
                                  </SelectItem>
                                </>
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Hide main exercise selector for Tabata and Giant Set */}
                      {!["tabata", "giant_set"].includes(
                        newExercise.exercise_type,
                      ) && (
                        <div>
                          <Label
                            htmlFor="exercise"
                            className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                        <div className="space-y-5">
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <Dumbbell className="w-4 h-4 text-purple-600" />
                              Straight Set Configuration
                            </h4>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              <div>
                                <Label
                                  htmlFor="sets"
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
                                >
                                  Sets
                                </Label>
                                <Input
                                  id="sets"
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="reps"
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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

                            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-5">
                              <div>
                                <Label
                                  htmlFor="rest"
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
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
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
                                >
                                  RIR
                                </Label>
                                <Input
                                  id="rir"
                                  type="number"
                                  value={
                                    newExercise.rir === ""
                                      ? ""
                                      : newExercise.rir
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      rir: handleNumberChange(
                                        e.target.value,
                                        0,
                                      ),
                                    })
                                  }
                                  min="0"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                            </div>

                            <div className="mt-5">
                              <Label
                                htmlFor="tempo"
                                className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                              <p
                                className={`text-xs ${theme?.textSecondary ?? ''} mt-1`}
                              >
                                Format: eccentric-pause-concentric-pause
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {newExercise.exercise_type === "superset" && (
                        <div className="space-y-4">
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <Zap className="w-4 h-4 text-purple-600" />
                              Superset Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              Select the second exercise for your superset
                              pair
                            </p>
                            <div>
                              <Label
                                htmlFor="superset-exercise"
                                className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="0"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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

                            {/* Load % / Weight Toggle Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                              {renderLoadWeightField(
                                newExercise.load_percentage,
                                newExercise.weight_kg,
                                (value) =>
                                  setNewExercise({
                                    ...newExercise,
                                    load_percentage: value,
                                    weight_kg: "",
                                  }),
                                (value) =>
                                  setNewExercise({
                                    ...newExercise,
                                    weight_kg: value,
                                    load_percentage: "",
                                  }),
                                "superset-first",
                                "First Exercise Load % / Weight",
                              )}
                              {renderLoadWeightField(
                                (newExercise as any).superset_load_percentage,
                                (newExercise as any).superset_weight_kg,
                                (value) =>
                                  setNewExercise({
                                    ...newExercise,
                                    superset_load_percentage: value,
                                    superset_weight_kg: "",
                                  }),
                                (value) =>
                                  setNewExercise({
                                    ...newExercise,
                                    superset_weight_kg: value,
                                    superset_load_percentage: "",
                                  }),
                                "superset-second",
                                "Second Exercise Load % / Weight",
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {newExercise.exercise_type === "amrap" && (
                        <div className="space-y-4">
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <Rocket className="w-4 h-4 text-purple-600" />
                              AMRAP Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              As Many Rounds As Possible - set the time
                              duration
                            </p>
                            <div>
                              <Label
                                htmlFor="amrap-duration"
                                className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                      0,
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
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <Timer className="w-4 h-4 text-purple-600" />
                              EMOM Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              Every Minute On the Minute - perform work at the
                              start of each minute
                            </p>

                            {/* EMOM Mode Selection */}
                            <div className="mb-4">
                              <Label
                                className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                          0,
                                        ),
                                      })
                                    }
                                    min="10"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                          0,
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
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                          0,
                                        ),
                                      })
                                    }
                                    min="1"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                          0,
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
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <CloudLightning className="w-4 h-4 text-purple-600" />
                              Tabata Circuit Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              High-intensity interval training with multiple
                              exercises - fixed timing for all exercises
                            </p>

                            {/* Tabata Timing */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="10"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="5"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="4"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="0"
                                  placeholder="e.g., 60"
                                  className="mt-2 rounded-xl"
                                />
                                <p
                                  className={`text-xs ${theme?.textSecondary ?? ''} mt-1`}
                                >
                                  Rest time after completing all exercises in
                                  each set
                                </p>
                              </div>
                            </div>

                            {/* Sets */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                (set: any, setIndex: number) => (
                                  <div
                                    key={setIndex}
                                    className="px-3 py-4 sm:p-5 fc-surface rounded-lg border border-[color:var(--fc-surface-card-border)]"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <h5
                                        className={`font-medium ${theme?.text ?? ''}`}
                                      >
                                        Set {setIndex + 1}
                                      </h5>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const updated = [
                                            ...(newExercise.tabata_sets ||
                                              []),
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
                                    <div className="space-y-3 mb-4">
                                      {(Array.isArray(set.exercises)
                                        ? set.exercises
                                        : []
                                      ).map((exercise: any, exerciseIndex: number) => (
                                        <div
                                          key={exerciseIndex}
                                          className="px-3 py-4 sm:p-4 rounded-lg border border-[color:var(--fc-surface-card-border)]"
                                          style={{
                                            background:
                                              "var(--fc-surface-sunken)",
                                          }}
                                        >
                                          <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className="text-xs fc-text-dim w-6">
                                              {exerciseIndex + 1}.
                                            </span>
                                            <div className="flex-1">
                                              <SearchableSelect
                                                value={
                                                  exercise.exercise_id || ""
                                                }
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
                                                    description:
                                                      ex.description,
                                                  }),
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
                                                  1,
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
                                            ...(newExercise.tabata_sets ||
                                              []),
                                          ];
                                          updated[setIndex].exercises.push({
                                            exercise_id: "",
                                            order:
                                              updated[setIndex].exercises
                                                .length + 1,
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
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {newExercise.exercise_type === "drop_set" && (
                        <div className="space-y-4">
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <TrendingDown className="w-4 h-4 text-purple-600" />
                              Drop Set Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              Perform to failure, then immediately reduce
                              weight
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
                                >
                                  Weight Reduction (%)
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.drop_percentage === "" ||
                                    newExercise.drop_percentage ===
                                      undefined ||
                                    newExercise.drop_percentage === null
                                      ? ""
                                      : String(newExercise.drop_percentage)
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      drop_percentage: handleNumberChange(
                                        e.target.value,
                                        0,
                                      ),
                                    })
                                  }
                                  min="10"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <Flame className="w-4 h-4 text-purple-600" />
                              Giant Set Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              Multiple exercises performed consecutively with
                              no rest between them
                            </p>

                            {/* Exercise List */}
                            <div className="space-y-4 mb-5">
                              <Label
                                className={`text-sm font-medium ${theme?.text ?? ''}`}
                              >
                                Exercises in Giant Set
                              </Label>
                              {(newExercise.giant_set_exercises || []).map(
                                (exercise: any, index: number) => (
                                  <div
                                    key={index}
                                    className="px-3 py-4 sm:p-4 fc-surface rounded-lg border border-[color:var(--fc-surface-card-border)]"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                      <span className="text-sm font-medium fc-text-dim w-6 sm:w-8">
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
                                            updated[index].exercise_id =
                                              value;
                                            setNewExercise({
                                              ...newExercise,
                                              giant_set_exercises: updated,
                                            });
                                          }}
                                          placeholder="Search exercise..."
                                          items={availableExercises.map(
                                            (ex) => ({
                                              id: ex.id,
                                              name: ex.name,
                                              description: ex.description,
                                            }),
                                          )}
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
                                    <div className="mt-3 grid grid-cols-1 gap-4 sm:ml-8 sm:grid-cols-2">
                                      <div>
                                        <Label
                                          className={`text-xs font-medium ${theme?.text ?? ''}`}
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
                                            updated[index].reps =
                                              e.target.value;
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
                                        {renderLoadWeightField(
                                          exercise.load_percentage,
                                          exercise.weight_kg,
                                          (value) => {
                                            const updated = [
                                              ...(newExercise.giant_set_exercises ||
                                                []),
                                            ];
                                            updated[index] = {
                                              ...updated[index],
                                              load_percentage: value,
                                              weight_kg: "",
                                            };
                                            setNewExercise({
                                              ...newExercise,
                                              giant_set_exercises: updated,
                                            });
                                          },
                                          (value) => {
                                            const updated = [
                                              ...(newExercise.giant_set_exercises ||
                                                []),
                                            ];
                                            updated[index] = {
                                              ...updated[index],
                                              weight_kg: value,
                                              load_percentage: "",
                                            };
                                            setNewExercise({
                                              ...newExercise,
                                              giant_set_exercises: updated,
                                            });
                                          },
                                          `giant-set-exercise-${index}`,
                                          "Load % / Weight",
                                          "e.g., 85",
                                          "e.g., 50",
                                          "sm:col-span-2",
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ),
                              )}

                              {/* Add Exercise Button */}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const updated = [
                                    ...(newExercise.giant_set_exercises ||
                                      []),
                                    {
                                      exercise_id: "",
                                      sets: "",
                                      reps: "",
                                      load_percentage: "",
                                      weight_kg: "",
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
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
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
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <Link className="w-4 h-4 text-purple-600" />
                              Cluster Set Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              Short intra-set rests between small sets of reps
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="0"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
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
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <PauseCircle className="w-4 h-4 text-purple-600" />
                              Rest-Pause Set Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              Perform to near failure, rest briefly, then
                              perform more reps
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="0"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="10"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
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
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <Dumbbell className="w-4 h-4 text-purple-600" />
                              Pre-Exhaustion Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              Isolation exercise followed by a compound
                              exercise for the same muscle
                            </p>
                            <div className="space-y-4">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                          0,
                                        ),
                                      })
                                    }
                                    min="1"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                          0,
                                        ),
                                      })
                                    }
                                    min="1"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                          0,
                                        ),
                                      })
                                    }
                                    min="1"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                          0,
                                        ),
                                      })
                                    }
                                    min="0"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                              </div>

                              {/* Load % / Weight Toggle Fields */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                                {renderLoadWeightField(
                                  newExercise.load_percentage,
                                  newExercise.weight_kg,
                                  (value) =>
                                    setNewExercise({
                                      ...newExercise,
                                      load_percentage: value,
                                      weight_kg: "",
                                    }),
                                  (value) =>
                                    setNewExercise({
                                      ...newExercise,
                                      weight_kg: value,
                                      load_percentage: "",
                                    }),
                                  "pre-exhaustion-isolation",
                                  "Isolation Load % / Weight",
                                )}
                                {renderLoadWeightField(
                                  (newExercise as any)
                                    .compound_load_percentage,
                                  (newExercise as any).compound_weight_kg,
                                  (value) =>
                                    setNewExercise({
                                      ...newExercise,
                                      compound_load_percentage: value,
                                      compound_weight_kg: "",
                                    }),
                                  (value) =>
                                    setNewExercise({
                                      ...newExercise,
                                      compound_weight_kg: value,
                                      compound_load_percentage: "",
                                    }),
                                  "pre-exhaustion-compound",
                                  "Compound Load % / Weight",
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {newExercise.exercise_type === "for_time" && (
                        <div className="space-y-4">
                          <div className="px-3 py-5 sm:p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <Activity className="w-4 h-4 text-purple-600" />
                              For Time Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              Complete a set amount of work as fast as
                              possible
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
                                      ),
                                    })
                                  }
                                  min="1"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                                        0,
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

                      {newExercise.exercise_type === "hr_sets" && (
                        <div className="space-y-4">
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700">
                            <h4
                              className={`font-semibold ${theme?.text ?? ''} mb-3 flex flex-wrap items-center gap-2`}
                            >
                              <Activity className="w-4 h-4 text-red-600" />
                              HR Sets Configuration
                            </h4>
                            <p
                              className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}
                            >
                              Heart rate zone training for aerobic endurance
                              (Zone 2-5)
                            </p>

                            {/* Session Type: Continuous vs Intervals */}
                            <div className="mb-4">
                              <Label
                                className={`text-sm font-medium ${theme?.text ?? ''}`}
                              >
                                Session Type
                              </Label>
                              <Select
                                value={
                                  newExercise.hr_is_intervals === true
                                    ? "intervals"
                                    : newExercise.hr_is_intervals === false
                                      ? "continuous"
                                      : ""
                                }
                                onValueChange={(value) =>
                                  setNewExercise({
                                    ...newExercise,
                                    hr_is_intervals: value === "intervals",
                                  })
                                }
                              >
                                <SelectTrigger className="mt-2 rounded-xl">
                                  <SelectValue placeholder="Select session type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="continuous">
                                    Continuous
                                  </SelectItem>
                                  <SelectItem value="intervals">
                                    Intervals
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* HR Zone or Percentage */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              <div>
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
                                >
                                  HR Zone (1-5)
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.hr_zone === ""
                                      ? ""
                                      : newExercise.hr_zone || ""
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      hr_zone: handleNumberChange(
                                        e.target.value,
                                        0,
                                      ),
                                      hr_percentage_min: "",
                                      hr_percentage_max: "",
                                    })
                                  }
                                  min="1"
                                  max="5"
                                  placeholder="e.g., 2"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
                                  >
                                    HR % Min
                                  </Label>
                                  <Input
                                    type="number"
                                    value={
                                      newExercise.hr_percentage_min === ""
                                        ? ""
                                        : newExercise.hr_percentage_min || ""
                                    }
                                    onChange={(e) =>
                                      setNewExercise({
                                        ...newExercise,
                                        hr_percentage_min: handleNumberChange(
                                          e.target.value,
                                          0,
                                        ),
                                        hr_zone: "",
                                      })
                                    }
                                    min="50"
                                    max="100"
                                    placeholder="e.g., 60"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
                                  >
                                    HR % Max
                                  </Label>
                                  <Input
                                    type="number"
                                    value={
                                      newExercise.hr_percentage_max === ""
                                        ? ""
                                        : newExercise.hr_percentage_max || ""
                                    }
                                    onChange={(e) =>
                                      setNewExercise({
                                        ...newExercise,
                                        hr_percentage_max: handleNumberChange(
                                          e.target.value,
                                          0,
                                        ),
                                        hr_zone: "",
                                      })
                                    }
                                    min="50"
                                    max="100"
                                    placeholder="e.g., 70"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Continuous Mode Fields */}
                            {newExercise.hr_is_intervals === false && (
                              <div className="mb-4">
                                <Label
                                  className={`text-sm font-medium ${theme?.text ?? ''}`}
                                >
                                  Duration (minutes)
                                </Label>
                                <Input
                                  type="number"
                                  value={
                                    newExercise.hr_duration_minutes === ""
                                      ? ""
                                      : newExercise.hr_duration_minutes || ""
                                  }
                                  onChange={(e) =>
                                    setNewExercise({
                                      ...newExercise,
                                      hr_duration_minutes: handleNumberChange(
                                        e.target.value,
                                        0,
                                      ),
                                    })
                                  }
                                  min="1"
                                  placeholder="e.g., 30"
                                  className="mt-2 rounded-xl"
                                />
                              </div>
                            )}

                            {/* Interval Mode Fields */}
                            {newExercise.hr_is_intervals === true && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <Label
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
                                  >
                                    Work Duration (minutes)
                                  </Label>
                                  <Input
                                    type="number"
                                    value={
                                      newExercise.hr_work_duration_minutes ===
                                      ""
                                        ? ""
                                        : newExercise.hr_work_duration_minutes ||
                                          ""
                                    }
                                    onChange={(e) =>
                                      setNewExercise({
                                        ...newExercise,
                                        hr_work_duration_minutes:
                                          handleNumberChange(
                                            e.target.value,
                                            0,
                                          ),
                                      })
                                    }
                                    min="1"
                                    placeholder="e.g., 5"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
                                  >
                                    Rest Duration (minutes)
                                  </Label>
                                  <Input
                                    type="number"
                                    value={
                                      newExercise.hr_rest_duration_minutes ===
                                      ""
                                        ? ""
                                        : newExercise.hr_rest_duration_minutes ||
                                          ""
                                    }
                                    onChange={(e) =>
                                      setNewExercise({
                                        ...newExercise,
                                        hr_rest_duration_minutes:
                                          handleNumberChange(
                                            e.target.value,
                                            0,
                                          ),
                                      })
                                    }
                                    min="0"
                                    placeholder="e.g., 3"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label
                                    className={`text-sm font-medium ${theme?.text ?? ''}`}
                                  >
                                    Target Rounds
                                  </Label>
                                  <Input
                                    type="number"
                                    value={
                                      newExercise.hr_target_rounds === ""
                                        ? ""
                                        : newExercise.hr_target_rounds || ""
                                    }
                                    onChange={(e) =>
                                      setNewExercise({
                                        ...newExercise,
                                        hr_target_rounds: handleNumberChange(
                                          e.target.value,
                                          0,
                                        ),
                                      })
                                    }
                                    min="1"
                                    placeholder="e.g., 4"
                                    className="mt-2 rounded-xl"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Optional Distance Field */}
                            <div>
                              <Label
                                className={`text-sm font-medium ${theme?.text ?? ''}`}
                              >
                                Distance (meters, optional)
                              </Label>
                              <Input
                                type="number"
                                value={
                                  newExercise.hr_distance_meters === ""
                                    ? ""
                                    : newExercise.hr_distance_meters || ""
                                }
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    hr_distance_meters: handleNumberChange(
                                      e.target.value,
                                      0,
                                    ),
                                  })
                                }
                                min="0"
                                placeholder="e.g., 5000"
                                className="mt-2 rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Common fields for all types */}
                      {/* Load % / Weight Toggle - Only show for block types that support it (all except tabata, superset, giant_set, pre_exhaustion, hr_sets which have their own fields) */}
                      {newExercise.exercise_type &&
                        ![
                          "superset",
                          "giant_set",
                          "pre_exhaustion",
                          "tabata",
                          "hr_sets",
                        ].includes(newExercise.exercise_type) &&
                        renderLoadWeightField(
                          newExercise.load_percentage,
                          newExercise.weight_kg,
                          (value) =>
                            setNewExercise({
                              ...newExercise,
                              load_percentage: value,
                              weight_kg: "",
                            }),
                          (value) =>
                            setNewExercise({
                              ...newExercise,
                              weight_kg: value,
                              load_percentage: "",
                            }),
                          "new-exercise-main",
                          "Load % / Weight",
                        )}

                      <div>
                        <Label
                          htmlFor="notes"
                          className={`text-sm font-medium ${theme?.text ?? ''}`}
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
                            onAddExercise();
                          }}
                          className={`${theme?.success ?? ''} flex items-center gap-2 rounded-xl`}
                        >
                          <Plus className="w-4 h-4" />
                          {editingExerciseId
                            ? "Update Exercise"
                            : "Add Exercise"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onClose}
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
  );
}
