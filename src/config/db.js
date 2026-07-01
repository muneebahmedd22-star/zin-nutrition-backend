const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

if (!config.supabaseUrl || !config.supabaseKey) {
  console.warn('WARNING: SUPABASE_URL and SUPABASE_KEY are not set in environment variables.');
}

const supabase = createClient(config.supabaseUrl || '', config.supabaseKey || '');

module.exports = supabase;
