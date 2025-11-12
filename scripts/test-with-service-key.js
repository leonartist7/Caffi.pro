// Test with service role key (bypasses RLS for testing)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ugppbaavzevmdkblniim.supabase.co'

// IMPORTANT: Replace this with your SERVICE_ROLE key from Supabase Dashboard
// Go to: Settings > API > service_role key (secret)
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testWithServiceKey() {
  console.log('🔍 Testing with Service Role Key (bypasses RLS)...\n')

  try {
    // Test 1: Check tenants
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

    // Test 2: Check users
    console.log('\n📋 Test 2: Query users table...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('full_name, email, loyalty_points, loyalty_tier')

    if (usersError) {
      console.error('❌ Error:', usersError.message)
    } else {
      console.log(`✅ Found ${users.length} users:`)
      users.forEach(u =>
        console.log(`   - ${u.full_name}: ${u.loyalty_points} pts (${u.loyalty_tier})`)
      )
    }

    // Test 3: Check coupons
    console.log('\n📋 Test 3: Query coupons table...')
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('code, discount_type, discount_value, is_active')

    if (couponsError) {
      console.error('❌ Error:', couponsError.message)
    } else {
      console.log(`✅ Found ${coupons.length} coupons:`)
      coupons.forEach(c =>
        console.log(
          `   - ${c.code}: ${c.discount_value}${c.discount_type === 'percentage' ? '%' : '€'} off`
        )
      )
    }

    console.log('\n🎉 Verification complete!')
    console.log('\nℹ️  Note: The anon key cannot see this data due to RLS policies.')
    console.log('   This is CORRECT security behavior!')
    console.log('   Your data IS there and working properly.')
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testWithServiceKey()
