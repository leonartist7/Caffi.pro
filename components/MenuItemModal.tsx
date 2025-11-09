'use client';

import { useState, useEffect } from 'react';

interface MenuItem {
  item_id?: string;
  tenant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  tags: string[];
  allergens: string[];
  calories: number | null;
  is_available: boolean;
}

interface Category {
  category_id: string;
  name: string;
}

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (menuItem: Partial<MenuItem>) => Promise<void>;
  menuItem?: MenuItem | null;
  tenantId: string;
  categories: Category[];
}

export default function MenuItemModal({
  isOpen,
  onClose,
  onSave,
  menuItem,
  tenantId,
  categories,
}: MenuItemModalProps) {
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    tenant_id: tenantId,
    category_id: '',
    name: '',
    description: '',
    price: 0,
    image_url: '',
    tags: [],
    allergens: [],
    calories: null,
    is_available: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [allergensInput, setAllergensInput] = useState('');

  useEffect(() => {
    if (menuItem) {
      setFormData(menuItem);
      setTagsInput(menuItem.tags?.join(', ') || '');
      setAllergensInput(menuItem.allergens?.join(', ') || '');
    } else {
      setFormData({
        tenant_id: tenantId,
        category_id: categories[0]?.category_id || '',
        name: '',
        description: '',
        price: 0,
        image_url: '',
        tags: [],
        allergens: [],
        calories: null,
        is_available: true,
      });
      setTagsInput('');
      setAllergensInput('');
    }
    setError('');
  }, [menuItem, tenantId, categories, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Parse tags and allergens
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t);
      const allergens = allergensInput
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a);

      await onSave({
        ...formData,
        tags,
        allergens,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {menuItem ? 'Edit Menu Item' : 'Add Menu Item'}
                  </h3>

                  {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Category *
                      </label>
                      <select
                        required
                        value={formData.category_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            category_id: e.target.value,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                          <option key={cat.category_id} value={cat.category_id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Price * (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              price: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Calories
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.calories || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              calories: e.target.value
                                ? parseInt(e.target.value)
                                : null,
                            })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Image URL
                      </label>
                      <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            image_url: e.target.value,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., hot, coffee, popular"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Allergens (comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., milk, nuts, gluten"
                        value={allergensInput}
                        onChange={(e) => setAllergensInput(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_available"
                        checked={formData.is_available}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_available: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label
                        htmlFor="is_available"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Available
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

>>>>>>> origin/main
