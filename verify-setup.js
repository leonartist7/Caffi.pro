#!/usr/bin/env node

/**
 * Caffi.pro - Automated Setup Verification Script
 * 
 * This script verifies that all database migrations, RLS policies,
 * functions, and seed data are correctly set up.
 */

import { createClient } from '@supabase/supabase-js';

// Configuration - Update these with your Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ugppbaavzevmdkblniim.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncHBiYWF2emV2bWRrYmxuaWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDY1NjUsImV4cCI6MjA3ODEyMjU2NX0.TV1fU_XFu2G_uc4bI1kTZPI8oHIKLe0oRjwXK-2H7l8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utility functions
function logTest(name, status, message = '', details = null) {
  const icons = {
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
    info: 'ℹ️'
  };
  
  const icon = icons[status] || icons.info;
  console.log(`${icon} ${name}`);
  
  if (message) {
    console.log(`   ${message}`);
  }
  
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
  
  results.tests.push({ name, status, message, details });
  
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else if (status === 'warn') results.warnings++;
}

function section(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log('='.repeat(60));
}

// Test functions
async function testDatabaseStructure() {
  section('📊 TEST 1: Database Structure');
  
  try {
    // Test 1.1: Check tables exist
    const { data: tables, error } = await supabase.rpc('get_table_list', {}, { 
      count: 'exact' 
    }).catch(async () => {
      // Fallback: Query using information_schema
      return await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
    });
    
    // Try direct query
    const { data: tableData, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `
    }).catch(async () => {
      // Simple test: try to query each expected table
      const expectedTables = [
        'tenants', 'tenant_manifests', 'users', 'locations',
        'categories', 'menu_items', 'orders', 'order_items',
        'loyalty_transactions', 'rewards_catalog', 'coupons',
        'coupon_usage', 'push_campaigns', 'super_admins'
      ];
      
      const results = [];
      for (const table of expectedTables) {
        try {
          await supabase.from(table).select('*').limit(0);
          results.push({ table_name: table, exists: true });
        } catch (e) {
          results.push({ table_name: table, exists: false });
        }
      }
      return { data: results };
    });
    
    if (tableError) {
      logTest('Database tables check', 'fail', `Error: ${tableError.message}`);
    } else {
      const expectedCount = 14;
      const actualCount = tableData?.length || 0;
      
      if (actualCount === expectedCount) {
        logTest('Database tables exist', 'pass', `All ${expectedCount} tables found`);
      } else {
        logTest('Database tables exist', 'warn', 
          `Found ${actualCount} tables, expected ${expectedCount}`);
      }
    }
  } catch (error) {
    logTest('Database structure test', 'fail', error.message);
  }
}

async function testRLSConfiguration() {
  section('🔒 TEST 2: Row-Level Security');
  
  try {
    // Test if tables have RLS enabled
    const tables = ['tenants', 'users', 'orders', 'menu_items'];
    
    for (const table of tables) {
      try {
        // Try to query without auth (should work with anon key but respect RLS)
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (error && error.code === 'PGRST301') {
          logTest(`RLS enabled on ${table}`, 'pass', 'RLS is active');
        } else if (!error) {
          logTest(`RLS on ${table}`, 'warn', 'Query succeeded - check RLS policies');
        } else {
          logTest(`RLS on ${table}`, 'fail', error.message);
        }
      } catch (e) {
        logTest(`RLS on ${table}`, 'info', 'Could not verify RLS');
      }
    }
  } catch (error) {
    logTest('RLS configuration test', 'fail', error.message);
  }
}

async function testSeedData() {
  section('🌱 TEST 3: Seed Data');
  
  try {
    // Test 3.1: Check tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('business_name, slug, subscription_status');
    
    if (tenantsError) {
      logTest('Tenants data', 'fail', tenantsError.message);
    } else if (!tenants || tenants.length === 0) {
      logTest('Tenants data', 'warn', 'No tenants found - seed data not loaded?');
    } else {
      logTest('Tenants data', 'pass', `Found ${tenants.length} tenant(s)`);
      tenants.forEach(t => {
        console.log(`   - ${t.business_name} (${t.slug})`);
      });
    }
    
    // Test 3.2: Check locations
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('name, city, is_active');
    
    if (!locationsError) {
      if (locations && locations.length > 0) {
        logTest('Locations data', 'pass', `Found ${locations.length} location(s)`);
      } else {
        logTest('Locations data', 'warn', 'No locations found');
      }
    }
    
    // Test 3.3: Check menu items
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('name, price, is_available')
      .limit(5);
    
    if (!itemsError) {
      if (items && items.length > 0) {
        logTest('Menu items data', 'pass', `Found ${items.length}+ menu item(s)`);
      } else {
        logTest('Menu items data', 'warn', 'No menu items found');
      }
    }
    
    // Test 3.4: Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('full_name, loyalty_points, loyalty_tier');
    
    if (!usersError) {
      if (users && users.length > 0) {
        logTest('Users data', 'pass', `Found ${users.length} user(s)`);
      } else {
        logTest('Users data', 'warn', 'No users found');
      }
    }
    
    // Test 3.5: Check coupons
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('code, discount_type, discount_value, is_active');
    
    if (!couponsError) {
      if (coupons && coupons.length > 0) {
        logTest('Coupons data', 'pass', `Found ${coupons.length} coupon(s)`);
      } else {
        logTest('Coupons data', 'warn', 'No coupons found');
      }
    }
    
  } catch (error) {
    logTest('Seed data test', 'fail', error.message);
  }
}

async function testDatabaseFunctions() {
  section('⚙️  TEST 4: Database Functions');
  
  try {
    // Get a tenant_id for testing
    const { data: tenants } = await supabase
      .from('tenants')
      .select('tenant_id')
      .limit(1);
    
    if (!tenants || tenants.length === 0) {
      logTest('Database functions', 'warn', 'No tenant found for testing functions');
      return;
    }
    
    const tenantId = tenants[0].tenant_id;
    
    // Test 4.1: generate_order_number
    try {
      const { data, error } = await supabase.rpc('generate_order_number', {
        p_tenant_id: tenantId
      });
      
      if (error) {
        logTest('generate_order_number()', 'fail', error.message);
      } else if (data && data.match(/^#\d{8}-\d{4}$/)) {
        logTest('generate_order_number()', 'pass', `Generated: ${data}`);
      } else {
        logTest('generate_order_number()', 'warn', `Unexpected format: ${data}`);
      }
    } catch (e) {
      logTest('generate_order_number()', 'fail', e.message);
    }
    
    // Test 4.2: calculate_loyalty_points
    try {
      const { data, error } = await supabase.rpc('calculate_loyalty_points', {
        p_order_total: 25.50,
        p_tenant_id: tenantId
      });
      
      if (error) {
        logTest('calculate_loyalty_points()', 'fail', error.message);
      } else if (data === 255) {
        logTest('calculate_loyalty_points()', 'pass', `Calculated: ${data} points`);
      } else {
        logTest('calculate_loyalty_points()', 'warn', `Got ${data} points, expected 255`);
      }
    } catch (e) {
      logTest('calculate_loyalty_points()', 'fail', e.message);
    }
    
    // Test 4.3: calculate_loyalty_tier
    try {
      const { data, error } = await supabase.rpc('calculate_loyalty_tier', {
        p_lifetime_points: 600,
        p_tenant_id: tenantId
      });
      
      if (error) {
        logTest('calculate_loyalty_tier()', 'fail', error.message);
      } else if (data === 'silver') {
        logTest('calculate_loyalty_tier()', 'pass', `Tier: ${data}`);
      } else {
        logTest('calculate_loyalty_tier()', 'warn', `Got ${data}, expected silver`);
      }
    } catch (e) {
      logTest('calculate_loyalty_tier()', 'fail', e.message);
    }
    
    // Test 4.4: validate_coupon
    try {
      const { data: coupons } = await supabase
        .from('coupons')
        .select('code, tenant_id')
        .limit(1);
      
      if (coupons && coupons.length > 0) {
        const { data, error } = await supabase.rpc('validate_coupon', {
          p_tenant_id: coupons[0].tenant_id,
          p_code: coupons[0].code,
          p_order_total: 50.00,
          p_user_id: null
        });
        
        if (error) {
          logTest('validate_coupon()', 'fail', error.message);
        } else if (data && data.length > 0 && data[0].valid) {
          logTest('validate_coupon()', 'pass', 
            `Valid coupon, discount: €${data[0].discount_amount}`);
        } else if (data && data.length > 0) {
          logTest('validate_coupon()', 'warn', 
            `Coupon invalid: ${data[0].error_message}`);
        }
      } else {
        logTest('validate_coupon()', 'info', 'No coupons to test');
      }
    } catch (e) {
      logTest('validate_coupon()', 'fail', e.message);
    }
    
  } catch (error) {
    logTest('Database functions test', 'fail', error.message);
  }
}

async function testConnection() {
  section('🔌 TEST 5: Database Connection');
  
  try {
    // Simple connection test
    const { data, error } = await supabase
      .from('tenants')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      logTest('Database connection', 'fail', error.message);
    } else {
      logTest('Database connection', 'pass', 'Successfully connected to Supabase');
    }
  } catch (error) {
    logTest('Database connection', 'fail', error.message);
  }
}

async function testAuthConfiguration() {
  section('🔐 TEST 6: Authentication Configuration');
  
  try {
    // Test super_admins table exists
    const { data, error } = await supabase
      .from('super_admins')
      .select('*')
      .limit(0);
    
    if (error && error.code !== 'PGRST301') {
      logTest('super_admins table', 'fail', error.message);
    } else {
      logTest('super_admins table', 'pass', 'Table exists and accessible');
    }
    
    // Check if custom functions exist (indirect test)
    logTest('Auth configuration', 'info', 
      'Auth hooks can only be fully tested with actual user signup');
    
  } catch (error) {
    logTest('Authentication test', 'fail', error.message);
  }
}

// Main execution
async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         CAFFI.PRO - SETUP VERIFICATION SCRIPT             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Using Key: ${SUPABASE_KEY.substring(0, 20)}...`);
  console.log('\n');
  
  // Run all test suites
  await testConnection();
  await testDatabaseStructure();
  await testRLSConfiguration();
  await testSeedData();
  await testDatabaseFunctions();
  await testAuthConfiguration();
  
  // Print summary
  section('📋 TEST SUMMARY');
  console.log('\n');
  console.log(`✅ Passed:   ${results.passed}`);
  console.log(`❌ Failed:   ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`ℹ️  Info:     ${results.tests.length - results.passed - results.failed - results.warnings}`);
  console.log('\n');
  
  // Overall status
  if (results.failed === 0 && results.warnings === 0) {
    console.log('🎉 ALL TESTS PASSED! Your setup is complete and working correctly.');
  } else if (results.failed === 0) {
    console.log('✅ All critical tests passed. Review warnings above.');
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
    console.log('   Check TROUBLESHOOTING.md for solutions.');
  }
  
  console.log('\n');
  console.log('📚 Next Steps:');
  console.log('   1. Review VERIFICATION_GUIDE.md for detailed checks');
  console.log('   2. Run manual SQL tests in Supabase Dashboard');
  console.log('   3. Test authentication flows');
  console.log('   4. Start building your frontend (MODULE 3 or MODULE 6)');
  console.log('\n');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
