import { BlockVariantProps } from "./types";
import { TypeBadge } from "./TypeBadge";
import { FieldDisplay } from "./FieldDisplay";

type DropSetEntry = {
  percentage?: number | string | null;
  reps?: number | string | null;
  label?: string | null;
};

function formatRest(restSeconds?: number | null) {
  if (!restSeconds && restSeconds !== 0) return "—";
  return `${restSeconds}s`;
}

function normalizeDropSets(raw: any): DropSetEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((entry) => ({
      percentage:
        entry?.percentage ??
        entry?.drop_percentage ??
        entry?.weight_reduction_percentage ??
        entry?.weight_change ??
        null,
      reps: entry?.reps ?? entry?.target_reps ?? entry?.rep_count ?? null,
      label: entry?.label ?? entry?.name ?? null,
    }));
  }
  return [];
}

function tryParseFromNotes(notes?: string | null): DropSetEntry[] {
  if (!notes) return [];
  const candidates = notes
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.includes("%"));

  return candidates.map((line) => {
    const percentageMatch = line.match(/(-?\d+\.?\d*)%/);
    const repsMatch = line.match(/(\d+)\s*(reps?|x)/i);
    return {
      percentage: percentageMatch ? `${percentageMatch[1]}%` : null,
      reps: repsMatch ? `${repsMatch[1]} reps` : null,
      label: line.replace(/[-•]/g, "").trim(),
    };
  });
}

export function DropsetsDisplay({ block, index }: BlockVariantProps) {
  const primaryExercise = block.exercises[0];
  const exerciseMeta = primaryExercise?.meta || {};
  const blockParams = block.parameters || {};
  const startingWeight =
    primaryExercise?.weightGuidance ??
    primaryExercise?.raw?.starting_weight ??
    primaryExercise?.raw?.weight_kg ??
    exerciseMeta.starting_weight ??
    exerciseMeta.weight ??
    blockParams.starting_weight ??
    blockParams.weight ??
    block.rawBlock?.starting_weight ??
    block.rawBlock?.weight ??
    null;

  const primaryDropSets = normalizeDropSets(
    primaryExercise?.raw?.drop_sets ||
      exerciseMeta.drop_sets ||
      exerciseMeta.drops ||
      exerciseMeta.drop_progression
  );
  const blockDropSets = normalizeDropSets(
    block.rawBlock?.drop_sets || blockParams.drop_sets
  );
  const dropSets = primaryDropSets.length > 0 ? primaryDropSets : blockDropSets;

  const parsedDropSets =
    dropSets.length > 0
      ? dropSets
      : tryParseFromNotes(
          (typeof primaryExercise?.notes === "string"
            ? primaryExercise?.notes
            : "") || block.notes
        );

  const restBetweenDrops =
    primaryExercise?.raw?.rest_between_drops ??
    exerciseMeta.rest_between_drops ??
    exerciseMeta.rest_seconds ??
    block.rawBlock?.rest_between_drops ??
    blockParams.rest_between_drops ??
    primaryExercise?.restSeconds ??
    block.rawBlock?.rest_seconds ??
    null;

  const displayStartingWeight =
    typeof startingWeight === "number"
      ? `${startingWeight} kg`
      : startingWeight;

  return (
    <div className="rounded-3xl shadow-lg border border-white/10 p-6 bg-white/60 backdrop-blur-md space-y-6 dark:bg-slate-900/60 dark:border-slate-800/60 transition-all duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-400">
            Block {index + 1}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {block.blockName || primaryExercise?.name || "Drop Set"}
          </h3>
          {primaryExercise?.description && (
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
              {primaryExercise.description}
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
        <FieldDisplay
          label="Starting weight"
          value={displayStartingWeight}
          hideIfEmpty
        />

        <div className="rounded-2xl border border-white/30 bg-white px-4 py-4 shadow-sm space-y-3 dark:border-slate-700/60 dark:bg-slate-800/90">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-400">
            Drop progression
          </div>

          {parsedDropSets.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Drop details not provided. Follow coach guidance for weight
              reductions.
            </p>
          ) : (
            <div className="space-y-2">
              {parsedDropSets.map((entry, entryIndex) => (
                <div
                  key={entryIndex}
                  className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-200 flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="font-semibold text-slate-800 dark:text-white">
                    Drop {entryIndex + 1}
                  </span>
                  <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-200">
                    {entry.percentage && (
                      <span className="font-semibold text-amber-600 dark:text-amber-300">
                        {typeof entry.percentage === "number"
                          ? `${entry.percentage}%`
                          : entry.percentage}
                      </span>
                    )}
                    {entry.reps && (
                      <span className="font-semibold">
                        {typeof entry.reps === "number"
                          ? `${entry.reps} reps`
                          : entry.reps}
                      </span>
                    )}
                    {entry.label && (
                      <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-400">
                        {entry.label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <FieldDisplay
          label="Rest between drops"
          value={
            typeof restBetweenDrops === "number"
              ? formatRest(restBetweenDrops)
              : restBetweenDrops
          }
          hideIfEmpty
        />
      </div>
    </div>
  );
}
