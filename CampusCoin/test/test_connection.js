/**
 * Test Connection to Supabase
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== TESTING SUPABASE CONNECTION ===');
console.log('Project URL:', url);
console.log('API Key:', key ? `${key.substring(0, 16)}...` : 'Missing');

if (!url || !key) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

async function runTest() {
  try {
    const startTime = Date.now();
    console.log('\n1. Testing Query on "campuscoin_state" table...');
    const { data, error } = await supabase
      .from('campuscoin_state')
      .select('*')
      .limit(1);

    const duration = Date.now() - startTime;

    if (error) {
      console.log(`\n❌ Error: ${error.message}`);
      if (error.code === '42501' || error.message.includes('permission denied')) {
        console.log('\n🔒 PostgreSQL Permission Required:');
        console.log('The "anon" API role needs table permissions in PostgreSQL.');
        console.log('Run this in your Supabase SQL Editor:');
        console.log(`
GRANT ALL ON TABLE campuscoin_state TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER TABLE campuscoin_state DISABLE ROW LEVEL SECURITY;
        `);
      } else if (error.code === '42P01') {
        console.log('\n⚠️ Table "campuscoin_state" not found. Please create the table in Supabase SQL Editor.');
      }
      return;
    }

    console.log(`✓ Read Query Successful (${duration}ms)`);
    console.log(`✓ Records found: ${data ? data.length : 0}`);

    // Test Write / Upsert
    console.log('\n2. Testing Write / Upsert operation...');
    const testState = {
      testPing: true,
      lastTested: new Date().toISOString()
    };
    const { error: upsertError } = await supabase
      .from('campuscoin_state')
      .upsert({
        id: 'test_connection_ping',
        state: testState,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.log(`❌ Write Error: ${upsertError.message}`);
      return;
    }
    console.log('✓ Upsert Operation Successful');

    // Clean up test ping
    await supabase.from('campuscoin_state').delete().eq('id', 'test_connection_ping');
    console.log('✓ Cleanup Successful');

    console.log('\n🎉 ALL SUPABASE CONNECTION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ Unexpected error:', err);
  }
}

runTest();
