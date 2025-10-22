#!/usr/bin/env node

// Simple OneSignal setup helper
const fs = require('fs');
const path = require('path');

console.log('🚀 OneSignal Setup Helper\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env.local file...');
  
  const envContent = `# OneSignal Configuration (for cross-browser support)
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id-here
NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID=your-safari-web-id-here

# Optional (for server-side notifications)
ONESIGNAL_REST_API_KEY=your-rest-api-key

# Supabase Configuration (if you have them)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file');
} else {
  console.log('✅ .env.local file already exists');
}

console.log('\n📋 Next Steps for Cross-Browser Support:');
console.log('1. Go to OneSignal.com and create an account');
console.log('2. Create a new Web Push app');
console.log('3. Copy your App ID from Settings > Keys & IDs');
console.log('4. Enable Safari support in Settings > Web Push');
console.log('5. Copy your Safari Web ID from Settings > Web Push');
console.log('6. Replace both IDs in .env.local with your actual values');
console.log('7. Run: npm run dev');
console.log('8. Visit: http://localhost:3000/test-notifications');
console.log('\n🌐 Cross-Browser Support:');
console.log('• Chrome ✅ (App ID only)');
console.log('• Firefox ✅ (App ID only)');
console.log('• Safari ✅ (App ID + Safari Web ID)');
console.log('• iOS Safari ✅ (App ID + Safari Web ID)');
console.log('• macOS Safari ✅ (App ID + Safari Web ID)');
console.log('\n📖 See SAFARI_SETUP.md for detailed Safari configuration help!');
