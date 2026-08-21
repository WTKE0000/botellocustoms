const { createClient } = require('@supabase/supabase-js');

let _anon = null;
let _admin = null;

function anonClient() {
  if (!_anon) {
    _anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return _anon;
}

// Service-role client — bypasses Row Level Security entirely.
// Only ever used server-side, only after our own requireAdmin /
// requireCustomer checks have already run. Never expose this key
// to the browser.
function adminClient() {
  if (!_admin) {
    _admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return _admin;
}

module.exports = { anonClient, adminClient };
