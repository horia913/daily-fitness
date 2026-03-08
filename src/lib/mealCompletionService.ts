/**
 * Meal Completion Service
 * Single source of truth for marking meals complete on the client Fuel tab.
 * Uses meal_completions only (no meal_photo_logs for new flow).
 */

import { supabase } from "./supabase";

const STORAGE_BUCKET = "meal-photos";
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// ============================================================================
// Types
// ============================================================================

export interface MealCompletionInput {
  clientId: string;
  mealId: string;
  mealOptionId?: string | null;
  mealPlanAssignmentId: string;
  date: string; // YYYY-MM-DD
  photoUrl?: string | null;
  notes?: string | null;
}

export interface MealCompletionRecord {
  id: string;
  client_id: string;
  meal_id: string;
  meal_option_id: string | null;
  meal_plan_assignment_id: string | null;
  date: string | null;
  completed_at: string;
  photo_url: string | null;
  notes: string | null;
  created_at?: string;
}

// ============================================================================
// completeMeal
// ============================================================================

/**
 * Mark a meal as complete for the given client/date.
 * Uses upsert on (client_id, meal_id, date) so re-completing updates option or photo.
 */
export async function completeMeal(
  input: MealCompletionInput
): Promise<MealCompletionRecord> {
  const row = {
    client_id: input.clientId,
    meal_id: input.mealId,
    meal_option_id: input.mealOptionId ?? null,
    meal_plan_assignment_id: input.mealPlanAssignmentId,
    date: input.date,
    completed_at: new Date().toISOString(),
    photo_url: input.photoUrl ?? null,
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase
    .from("meal_completions")
    .upsert(row, {
      onConflict: "client_id,meal_id,date",
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) throw new Error("Failed to complete meal: " + error.message);
  if (!data) throw new Error("No data returned from completeMeal");
  return data as MealCompletionRecord;
}

// ============================================================================
// addPhotoToCompletion
// ============================================================================

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "Invalid file type. Use JPEG, PNG, or WebP.";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
}

/**
 * Upload a photo and set photo_url on the completion record.
 * If no completion exists for that client/meal/date, creates one (with no meal_option_id/assignment — caller can complete first then add photo).
 */
export async function addPhotoToCompletion(
  clientId: string,
  mealId: string,
  date: string,
  photoFile: File
): Promise<string> {
  const err = validateFile(photoFile);
  if (err) throw new Error(err);

  const timestamp = Date.now();
  const sanitized = (photoFile.name || "photo").replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `${clientId}/${mealId}/${timestamp}_${sanitized}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, photoFile, { cacheControl: "3600", upsert: false });

  if (uploadError) throw new Error("Upload failed: " + uploadError.message);

  const existing = await supabase
    .from("meal_completions")
    .select("id")
    .eq("client_id", clientId)
    .eq("meal_id", mealId)
    .eq("date", date)
    .maybeSingle();
  if (existing.data) {
    const { error: updateErr } = await supabase
      .from("meal_completions")
      // Store the storage path only; signed URLs are generated at read time.
      .update({ photo_url: storagePath })
      .eq("client_id", clientId)
      .eq("meal_id", mealId)
      .eq("date", date);
    if (updateErr) {
      try {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      } catch (_) {}
      throw new Error("Failed to save photo URL: " + updateErr.message);
    }
  } else {
    const { error: insertErr } = await supabase.from("meal_completions").insert({
      client_id: clientId,
      meal_id: mealId,
      date,
      // Store the storage path only; signed URLs are generated at read time.
      photo_url: storagePath,
      completed_at: new Date().toISOString(),
    });
    if (insertErr) {
      try {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      } catch (_) {}
      throw new Error("Failed to save photo: " + insertErr.message);
    }
  }

  return storagePath;
}

// ============================================================================
// getDayCompletions
// ============================================================================

export async function getDayCompletions(
  clientId: string,
  date: string
): Promise<MealCompletionRecord[]> {
  const { data, error } = await supabase
    .from("meal_completions")
    .select("*")
    .eq("client_id", clientId)
    .eq("date", date)
    .order("completed_at", { ascending: true });

  if (error) throw new Error("Failed to load completions: " + error.message);
  return (data ?? []) as MealCompletionRecord[];
}

// ============================================================================
// undoCompletion
// ============================================================================

export async function undoCompletion(
  clientId: string,
  mealId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from("meal_completions")
    .delete()
    .eq("client_id", clientId)
    .eq("meal_id", mealId)
    .eq("date", date);

  if (error) throw new Error("Failed to undo completion: " + error.message);
}

// ============================================================================
// getCompletionStats
// ============================================================================

export async function getCompletionStats(
  clientId: string,
  startDate: string,
  endDate: string,
  mealPlanAssignmentId?: string
): Promise<{
  totalMeals: number;
  completedMeals: number;
  completionRate: number;
  byDate: { date: string; completed: number; total: number }[];
}> {
  let query = supabase
    .from("meal_completions")
    .select("id, meal_id, date")
    .eq("client_id", clientId)
    .gte("date", startDate)
    .lte("date", endDate);
  if (mealPlanAssignmentId) {
    query = query.eq("meal_plan_assignment_id", mealPlanAssignmentId);
  }
  const { data: completions, error: compErr } = await query;

  if (compErr) throw new Error("Failed to load completions: " + compErr.message);

  const completedByDate = new Map<string, Set<string>>();
  (completions ?? []).forEach((c: { date: string | null; meal_id: string }) => {
    if (!c.date) return;
    if (!completedByDate.has(c.date)) completedByDate.set(c.date, new Set());
    completedByDate.get(c.date)!.add(c.meal_id);
  });

  const byDate: { date: string; completed: number; total: number }[] = [];
  let mealCount = 0;

  if (mealPlanAssignmentId) {
    const { data: assignment } = await supabase
      .from("meal_plan_assignments")
      .select("meal_plan_id")
      .eq("id", mealPlanAssignmentId)
      .single();
    if (!assignment?.meal_plan_id) {
      return {
        totalMeals: 0,
        completedMeals: 0,
        completionRate: 0,
        byDate: [],
      };
    }
    const { data: meals } = await supabase
      .from("meals")
      .select("id")
      .eq("meal_plan_id", assignment.meal_plan_id);
    mealCount = meals?.length ?? 0;
    for (let d = startDate; d <= endDate; d = nextDay(d)) {
      const set = completedByDate.get(d);
      byDate.push({
        date: d,
        completed: set?.size ?? 0,
        total: mealCount,
      });
    }
  } else {
    mealCount = 1;
    for (let d = startDate; d <= endDate; d = nextDay(d)) {
      const set = completedByDate.get(d);
      byDate.push({
        date: d,
        completed: set?.size ?? 0,
        total: 1,
      });
    }
  }

  const totalMeals = byDate.reduce((s, x) => s + x.total, 0);
  const completedMeals = byDate.reduce((s, x) => s + x.completed, 0);
  const completionRate =
    totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0;

  return {
    totalMeals,
    completedMeals,
    completionRate,
    byDate,
  };
}

function nextDay(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

// ============================================================================
// Plan selection (client_daily_plan_selection) — Phase N4
// ============================================================================

/**
 * Save which plan the client chose for the given date.
 * Upserts on (client_id, date) so changing selection for the day updates the row.
 */
export async function selectPlanForToday(
  clientId: string,
  mealPlanAssignmentId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from("client_daily_plan_selection")
    .upsert(
      {
        client_id: clientId,
        meal_plan_assignment_id: mealPlanAssignmentId,
        date,
      },
      { onConflict: "client_id,date" }
    );
  if (error) throw new Error("Failed to save plan selection: " + error.message);
}

/**
 * Get the client's plan selection for a given date (which assignment they chose).
 * Returns assignment id or null if none.
 */
export async function getTodayPlanSelection(
  clientId: string,
  date: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("client_daily_plan_selection")
    .select("meal_plan_assignment_id")
    .eq("client_id", clientId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw new Error("Failed to load plan selection: " + error.message);
  return data?.meal_plan_assignment_id ?? null;
}
