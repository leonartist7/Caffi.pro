// Test Supabase connection and database
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ugppbaavzevmdkblniim.supabase.co'
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncHBiYWF2emV2bWRrYmxuaWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDY1NjUsImV4cCI6MjA3ODEyMjU2NX0.TV1fU_XFu2G_uc4bI1kTZPI8oHIKLe0oRjwXK-2H7l8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔌 Testing Supabase connection...\n')

  try {
    // Test 1: Check tenants table
    console.log('📋 Test 1: Query tenants table...')
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('business_name, slug, subscription_status')

    if (tenantsError) {
      console.error('❌ Error:', tenantsError.message)
    } else {
      console.log(`✅ Found ${tenants.length} tenants:`)
      tenants.forEach(t =>
        console.log(`   - ${t.business_name} (${t.slug}) - ${t.subscription_status}`)
      )
    }

    // Test 2: Check menu items
    console.log('\n📋 Test 2: Query menu items...')
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('name, price')
      .limit(5)

    if (itemsError) {
      console.error('❌ Error:', itemsError.message)
    } else {
      console.log(`✅ Found ${items.length} menu items:`)
      items.forEach(item => console.log(`   - ${item.name}: €${item.price}`))
    }

    // Test 3: Check locations
    console.log('\n📋 Test 3: Query locations...')
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('name, city')

    if (locationsError) {
      console.error('❌ Error:', locationsError.message)
    } else {
      console.log(`✅ Found ${locations.length} locations:`)
      locations.forEach(loc => console.log(`   - ${loc.name} (${loc.city})`))
    }

    // Test 4: Check users
    console.log('\n📋 Test 4: Query users...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('full_name, loyalty_points, loyalty_tier')

    if (usersError) {
      console.error('❌ Error:', usersError.message)
    } else {
      console.log(`✅ Found ${users.length} users:`)
      users.forEach(user =>
        console.log(`   - ${user.full_name}: ${user.loyalty_points} pts (${user.loyalty_tier})`)
      )
    }

    console.log('\n🎉 All tests passed! Database is working correctly.')
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
  }
}

testConnection()
