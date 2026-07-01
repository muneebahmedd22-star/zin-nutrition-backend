const path = require('path');
const dotenv = require('dotenv');

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

async function checkDatabaseReadiness() {
  console.log('================================================================');
  console.log('         ZIN NUTRITION - DATABASE READINESS CHECK               ');
  console.log('================================================================');

  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'GEMINI_API_KEY',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'ADMIN_API_KEY'
  ];

  const missing = [];
  requiredVars.forEach(v => {
    if (!process.env[v] || process.env[v].includes('your-') || process.env[v].includes('placeholder')) {
      missing.push(v);
    }
  });

  if (missing.length > 0) {
    console.error('Database Check Failed: Missing or placeholder environment variables detected:');
    console.error(missing.join(', '));
    console.log('Please configure these in your .env file.');
    process.exit(1);
  }

  console.log('1. Environment Configuration Validation: PASSED');

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  // Check tables presence
  const tables = ['ebooks', 'ebook_chunks', 'assessments', 'generated_programs'];
  const statusReport = {};
  let overallPassed = true;

  console.log('\n2. Verifying table structures in Supabase...');

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        // Table does not exist or permission issue
        statusReport[table] = `FAILED (${error.message})`;
        overallPassed = false;
      } else {
        statusReport[table] = 'READY';
      }
    } catch (err) {
      statusReport[table] = `FAILED (${err.message})`;
      overallPassed = false;
    }
  }

  console.log('----------------------------------------------------------------');
  tables.forEach(table => {
    console.log(`Table "${table}": ${statusReport[table]}`);
  });
  console.log('----------------------------------------------------------------');

  if (overallPassed) {
    console.log('\nSUCCESS: All tables are verified and ready for production!');
    console.log('Database Readiness Status: READY');
  } else {
    console.log('\nWARNING: Some tables are missing. Please execute schema.sql in your Supabase SQL editor.');
    console.log('Database Readiness Status: SCHEMA_MIGRATION_REQUIRED');
  }
}

checkDatabaseReadiness();
