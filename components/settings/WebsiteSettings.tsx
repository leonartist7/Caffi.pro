'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Globe2, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SiteProfile } from '@/lib/site-profile'

interface WebsiteSettingsProps {
  venueId: string
  businessName: string
  slug: string
  customDomain: string | null
  initialProfile: SiteProfile
  onSaved: (profile: SiteProfile) => void
}

export function WebsiteSettings({
  venueId,
  businessName,
  slug,
  customDomain,
  initialProfile,
  onSaved,
}: WebsiteSettingsProps) {
  const [form, setForm] = useState<SiteProfile>(initialProfile)
  const [persistedEnabled, setPersistedEnabled] = useState(initialProfile.site_enabled)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initialProfile)
    setPersistedEnabled(initialProfile.site_enabled)
  }, [initialProfile, venueId])

  const previewHref = `/site/${slug}`
  const publicUrl = useMemo(() => {
    if (customDomain)
      return `https://${customDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '')
    return origin ? `${origin}${previewHref}` : previewHref
  }, [customDomain, previewHref])

  const setField = <K extends keyof SiteProfile>(key: K, value: SiteProfile[K]) => {
    setForm(current => ({ ...current, [key]: value }))
  }

  const setGalleryUrl = (index: number, value: string) => {
    setForm(current => ({
      ...current,
      gallery: current.gallery.map((url, itemIndex) => (itemIndex === index ? value : url)),
    }))
  }

  const addGalleryUrl = () => {
    setForm(current =>
      current.gallery.length >= 6 ? current : { ...current, gallery: [...current.gallery, ''] }
    )
  }

  const removeGalleryUrl = (index: number) => {
    setForm(current => ({
      ...current,
      gallery: current.gallery.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const profile: SiteProfile = {
        ...form,
        gallery: form.gallery
          .map(url => url.trim())
          .filter(Boolean)
          .slice(0, 6),
      }
      const response = await fetch(`/api/clients/${venueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_profile: profile }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${response.status})`)
      }
      setForm(profile)
      setPersistedEnabled(profile.site_enabled)
      onSaved(profile)
      toast.success('Website settings saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save website settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-bold text-coffee-900 dark:text-cream-100 lg:text-xl">
            Website for {businessName}
          </h2>
          <p className="mt-1 text-sm text-coffee-600 dark:text-cream-400">
            A polished public home powered by the details you already keep in aro.
          </p>
        </div>
        {persistedEnabled ? (
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-coffee-300 px-4 py-2 text-sm font-semibold text-coffee-700 hover:bg-coffee-50 dark:border-dark-600 dark:text-cream-300 dark:hover:bg-dark-700"
          >
            Preview site <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-coffee-200 px-4 py-2 text-sm font-semibold text-coffee-400 opacity-60 dark:border-dark-700 dark:text-cream-500">
            Preview site <ExternalLink className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="rounded-xl border border-coffee-200 bg-coffee-50 p-4 dark:border-dark-700 dark:bg-dark-900/50">
        <div className="flex items-start gap-3">
          <Globe2 className="mt-0.5 h-5 w-5 text-coffee-600 dark:text-cream-400" />
          <div>
            <p className="text-sm font-semibold text-coffee-900 dark:text-cream-100">Public URL</p>
            <p className="mt-1 break-all font-mono text-xs text-coffee-600 dark:text-cream-400">
              {publicUrl}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-coffee-700 dark:text-cream-300">
            Tagline
          </span>
          <input
            type="text"
            value={form.tagline ?? ''}
            onChange={event => setField('tagline', event.target.value || null)}
            placeholder="Third-wave coffee, no pretense."
            className="w-full rounded-xl border border-coffee-200 bg-white px-4 py-3 text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:border-dark-600 dark:bg-dark-900 dark:text-cream-100"
          />
          <span className="mt-1 block text-xs text-coffee-500 dark:text-cream-500">
            Required before the site can be published.
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-coffee-700 dark:text-cream-300">
            About
          </span>
          <textarea
            rows={6}
            value={form.about ?? ''}
            onChange={event => setField('about', event.target.value || null)}
            placeholder="Tell guests what makes this café special. Plain text and short paragraphs work best."
            className="w-full rounded-xl border border-coffee-200 bg-white px-4 py-3 text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:border-dark-600 dark:bg-dark-900 dark:text-cream-100"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-coffee-700 dark:text-cream-300">
              Address
            </span>
            <input
              type="text"
              value={form.address ?? ''}
              onChange={event => setField('address', event.target.value || null)}
              placeholder="123 Coffee Street, Calgary"
              className="w-full rounded-xl border border-coffee-200 bg-white px-4 py-3 text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:border-dark-600 dark:bg-dark-900 dark:text-cream-100"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-coffee-700 dark:text-cream-300">
              Display phone
            </span>
            <input
              type="tel"
              value={form.phone_display ?? ''}
              onChange={event => setField('phone_display', event.target.value || null)}
              placeholder="(403) 555-0100"
              className="w-full rounded-xl border border-coffee-200 bg-white px-4 py-3 text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:border-dark-600 dark:bg-dark-900 dark:text-cream-100"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-coffee-700 dark:text-cream-300">
              Instagram URL
            </span>
            <input
              type="url"
              value={form.instagram_url ?? ''}
              onChange={event => setField('instagram_url', event.target.value || null)}
              placeholder="https://instagram.com/yourcafe"
              className="w-full rounded-xl border border-coffee-200 bg-white px-4 py-3 text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:border-dark-600 dark:bg-dark-900 dark:text-cream-100"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-coffee-700 dark:text-cream-300">
              Facebook URL
            </span>
            <input
              type="url"
              value={form.facebook_url ?? ''}
              onChange={event => setField('facebook_url', event.target.value || null)}
              placeholder="https://facebook.com/yourcafe"
              className="w-full rounded-xl border border-coffee-200 bg-white px-4 py-3 text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:border-dark-600 dark:bg-dark-900 dark:text-cream-100"
            />
          </label>
        </div>
      </div>

      <section className="rounded-xl border border-coffee-200 p-4 dark:border-dark-700">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-coffee-900 dark:text-cream-100">Gallery URLs</h3>
            <p className="mt-1 text-xs text-coffee-500 dark:text-cream-500">
              Add up to six externally hosted images. Uploads are not included in this release.
            </p>
          </div>
          <button
            type="button"
            onClick={addGalleryUrl}
            disabled={form.gallery.length >= 6}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-coffee-300 px-3 py-2 text-sm font-semibold text-coffee-700 disabled:opacity-40 dark:border-dark-600 dark:text-cream-300"
          >
            <Plus className="h-4 w-4" /> Add image
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {form.gallery.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={event => setGalleryUrl(index, event.target.value)}
                placeholder="https://example.com/cafe.jpg"
                aria-label={`Gallery image ${index + 1}`}
                className="min-w-0 flex-1 rounded-xl border border-coffee-200 bg-white px-4 py-3 text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:border-dark-600 dark:bg-dark-900 dark:text-cream-100"
              />
              <button
                type="button"
                onClick={() => removeGalleryUrl(index)}
                aria-label={`Remove gallery image ${index + 1}`}
                className="rounded-xl border border-red-200 px-3 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <label className="flex items-start justify-between gap-5 rounded-xl border border-coffee-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-900">
        <span>
          <span className="block font-semibold text-coffee-900 dark:text-cream-100">
            Publish website
          </span>
          <span className="mt-1 block text-sm text-coffee-600 dark:text-cream-400">
            Turning this on makes the public site live at {publicUrl}.
          </span>
        </span>
        <input
          type="checkbox"
          checked={form.site_enabled}
          onChange={event => setField('site_enabled', event.target.checked)}
          disabled={!form.tagline?.trim() && !form.site_enabled}
          className="mt-1 h-5 w-5 accent-coffee-700 disabled:cursor-not-allowed disabled:opacity-40"
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-coffee px-5 py-3 font-semibold text-cream-100 shadow-md disabled:opacity-50"
      >
        <Save className="h-5 w-5" />
        {saving ? 'Saving…' : 'Save Website'}
      </button>
    </form>
  )
}
