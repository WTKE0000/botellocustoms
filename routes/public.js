const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { anonClient } = require('../lib/supabase');
const { setSessionCookies, clearSessionCookies, setFlash, readFlash } = require('../lib/auth');
const { requireCustomer } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const [settings, raffle] = await Promise.all([db.getSettings(), db.getRaffleConfig()]);
    res.render('index', {
      pageTitle: 'Hand-Engraved Firearms & Custom Metalwork',
      pageDescription: 'Three generations of gunsmithing and hand engraving. Custom laser art, firearm sales, accessories, and a live raffle — Murfreesboro, Tennessee.',
      settings, raffle
    });
  } catch (err) { next(err); }
});

router.get('/firearms', async (req, res, next) => {
  try {
    const [settings, firearms] = await Promise.all([db.getSettings(), db.getFirearms()]);
    res.render('firearms', {
      pageTitle: 'Firearms — Glocks, Colts, Sig Sauer, Draco & More',
      pageDescription: 'Browse firearms by make. In-store reservation, FFL transfer required on all sales.',
      settings, firearms
    });
  } catch (err) { next(err); }
});

router.get('/custom-work', async (req, res, next) => {
  try {
    const [settings, customWork] = await Promise.all([db.getSettings(), db.getCustomWork()]);
    res.render('custom-work', {
      pageTitle: 'Custom Work — Hand Engraving & Laser Art',
      pageDescription: 'Hand engraving, laser art, and custom metalwork portfolio.',
      settings, customWork
    });
  } catch (err) { next(err); }
});

router.get('/accessories', async (req, res, next) => {
  try {
    const [settings, accessories] = await Promise.all([db.getSettings(), db.getAccessories()]);
    res.render('accessories', {
      pageTitle: 'Accessories — Holsters, Cases & Gear',
      pageDescription: 'Holsters, cases, optics and cleaning gear.',
      settings, accessories
    });
  } catch (err) { next(err); }
});

router.get('/about', async (req, res, next) => {
  try {
    const [settings, timeline] = await Promise.all([db.getSettings(), db.getTimeline()]);
    res.render('about', {
      pageTitle: 'Our Story — Three Generations',
      pageDescription: "From our grandfather's bench to two cousins running the shop today.",
      settings, timeline
    });
  } catch (err) { next(err); }
});

router.get('/raffle', async (req, res, next) => {
  try {
    const [settings, raffle] = await Promise.all([db.getSettings(), db.getRaffleConfig()]);
    res.render('raffle', {
      pageTitle: 'Raffle — Custom Hand-Engraved & Plated Firearm',
      pageDescription: '50 numbered tickets, three winners drawn at random.',
      settings, raffle
    });
  } catch (err) { next(err); }
});

// ============ CUSTOMER ACCOUNTS ============
router.get('/signup', async (req, res, next) => {
  try {
    if (req.currentUser) return res.redirect('/account');
    const settings = await db.getSettings();
    res.render('signup', {
      pageTitle: 'Create Account', pageDescription: 'Create an account',
      settings, flash: readFlash(req, res), redirectTo: req.query.redirect || '/raffle'
    });
  } catch (err) { next(err); }
});

router.post('/signup', async (req, res) => {
  const { email, password, redirectTo } = req.body;
  if (!email || !password || password.length < 6) {
    setFlash(res, 'error', 'Enter a valid email and a password of at least 6 characters.');
    return res.redirect('/signup');
  }
  const { data, error } = await anonClient().auth.signUp({ email, password });
  if (error) {
    setFlash(res, 'error', error.message);
    return res.redirect('/signup');
  }
  if (data.session) {
    setSessionCookies(res, data.session);
    return res.redirect(redirectTo || '/raffle');
  }
  setFlash(res, 'success', 'Account created — check your email to confirm it, then log in.');
  res.redirect('/login');
});

router.get('/login', async (req, res, next) => {
  try {
    if (req.currentUser) return res.redirect('/account');
    const settings = await db.getSettings();
    res.render('login', {
      pageTitle: 'Log In', pageDescription: 'Log in to your account',
      settings, flash: readFlash(req, res), redirectTo: req.query.redirect || '/raffle'
    });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res) => {
  const { email, password, redirectTo } = req.body;
  const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    setFlash(res, 'error', 'Incorrect email or password.');
    return res.redirect('/login');
  }
  setSessionCookies(res, data.session);
  res.redirect(redirectTo || '/raffle');
});

router.post('/logout', (req, res) => {
  clearSessionCookies(res);
  res.redirect('/');
});

router.get('/account', requireCustomer, async (req, res, next) => {
  try {
    const [settings, tickets] = await Promise.all([db.getSettings(), db.getMyRaffleTickets(req.currentUser.id)]);
    res.render('account', {
      pageTitle: 'My Account', pageDescription: 'Your account',
      settings, user: req.currentUser, tickets
    });
  } catch (err) { next(err); }
});

// ============ RAFFLE REDEMPTION (open to anyone, no account required) ============
router.post('/raffle/redeem', express.json(), async (req, res, next) => {
  try {
    const code = (req.body && req.body.code) || '';
    const userId = req.currentUser ? req.currentUser.id : null;
    const result = await db.redeemRaffleCode(code, userId);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;