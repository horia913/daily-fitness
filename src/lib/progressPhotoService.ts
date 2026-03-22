/**
 * Progress Photos Service
 * Client progress-photos timeline: upload by (client_id, photo_date, photo_type).
 * Writes to table progress_photos and Storage path {clientId}/{dateStr}/{type}.jpg.
 * Used by: weekly check-in flow, client progress/photos page, coach progress hub (photos section).
 */

import { supabase } from "./supabase";
import { getLatestMeasurement } from "./measurementService";

const STORAGE_BUCKET = "progress-photos";
const MAX_IMAGE_SIZE = 1200; // Max width/height in pixels
const JPEG_QUALITY = 0.8; // 80% quality

export interface ProgressPhoto {
  id: string;
  client_id: string;
  photo_date: string;
  photo_type: "front" | "side" | "back" | "other";
  photo_url: string; // Signed URL for private buckets
  photo_path: string;
  weight_kg?: number | null;
  body_fat_percentage?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Generate signed URL for a photo path (for private buckets)
 */
export async function getSignedUrl(photoPath: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(photoPath, expiresIn);
    
    if (error || !data?.signedUrl) {
      console.error("Error creating signed URL:", error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }
}

/**
 * Convert photo records to include signed URLs (for private buckets)
 */
async function enrichPhotosWithSignedUrls(photos: any[]): Promise<ProgressPhoto[]> {
  const enriched = await Promise.all(
    photos.map(async (photo) => {
      // If photo_url is a placeholder or old signed URL expired, generate new one
      const signedUrl = await getSignedUrl(photo.photo_path, 3600); // 1 hour expiry
      return {
        ...photo,
        photo_url: signedUrl || photo.photo_url, // Fallback to stored URL if generation fails
      } as ProgressPhoto;
    })
  );
  return enriched;
}

/**
 * Compress image: resize to max 1200px, convert to JPEG 80% quality
 */
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Resize if larger than MAX_IMAGE_SIZE
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          if (width > height) {
            height = (height / width) * MAX_IMAGE_SIZE;
            width = MAX_IMAGE_SIZE;
          } else {
            width = (width / height) * MAX_IMAGE_SIZE;
            height = MAX_IMAGE_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          JPEG_QUALITY
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a progress photo
 */
export async function uploadPhoto(
  clientId: string,
  data: {
    photo_date: string;
    photo_type: "front" | "side" | "back" | "other";
    file: File;
    weight_kg?: number;
    body_fat_percentage?: number;
    notes?: string;
  }
): Promise<ProgressPhoto> {
  try {
    // Validate file
    if (!data.file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (data.file.size > maxSize) {
      throw new Error("Image size must be less than 10MB");
    }

    // Compress image
    const compressedBlob = await compressImage(data.file);

    // Build storage path: progress-photos/{clientId}/{date}/{type}.jpg
    const dateStr = data.photo_date.replace(/-/g, "");
    const fileName = `${data.photo_type}.jpg`;
    const storagePath = `${clientId}/${dateStr}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, compressedBlob, {
        cacheControl: "3600",
        upsert: true, // Allow overwriting same photo type for same date
        contentType: "image/jpeg",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // For private buckets, we store the path and generate signed URLs on-demand
    // Store a placeholder URL that will be replaced when fetching
    const placeholderUrl = `storage://${storagePath}`;

    // Insert into progress_photos table (upsert based on unique constraint)
    const { data: photoData, error: dbError } = await supabase
      .from("progress_photos")
      .upsert(
        {
          client_id: clientId,
          photo_date: data.photo_date,
          photo_type: data.photo_type,
          photo_url: placeholderUrl, // Will be replaced with signed URL when fetched
          photo_path: storagePath,
          weight_kg: data.weight_kg ?? null,
          body_fat_percentage: data.body_fat_percentage ?? null,
          notes: data.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "client_id,photo_date,photo_type",
        }
      )
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      // Try to clean up storage if DB insert fails
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      throw dbError;
    }

    return photoData as ProgressPhoto;
  } catch (error) {
    console.error("Error uploading progress photo:", error);
    throw error;
  }
}

/**
 * Get photos for a specific date
 */
export async function getPhotosForDate(
  clientId: string,
  date: string
): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("client_id", clientId)
    .eq("photo_date", date)
    .order("photo_type", { ascending: true });

  if (error) {
    console.error("Error fetching photos for date:", error);
    return [];
  }

  // Generate signed URLs for private bucket
  return await enrichPhotosWithSignedUrls(data || []);
}

/**
 * Get photo timeline (all dates with photos)
 */
export async function getPhotoTimeline(
  clientId: string
): Promise<
  { date: string; types: string[]; weight_kg?: number | null }[]
> {
  const { data, error } = await supabase
    .from("progress_photos")
    .select("photo_date, photo_type, weight_kg")
    .eq("client_id", clientId)
    .order("photo_date", { ascending: false });

  if (error) {
    console.error("Error fetching photo timeline:", error);
    return [];
  }

  // Group by date
  const grouped = new Map<
    string,
    { types: Set<string>; weight_kg?: number | null }
  >();
  (data || []).forEach((p: any) => {
    const date = p.photo_date;
    if (!grouped.has(date)) {
      grouped.set(date, { types: new Set(), weight_kg: p.weight_kg });
    }
    grouped.get(date)!.types.add(p.photo_type);
  });

  return Array.from(grouped.entries()).map(([date, info]) => ({
    date,
    types: Array.from(info.types),
    weight_kg: info.weight_kg,
  }));
}

/** Timeline rows with a signed preview URL per date (first photo path for that day). */
export async function getPhotoTimelineWithPreviews(
  clientId: string,
  maxDates = 10
): Promise<
  Array<{
    date: string;
    types: string[];
    weight_kg?: number | null;
    previewUrl: string | null;
  }>
> {
  const { data, error } = await supabase
    .from("progress_photos")
    .select("photo_date, photo_type, weight_kg, photo_path")
    .eq("client_id", clientId)
    .order("photo_date", { ascending: false });

  if (error || !data?.length) return [];

  const byDate = new Map<
    string,
    { types: Set<string>; weight_kg?: number | null; path?: string }
  >();
  for (const p of data as Array<{
    photo_date: string;
    photo_type: string;
    weight_kg?: number | null;
    photo_path?: string | null;
  }>) {
    const d = p.photo_date;
    if (!byDate.has(d)) {
      byDate.set(d, {
        types: new Set(),
        weight_kg: p.weight_kg,
        path: p.photo_path ?? undefined,
      });
    }
    const g = byDate.get(d)!;
    g.types.add(p.photo_type);
    if (!g.path && p.photo_path) g.path = p.photo_path;
  }

  const slice = Array.from(byDate.entries()).slice(0, maxDates);
  return Promise.all(
    slice.map(async ([date, info]) => {
      const previewUrl = info.path ? await getSignedUrl(info.path, 3600) : null;
      return {
        date,
        types: Array.from(info.types),
        weight_kg: info.weight_kg,
        previewUrl,
      };
    })
  );
}

/**
 * Get latest photos (one of each type)
 */
export async function getLatestPhotos(
  clientId: string
): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("client_id", clientId)
    .order("photo_date", { ascending: false })
    .order("photo_type", { ascending: true });

  if (error) {
    console.error("Error fetching latest photos:", error);
    return [];
  }

  // Get most recent of each type
  const byType = new Map<string, any>();
  (data || []).forEach((p: any) => {
    if (!byType.has(p.photo_type)) {
      byType.set(p.photo_type, p);
    }
  });

  // Generate signed URLs for private bucket
  return await enrichPhotosWithSignedUrls(Array.from(byType.values()));
}

/**
 * Delete a photo
 */
export async function deletePhoto(
  photoId: string,
  clientId: string
): Promise<void> {
  try {
    // Get photo to find storage path
    const { data: photo, error: fetchError } = await supabase
      .from("progress_photos")
      .select("photo_path")
      .eq("id", photoId)
      .eq("client_id", clientId)
      .single();

    if (fetchError || !photo) {
      throw new Error("Photo not found");
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([photo.photo_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      // Continue to delete from DB even if storage delete fails
    }

    // Delete from DB
    const { error: dbError } = await supabase
      .from("progress_photos")
      .delete()
      .eq("id", photoId)
      .eq("client_id", clientId);

    if (dbError) {
      throw dbError;
    }
  } catch (error) {
    console.error("Error deleting photo:", error);
    throw error;
  }
}

/**
 * Get comparison photos between two dates
 */
export async function getComparisonPhotos(
  clientId: string,
  date1: string,
  date2: string
): Promise<{
  before: ProgressPhoto[];
  after: ProgressPhoto[];
}> {
  // Fetch both dates in parallel
  const [beforeData, afterData] = await Promise.all([
    supabase
      .from("progress_photos")
      .select("*")
      .eq("client_id", clientId)
      .eq("photo_date", date1)
      .order("photo_type", { ascending: true }),
    supabase
      .from("progress_photos")
      .select("*")
      .eq("client_id", clientId)
      .eq("photo_date", date2)
      .order("photo_type", { ascending: true }),
  ]);

  // Generate signed URLs for both sets
  const [before, after] = await Promise.all([
    enrichPhotosWithSignedUrls(beforeData.data || []),
    enrichPhotosWithSignedUrls(afterData.data || []),
  ]);

  return { before, after };
}

/**
 * Get latest weight from body_metrics (for auto-fill)
 */
export async function getLatestWeightForPhoto(
  clientId: string
): Promise<number | null> {
  try {
    const latest = await getLatestMeasurement(clientId);
    return latest?.weight_kg ?? null;
  } catch (error) {
    console.error("Error fetching latest weight:", error);
    return null;
  }
}
