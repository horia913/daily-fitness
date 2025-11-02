import { supabase } from './supabase'

const STORAGE_BUCKET = 'progress-photos'

export class ProgressPhotoStorage {
  /**
   * Upload a photo for a progress tracking record
   */
  static async uploadPhoto(
    file: File,
    clientId: string,
    recordType: 'body-metrics' | 'mobility' | 'fms',
    recordId: string,
    fileName?: string
  ): Promise<string> {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image')
      }

      // Validate file size (max 10MB for progress photos)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('Image size must be less than 10MB')
      }

      // Generate file name if not provided
      const fileExt = file.name.split('.').pop() || 'jpg'
      const uniqueFileName = fileName || `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      
      // Build storage path: {recordType}/{clientId}/{recordId}/{fileName}
      const storagePath = `${recordType}/${clientId}/${recordId}/${uniqueFileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Storage upload error:', error)
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading progress photo:', error)
      throw error
    }
  }

  /**
   * Delete a photo from storage
   */
  static async deletePhoto(
    photoUrl: string,
    clientId: string,
    recordType: 'body-metrics' | 'mobility' | 'fms',
    recordId: string
  ): Promise<boolean> {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split(`/${recordType}/${clientId}/${recordId}/`)
      if (urlParts.length < 2) {
        throw new Error('Invalid photo URL format')
      }

      const fileName = urlParts[1].split('?')[0] // Remove query params
      const storagePath = `${recordType}/${clientId}/${recordId}/${fileName}`

      // Delete from storage
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath])

      if (error) {
        console.error('Storage delete error:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error deleting progress photo:', error)
      throw error
    }
  }

  /**
   * Delete all photos for a record
   */
  static async deleteAllPhotos(
    photos: string[],
    clientId: string,
    recordType: 'body-metrics' | 'mobility' | 'fms',
    recordId: string
  ): Promise<boolean> {
    try {
      const deletePromises = photos.map(photoUrl => 
        this.deletePhoto(photoUrl, clientId, recordType, recordId)
      )

      await Promise.all(deletePromises)
      return true
    } catch (error) {
      console.error('Error deleting all photos:', error)
      throw error
    }
  }

  /**
   * Get public URL for a photo (if already uploaded)
   */
  static getPhotoUrl(
    storagePath: string
  ): string {
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    return publicUrl
  }
}

