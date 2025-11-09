import { supabase } from './supabase'
import { toast } from 'sonner'

/**
 * Upload an image to Supabase Storage
 * @param file - The image file to upload
 * @param bucket - The storage bucket name (default: 'images')
 * @param folder - Optional folder path within the bucket
 * @returns The public URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  bucket: string = 'images',
  folder?: string
): Promise<string> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('Image must be less than 5MB')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = folder ? `${folder}/${fileName}` : fileName

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error: any) {
    console.error('Image upload error:', error)
    throw error
  }
}

/**
 * Delete an image from Supabase Storage
 * @param url - The public URL of the image to delete
 * @param bucket - The storage bucket name (default: 'images')
 */
export async function deleteImage(
  url: string,
  bucket: string = 'images'
): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = url.split(`/${bucket}/`)
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL')
    }
    
    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) throw error
  } catch (error: any) {
    console.error('Image deletion error:', error)
    throw error
  }
}

/**
 * React hook for handling image uploads
 */
export function useImageUpload() {
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const uploadWithProgress = async (
    file: File,
    bucket?: string,
    folder?: string
  ): Promise<string> => {
    setUploading(true)
    setProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const url = await uploadImage(file, bucket, folder)

      clearInterval(progressInterval)
      setProgress(100)
      
      toast.success('Image uploaded successfully')
      
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 500)

      return url
    } catch (error: any) {
      setUploading(false)
      setProgress(0)
      toast.error(error.message || 'Failed to upload image')
      throw error
    }
  }

  return {
    uploading,
    progress,
    uploadImage: uploadWithProgress,
  }
}

// Import React at the top if using the hook
import React from 'react'
