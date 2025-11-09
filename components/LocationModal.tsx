'use client';

import { useState, useEffect } from 'react';
import HoursEditor from './HoursEditor';

interface Location {
  location_id?: string;
  tenant_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  hours: Record<string, string>;
  is_active: boolean;
  accepts_mobile_orders: boolean;
  accepts_dine_in_orders: boolean;
  estimated_prep_time: number;
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: Partial<Location>) => Promise<void>;
  location?: Location | null;
  tenantId: string;
}

export default function LocationModal({
  isOpen,
  onClose,
  onSave,
  location,
  tenantId,
}: LocationModalProps) {
  const [formData, setFormData] = useState<Partial<Location>>({
    tenant_id: tenantId,
    name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    phone: '',
    email: '',
    hours: {
      monday: '07:00-19:00',
      tuesday: '07:00-19:00',
      wednesday: '07:00-19:00',
      thursday: '07:00-19:00',
      friday: '07:00-19:00',
      saturday: '08:00-20:00',
      sunday: '08:00-18:00',
    },
    is_active: true,
    accepts_mobile_orders: true,
    accepts_dine_in_orders: true,
    estimated_prep_time: 15,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location) {
      setFormData(location);
    } else {
      setFormData({
        tenant_id: tenantId,
        name: '',
        address: '',
        city: '',
        postal_code: '',
        country: 'France',
        phone: '',
        email: '',
        hours: {
          monday: '07:00-19:00',
          tuesday: '07:00-19:00',
          wednesday: '07:00-19:00',
          thursday: '07:00-19:00',
          friday: '07:00-19:00',
          saturday: '08:00-20:00',
          sunday: '08:00-18:00',
        },
        is_active: true,
        accepts_mobile_orders: true,
        accepts_dine_in_orders: true,
        estimated_prep_time: 15,
      });
    }
    setError('');
  }, [location, tenantId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
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
                    {location ? 'Edit Location' : 'Add Location'}
                  </h3>

                  {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Basic Info */}
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
                        Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.city}
                          onChange={(e) =>
                            setFormData({ ...formData, city: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={formData.postal_code}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              postal_code: e.target.value,
                            })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Country *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.country}
                        onChange={(e) =>
                          setFormData({ ...formData, country: e.target.value })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Operating Hours */}
                    <HoursEditor
                      value={formData.hours || {}}
                      onChange={(hours) =>
                        setFormData({ ...formData, hours })
                      }
                    />

                    {/* Settings */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estimated Prep Time (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.estimated_prep_time}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            estimated_prep_time: parseInt(e.target.value) || 15,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              is_active: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor="is_active"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Active
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="accepts_mobile_orders"
                          checked={formData.accepts_mobile_orders}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              accepts_mobile_orders: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor="accepts_mobile_orders"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Accepts Mobile Orders
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="accepts_dine_in_orders"
                          checked={formData.accepts_dine_in_orders}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              accepts_dine_in_orders: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor="accepts_dine_in_orders"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Accepts Dine-in Orders
                        </label>
                      </div>
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

