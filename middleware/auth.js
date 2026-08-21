const { getSessionUser } = require('../lib/auth');

// Attaches req.currentUser / req.currentProfile + res.locals.currentUser
// on every request, so views can show "My Account" vs "Log In".
async function attachSession(req, res, next) {
  const session = await getSessionUser(req, res);
  req.currentUser = session ? session.user : null;
  req.currentProfile = session ? session.profile : null;
  res.locals.currentUser = req.currentUser;
  res.locals.currentProfile = req.currentProfile;
  next();
}

async function requireAdmin(req, res, next) {
  const session = await getSessionUser(req, res);
  if (session && session.profile && session.profile.is_admin) {
    req.currentUser = session.user;
    req.currentProfile = session.profile;
    return next();
  }
  return res.redirect('/admin/login');
}

// For routes that need a logged-in customer (raffle redemption, /account)
async function requireCustomer(req, res, next) {
  const session = await getSessionUser(req, res);
  if (session && session.user) {
    req.currentUser = session.user;
    req.currentProfile = session.profile;
    return next();
  }
  const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
  if (wantsJson || req.path.startsWith('/raffle/redeem')) {
    return res.status(401).json({ success: false, error: 'login_required' });
  }
  return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
}

module.exports = { attachSession, requireAdmin, requireCustomer };
