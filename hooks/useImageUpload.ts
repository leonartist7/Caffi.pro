import { useState } from 'react'
import { uploadMenuItemImage, uploadLocationImage } from '@/lib/storage'

export type UploadType = 'location-image' | 'menu-item'

interface UseImageUploadOptions {
  type: UploadType
  entityId: string // tenant ID for uploads
  onSuccess?: (url: string) => void
  onError?: (error: string) => void
}

export function useImageUpload(options: UseImageUploadOptions) {
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File) => {
    setUploading(true)
    setError(null)

    try {
      let result

      if (options.type === 'location-image') {
        result = await uploadLocationImage(file, options.entityId)
      } else {
        result = await uploadMenuItemImage(file, options.entityId)
      }

      if (result.error) {
        throw new Error(result.error)
      }

      setUploadedUrl(result.url)
      options.onSuccess?.(result.url)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload image'
      setError(errorMessage)
      options.onError?.(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    setUploadedUrl(null)
    setError(null)
  }

  return {
    upload,
    uploading,
    uploadedUrl,
    error,
    reset,
  }
}
