-- =====================================================
-- QUICK SETUP: Apply Development Mode RLS Policies
-- Run this in Supabase SQL Editor to enable development mode
-- =====================================================

-- This script allows unauthenticated access to all tables
-- for faster development without authentication barriers.

-- IMPORTANT: Only use in development! Remove in production!

\i supabase/migrations/20250110000001_dev_mode_rls.sql
