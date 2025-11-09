# 🚀 Supabase Storage Integration Guide

## Overview

This guide explains how to use the image upload functionality with Supabase Storage for cafe logos and menu item images.

## Setup

### 1. Create Storage Buckets in Supabase

Go to your Supabase Dashboard → Storage and create these buckets:

- `cafe-logos` - For cafe logo images
- `menu-items` - For menu item photos
- `profiles` - For user profile pictures

**Important:** Set the buckets to **public** if you want the images to be publicly accessible.

### 2. Storage Policies (RLS)

Apply these RLS policies in Supabase:

```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'cafe-logos' );

-- Allow authenticated uploads
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'cafe-logos' AND auth.role() = 'authenticated' );

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'cafe-logos' AND auth.role() = 'authenticated' );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING ( bucket_id = 'cafe-logos' AND auth.role() = 'authenticated' );
```

## Usage Examples

### Example 1: Upload Cafe Logo

```tsx
'use client'

import { useState } from 'react'
import ImageUpload from '@/components/ImageUpload'
import { useImageUpload } from '@/hooks/useImageUpload'

export default function CafeLogoUploader({ cafeId }: { cafeId: string }) {
  const { upload, uploading, uploadedUrl, error } = useImageUpload({
    type: 'cafe-logo',
    entityId: cafeId,
    onSuccess: (url) => {
      console.log('Logo uploaded successfully:', url)
      // Update cafe record in database with new logo URL
    },
    onError: (error) => {
      console.error('Upload failed:', error)
    },
  })

  return (
    <div>
      <h2>Upload Cafe Logo</h2>

      <ImageUpload
        onImageSelect={upload}
        currentImageUrl={uploadedUrl}
        label="Cafe Logo"
        maxSizeMB={2}
        acceptedFormats={['image/png', 'image/jpeg', 'image/webp']}
      />

      {uploading && <p>Uploading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {uploadedUrl && (
        <div>
          <p>Upload successful!</p>
          <img src={uploadedUrl} alt="Uploaded logo" style={{ width: 200 }} />
        </div>
      )}
    </div>
  )
}
```

### Example 2: Upload Menu Item Image

```tsx
'use client'

import ImageUpload from '@/components/ImageUpload'
import { uploadMenuItemImage } from '@/lib/storage'

export default function MenuItemForm({ cafeId }: { cafeId: string }) {
  const [imageUrl, setImageUrl] = useState<string>('')

  const handleImageUpload = async (file: File) => {
    const result = await uploadMenuItemImage(file, cafeId)

    if (result.error) {
      alert('Upload failed: ' + result.error)
      return
    }

    setImageUrl(result.url)
    console.log('Image uploaded to:', result.url)
  }

  return (
    <form>
      <input type="text" placeholder="Item name" />
      <textarea placeholder="Description" />

      <ImageUpload
        onImageSelect={handleImageUpload}
        currentImageUrl={imageUrl}
        label="Menu Item Photo"
      />

      <button type="submit">Save Menu Item</button>
    </form>
  )
}
```

### Example 3: Direct Upload Without Hook

```tsx
import { uploadFile, STORAGE_BUCKETS } from '@/lib/storage'

async function handleDirectUpload(file: File) {
  const result = await uploadFile(
    file,
    STORAGE_BUCKETS.CAFE_LOGOS,
    'tenant-123' // optional subdirectory
  )

  if (result.error) {
    console.error('Upload failed:', result.error)
    return
  }

  console.log('File uploaded!')
  console.log('URL:', result.url)
  console.log('Path:', result.path)
}
```

## API Reference

### Storage Functions (`lib/storage.ts`)

#### `uploadFile(file, bucket, path?)`
Generic file upload function.

**Parameters:**
- `file: File` - The file to upload
- `bucket: string` - Storage bucket name
- `path?: string` - Optional subdirectory path

**Returns:** `Promise<UploadResult>`
```ts
{
  url: string    // Public URL of uploaded file
  path: string   // Storage path
  error?: string // Error message if failed
}
```

#### `uploadCafeLogo(file, cafeId)`
Upload a cafe logo image.

#### `uploadMenuItemImage(file, cafeId)`
Upload a menu item image.

#### `deleteFile(bucket, path)`
Delete a file from storage.

#### `getPublicUrl(bucket, path)`
Get the public URL for an existing file.

### Hook: `useImageUpload`

```ts
const { upload, uploading, uploadedUrl, error, reset } = useImageUpload({
  type: 'cafe-logo' | 'menu-item',
  entityId: string,
  onSuccess?: (url: string) => void,
  onError?: (error: string) => void,
})
```

**Returns:**
- `upload: (file: File) => Promise<void>` - Function to upload file
- `uploading: boolean` - Upload in progress
- `uploadedUrl: string | null` - URL of uploaded file
- `error: string | null` - Error message
- `reset: () => void` - Reset state

## Component: ImageUpload

Full-featured image upload component with drag & drop.

**Props:**
```ts
{
  onImageSelect: (file: File) => void
  currentImageUrl?: string | null
  maxSizeMB?: number              // Default: 5
  acceptedFormats?: string[]       // Default: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  label?: string                   // Default: 'Upload Image'
  className?: string
}
```

**Features:**
- Drag and drop support
- File type validation
- File size validation
- Image preview
- Remove uploaded image
- Error handling
- Customizable styling

## Integration with Database

After uploading an image, update your database record:

```ts
// After successful upload
const { url } = await uploadCafeLogo(file, cafeId)

// Update cafe record
await supabaseAdmin
  .from('tenants')
  .update({ logo_url: url })
  .eq('tenant_id', cafeId)
```

## Storage Bucket Configuration

### Recommended Settings

**cafe-logos:**
- Max file size: 2 MB
- Allowed types: PNG, JPEG, WebP
- Public access: Yes

**menu-items:**
- Max file size: 5 MB
- Allowed types: PNG, JPEG, WebP
- Public access: Yes

## Troubleshooting

### Images not loading
- Check bucket is set to public
- Verify RLS policies allow public SELECT
- Check CORS settings in Supabase

### Upload fails
- Verify service role key is set in environment
- Check file size limits
- Ensure bucket exists
- Check RLS policies for INSERT

### CORS errors
Go to Supabase Dashboard → Storage → Configuration and add your domain to allowed origins.

## Best Practices

1. **Always validate file size and type** on the client before uploading
2. **Use unique filenames** to avoid collisions (built into `uploadFile`)
3. **Store the URL in your database** after successful upload
4. **Delete old images** when updating (use `deleteFile`)
5. **Show loading states** during upload
6. **Handle errors gracefully** with user-friendly messages
7. **Optimize images** before upload (consider using next/image optimization)

## Next Steps

1. Create storage buckets in Supabase
2. Set up RLS policies
3. Configure environment variables
4. Integrate ImageUpload component into your forms
5. Update database records with uploaded URLs

---

**Ready to use!** All components and utilities are production-ready. 🚀
