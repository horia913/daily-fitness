import { BlockVariantProps } from "./types";
import { TypeBadge } from "./TypeBadge";
import { FieldDisplay } from "./FieldDisplay";

function formatRest(restSeconds?: number | null) {
  if (restSeconds === null || restSeconds === undefined) return null;
  if (restSeconds === 0) return "0s";
  return `${restSeconds}s`;
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function SupersetsDisplay({ block, index }: BlockVariantProps) {
  const exercises = block.exercises;
  const exerciseA =
    exercises.find((exercise) => exercise.exerciseLetter === "A") ||
    exercises[0];
  const exerciseB =
    exercises.find((exercise) => exercise.exerciseLetter === "B") ||
    exercises[1];

  const metaA = exerciseA?.meta || {};
  const metaB = exerciseB?.meta || {};
  const blockParams = block.parameters || {};

  const setsA =
    exerciseA &&
    (metaA.sets ??
      exerciseA.sets ??
      blockParams.sets ??
      block.rawBlock?.total_sets ??
      null);
  const repsA =
    exerciseA &&
    (metaA.reps ??
      metaA.first_exercise_reps ??
      exerciseA.reps ??
      blockParams.reps_per_set ??
      block.rawBlock?.reps_per_set ??
      null);

  const setsB =
    exerciseB &&
    (metaB.sets ??
      exerciseB.sets ??
      blockParams.sets ??
      block.rawBlock?.total_sets ??
      null);
  const repsB =
    exerciseB &&
    (metaB.reps ??
      metaB.second_exercise_reps ??
      exerciseB.reps ??
      blockParams.reps_per_set ??
      block.rawBlock?.reps_per_set ??
      null);

  const restBetweenPairs =
    exerciseA?.restSeconds ??
    exerciseB?.restSeconds ??
    block.rawBlock?.rest_seconds ??
    blockParams.rest_seconds ??
    blockParams.rest_between_pairs ??
    blockParams.rest ??
    metaA.rest_seconds ??
    metaB.rest_seconds ??
    metaA.rest_between_pairs ??
    metaB.rest_between_pairs ??
    null;

  return (
    <div className="rounded-3xl shadow-lg border border-white/10 p-6 bg-white/60 backdrop-blur-md space-y-6 dark:bg-slate-900/60 dark:border-slate-800/60 transition-all duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-400">
            Block {index + 1}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {block.blockName || "Superset"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
            Alternate the two exercises with minimal rest in between.
          </p>
        </div>
        <TypeBadge blockType={block.blockType} label={block.displayType} />
      </div>

      {block.notes && (
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
          {block.notes}
        </div>
      )}

      <div className="space-y-4">
        {exerciseA && (
          <div className="rounded-2xl border border-white/30 bg-white px-4 py-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/90 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-400">
                Exercise A
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {exerciseA.name}
              </p>
              {exerciseA.description && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  {exerciseA.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldDisplay label="Sets" value={setsA} hideIfEmpty />
              <FieldDisplay label="Reps" value={repsA} hideIfEmpty />
            </div>
            {exerciseA.notes && (
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
                {exerciseA.notes}
              </div>
            )}
          </div>
        )}

        {exerciseB && (
          <div className="rounded-2xl border border-white/30 bg-white px-4 py-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/90 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-400">
                Exercise B
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {exerciseB.name}
              </p>
              {exerciseB.description && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  {exerciseB.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldDisplay label="Sets" value={setsB} hideIfEmpty />
              <FieldDisplay label="Reps" value={repsB} hideIfEmpty />
            </div>
            {exerciseB.notes && (
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
                {exerciseB.notes}
              </div>
            )}
          </div>
        )}

        {hasValue(restBetweenPairs) && (
          <FieldDisplay
            label="Rest between sets"
            value={
              typeof restBetweenPairs === "number"
                ? formatRest(restBetweenPairs)
                : restBetweenPairs
            }
            hideIfEmpty
          />
        )}
      </div>
    </div>
  );
}
