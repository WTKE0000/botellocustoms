const express = require('express');
const router = express.Router();
const dbLib = require('../lib/db');
const { anonClient } = require('../lib/supabase');
const { setSessionCookies, clearSessionCookies, setFlash, readFlash } = require('../lib/auth');
const { requireAdmin } = require('../middleware/auth');
const { upload, uploadToStorage } = require('../lib/upload');

function parsePrizesRaw(raw) {
  return raw.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return { place: '', description: line };
    return { place: line.slice(0, idx).trim(), description: line.slice(idx + 1).trim() };
  });
}
function linesToArray(raw) {
  return raw.split('\n').map(l => l.trim()).filter(Boolean);
}

// ============ AUTH ============
router.get('/login', (req, res) => {
  if (req.currentProfile && req.currentProfile.is_admin) return res.redirect('/admin');
  res.render('admin/login', { flash: readFlash(req, res) });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body; // "username" field on the form is actually an email
  const { data, error } = await anonClient().auth.signInWithPassword({ email: username, password });
  if (error || !data.session) {
    setFlash(res, 'error', 'Incorrect email or password.');
    return res.redirect('/admin/login');
  }
  const { data: profile } = await anonClient().from('profiles').select('is_admin').eq('id', data.user.id).single();
  if (!profile || !profile.is_admin) {
    setFlash(res, 'error', 'That account is not an admin on this site.');
    return res.redirect('/admin/login');
  }
  setSessionCookies(res, data.session);
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  clearSessionCookies(res);
  res.redirect('/admin/login');
});

// Everything below requires an admin session
router.use(requireAdmin);

// ============ DASHBOARD ============
router.get('/', async (req, res, next) => {
  try {
    const [firearms, customWork, accessories, raffle, redeemed] = await Promise.all([
      dbLib.getFirearms(), dbLib.getCustomWork(), dbLib.getAccessories(),
      dbLib.getRaffleConfig(), dbLib.countRedeemedCodes()
    ]);
    res.render('admin/dashboard', {
      flash: readFlash(req, res),
      counts: { firearms: firearms.length, customWork: customWork.length, accessories: accessories.length },
      raffle, ticketsRedeemed: redeemed
    });
  } catch (err) { next(err); }
});

// ============ SETTINGS ============
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await dbLib.getSettings();
    res.render('admin/settings', { flash: readFlash(req, res), settings });
  } catch (err) { next(err); }
});

router.post('/settings', upload.fields([{ name: 'familyPhoto', maxCount: 1 }, { name: 'workshopPhoto', maxCount: 1 }]), async (req, res, next) => {
  try {
    const b = req.body;
    const patch = {
      businessName: b.businessName, locationLine: b.locationLine, address: b.address,
      email: b.email, snapchatHandle: b.snapchatHandle, heroEyebrow: b.heroEyebrow,
      heroHeadlineTop: b.heroHeadlineTop, heroHeadlineEm: b.heroHeadlineEm, heroSubhead: b.heroSubhead,
      legacyQuote: b.legacyQuote, legacyText: b.legacyText, storyIntroTitle: b.storyIntroTitle,
      storyIntroText: b.storyIntroText, storyOutroText: b.storyOutroText
    };
    if (req.files && req.files.familyPhoto) patch.familyPhoto = await uploadToStorage(req.files.familyPhoto[0], 'settings');
    if (req.files && req.files.workshopPhoto) patch.workshopPhoto = await uploadToStorage(req.files.workshopPhoto[0], 'settings');
    await dbLib.updateSettings(patch);
    setFlash(res, 'success', 'Site settings updated.');
    res.redirect('/admin/settings');
  } catch (err) { next(err); }
});

// ============ GENERIC COLLECTION FACTORY ============
function collectionRoutes({ path: base, crud, getAll, view, formView, buildFields, imageField = 'image' }) {
  router.get('/' + base, async (req, res, next) => {
    try {
      const items = await getAll();
      const payload = { flash: readFlash(req, res) };
      payload[base === 'custom-work' ? 'customWork' : base] = items;
      res.render('admin/' + view, payload);
    } catch (err) { next(err); }
  });

  router.get('/' + base + '/new', (req, res) => {
    res.render('admin/' + formView, { flash: null, item: null });
  });

  router.get('/' + base + '/:id/edit', async (req, res, next) => {
    try {
      const items = await getAll();
      const item = items.find(i => i.id === req.params.id);
      if (!item) { setFlash(res, 'error', 'Item not found.'); return res.redirect('/admin/' + base); }
      res.render('admin/' + formView, { flash: readFlash(req, res), item });
    } catch (err) { next(err); }
  });

  router.post('/' + base, upload.single(imageField), async (req, res, next) => {
    try {
      const fields = buildFields(req.body);
      if (req.file) fields[imageField] = await uploadToStorage(req.file, base);
      await crud.add(fields);
      setFlash(res, 'success', 'Added successfully.');
      res.redirect('/admin/' + base);
    } catch (err) { next(err); }
  });

  router.post('/' + base + '/:id', upload.single(imageField), async (req, res, next) => {
    try {
      const fields = buildFields(req.body);
      if (req.file) fields[imageField] = await uploadToStorage(req.file, base);
      await crud.update(req.params.id, fields);
      setFlash(res, 'success', 'Saved successfully.');
      res.redirect('/admin/' + base);
    } catch (err) { next(err); }
  });

  router.post('/' + base + '/:id/delete', async (req, res, next) => {
    try {
      await crud.delete(req.params.id);
      setFlash(res, 'success', 'Deleted.');
      res.redirect('/admin/' + base);
    } catch (err) { next(err); }
  });
}

collectionRoutes({
  path: 'firearms', crud: dbLib.firearms, getAll: dbLib.getFirearms,
  view: 'firearms', formView: 'firearms-form',
  buildFields: (b) => ({ name: b.name, price: b.price, brand: b.brand, tag: b.tag, description: b.description, engraved: b.engraved === '1' })
});

collectionRoutes({
  path: 'custom-work', crud: dbLib.customWork, getAll: dbLib.getCustomWork,
  view: 'custom-work', formView: 'custom-work-form',
  buildFields: (b) => ({ title: b.title, tag: b.tag, description: b.description })
});

collectionRoutes({
  path: 'accessories', crud: dbLib.accessories, getAll: dbLib.getAccessories,
  view: 'accessories', formView: 'accessories-form',
  buildFields: (b) => ({ name: b.name, price: b.price, description: b.description })
});

// ============ TIMELINE ============
router.get('/timeline', async (req, res, next) => {
  try {
    const timeline = await dbLib.getTimeline();
    res.render('admin/timeline', { flash: readFlash(req, res), timeline });
  } catch (err) { next(err); }
});
router.get('/timeline/new', (req, res) => res.render('admin/timeline-form', { flash: null, item: null }));
router.get('/timeline/:id/edit', async (req, res, next) => {
  try {
    const timeline = await dbLib.getTimeline();
    const item = timeline.find(i => i.id === req.params.id);
    if (!item) { setFlash(res, 'error', 'Entry not found.'); return res.redirect('/admin/timeline'); }
    res.render('admin/timeline-form', { flash: readFlash(req, res), item });
  } catch (err) { next(err); }
});
router.post('/timeline', async (req, res, next) => {
  try {
    await dbLib.timeline.add({ label: req.body.label, title: req.body.title, text: req.body.text });
    setFlash(res, 'success', 'Timeline entry added.');
    res.redirect('/admin/timeline');
  } catch (err) { next(err); }
});
router.post('/timeline/:id', async (req, res, next) => {
  try {
    await dbLib.timeline.update(req.params.id, { label: req.body.label, title: req.body.title, text: req.body.text });
    setFlash(res, 'success', 'Timeline entry saved.');
    res.redirect('/admin/timeline');
  } catch (err) { next(err); }
});
router.post('/timeline/:id/delete', async (req, res, next) => {
  try {
    await dbLib.timeline.delete(req.params.id);
    setFlash(res, 'success', 'Deleted.');
    res.redirect('/admin/timeline');
  } catch (err) { next(err); }
});

// ============ RAFFLE SETTINGS ============
router.get('/raffle', async (req, res, next) => {
  try {
    const raffle = await dbLib.getRaffleConfig();
    res.render('admin/raffle', { flash: readFlash(req, res), raffle });
  } catch (err) { next(err); }
});

router.post('/raffle', upload.single('prizeImage'), async (req, res, next) => {
  try {
    const b = req.body;
    const patch = {
      ticketPrice: parseInt(b.ticketPrice, 10) || undefined,
      totalTickets: parseInt(b.totalTickets, 10) || undefined,
      maxPerPerson: parseInt(b.maxPerPerson, 10) || undefined,
      durationDays: parseInt(b.durationDays, 10) || undefined,
      prizes: parsePrizesRaw(b.prizesRaw || ''),
      howItWorks: linesToArray(b.howItWorksRaw || ''),
      terms: linesToArray(b.termsRaw || '')
    };
    if (req.file) patch.prizeImage = await uploadToStorage(req.file, 'raffle');
    await dbLib.updateRaffleSettings(patch);
    setFlash(res, 'success', 'Raffle settings updated.');
    res.redirect('/admin/raffle');
  } catch (err) { next(err); }
});

// ============ RAFFLE CODES ============
router.get('/raffle-codes', async (req, res, next) => {
  try {
    const raffle = await dbLib.getRaffleConfig();
    const codesRaw = await dbLib.listRaffleCodes();
    const codes = codesRaw.sort((a, b) => a.status === b.status ? 0 : (a.status === 'unused' ? -1 : 1));
    res.render('admin/raffle-codes', {
      flash: readFlash(req, res), codes, totalTickets: raffle.totalTickets,
      newlyGenerated: req.query.generated ? req.query.generated.split(',') : null
    });
  } catch (err) { next(err); }
});

router.post('/raffle-codes/generate', async (req, res, next) => {
  try {
    let qty = parseInt(req.body.quantity, 10);
    if (!qty || qty < 1) qty = 1;
    if (qty > 50) qty = 50;
    const created = await dbLib.generateRaffleCodes(qty);
    setFlash(res, 'success', `Generated ${created.length} new code${created.length > 1 ? 's' : ''}. Copy these before leaving this page — send one to each buyer over Snapchat after they pay.`);
    res.redirect('/admin/raffle-codes?generated=' + created.map(c => c.code).join(','));
  } catch (err) { next(err); }
});

router.post('/raffle-codes/custom', async (req, res, next) => {
  try {
    const result = await dbLib.addRaffleCode(req.body.code);
    if (result && result.error) {
      setFlash(res, 'error', result.error);
    } else {
      setFlash(res, 'success', `Code ${result.code} added.`);
    }
    res.redirect('/admin/raffle-codes');
  } catch (err) { next(err); }
});

router.post('/raffle-codes/:id/delete', async (req, res, next) => {
  try {
    await dbLib.deleteRaffleCode(req.params.id);
    setFlash(res, 'success', 'Code deleted.');
    res.redirect('/admin/raffle-codes');
  } catch (err) { next(err); }
});

// ============ ACCOUNT — password change goes through Supabase Auth ============
router.get('/account', (req, res) => {
  res.render('admin/account', { flash: readFlash(req, res), admin: { email: req.currentUser.email } });
});

router.post('/account', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 6) {
    setFlash(res, 'error', 'New password must be at least 6 characters.');
    return res.redirect('/admin/account');
  }
  const client = anonClient();
  await client.auth.setSession({
    access_token: req.cookies.sb_access_token,
    refresh_token: req.cookies.sb_refresh_token
  });
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) {
    setFlash(res, 'error', error.message);
    return res.redirect('/admin/account');
  }
  setFlash(res, 'success', 'Password updated.');
  res.redirect('/admin/account');
});

module.exports = router;
