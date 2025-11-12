import { createClient } from '@/utils/supabase/client'

export const STORAGE_BUCKETS = {
  MENU_ITEM_IMAGES: 'menu-item-images',
  CATEGORY_IMAGES: 'category-images',
  REWARD_IMAGES: 'reward-images',
  LOCATION_IMAGES: 'location-images',
}

interface UploadResult {
  url: string
  path: string
  error?: string
}

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name
 * @param path - Optional path within the bucket
 * @returns Promise with the public URL and path
 */
export async function uploadFile(
  file: File,
  bucket: string,
  path?: string
): Promise<UploadResult> {
  try {
    const supabase = createClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = path ? `${path}/${fileName}` : fileName

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      throw error
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      url: urlData.publicUrl,
      path: data.path,
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    return {
      url: '',
      path: '',
      error: error.message || 'Failed to upload file',
    }
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path to delete
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      throw error
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

/**
 * Upload menu item image
 * @param file - The menu item image
 * @param tenantId - The tenant ID
 */
export async function uploadMenuItemImage(
  file: File,
  tenantId: string
): Promise<UploadResult> {
  return uploadFile(file, STORAGE_BUCKETS.MENU_ITEM_IMAGES, tenantId)
}

/**
 * Upload category image
 * @param file - The category image
 * @param tenantId - The tenant ID
 */
export async function uploadCategoryImage(
  file: File,
  tenantId: string
): Promise<UploadResult> {
  return uploadFile(file, STORAGE_BUCKETS.CATEGORY_IMAGES, tenantId)
}

/**
 * Upload reward image
 * @param file - The reward image
 * @param tenantId - The tenant ID
 */
export async function uploadRewardImage(
  file: File,
  tenantId: string
): Promise<UploadResult> {
  return uploadFile(file, STORAGE_BUCKETS.REWARD_IMAGES, tenantId)
}

/**
 * Upload location image
 * @param file - The location image
 * @param tenantId - The tenant ID
 */
export async function uploadLocationImage(
  file: File,
  tenantId: string
): Promise<UploadResult> {
  return uploadFile(file, STORAGE_BUCKETS.LOCATION_IMAGES, tenantId)
}

/**
 * Get the public URL for a storage file
 * @param bucket - The storage bucket name
 * @param path - The file path
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
