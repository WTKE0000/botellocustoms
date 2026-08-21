const { anonClient } = require('./supabase');

const ACCESS_COOKIE = 'sb_access_token';
const REFRESH_COOKIE = 'sb_refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days (refresh token driven)
};

function setSessionCookies(res, session) {
  if (!session) return;
  res.cookie(ACCESS_COOKIE, session.access_token, COOKIE_OPTS);
  res.cookie(REFRESH_COOKIE, session.refresh_token, COOKIE_OPTS);
}

function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE);
}

// Verifies the current request's session, transparently refreshing
// an expired access token using the refresh token when needed.
// Returns { user, profile } or null.
async function getSessionUser(req, res) {
  const accessToken = req.cookies[ACCESS_COOKIE];
  const refreshToken = req.cookies[REFRESH_COOKIE];
  if (!accessToken) return null;

  const client = anonClient();
  let { data, error } = await client.auth.getUser(accessToken);

  if (error && refreshToken) {
    // Access token expired — try to refresh
    const { data: refreshed, error: refreshErr } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (refreshErr || !refreshed.session) {
      clearSessionCookies(res);
      return null;
    }
    setSessionCookies(res, refreshed.session);
    data = { user: refreshed.user };
    error = null;
  }

  if (error || !data || !data.user) return null;

  const { data: profile } = await client
    .from('profiles')
    .select('id, email, display_name, is_admin')
    .eq('id', data.user.id)
    .single();

  return { user: data.user, profile: profile || null };
}

// ---- Flash messages via a short-lived signed cookie (no server memory needed) ----
function setFlash(res, type, message) {
  res.cookie('flash', JSON.stringify({ type, message }), {
    httpOnly: true,
    maxAge: 15000,
    sameSite: 'lax'
  });
}

function readFlash(req, res) {
  const raw = req.cookies.flash;
  if (!raw) return null;
  res.clearCookie('flash');
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = { setSessionCookies, clearSessionCookies, getSessionUser, setFlash, readFlash };
