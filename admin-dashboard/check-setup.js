// Quick diagnostic script
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Admin Dashboard Setup...\n');

const filesToCheck = [
  'app/login/page.tsx',
  'middleware.ts',
  'lib/auth.ts',
  'utils/supabase/client.ts',
  'utils/supabase/server.ts',
  'utils/supabase/middleware.ts',
  'components/Navigation.tsx',
  'app/page.tsx',
  '.env.local'
];

console.log('📁 Checking files:\n');

filesToCheck.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n📊 Summary:');
const existing = filesToCheck.filter(f => fs.existsSync(path.join(__dirname, f)));
console.log(`${existing.length}/${filesToCheck.length} files exist`);

if (existing.length === filesToCheck.length) {
  console.log('\n🎉 All files present! Server should work.');
  console.log('\n💡 If browser is blank:');
  console.log('1. Open browser console (F12)');
  console.log('2. Check for JavaScript errors');
  console.log('3. Try: http://localhost:3000/login directly');
} else {
  console.log('\n⚠️  Some files missing. This might cause errors.');
}



