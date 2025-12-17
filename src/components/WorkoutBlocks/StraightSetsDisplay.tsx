import { BlockVariantProps } from "./types";
import { TypeBadge } from "./TypeBadge";
import { FieldDisplay } from "./FieldDisplay";

function formatRest(restSeconds?: number | null) {
  if (restSeconds === null || restSeconds === undefined) return null;
  if (restSeconds === 0) return "0s";
  return `${restSeconds}s`;
}

function formatWeight(value: any) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return `${value} kg`;
  }
  return value;
}

function getFallbackValue(
  ...values: Array<string | number | null | undefined>
) {
  for (const value of values) {
    if (value !== null && value !== undefined && `${value}`.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function StraightSetsDisplay({ block, index }: BlockVariantProps) {
  const exercises = block.exercises;
  const blockParams = block.parameters || {};

  return (
    <div className="rounded-3xl shadow-lg border border-white/10 p-6 bg-white/60 backdrop-blur-md space-y-6 dark:bg-slate-900/60 dark:border-slate-800/60 transition-all duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-400">
            Block {index + 1}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {block.blockName ||
              exercises[0]?.name ||
              block.displayType ||
              "Straight Sets"}
          </h3>
          {block.blockName && exercises[0]?.name && (
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
              {exercises[0]?.name}
            </p>
          )}
        </div>
        <TypeBadge blockType={block.blockType} label={block.displayType} />
      </div>

      {block.notes && (
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
          {block.notes}
        </div>
      )}

      <div className="space-y-4">
        {exercises.map((exercise, exerciseIndex) => {
          const meta = exercise.meta || {};

          const sets = getFallbackValue(
            exercise.sets,
            meta.sets,
            meta.total_sets,
            block.rawBlock?.total_sets,
            blockParams.total_sets,
            meta.rounds,
            exercise.raw?.["sets"],
            block.rawBlock?.sets
          );
          const reps = getFallbackValue(
            exercise.reps,
            meta.reps,
            meta.rep_range,
            meta.exercise_reps,
            block.rawBlock?.reps_per_set,
            blockParams.reps_per_set,
            blockParams.reps,
            exercise.raw?.["reps"],
            block.rawBlock?.reps
          );
          const restSeconds = getFallbackValue(
            exercise.restSeconds,
            block.rawBlock?.rest_seconds,
            blockParams.rest_seconds,
            blockParams.rest,
            meta.rest_seconds,
            meta.rest,
            exercise.raw?.["rest_seconds"],
            block.rawBlock?.rest_between_sets,
            block.rawBlock?.rest
          );
          const weight = getFallbackValue(
            exercise.weightGuidance,
            formatWeight(exercise.raw?.["weight_kg"]),
            formatWeight(exercise.raw?.["working_weight"]),
            formatWeight(exercise.raw?.["starting_weight"]),
            formatWeight(meta.weight),
            formatWeight(meta.working_weight),
            formatWeight(meta.starting_weight),
            formatWeight(blockParams.weight),
            formatWeight(blockParams.weight_kg),
            formatWeight(block.rawBlock?.weight),
            formatWeight(block.rawBlock?.target_weight)
          );

          const fields = [
            {
              label: "Sets",
              value: sets,
            },
            {
              label: "Reps",
              value: reps,
            },
            {
              label: "Rest",
              value: (() => {
                if (typeof restSeconds === "number") {
                  return formatRest(restSeconds);
                }
                if (
                  typeof restSeconds === "string" &&
                  restSeconds.trim().length > 0
                ) {
                  const numeric = Number(restSeconds);
                  return Number.isFinite(numeric)
                    ? formatRest(numeric)
                    : restSeconds;
                }
                return restSeconds;
              })(),
            },
            {
              label: "Weight",
              value: weight,
            },
          ].filter(
            (field) => field.value !== null && field.value !== undefined
          );

          return (
            <div
              key={exercise.id || `${block.id}-exercise-${exerciseIndex}`}
              className="rounded-2xl border border-white/30 bg-white px-4 py-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/90 space-y-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-400 dark:text-slate-400">
                      #{exerciseIndex + 1}
                    </span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {exercise.name}
                    </span>
                  </div>
                  {exercise.description && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                      {exercise.description}
                    </p>
                  )}
                </div>
                {exercise.exerciseLetter && (
                  <span className="text-xs font-semibold rounded-full px-3 py-1 inline-block bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-200">
                    {exercise.exerciseLetter}
                  </span>
                )}
              </div>

              {fields.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((field) => (
                    <FieldDisplay
                      key={field.label}
                      label={field.label}
                      value={field.value}
                      hideIfEmpty
                    />
                  ))}
                </div>
              )}

              {exercise.notes && (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
                  {exercise.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
