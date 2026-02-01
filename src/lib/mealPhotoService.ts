/**
 * Meal Photo Service
 * Handles meal photo uploads to Supabase storage with DB logging
 * Enforces "1 photo per meal per day" constraint
 * 
 * IMPORTANT: The rule is 1 photo per MEAL per day, NOT 1 photo per option.
 * meal_option_id is INFORMATIONAL ONLY - it records which option the client chose.
 * The unique constraint remains: UNIQUE (client_id, meal_id, log_date)
 */

import { supabase } from './supabase';

// ============================================================================
// Type Definitions
// ============================================================================

export interface MealPhotoLog {
  id: string;
  client_id: string;
  meal_id: string;
  meal_option_id: string | null;  // INFORMATIONAL: which option was chosen (NULL for legacy meals)
  log_date: string; // YYYY-MM-DD format
  photo_url: string;
  photo_path: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadPhotoResult {
  success: boolean;
  photoLog?: MealPhotoLog;
  error?: string;
}

export interface UploadPhotoParams {
  clientId: string;
  mealId: string;
  file: File;
  logDate?: string;
  notes?: string;
  mealOptionId?: string | null;  // Required if meal has options, NULL otherwise
}

// ============================================================================
// Configuration
// ============================================================================

const STORAGE_BUCKET = 'meal-photos';
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ============================================================================
// Upload & Logging
// ============================================================================

/**
 * Upload meal photo and create DB log
 * Enforces "1 photo per meal per day" - returns error if photo already exists
 * Clients cannot replace or delete photos once uploaded (accountability rule)
 * 
 * IMPORTANT: meal_option_id is INFORMATIONAL ONLY
 * - If meal has options → mealOptionId is REQUIRED
 * - If meal has no options → mealOptionId should be NULL
 * - The unique constraint remains: UNIQUE (client_id, meal_id, log_date)
 * - You CANNOT upload multiple photos for the same meal by using different options
 * 
 * @param clientId - Client UUID
 * @param mealId - Meal UUID (from assigned meal plan)
 * @param file - Image file to upload
 * @param logDate - Date for the meal log (defaults to today)
 * @param notes - Optional notes about the meal
 * @param mealOptionId - Option ID if meal has options (INFORMATIONAL - does not affect uniqueness)
 */
export async function uploadMealPhoto(
  clientId: string,
  mealId: string,
  file: File,
  logDate?: string,
  notes?: string,
  mealOptionId?: string | null
): Promise<UploadPhotoResult> {
  try {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Use provided date or today
    const dateStr = logDate || new Date().toISOString().split('T')[0];

    // Check if photo already logged for this meal today
    // NOTE: We check by meal_id only, NOT by option. 1 photo per MEAL per day.
    const existingLog = await getMealPhotoForDate(clientId, mealId, dateStr);
    
    if (existingLog) {
      // Photo already logged - cannot replace (business rule: 1 photo per meal per day)
      return { 
        success: false, 
        error: 'Photo already uploaded for this meal today. You cannot upload another one.' 
      };
    }

    // Generate storage path: {client_id}/{meal_id}/{timestamp}_{filename}
    const timestamp = Date.now();
    const sanitizedFilename = sanitizeFilename(file.name);
    const storagePath = `${clientId}/${mealId}/${timestamp}_${sanitizedFilename}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite if exists
      });

    if (uploadError) {
      console.error('Error uploading meal photo:', uploadError);
      return { 
        success: false, 
        error: `Upload failed: ${uploadError.message}` 
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      // Cleanup uploaded file if URL generation fails
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return { 
        success: false, 
        error: 'Failed to generate photo URL' 
      };
    }

    // Create DB log
    // meal_option_id is INFORMATIONAL - records which option the client chose
    const { data: logData, error: logError } = await supabase
      .from('meal_photo_logs')
      .insert([{
        client_id: clientId,
        meal_id: mealId,
        meal_option_id: mealOptionId || null,  // INFORMATIONAL ONLY
        log_date: dateStr,
        photo_url: urlData.publicUrl,
        photo_path: storagePath,
        notes: notes || null
      }])
      .select()
      .single();

    if (logError) {
      console.error('Error creating meal photo log:', logError);
      // Cleanup uploaded file if DB insert fails
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return { 
        success: false, 
        error: `Failed to log photo: ${logError.message}` 
      };
    }

    return {
      success: true,
      photoLog: logData
    };

  } catch (error) {
    console.error('Error in uploadMealPhoto:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate that mealOptionId is provided when required
 * Call this before uploadMealPhoto when you know the meal has options
 * 
 * @param mealHasOptions - Whether the meal has options configured
 * @param mealOptionId - The option ID being used
 * @returns Error message if validation fails, null if valid
 */
export function validateMealOptionForUpload(
  mealHasOptions: boolean,
  mealOptionId: string | null | undefined
): string | null {
  if (mealHasOptions && !mealOptionId) {
    return 'This meal has options. Please select an option before uploading a photo.';
  }
  return null;
}


// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get meal photo log for specific date
 * Returns null if no photo logged for that day
 */
export async function getMealPhotoForDate(
  clientId: string,
  mealId: string,
  logDate: string
): Promise<MealPhotoLog | null> {
  try {
    const { data, error } = await supabase
      .from('meal_photo_logs')
      .select('*')
      .eq('client_id', clientId)
      .eq('meal_id', mealId)
      .eq('log_date', logDate)
      .maybeSingle();

    if (error) {
      console.error('Error fetching meal photo for date:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getMealPhotoForDate:', error);
    return null;
  }
}

/**
 * Get all meal photo logs for a client on a specific date
 * Useful for "today's meals" view
 */
export async function getMealPhotosForDay(
  clientId: string,
  logDate: string
): Promise<MealPhotoLog[]> {
  try {
    const { data, error } = await supabase
      .from('meal_photo_logs')
      .select('*')
      .eq('client_id', clientId)
      .eq('log_date', logDate)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching meal photos for day:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMealPhotosForDay:', error);
    return [];
  }
}

/**
 * Get meal photo history for date range
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function getMealPhotoHistory(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<MealPhotoLog[]> {
  try {
    const { data, error } = await supabase
      .from('meal_photo_logs')
      .select('*')
      .eq('client_id', clientId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching meal photo history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMealPhotoHistory:', error);
    return [];
  }
}

/**
 * Get adherence stats (how many meals logged vs expected)
 * @param expectedMealsPerDay - Number of meals in client's meal plan
 */
export async function getMealAdherenceStats(
  clientId: string,
  startDate: string,
  endDate: string,
  expectedMealsPerDay: number
): Promise<{
  totalExpected: number;
  totalLogged: number;
  adherenceRate: number;
  dayBreakdown: Array<{ date: string; logged: number; expected: number }>;
}> {
  try {
    const logs = await getMealPhotoHistory(clientId, startDate, endDate);
    
    // Calculate days in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const totalExpected = daysDiff * expectedMealsPerDay;
    const totalLogged = logs.length;
    const adherenceRate = totalExpected > 0 ? (totalLogged / totalExpected) * 100 : 0;

    // Group by date for breakdown
    const logsByDate = logs.reduce((acc, log) => {
      acc[log.log_date] = (acc[log.log_date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dayBreakdown = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dayBreakdown.push({
        date: dateStr,
        logged: logsByDate[dateStr] || 0,
        expected: expectedMealsPerDay
      });
    }

    return {
      totalExpected,
      totalLogged,
      adherenceRate: Math.round(adherenceRate * 10) / 10, // Round to 1 decimal
      dayBreakdown
    };
  } catch (error) {
    console.error('Error in getMealAdherenceStats:', error);
    return {
      totalExpected: 0,
      totalLogged: 0,
      adherenceRate: 0,
      dayBreakdown: []
    };
  }
}

/**
 * Delete meal photo log and remove from storage
 */
export async function deleteMealPhoto(photoLogId: string): Promise<boolean> {
  try {
    // Get photo log to find storage path
    const { data: photoLog, error: fetchError } = await supabase
      .from('meal_photo_logs')
      .select('photo_path')
      .eq('id', photoLogId)
      .single();

    if (fetchError || !photoLog) {
      console.error('Error fetching photo log for deletion:', fetchError);
      return false;
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([photoLog.photo_path]);

    if (storageError) {
      console.warn('Warning: Could not delete photo from storage:', storageError);
      // Continue to delete DB record anyway
    }

    // Delete DB log
    const { error: dbError } = await supabase
      .from('meal_photo_logs')
      .delete()
      .eq('id', photoLogId);

    if (dbError) {
      console.error('Error deleting meal photo log from DB:', dbError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteMealPhoto:', error);
    return false;
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

function validateFile(file: File): string | null {
  // Check file exists
  if (!file) {
    return 'No file provided';
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`;
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    return `File too large. Maximum: ${MAX_FILE_SIZE_MB}MB`;
  }

  return null; // Valid
}

function sanitizeFilename(filename: string): string {
  // Remove unsafe characters and limit length
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100);
}

// ============================================================================
// UI Helper Functions
// ============================================================================

/**
 * Check if meal has been logged today
 * @returns { logged: boolean, photoLog?: MealPhotoLog }
 */
export async function isMealLoggedToday(
  clientId: string,
  mealId: string
): Promise<{ logged: boolean; photoLog?: MealPhotoLog }> {
  const today = new Date().toISOString().split('T')[0];
  const photoLog = await getMealPhotoForDate(clientId, mealId, today);
  
  return {
    logged: photoLog !== null,
    photoLog: photoLog || undefined
  };
}

/**
 * Get today's adherence rate (for dashboard widget)
 */
export async function getTodayAdherence(
  clientId: string,
  expectedMealsToday: number
): Promise<{ logged: number; expected: number; percentage: number }> {
  const today = new Date().toISOString().split('T')[0];
  const logs = await getMealPhotosForDay(clientId, today);
  
  const logged = logs.length;
  const percentage = expectedMealsToday > 0 
    ? Math.round((logged / expectedMealsToday) * 100)
    : 0;

  return {
    logged,
    expected: expectedMealsToday,
    percentage
  };
}

