import type { CurrentWeekRules } from '@/lib/clientProgressionService'
import { isRuleEffectivelyEmpty } from '@/lib/clientProgressionService'

export type WorkLineOutput = {
  primary: string | null
  metadata: string[]
  notes: string | null
  blockSpecific: string[]
  isEmpty: boolean
}

export function daysAgoText(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "unknown date";
  const ms = Math.max(0, Date.now() - t);
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function loadSuffix(rule: CurrentWeekRules): string {
  if (rule.targetWeightKg != null) return ` @ ${rule.targetWeightKg}kg`;
  if (rule.targetLoadPercentage != null) return ` @ ${rule.targetLoadPercentage}%`;
  return "";
}

/** Duration only (no "rest " prefix) - used for between-pairs, rest-after-set, etc. */
function formatSecondsDuration(sec: number): string {
  if (!Number.isFinite(sec)) return "";
  const n = Math.round(sec);
  if (n < 60) return `${n}s`;
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function formatRestSeconds(restSeconds: number): string {
  return `rest ${formatSecondsDuration(restSeconds)}`;
}

function normBlockType(bt: string | null): string {
  return (bt || "").toLowerCase().replace(/\s+/g, "_");
}

function formatRepsParsed(rule: CurrentWeekRules): string | null {
  const min = rule.targetRepsMin;
  const max = rule.targetRepsMax;
  if (min != null && max != null) {
    return min === max ? `${min}` : `${min}-${max}`;
  }
  return null;
}

/** Straight-set primary line (shared by straight aliases, rest_pause, fallbacks). */
function straightPrimaryString(rule: CurrentWeekRules): string | null {
  const load = loadSuffix(rule);
  const sets = rule.targetSets;
  const parsed = formatRepsParsed(rule);
  const raw = rule.repsVarchar?.trim() || null;

  if (sets != null) {
    if (parsed) {
      return `${sets} × ${parsed}${load}`;
    }
    if (raw) {
      return `${sets} × ${raw}${load}`;
    }
    return `${sets} sets${load}`;
  }

  if (parsed) {
    return `${parsed}${load}`;
  }
  if (raw) {
    return `${raw}${load}`;
  }
  if (load) {
    return load.trim();
  }
  return null;
}

function metaRirTempoRest(rule: CurrentWeekRules): string[] {
  const out: string[] = [];
  if (rule.targetRpe != null) out.push(`RPE ${rule.targetRpe}`);
  const tempoTrim = rule.tempo?.trim();
  if (tempoTrim) out.push(`tempo ${tempoTrim}`);
  if (rule.restSeconds != null) out.push(formatRestSeconds(rule.restSeconds));
  return out;
}

function metaRirTempo(rule: CurrentWeekRules): string[] {
  const out: string[] = [];
  if (rule.targetRpe != null) out.push(`RPE ${rule.targetRpe}`);
  const tempoTrim = rule.tempo?.trim();
  if (tempoTrim) out.push(`tempo ${tempoTrim}`);
  return out;
}

function metaTempoOnly(rule: CurrentWeekRules): string[] {
  const tempoTrim = rule.tempo?.trim();
  return tempoTrim ? [`tempo ${tempoTrim}`] : [];
}

function buildRestPauseBlockLines(rule: CurrentWeekRules): string[] {
  const out: string[] = [];
  if (rule.maxRestPauses != null && rule.restPauseDuration != null) {
    out.push(`rest-pause ${rule.maxRestPauses}× / ${rule.restPauseDuration}s`);
  } else if (rule.maxRestPauses != null) {
    out.push(`rest-pause ${rule.maxRestPauses}×`);
  } else if (rule.restPauseDuration != null) {
    out.push(`rest-pause hold ${rule.restPauseDuration}s`);
  }
  return out;
}

type WorkLineParts = { primary: string | null; metadata: string[]; blockSpecific: string[] };

function buildStraightLikeWork(rule: CurrentWeekRules): WorkLineParts {
  return {
    primary: straightPrimaryString(rule),
    metadata: metaRirTempoRest(rule),
    blockSpecific: [],
  };
}

function buildByBlockType(rule: CurrentWeekRules): WorkLineParts {
  const bt = normBlockType(rule.blockType);
  const load = loadSuffix(rule);

  const straightAliases = new Set([
    "",
    "straight",
    "straight_set",
    "speed_work",
    "endurance",
    "warm_up",
    "warm_up_set",
    "warmup",
    "optional",
    "unknown",
  ]);

  if (straightAliases.has(bt)) {
    return buildStraightLikeWork(rule);
  }

  switch (bt) {
    case "cluster_set": {
      let primary: string | null = null;
      if (rule.clustersPerSet != null && rule.targetSets != null && rule.repsPerCluster != null) {
        primary = `${rule.targetSets} × ${rule.repsPerCluster} × ${rule.clustersPerSet} clusters${load}`;
      } else if (rule.repsPerCluster != null && rule.targetSets != null) {
        primary = `${rule.targetSets} × ${rule.repsPerCluster} reps/cluster${load}`;
      } else {
        primary = straightPrimaryString(rule);
      }
      const block: string[] = [];
      if (rule.intraClusterRest != null) {
        block.push(`intra-cluster rest ${rule.intraClusterRest}s`);
      }
      return { primary, metadata: metaRirTempoRest(rule), blockSpecific: block };
    }

    case "drop_set": {
      const parsed = formatRepsParsed(rule);
      const mainReps =
        rule.exerciseReps?.trim() || rule.repsVarchar?.trim() || parsed || null;
      let primary: string | null = null;
      if (rule.targetSets != null && mainReps) {
        primary = `${rule.targetSets} × ${mainReps}${load}`;
      } else if (mainReps) {
        primary = `${mainReps}${load}`;
      } else {
        primary = straightPrimaryString(rule);
      }
      const block: string[] = [];
      if (rule.dropSetReps) block.push(`drops: ${rule.dropSetReps}`);
      if (rule.weightReductionPercentage != null) {
        block.push(`-${rule.weightReductionPercentage}% per drop`);
      }
      return { primary, metadata: metaRirTempoRest(rule), blockSpecific: block };
    }

    case "rest_pause": {
      return {
        primary: straightPrimaryString(rule),
        metadata: metaRirTempoRest(rule),
        blockSpecific: buildRestPauseBlockLines(rule),
      };
    }

    case "superset": {
      const repsForThisExercise =
        rule.firstExerciseReps?.trim() ||
        rule.secondExerciseReps?.trim() ||
        rule.repsVarchar?.trim() ||
        formatRepsParsed(rule);
      let primary: string | null = null;
      if (rule.targetSets != null && repsForThisExercise) {
        primary = `${rule.targetSets} × ${repsForThisExercise}${load}`;
      } else if (repsForThisExercise) {
        primary = `${repsForThisExercise}${load}`;
      } else {
        primary = straightPrimaryString(rule);
      }
      const block: string[] = [];
      if (rule.restBetweenPairs != null) {
        block.push(`between pairs: ${formatSecondsDuration(rule.restBetweenPairs)}`);
      }
      return { primary, metadata: metaRirTempo(rule), blockSpecific: block };
    }

    case "giant_set": {
      const reps =
        rule.repsVarchar?.trim() || formatRepsParsed(rule);
      let primary: string | null = null;
      if (rule.targetSets != null && reps) {
        primary = `${rule.targetSets} × ${reps}${load}`;
      } else if (reps) {
        primary = `${reps}${load}`;
      } else {
        primary = straightPrimaryString(rule);
      }
      const block: string[] = [];
      if (rule.restBetweenPairs != null) {
        block.push(`between rounds: ${formatSecondsDuration(rule.restBetweenPairs)}`);
      }
      return { primary, metadata: metaRirTempoRest(rule), blockSpecific: block };
    }

    case "pre_exhaustion":
    case "pre_exhaust": {
      const repsForThisExercise =
        rule.isolationReps?.trim() ||
        rule.compoundReps?.trim() ||
        rule.repsVarchar?.trim() ||
        formatRepsParsed(rule);
      let primary: string | null = null;
      if (rule.targetSets != null && repsForThisExercise) {
        primary = `${rule.targetSets} × ${repsForThisExercise}${load}`;
      } else if (repsForThisExercise) {
        primary = `${repsForThisExercise}${load}`;
      } else {
        primary = straightPrimaryString(rule);
      }
      const block: string[] = [];
      if (rule.restBetweenPairs != null) {
        block.push(`between pairs: ${formatSecondsDuration(rule.restBetweenPairs)}`);
      }
      return { primary, metadata: metaRirTempo(rule), blockSpecific: block };
    }

    case "amrap": {
      let primary: string;
      if (rule.durationMinutes != null) {
        primary = `AMRAP ${rule.durationMinutes}m${load}`;
      } else if (rule.repsVarchar?.trim()) {
        primary = `AMRAP${load}`;
      } else {
        primary = `AMRAP${load}`;
      }
      if (rule.targetReps != null) {
        primary += ` · target ${rule.targetReps} reps`;
      }
      return { primary, metadata: metaRirTempoRest(rule), blockSpecific: [] };
    }

    case "emom": {
      let primary =
        rule.durationMinutes != null ? `EMOM ${rule.durationMinutes}m` : "EMOM";
      if (rule.workSeconds != null) {
        primary += ` · ${rule.workSeconds}s work/min`;
      }
      primary += load;
      if (rule.targetReps != null) {
        primary += ` · target ${rule.targetReps} reps`;
      }
      const block: string[] = [];
      if (rule.emomMode) block.push(`mode: ${rule.emomMode}`);
      return { primary, metadata: metaRirTempo(rule), blockSpecific: block };
    }

    case "tabata": {
      const r = rule.rounds;
      const w = rule.workSeconds;
      const rest = rule.restSeconds;
      let primary: string | null = null;
      if (r != null && w != null && rest != null) {
        primary = `Tabata ${r} × ${w}s / ${rest}s off`;
      } else if (r != null) {
        primary = `Tabata ${r} rounds`;
      } else if (w != null && rest != null) {
        primary = `Tabata ${w}s / ${rest}s off`;
      } else if (w != null) {
        primary = `Tabata ${w}s work`;
      } else if (rest != null) {
        primary = `Tabata ${rest}s off`;
      } else {
        primary = null;
      }
      const block: string[] = [];
      if (rule.restAfterSet != null) {
        block.push(`rest after set: ${formatSecondsDuration(rule.restAfterSet)}`);
      }
      return { primary, metadata: metaTempoOnly(rule), blockSpecific: block };
    }

    case "for_time": {
      let primary = "For time";
      if (rule.timeCapMinutes != null) {
        primary += ` · cap ${rule.timeCapMinutes}m`;
      }
      if (rule.targetReps != null) {
        primary += ` · ${rule.targetReps} reps`;
      }
      primary += load;
      return { primary, metadata: metaRirTempoRest(rule), blockSpecific: [] };
    }

    default:
      return buildStraightLikeWork(rule);
  }
}

export function buildWorkLine(rule: CurrentWeekRules | null): WorkLineOutput {
  if (rule == null || isRuleEffectivelyEmpty(rule)) {
    return { primary: null, metadata: [], notes: null, blockSpecific: [], isEmpty: true };
  }
  const built = buildByBlockType(rule);
  const notes = rule.notes?.trim() ? rule.notes.trim() : null;
  const primaryTrimmed = built.primary?.trim() ?? "";
  const noContent =
    primaryTrimmed === "" &&
    built.metadata.length === 0 &&
    built.blockSpecific.length === 0 &&
    !notes;
  if (noContent) {
    return { primary: null, metadata: [], notes: null, blockSpecific: [], isEmpty: true };
  }
  return {
    primary: built.primary,
    metadata: built.metadata,
    notes,
    blockSpecific: built.blockSpecific,
    isEmpty: false,
  };
}
