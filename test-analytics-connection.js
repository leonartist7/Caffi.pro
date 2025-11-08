// Test Supabase Connection and Check Data
// Run with: node test-analytics-connection.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...\n');

if (!supabaseUrl) {
  console.error('❌ ERROR: SUPABASE_URL not found in .env.local');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  console.error('   Make sure you added it to .env.local file');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('   URL:', supabaseUrl);
console.log('   Key:', supabaseKey.substring(0, 20) + '...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Check tenants
    console.log('📊 Checking tenants table...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('tenant_id, business_name')
      .limit(5);
    
    if (tenantsError) {
      console.error('❌ Error querying tenants:', tenantsError.message);
    } else {
      console.log(`✅ Found ${tenants.length} tenants`);
      if (tenants.length > 0) {
        tenants.forEach(t => console.log(`   - ${t.business_name}`));
      }
    }

    // Test 2: Check orders
    console.log('\n📦 Checking orders table...');
    const { data: orders, error: ordersError, count } = await supabase
      .from('orders')
      .select('order_id, status, total, created_at', { count: 'exact' })
      .limit(5);
    
    if (ordersError) {
      console.error('❌ Error querying orders:', ordersError.message);
    } else {
      console.log(`✅ Found ${count} total orders`);
      if (orders && orders.length > 0) {
        console.log('   Recent orders:');
        orders.forEach(o => console.log(`   - ${o.status}: €${o.total} (${o.created_at})`));
      } else {
        console.log('   ⚠️  No orders found - dashboard will be empty');
      }
    }

    // Test 3: Check users
    console.log('\n👥 Checking users table...');
    const { data: users, error: usersError, count: userCount } = await supabase
      .from('users')
      .select('user_id, created_at', { count: 'exact' })
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error querying users:', usersError.message);
    } else {
      console.log(`✅ Found ${userCount} total users`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    if (!tenantsError && !ordersError && !usersError) {
      console.log('✅ CONNECTION SUCCESSFUL!');
      if (count > 0) {
        console.log('✅ Database has data - dashboard should work');
      } else {
        console.log('⚠️  Database is empty - dashboard will show zeros');
        console.log('   Run the seed data script to add test data');
      }
    } else {
      console.log('❌ CONNECTION FAILED - Check errors above');
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

testConnection();


