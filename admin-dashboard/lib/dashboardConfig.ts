export interface DashboardOwnerConfig {
  name: string
  email: string
  brand: string
  tagline: string
  primaryCurrency: string
}

export interface IntegrationLink {
  label: string
  href: string
  description: string
}

const ownerName = process.env.NEXT_PUBLIC_OWNER_NAME || process.env.OWNER_NAME || 'Leona (Control Center)'
const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL || process.env.OWNER_EMAIL || 'owner@caffi.pro'
const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || process.env.BRAND_NAME || 'Cofi Control Center'
const brandTagline =
  process.env.NEXT_PUBLIC_BRAND_TAGLINE ||
  process.env.BRAND_TAGLINE ||
  'Command all FlutterFlow and Supabase apps from one place.'
const primaryCurrency = process.env.NEXT_PUBLIC_PRIMARY_CURRENCY || process.env.PRIMARY_CURRENCY || 'EUR'

const supabaseStudioUrl =
  process.env.NEXT_PUBLIC_SUPABASE_STUDIO_URL ||
  process.env.SUPABASE_STUDIO_URL ||
  'https://app.supabase.com'
const flutterflowUrl =
  process.env.NEXT_PUBLIC_FLUTTERFLOW_CONSOLE_URL ||
  process.env.FLUTTERFLOW_CONSOLE_URL ||
  'https://app.flutterflow.io'
const documentationUrl =
  process.env.NEXT_PUBLIC_INTERNAL_DOCS_URL ||
  process.env.INTERNAL_DOCS_URL ||
  'https://docs.google.com'

export const dashboardOwner: DashboardOwnerConfig = {
  name: ownerName,
  email: ownerEmail,
  brand: brandName,
  tagline: brandTagline,
  primaryCurrency,
}

export const integrationLinks: IntegrationLink[] = [
  {
    label: 'Supabase Studio',
    href: supabaseStudioUrl,
    description: 'Manage database schemas, storage, and backend automations.',
  },
  {
    label: 'FlutterFlow Console',
    href: flutterflowUrl,
    description: 'Update app flows, UI, and deployments for client apps.',
  },
  {
    label: 'Internal Docs',
    href: documentationUrl,
    description: 'Reference runbooks, SOPs, and launch checklists.',
  },
]
