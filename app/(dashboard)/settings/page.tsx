'use client'

import { useState } from 'react'
import {
  Settings as SettingsIcon,
  Bell,
  Key,
  Mail,
  Shield,
  Server,
  Save,
  Eye,
  EyeOff,
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'

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
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'api', name: 'API Keys', icon: Key },
    { id: 'email', name: 'Email Templates', icon: Mail },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'system', name: 'System Info', icon: Server },
  ]

  const apiKeys = [
    {
      id: 'supabase_url',
      name: 'Supabase URL',
      value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured',
      visible: true,
    },
    {
      id: 'supabase_anon',
      name: 'Supabase Anon Key',
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'Not configured',
      visible: false,
    },
    {
      id: 'stripe',
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
      subject: "Welcome aboard! Here's how to get started",
      lastUpdated: '1 month ago',
      status: 'draft',
    },
  ]

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
          Manage platform configuration and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6">
        <div className="flex overflow-x-auto border-b border-coffee-200/50 dark:border-dark-700 scrollbar-hide">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 lg:px-6 py-3 lg:py-4 font-medium transition-all whitespace-nowrap text-sm lg:text-base ${
                  activeTab === tab.id
                    ? 'text-coffee-700 dark:text-cream-200 border-b-2 border-coffee-600 dark:border-coffee-500'
                    : 'text-coffee-600 dark:text-cream-400 hover:text-coffee-900 dark:hover:text-cream-100'
                }`}
              >
                <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                {tab.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                General Settings
              </h2>
              <p className="text-sm lg:text-base text-coffee-600 dark:text-cream-400 mb-6">
                Configure your platform preferences
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  defaultValue="Caffi.pro"
                  className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  defaultValue="support@caffi.pro"
                  className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                  Default Currency
                </label>
                <select className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base">
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                  Timezone
                </label>
                <select className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 transition-all text-sm lg:text-base">
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New York (EST)</option>
                </select>
              </div>
            </div>

            <button className="flex items-center gap-2 bg-gradient-coffee text-cream-100 font-semibold py-2.5 lg:py-3 px-4 lg:px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm lg:text-base">
              <Save className="w-4 h-4 lg:w-5 lg:h-5" />
              Save Changes
            </button>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                Notification Preferences
              </h2>
              <p className="text-sm lg:text-base text-coffee-600 dark:text-cream-400 mb-6">
                Choose how you want to be notified
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-coffee-50/50 dark:bg-dark-900/50 border border-coffee-200/50 dark:border-dark-700">
                <div>
                  <p className="font-medium text-coffee-900 dark:text-cream-100">
                    Email Notifications
                  </p>
                  <p className="text-sm text-coffee-600 dark:text-cream-400">
                    Receive updates via email
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={e => setNotifications({ ...notifications, email: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-coffee-200 dark:bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-coffee-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-coffee-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coffee-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-coffee-50/50 dark:bg-dark-900/50 border border-coffee-200/50 dark:border-dark-700">
                <div>
                  <p className="font-medium text-coffee-900 dark:text-cream-100">
                    Push Notifications
                  </p>
                  <p className="text-sm text-coffee-600 dark:text-cream-400">
                    Receive push notifications in browser
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.push}
                    onChange={e => setNotifications({ ...notifications, push: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-coffee-200 dark:bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-coffee-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-coffee-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coffee-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-coffee-50/50 dark:bg-dark-900/50 border border-coffee-200/50 dark:border-dark-700">
                <div>
                  <p className="font-medium text-coffee-900 dark:text-cream-100">
                    SMS Notifications
                  </p>
                  <p className="text-sm text-coffee-600 dark:text-cream-400">
                    Receive text messages for urgent updates
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.sms}
                    onChange={e => setNotifications({ ...notifications, sms: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-coffee-200 dark:bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-coffee-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-coffee-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coffee-600"></div>
                </label>
              </div>
            </div>

            <div className="border-t border-coffee-200/50 dark:border-dark-700 pt-6 mt-6">
              <h3 className="font-bold text-coffee-900 dark:text-cream-100 mb-4">
                Notification Types
              </h3>
              <div className="space-y-3">
                {[
                  {
                    key: 'orderUpdates',
                    label: 'Order Updates',
                    desc: 'Get notified about new orders and status changes',
                  },
                  {
                    key: 'newCafes',
                    label: 'New Café Registrations',
                    desc: 'When a new café signs up',
                  },
                  {
                    key: 'systemAlerts',
                    label: 'System Alerts',
                    desc: 'Important system messages and updates',
                  },
                ].map(item => (
                  <div key={item.key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={item.key}
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={e =>
                        setNotifications({
                          ...notifications,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded border-coffee-300 dark:border-dark-600 text-coffee-600 focus:ring-coffee-500"
                    />
                    <label htmlFor={item.key} className="flex-1">
                      <p className="font-medium text-coffee-900 dark:text-cream-100">
                        {item.label}
                      </p>
                      <p className="text-sm text-coffee-600 dark:text-cream-400">{item.desc}</p>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <button className="flex items-center gap-2 bg-gradient-coffee text-cream-100 font-semibold py-2.5 lg:py-3 px-4 lg:px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm lg:text-base">
              <Save className="w-4 h-4 lg:w-5 lg:h-5" />
              Save Preferences
            </button>
          </div>
        )}

        {/* API Keys */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                API Keys & Credentials
              </h2>
              <p className="text-sm lg:text-base text-coffee-600 dark:text-cream-400 mb-6">
                Manage your API keys and integrations
              </p>
            </div>

            <div className="space-y-4">
              {apiKeys.map(key => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-coffee-200 dark:border-dark-700 bg-coffee-50/50 dark:bg-dark-900/50"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-medium text-coffee-900 dark:text-cream-100 mb-1">
                      {key.name}
                    </p>
                    <p className="text-sm font-mono text-coffee-600 dark:text-cream-400 truncate">
                      {showKeys[key.id] ? key.value : '••••••••••••••••'}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleKeyVisibility(key.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-coffee-700 dark:text-cream-300 hover:bg-coffee-100 dark:hover:bg-dark-800 rounded-lg transition-all"
                  >
                    {showKeys[key.id] ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Reveal
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                <strong>Note:</strong> Keep your API keys secure. Never share them publicly or
                commit them to version control.
              </p>
            </div>
          </div>
        )}

        {/* Email Templates */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                  Email Templates
                </h2>
                <p className="text-sm lg:text-base text-coffee-600 dark:text-cream-400">
                  Customize automated email messages
                </p>
              </div>
              <button className="self-start lg:self-auto flex items-center gap-2 bg-gradient-coffee text-cream-100 font-semibold py-2 lg:py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm lg:text-base">
                <Plus className="w-4 h-4" />
                New Template
              </button>
            </div>

            <div className="space-y-3">
              {emailTemplates.map((template, index) => (
                <div
                  key={index}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-xl border border-coffee-200 dark:border-dark-700 bg-coffee-50/50 dark:bg-dark-900/50 hover:border-coffee-300 dark:hover:border-dark-600 hover:shadow-md transition-all gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium text-coffee-900 dark:text-cream-100">
                        {template.name}
                      </p>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          template.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {template.status}
                      </span>
                    </div>
                    <p className="text-sm text-coffee-600 dark:text-cream-400 mb-1">
                      {template.subject}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-coffee-500 dark:text-cream-500">
                      <Clock className="w-3 h-3" />
                      <span>Last updated {template.lastUpdated}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 text-sm font-medium text-coffee-700 dark:text-cream-300 hover:bg-coffee-100 dark:hover:bg-dark-800 rounded-lg transition-all">
                      Preview
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-coffee-700 dark:text-cream-300 hover:bg-coffee-100 dark:hover:bg-dark-800 rounded-lg transition-all">
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
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                Security Settings
              </h2>
              <p className="text-sm lg:text-base text-coffee-600 dark:text-cream-400 mb-6">
                Manage security and access controls
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-coffee-200 dark:border-dark-700 bg-coffee-50/50 dark:bg-dark-900/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-coffee-900 dark:text-cream-100 mb-1">
                      Two-Factor Authentication
                    </p>
                    <p className="text-sm text-coffee-600 dark:text-cream-400">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Not Enabled
                  </span>
                </div>
                <button className="mt-3 px-4 py-2 text-sm font-medium text-coffee-700 dark:text-cream-300 hover:bg-coffee-100 dark:hover:bg-dark-800 rounded-lg transition-all">
                  Enable 2FA
                </button>
              </div>

              <div className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-coffee-900 dark:text-cream-100 mb-1">
                      Session Timeout
                    </p>
                    <p className="text-sm text-coffee-600 dark:text-cream-400">
                      Auto logout after 30 minutes of inactivity
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Enabled
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-coffee-200 dark:border-dark-700 bg-coffee-50/50 dark:bg-dark-900/50">
                <p className="font-medium text-coffee-900 dark:text-cream-100 mb-3">
                  Recent Login Activity
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-coffee-600 dark:text-cream-400">Today at 10:23 AM</span>
                    <span className="text-coffee-900 dark:text-cream-100">Chrome on macOS</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-coffee-600 dark:text-cream-400">
                      Yesterday at 2:15 PM
                    </span>
                    <span className="text-coffee-900 dark:text-cream-100">Safari on iPhone</span>
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
              <h2 className="text-lg lg:text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">
                System Information
              </h2>
              <p className="text-sm lg:text-base text-coffee-600 dark:text-cream-400 mb-6">
                Platform status and technical details
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-coffee-50/50 dark:bg-dark-900/50 border border-coffee-200/50 dark:border-dark-700">
                <p className="text-sm text-coffee-600 dark:text-cream-400 mb-1">Platform Version</p>
                <p className="text-lg font-bold text-coffee-900 dark:text-cream-100">v1.0.0</p>
              </div>
              <div className="p-4 rounded-xl bg-coffee-50/50 dark:bg-dark-900/50 border border-coffee-200/50 dark:border-dark-700">
                <p className="text-sm text-coffee-600 dark:text-cream-400 mb-1">Database Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <p className="text-lg font-bold text-coffee-900 dark:text-cream-100">Healthy</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-coffee-50/50 dark:bg-dark-900/50 border border-coffee-200/50 dark:border-dark-700">
                <p className="text-sm text-coffee-600 dark:text-cream-400 mb-1">
                  API Response Time
                </p>
                <p className="text-lg font-bold text-coffee-900 dark:text-cream-100">45ms</p>
              </div>
              <div className="p-4 rounded-xl bg-coffee-50/50 dark:bg-dark-900/50 border border-coffee-200/50 dark:border-dark-700">
                <p className="text-sm text-coffee-600 dark:text-cream-400 mb-1">Uptime</p>
                <p className="text-lg font-bold text-coffee-900 dark:text-cream-100">99.9%</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-coffee-200 dark:border-dark-700 bg-coffee-50/50 dark:bg-dark-900/50">
              <p className="font-medium text-coffee-900 dark:text-cream-100 mb-3 flex items-center gap-2">
                <Server className="w-5 h-5" />
                Technology Stack
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-coffee-600 dark:text-cream-400">Framework</p>
                  <p className="font-medium text-coffee-900 dark:text-cream-100">Next.js 14</p>
                </div>
                <div>
                  <p className="text-coffee-600 dark:text-cream-400">Database</p>
                  <p className="font-medium text-coffee-900 dark:text-cream-100">
                    Supabase (PostgreSQL)
                  </p>
                </div>
                <div>
                  <p className="text-coffee-600 dark:text-cream-400">Hosting</p>
                  <p className="font-medium text-coffee-900 dark:text-cream-100">Vercel</p>
                </div>
                <div>
                  <p className="text-coffee-600 dark:text-cream-400">Language</p>
                  <p className="font-medium text-coffee-900 dark:text-cream-100">TypeScript</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
