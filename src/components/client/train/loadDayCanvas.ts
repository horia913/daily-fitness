import type { SupabaseClient } from "@supabase/supabase-js";
import { loadInstanceWorkoutForCanvas } from "@/lib/programInstance/instanceCanvasLoad";
import { loadWorkoutForCanvas } from "@/lib/groupModel/canvasLoad";
import { mapCanvasGroupToExerciseGroupDisplay } from "@/components/exercise-display";
import type { ExerciseGroupDisplayProps } from "@/components/exercise-display";

export interface LoadDayCanvasInput {
  templateId: string;
  instanceWorkoutId?: string | null;
}

/** Lazy-load one day's workout canvas for Train week expansion (session cache lives in the page). */
export async function loadDayExerciseGroups(
  supabase: SupabaseClient,
  input: LoadDayCanvasInput | string,
): Promise<ExerciseGroupDisplayProps[]> {
  const { templateId, instanceWorkoutId } =
    typeof input === "string"
      ? { templateId: input, instanceWorkoutId: null as string | null }
      : input;

  const instanceId = instanceWorkoutId?.trim();
  const template = templateId?.trim();

  let canvas = null;
  if (instanceId) {
    canvas = await loadInstanceWorkoutForCanvas(supabase, instanceId);
  }
  if (!canvas?.groups?.length && template) {
    canvas = await loadWorkoutForCanvas(supabase, template);
  }
  if (!canvas?.groups?.length) return [];

  return canvas.groups.map((group, index) =>
    mapCanvasGroupToExerciseGroupDisplay(group, index, { size: "list" }),
  );
}
