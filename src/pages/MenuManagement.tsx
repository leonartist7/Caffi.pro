import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, Image as ImageIcon, DollarSign, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { MenuItemModal } from '@/components/menu/MenuItemModal'
import { CategoryModal } from '@/components/menu/CategoryModal'

export function MenuManagement() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  
  const queryClient = useQueryClient()

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
      
      if (error) throw error
      return data
    },
  })

  // Fetch menu items
  const { data: menuItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['menu-items', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('menu_items')
        .select('*, categories(name)')
        .order('display_order', { ascending: true })
      
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('item_id', itemId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] })
      toast.success('Menu item deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete menu item')
    },
  })

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('category_id', categoryId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setSelectedCategory(null)
      toast.success('Category deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete category')
    },
  })

  const handleEditItem = (item: any) => {
    setEditingItem(item)
    setIsItemModalOpen(true)
  }

  const handleEditCategory = (category: any) => {
    setEditingCategory(category)
    setIsCategoryModalOpen(true)
  }

  const handleAddItem = () => {
    setEditingItem(null)
    setIsItemModalOpen(true)
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    setIsCategoryModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="mt-2 text-gray-600">
            Manage your menu categories and items
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAddCategory}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
          <button
            onClick={handleAddItem}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Menu Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  !selectedCategory
                    ? 'bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                All Items ({menuItems?.length || 0})
              </button>
              {categories?.map((category) => (
                <div
                  key={category.category_id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === category.category_id
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <button
                    onClick={() => setSelectedCategory(category.category_id)}
                    className="flex-1 text-left"
                  >
                    {category.name}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="p-1 hover:bg-white rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this category?')) {
                          deleteCategoryMutation.mutate(category.category_id)
                        }
                      }}
                      className="p-1 hover:bg-white rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="lg:col-span-3">
          {itemsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading menu items...</p>
            </div>
          ) : menuItems && menuItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menuItems.map((item) => (
                <div key={item.item_id} className="card hover:shadow-md transition-shadow">
                  <div className="flex gap-4">
                    {/* Item Image */}
                    <div className="flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {item.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this item?')) {
                                deleteItemMutation.mutate(item.item_id)
                              }
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>

                      {/* Price and Status */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1 text-primary-700 font-semibold">
                          <DollarSign className="w-4 h-4" />
                          €{item.price.toFixed(2)}
                        </div>
                        <span
                          className={`badge ${
                            item.is_available ? 'badge-success' : 'badge-danger'
                          }`}
                        >
                          {item.is_available ? 'Available' : 'Unavailable'}
                        </span>
                        {item.is_featured && (
                          <span className="badge badge-warning">Featured</span>
                        )}
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {item.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                            >
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 card">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No menu items yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by adding your first menu item
              </p>
              <button onClick={handleAddItem} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Menu Item
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MenuItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false)
          setEditingItem(null)
        }}
        item={editingItem}
        categories={categories || []}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false)
          setEditingCategory(null)
        }}
        category={editingCategory}
      />
    </div>
  )
}
