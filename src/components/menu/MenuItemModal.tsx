import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { X, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface MenuItemFormData {
  name: string
  description: string
  category_id: string
  price: number
  image_url: string
  is_available: boolean
  is_featured: boolean
  tags: string
  calories: number | null
  allergens: string
}

interface MenuItemModalProps {
  isOpen: boolean
  onClose: () => void
  item?: any
  categories: any[]
}

export function MenuItemModal({ isOpen, onClose, item, categories }: MenuItemModalProps) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MenuItemFormData>({
    defaultValues: {
      name: '',
      description: '',
      category_id: '',
      price: 0,
      image_url: '',
      is_available: true,
      is_featured: false,
      tags: '',
      calories: null,
      allergens: '',
    },
  })

  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        description: item.description || '',
        category_id: item.category_id,
        price: item.price,
        image_url: item.image_url || '',
        is_available: item.is_available,
        is_featured: item.is_featured,
        tags: item.tags?.join(', ') || '',
        calories: item.calories,
        allergens: item.allergens?.join(', ') || '',
      })
    } else {
      reset()
    }
  }, [item, reset])

  const mutation = useMutation({
    mutationFn: async (data: MenuItemFormData) => {
      const payload = {
        name: data.name,
        description: data.description,
        category_id: data.category_id,
        price: data.price,
        image_url: data.image_url || null,
        is_available: data.is_available,
        is_featured: data.is_featured,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
        calories: data.calories || null,
        allergens: data.allergens ? data.allergens.split(',').map(a => a.trim()) : [],
        tenant_id: 'YOUR_TENANT_ID', // This should come from auth context
        display_order: 0,
        is_active: true,
        modifiers: { sizes: [], addons: [] },
        available_at_locations: [],
      }

      if (item) {
        const { error } = await supabase
          .from('menu_items')
          .update(payload)
          .eq('item_id', item.item_id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(payload)
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
      toast.success(item ? 'Menu item updated successfully' : 'Menu item created successfully')
      onClose()
      reset()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save menu item')
    },
  })

  const onSubmit = (data: MenuItemFormData) => {
    mutation.mutate(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />

        <div className="relative inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">
              {item ? 'Edit Menu Item' : 'Add Menu Item'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="input"
                  placeholder="e.g., Cappuccino"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  {...register('category_id', { required: 'Category is required' })}
                  className="input"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { 
                    required: 'Price is required',
                    min: { value: 0, message: 'Price must be positive' }
                  })}
                  className="input"
                  placeholder="4.50"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="input"
                  placeholder="Describe your menu item..."
                />
              </div>

              {/* Image URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    {...register('image_url')}
                    className="input flex-1"
                    placeholder="https://example.com/image.jpg"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  {...register('tags')}
                  className="input"
                  placeholder="vegan, hot, popular"
                />
              </div>

              {/* Calories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calories
                </label>
                <input
                  type="number"
                  {...register('calories')}
                  className="input"
                  placeholder="250"
                />
              </div>

              {/* Allergens */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allergens (comma-separated)
                </label>
                <input
                  {...register('allergens')}
                  className="input"
                  placeholder="milk, nuts"
                />
              </div>

              {/* Checkboxes */}
              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('is_available')}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Available for ordering
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('is_featured')}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Featured item
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn btn-primary"
              >
                {mutation.isPending ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
