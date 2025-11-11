import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { X, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface CategoryFormData {
  name: string
  description: string
  image_url: string
  icon_name: string
  is_active: boolean
}

interface Category extends CategoryFormData {
  category_id: string
}

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category?: Category
  onSave?: (categoryData: Partial<Category>) => Promise<void>
  tenantId?: string
}

export function CategoryModal({ isOpen, onClose, category }: CategoryModalProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: '',
      description: '',
      image_url: '',
      icon_name: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        description: category.description || '',
        image_url: category.image_url || '',
        icon_name: category.icon_name || '',
        is_active: category.is_active,
      })
    } else {
      reset()
    }
  }, [category, reset])

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        image_url: data.image_url || null,
        icon_name: data.icon_name || null,
        is_active: data.is_active,
        tenant_id: 'YOUR_TENANT_ID', // This should come from auth context
        display_order: 0,
      }

      if (category) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('category_id', category.category_id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('categories').insert(payload)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(category ? 'Category updated successfully' : 'Category created successfully')
      onClose()
      reset()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save category')
    },
  })

  const onSubmit = (data: CategoryFormData) => {
    mutation.mutate(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">
              {category ? 'Edit Category' : 'Add Category'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name *
              </label>
              <input
                {...register('name', { required: 'Name is required' })}
                className="input"
                placeholder="e.g., Coffee, Pastries"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="input"
                placeholder="Describe this category..."
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <div className="flex gap-2">
                <input
                  {...register('image_url')}
                  className="input flex-1"
                  placeholder="https://example.com/image.jpg"
                />
                <button type="button" className="btn btn-secondary flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>
            </div>

            {/* Icon Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon Name</label>
              <input {...register('icon_name')} className="input" placeholder="e.g., coffee-cup" />
              <p className="mt-1 text-xs text-gray-500">Icon identifier for the mobile app</p>
            </div>

            {/* Is Active */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('is_active')}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Active (visible to customers)
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                {mutation.isPending
                  ? 'Saving...'
                  : category
                    ? 'Update Category'
                    : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
