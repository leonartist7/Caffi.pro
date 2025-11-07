#!/bin/bash

# Caffi.pro - Database Deployment Script
# This script will deploy all migrations to your Supabase project

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║   🚀 Caffi.pro - Database Deployment                          ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Project details
PROJECT_REF="ugppbaavzevmdkblniim"
PROJECT_URL="https://ugppbaavzevmdkblniim.supabase.co"

echo "📋 Project: $PROJECT_REF"
echo "🔗 URL: $PROJECT_URL"
echo ""

# Check if already linked
cd /workspace/supabase

if [ -f ".supabase/config.toml" ]; then
    echo "✅ Project already linked!"
else
    echo "🔗 Linking to Supabase project..."
    echo ""
    echo "You'll need your DATABASE PASSWORD (set when creating the project)"
    echo ""
    
    supabase link --project-ref $PROJECT_REF
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Project linked successfully!"
    else
        echo ""
        echo "❌ Failed to link project. Please check your database password."
        exit 1
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📤 Pushing migrations to database..."
echo ""

supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ All migrations applied successfully!"
    echo ""
    echo "📊 Created tables:"
    echo "   • tenants"
    echo "   • tenant_manifests"
    echo "   • users"
    echo "   • locations"
    echo "   • categories"
    echo "   • menu_items"
    echo "   • orders"
    echo "   • order_items"
    echo "   • loyalty_transactions"
    echo "   • rewards_catalog"
    echo "   • coupons"
    echo "   • coupon_usage"
    echo "   • push_campaigns"
    echo "   • super_admins"
    echo ""
    echo "🔒 RLS policies enabled on all tables"
    echo "⚙️  8 database functions created"
    echo "🤖 7 triggers configured"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌱 Loading seed data..."
    echo ""
    
    # Load seed data
    cd /workspace
    PGPASSWORD=$(grep 'DB Password' ~/.supabase/config.toml | cut -d'"' -f2) \
    psql -h db.ugppbaavzevmdkblniim.supabase.co \
         -U postgres \
         -d postgres \
         -f supabase/seed/01_test_tenants.sql 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Seed data loaded successfully!"
        echo "   • 2 test tenants (Blue Bottle, Sunrise Coffee)"
        echo "   • 3 locations"
        echo "   • 7 menu items"
        echo "   • 3 test customers"
    else
        echo "⚠️  Couldn't load seed data automatically."
        echo "   Please load manually via SQL Editor:"
        echo "   → Copy supabase/seed/01_test_tenants.sql"
        echo "   → Paste in Supabase Dashboard > SQL Editor"
        echo "   → Click Run"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎉 DATABASE SETUP COMPLETE!"
    echo ""
    echo "✅ Next steps:"
    echo "   1. Test connection: npm install @supabase/supabase-js && node test-connection.js"
    echo "   2. Configure auth: Enable Phone Auth in Dashboard"
    echo "   3. Enable JWT Hook: Authentication > Hooks > Custom Access Token"
    echo "   4. Create super admin: Follow QUICK_SETUP.md Step 5"
    echo ""
    echo "📖 Full instructions: QUICK_SETUP.md"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Check the error above."
    echo ""
    echo "💡 Alternative: Copy SQL files manually to Dashboard:"
    echo "   → Open: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim"
    echo "   → Go to SQL Editor"
    echo "   → Copy & paste each migration file"
    echo "   → See QUICK_SETUP.md for step-by-step guide"
    echo ""
    exit 1
fi
