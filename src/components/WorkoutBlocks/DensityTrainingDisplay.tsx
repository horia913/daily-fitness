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

function formatMinutesValue(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return `${numeric} min`;
  }
  return typeof value === "string" ? value : null;
}

function formatNumericValue(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  return `${value}`;
}

export function DensityTrainingDisplay({ block, index }: BlockVariantProps) {
  const primaryExercise = block.exercises[0];
  const blockParams = block.parameters || {};
  const meta = primaryExercise?.meta || {};
  const rawBlock = block.rawBlock || {};
  const normalizedType = (block.blockType || "").toLowerCase();

  const durationMinutes = pickValue(
    blockParams.duration_minutes,
    blockParams.amrap_duration,
    blockParams.emom_duration,
    blockParams.time_cap,
    (rawBlock as any).duration_minutes,
    (rawBlock as any).time_cap_minutes,
    meta.duration_minutes,
    meta.amrap_duration,
    meta.emom_duration,
    meta.time_cap
  );

  const timeBlockSeconds = pickValue(
    blockParams.time_block_duration,
    blockParams.duration_seconds,
    (rawBlock as any).time_block_duration,
    (rawBlock as any).duration_seconds,
    meta.time_block_duration,
    meta.duration_seconds
  );

  const workSeconds = pickValue(
    blockParams.work_seconds,
    meta.work_seconds,
    (primaryExercise?.raw as any)?.work_seconds
  );

  let restBetweenSets = pickValue(
    blockParams.rest_after_set,
    blockParams.rest_after,
    (rawBlock as any).rest_after_set,
    meta.rest_after_set,
    meta.rest_after,
    (rawBlock as any).rest_seconds,
    primaryExercise?.restSeconds
  );

  const recoveryTime = pickValue(
    blockParams.recovery_time,
    (rawBlock as any).recovery_time,
    meta.recovery_time,
    primaryExercise?.restSeconds
  );

  const targetReps = pickValue(
    blockParams.target_reps,
    (rawBlock as any).target_reps,
    meta.target_reps,
    primaryExercise?.reps
  );

  const rounds = pickValue(
    blockParams.rounds,
    (rawBlock as any).rounds,
    meta.rounds,
    primaryExercise?.sets
  );

  if (
    (normalizedType === "emom" || normalizedType === "emom_reps") &&
    restBetweenSets === null &&
    restBetweenSets === undefined
  ) {
    const numericWork = Number(workSeconds);
    if (Number.isFinite(numericWork)) {
      restBetweenSets = Math.max(0, 60 - numericWork);
    }
  }

  const summaryFields: { label: string; value: string }[] = [];
  const pushSummary = (
    label: string,
    rawValue: any,
    formatter?: (value: any) => string | null
  ) => {
    if (summaryFields.some((field) => field.label === label)) return;
    const formatted = formatter ? formatter(rawValue) : rawValue;
    if (
      formatted === null ||
      formatted === undefined ||
      (typeof formatted === "string" && formatted.trim().length === 0)
    ) {
      return;
    }
    summaryFields.push({
      label,
      value: typeof formatted === "string" ? formatted : String(formatted),
    });
  };

  switch (normalizedType) {
    case "emom":
      pushSummary("Duration", durationMinutes, formatMinutesValue);
      pushSummary("Work interval", workSeconds, formatSecondsValue);
      pushSummary("Rest between sets", restBetweenSets, formatSecondsValue);
      // If there are specific rep targets within one minute, highlight them
      const repsPerMinute = pickValue(
        meta.emom_reps,
        blockParams.emom_reps,
        (rawBlock as any).emom_reps,
        targetReps
      );
      pushSummary("Reps per minute", repsPerMinute, formatNumericValue);
      pushSummary("Target reps", targetReps, formatNumericValue);
      pushSummary("Rounds", rounds, formatNumericValue);
      break;
    case "amrap":
      pushSummary("Duration", durationMinutes, formatMinutesValue);
      pushSummary("Target reps", targetReps, formatNumericValue);
      pushSummary("Rest between sets", restBetweenSets, formatSecondsValue);
      pushSummary("Rounds", rounds, formatNumericValue);
      break;
    case "for_time":
      pushSummary("Time cap", durationMinutes, formatMinutesValue);
      pushSummary("Target reps", targetReps, formatNumericValue);
      pushSummary("Rest between sets", restBetweenSets, formatSecondsValue);
      break;
    default:
      pushSummary("Time block", timeBlockSeconds, formatSecondsValue);
      pushSummary("Target reps", targetReps, formatNumericValue);
      pushSummary("Rounds", rounds, formatNumericValue);
      pushSummary("Recovery time", recoveryTime, formatSecondsValue);
      break;
  }

  if (
    (normalizedType === "emom" ||
      normalizedType === "amrap" ||
      normalizedType === "for_time") &&
    !summaryFields.some((field) => field.label === "Recovery time")
  ) {
    pushSummary("Recovery time", recoveryTime, formatSecondsValue);
  }

  const descriptionMap: Record<string, string> = {
    density: "Accumulate quality reps within the prescribed time window.",
    density_training:
      "Accumulate quality reps within the prescribed time window.",
    amrap: "As many reps or rounds as possible within the allotted time.",
    emom: "Complete the prescribed work every minute on the minute.",
    for_time: "Finish all prescribed work as quickly as possible.",
  };

  const blockTitle = block.blockName || block.displayType || "Training Block";
  const blockDescription =
    descriptionMap[normalizedType] ??
    "Follow the prescribed tempo and rest guidance for this interval.";

  return (
    <div className="rounded-3xl shadow-lg border border-white/10 p-6 bg-white/60 backdrop-blur-md space-y-6 dark:bg-slate-900/60 dark:border-slate-800/60 transition-all duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-400">
            Block {index + 1}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {blockTitle}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
            {blockDescription}
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

      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide dark:text-slate-400">
          Primary exercise
        </div>
        <div className="rounded-2xl border border-white/30 bg-white px-4 py-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/90">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {primaryExercise?.name || "Exercise"}
          </div>
          {primaryExercise?.description && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              {primaryExercise.description}
            </p>
          )}
          {primaryExercise?.notes && (
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
              {primaryExercise.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
