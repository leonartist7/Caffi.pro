'use client'

import { useState } from 'react'
import Badge from '@/components/Badge'
import {
  CogIcon,
  BellIcon,
  KeyIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ServerIcon,
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    orderUpdates: true,
    newCafes: true,
    systemAlerts: true,
  })

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'api', name: 'API Keys', icon: KeyIcon },
    { id: 'email', name: 'Email Templates', icon: EnvelopeIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'system', name: 'System Info', icon: ServerIcon },
  ]

  const apiKeys = [
    {
      name: 'Supabase URL',
      value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured',
      visible: true,
    },
    {
      name: 'Supabase Anon Key',
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'Not configured',
      visible: false,
    },
    {
      name: 'Stripe Public Key',
      value: 'pk_test_••••••••••••••••',
      visible: false,
    },
  ]

  const emailTemplates = [
    {
      name: 'Welcome Email',
      subject: 'Welcome to Caffi.pro!',
      lastUpdated: '2 days ago',
      status: 'active',
    },
    {
      name: 'Order Confirmation',
      subject: 'Your order #{{order_number}} is confirmed',
      lastUpdated: '1 week ago',
      status: 'active',
    },
    {
      name: 'Password Reset',
      subject: 'Reset your password',
      lastUpdated: '3 weeks ago',
      status: 'active',
    },
    {
      name: 'New Cafe Onboarding',
      subject: 'Welcome aboard! Here\'s how to get started',
      lastUpdated: '1 month ago',
      status: 'draft',
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage platform configuration and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 mb-6">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">General Settings</h2>
              <p className="text-gray-600 mb-6">Configure your platform preferences</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  defaultValue="Caffi.pro"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  defaultValue="support@caffi.pro"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Currency
                </label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New York (EST)</option>
                </select>
              </div>
            </div>

            <button className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl transition-all">
              Save Changes
            </button>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Notification Preferences</h2>
              <p className="text-gray-600 mb-6">Choose how you want to be notified</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-alt">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive updates via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) =>
                      setNotifications({ ...notifications, email: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-alt">
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.push}
                    onChange={(e) =>
                      setNotifications({ ...notifications, push: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-alt">
                <div>
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-600">Receive text messages for urgent updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.sms}
                    onChange={(e) =>
                      setNotifications({ ...notifications, sms: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="font-bold text-gray-900 mb-4">Notification Types</h3>
              <div className="space-y-3">
                {[
                  { key: 'orderUpdates', label: 'Order Updates', desc: 'Get notified about new orders and status changes' },
                  { key: 'newCafes', label: 'New Café Registrations', desc: 'When a new café signs up' },
                  { key: 'systemAlerts', label: 'System Alerts', desc: 'Important system messages and updates' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={item.key}
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor={item.key} className="flex-1">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <button className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl transition-all">
              Save Preferences
            </button>
          </div>
        )}

        {/* API Keys */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">API Keys & Credentials</h2>
              <p className="text-gray-600 mb-6">Manage your API keys and integrations</p>
            </div>

            <div className="space-y-4">
              {apiKeys.map((key, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">{key.name}</p>
                    <p className="text-sm font-mono text-gray-600">
                      {key.visible ? key.value : '••••••••••••••••'}
                    </p>
                  </div>
                  <button className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-all">
                    {key.visible ? 'Hide' : 'Reveal'}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Keep your API keys secure. Never share them publicly or commit them to version control.
              </p>
            </div>
          </div>
        )}

        {/* Email Templates */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Email Templates</h2>
                <p className="text-gray-600">Customize automated email messages</p>
              </div>
              <button className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-xl transition-all">
                + New Template
              </button>
            </div>

            <div className="space-y-3">
              {emailTemplates.map((template, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <Badge variant={template.status === 'active' ? 'success' : 'default'} size="sm">
                        {template.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{template.subject}</p>
                    <p className="text-xs text-gray-500">Last updated {template.lastUpdated}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
                      Preview
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-all">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Security Settings</h2>
              <p className="text-gray-600 mb-6">Manage security and access controls</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                  </div>
                  <Badge variant="warning">Not Enabled</Badge>
                </div>
                <button className="mt-3 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-all">
                  Enable 2FA
                </button>
              </div>

              <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">Session Timeout</p>
                    <p className="text-sm text-gray-600">Auto logout after 30 minutes of inactivity</p>
                  </div>
                  <Badge variant="success">Enabled</Badge>
                </div>
              </div>

              <div className="p-4 rounded-xl border-2 border-gray-200">
                <p className="font-medium text-gray-900 mb-3">Recent Login Activity</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Today at 10:23 AM</span>
                    <span className="text-gray-900">Chrome on macOS</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Yesterday at 2:15 PM</span>
                    <span className="text-gray-900">Safari on iPhone</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Info */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">System Information</h2>
              <p className="text-gray-600 mb-6">Platform status and technical details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-alt">
                <p className="text-sm text-gray-600 mb-1">Platform Version</p>
                <p className="text-lg font-bold text-gray-900">v1.0.0</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-alt">
                <p className="text-sm text-gray-600 mb-1">Database Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <p className="text-lg font-bold text-gray-900">Healthy</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-surface-alt">
                <p className="text-sm text-gray-600 mb-1">API Response Time</p>
                <p className="text-lg font-bold text-gray-900">45ms</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-alt">
                <p className="text-sm text-gray-600 mb-1">Uptime</p>
                <p className="text-lg font-bold text-gray-900">99.9%</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border-2 border-gray-200">
              <p className="font-medium text-gray-900 mb-3">Technology Stack</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Framework</p>
                  <p className="font-medium text-gray-900">Next.js 14</p>
                </div>
                <div>
                  <p className="text-gray-600">Database</p>
                  <p className="font-medium text-gray-900">Supabase (PostgreSQL)</p>
                </div>
                <div>
                  <p className="text-gray-600">Hosting</p>
                  <p className="font-medium text-gray-900">Vercel</p>
                </div>
                <div>
                  <p className="text-gray-600">Language</p>
                  <p className="font-medium text-gray-900">TypeScript</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
