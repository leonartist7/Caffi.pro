# Supabase Storage Buckets Setup

After running the SQL migration, you need to create storage buckets for images.

## Steps:

### 1. Go to Supabase Dashboard → Storage

### 2. Create these 4 buckets (click "New bucket"):

#### Bucket 1: `menu-item-images`

- Name: `menu-item-images`
- Public: ✅ YES (images need to be accessible)
- File size limit: 5 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

#### Bucket 2: `category-images`

- Name: `category-images`
- Public: ✅ YES
- File size limit: 3 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp, image/svg+xml`

#### Bucket 3: `reward-images`

- Name: `reward-images`
- Public: ✅ YES
- File size limit: 3 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

#### Bucket 4: `location-images`

- Name: `location-images`
- Public: ✅ YES
- File size limit: 3 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

### 3. Set up Storage Policies

For each bucket, add this policy (go to Policies tab):

**Policy Name:** "Public read access"
**Policy Definition:**

```sql
SELECT true
```

**Target roles:** `public`
**Allowed operations:** SELECT

**Policy Name:** "Authenticated users can upload"
**Policy Definition:**

```sql
(auth.role() = 'authenticated')
```

**Target roles:** `authenticated`
**Allowed operations:** INSERT, UPDATE, DELETE

### 4. Test Upload

Try uploading a test image to verify the buckets are working correctly.

## Image URLs

Once uploaded, images will be accessible at:

```
https://[YOUR_PROJECT_ID].supabase.co/storage/v1/object/public/menu-item-images/[filename]
```

Replace `[YOUR_PROJECT_ID]` with your actual Supabase project ID.
