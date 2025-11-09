import { supabase } from './supabase'

export const STORAGE_BUCKETS = {
  CAFE_LOGOS: 'cafe-logos',
  MENU_ITEMS: 'menu-items',
  PROFILES: 'profiles',
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
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

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
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

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
 * Upload cafe logo
 * @param file - The logo file
 * @param cafeId - The cafe tenant ID
 */
export async function uploadCafeLogo(
  file: File,
  cafeId: string
): Promise<UploadResult> {
  return uploadFile(file, STORAGE_BUCKETS.CAFE_LOGOS, cafeId)
}

/**
 * Upload menu item image
 * @param file - The menu item image
 * @param cafeId - The cafe tenant ID
 */
export async function uploadMenuItemImage(
  file: File,
  cafeId: string
): Promise<UploadResult> {
  return uploadFile(file, STORAGE_BUCKETS.MENU_ITEMS, cafeId)
}

/**
 * Get the public URL for a storage file
 * @param bucket - The storage bucket name
 * @param path - The file path
 */
export function getPublicUrl(bucket: string, path: string): string {
  if (!supabase) {
    return ''
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
