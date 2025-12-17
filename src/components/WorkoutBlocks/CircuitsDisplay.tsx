import { BlockVariantProps } from "./types";
import { TypeBadge } from "./TypeBadge";
import { FieldDisplay } from "./FieldDisplay";

function pickValue<T>(...values: (T | null | undefined | "")[]): T | null {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim().length === 0) continue;
    return value as T;
  }
  return null;
}

function formatSecondsValue(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric === 0) return "0s";
    const minutes = Math.floor(numeric / 60);
    const seconds = numeric % 60;
    if (minutes > 0) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    return `${numeric}s`;
  }
  return typeof value === "string" ? value : null;
}

export function CircuitsDisplay({ block, index }: BlockVariantProps) {
  const normalizedType = (block.blockType || "circuit").toLowerCase();
  const isTabata = normalizedType === "tabata";
  const parameters = block.parameters || {};
  const allMetas = block.exercises.map((exercise) => exercise.meta || {});
  const firstMeta =
    allMetas.find((meta) => meta && Object.keys(meta).length > 0) || {};

  const setCandidates = [
    parameters.circuit_sets,
    parameters.tabata_sets,
    firstMeta.circuit_sets,
    firstMeta.tabata_sets,
    ...allMetas.map((meta) => meta.circuit_sets),
    ...allMetas.map((meta) => meta.tabata_sets),
  ];

  const structuredSets =
    (setCandidates.find(
      (candidate) => Array.isArray(candidate) && candidate.length > 0
    ) as any[] | undefined) || [];

  const rounds = pickValue(
    parameters.rounds,
    parameters.total_sets,
    block.rawBlock?.rotation_count,
    block.rawBlock?.total_sets,
    firstMeta.rounds,
    block.exercises[0]?.sets
  );

  const restBetweenRounds = pickValue(
    parameters.rest_between_rounds,
    parameters.rest_seconds,
    block.rawBlock?.rest_between_rounds,
    block.rawBlock?.rest_seconds,
    firstMeta.rest_between_rounds,
    firstMeta.rest_seconds
  );

  const firstSet = structuredSets[0] || {};
  const firstEntry =
    (Array.isArray(firstSet.exercises) && firstSet.exercises[0]) || {};

  const workInterval = pickValue(
    parameters.work_seconds,
    firstMeta.work_seconds,
    firstEntry.work_seconds,
    firstEntry.work,
    firstEntry.duration_seconds,
    firstEntry.duration
  );

  const restBetweenExercises = pickValue(
    firstEntry.rest_seconds,
    firstEntry.rest_after,
    firstMeta.rest_after_exercise,
    firstMeta.rest_between_exercises
  );

  const restBetweenSets = pickValue(
    firstSet.rest_between_sets,
    firstSet.rest_seconds,
    parameters.rest_after_set,
    parameters.rest_after,
    firstMeta.rest_after_set,
    firstMeta.rest_after,
    restBetweenRounds
  );

  const exerciseLookup = new Map<string, string>();
  block.exercises.forEach((exercise) => {
    const raw = exercise.raw || {};
    const exerciseId =
      raw.exercise_id || raw.id || exercise.meta?.exercise_id || exercise.id;
    if (exerciseId && !exerciseLookup.has(exerciseId)) {
      exerciseLookup.set(exerciseId, exercise.name);
    }
  });

  const exercisesPerSet =
    structuredSets.length > 0 && structuredSets[0]?.exercises
      ? structuredSets[0].exercises.length
      : block.exercises.length;

  const summaryFields = [
    {
      label: "Rounds",
      value: rounds !== null && rounds !== undefined ? `${rounds}` : undefined,
    },
    {
      label: "Work Interval",
      value: formatSecondsValue(workInterval) || undefined,
    },
    {
      label: "Rest Between Exercises",
      value: formatSecondsValue(restBetweenExercises) || undefined,
    },
    {
      label: "Rest Between Sets",
      value: formatSecondsValue(restBetweenSets) || undefined,
    },
    {
      label: "Exercises per Set",
      value:
        exercisesPerSet !== null && exercisesPerSet !== undefined
          ? `${exercisesPerSet}`
          : undefined,
    },
  ].filter((field) => field.value);

  const hasStructuredSets =
    Array.isArray(structuredSets) && structuredSets.length > 0;

  return (
    <div className="rounded-3xl shadow-lg border border-white/10 p-6 bg-white/60 backdrop-blur-md space-y-6 dark:bg-slate-900/60 dark:border-slate-800/60 transition-all duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-400">
            Block {index + 1}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {block.blockName || (isTabata ? "Tabata" : "Circuit")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
            {isTabata
              ? "Alternate work and recovery intervals for each round."
              : "Perform each exercise sequentially, then rest before the next round."}
          </p>
        </div>
        <TypeBadge blockType={block.blockType} label={block.displayType} />
      </div>

      {block.notes && (
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
          {block.notes}
        </div>
      )}

      {summaryFields.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {summaryFields.map((field) => (
            <FieldDisplay
              key={field.label}
              label={field.label}
              value={field.value}
              hideIfEmpty
            />
          ))}
        </div>
      )}

      {hasStructuredSets ? (
        <div className="space-y-4">
          {structuredSets.map((set: any, setIndex: number) => {
            const setRest = formatSecondsValue(
              pickValue(set.rest_between_sets, set.rest_seconds)
            );
            return (
              <div
                key={`set-${setIndex}`}
                className="rounded-2xl border border-white/30 bg-white px-4 py-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/90 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">
                    {isTabata
                      ? `Interval ${setIndex + 1}`
                      : `Set ${setIndex + 1}`}
                  </div>
                  {setRest && (
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-300">
                      Rest after set: {setRest}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {(set.exercises || []).map(
                    (entry: any, entryIndex: number) => {
                      const entryId =
                        entry.exercise_id ||
                        entry.id ||
                        block.exercises[entryIndex]?.raw?.exercise_id;
                      const fallbackExercise =
                        block.exercises.find(
                          (exercise) =>
                            exercise.raw?.exercise_id === entryId ||
                            exercise.id === entryId
                        ) || block.exercises[entryIndex];

                      const entryName =
                        exerciseLookup.get(entryId) ||
                        entry.name ||
                        fallbackExercise?.name ||
                        `Exercise ${entryIndex + 1}`;

                      const entryReps = pickValue(
                        entry.reps,
                        entry.target_reps,
                        entry.rep_target
                      );
                      const entrySets = pickValue(entry.sets);
                      const entryWork = formatSecondsValue(
                        pickValue(
                          entry.work_seconds,
                          entry.duration,
                          entry.duration_seconds
                        )
                      );
                      const entryRest = formatSecondsValue(
                        pickValue(entry.rest_seconds, entry.rest_after)
                      );

                      const details: string[] = [];
                      if (entrySets !== null && entrySets !== undefined) {
                        details.push(`Sets: ${entrySets}`);
                      }
                      if (entryReps !== null && entryReps !== undefined) {
                        details.push(`Reps: ${entryReps}`);
                      }
                      if (entryWork) {
                        details.push(`Work: ${entryWork}`);
                      }
                      if (entryRest) {
                        details.push(`Rest: ${entryRest}`);
                      }

                      return (
                        <div
                          key={`set-${setIndex}-exercise-${entryIndex}`}
                          className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/50"
                        >
                          <div className="font-semibold text-slate-800 dark:text-white">
                            {entryName}
                          </div>
                          {details.length > 0 && (
                            <div className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                              {details.join(" • ")}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
            Exercise rotation
          </div>
          <div className="space-y-3">
            {block.exercises.map((exercise, exerciseIndex) => {
              const workSummary = formatSecondsValue(
                pickValue(
                  exercise.meta?.work_seconds,
                  exercise.raw?.work_seconds,
                  exercise.meta?.duration_seconds,
                  exercise.meta?.duration
                )
              );
              return (
                <div
                  key={exercise.id || `${block.id}-exercise-${exerciseIndex}`}
                  className="rounded-2xl border border-white/30 bg-white px-4 py-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/90"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-400">
                        Exercise {exerciseIndex + 1}
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                        {exercise.name}
                      </div>
                      {exercise.description && (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                          {exercise.description}
                        </p>
                      )}
                    </div>
                    {workSummary && (
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-700/60 dark:text-slate-200">
                        {workSummary}
                      </div>
                    )}
                  </div>

                  {exercise.notes && (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
                      {exercise.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FieldDisplay
        label="Rest between rounds"
        value={formatSecondsValue(restBetweenRounds)}
        hideIfEmpty
      />
    </div>
  );
}
