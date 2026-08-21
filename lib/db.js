const { anonClient, adminClient } = require('./supabase');

// ---------- mappers: snake_case DB rows -> camelCase view shape ----------
const mapFirearm = (r) => ({
  id: r.id, brand: r.brand, engraved: r.engraved, name: r.name,
  tag: r.tag, description: r.description, price: r.price, image: r.image_url
});
const mapCustomWork = (r) => ({
  id: r.id, title: r.title, tag: r.tag, description: r.description, image: r.image_url
});
const mapAccessory = (r) => ({
  id: r.id, name: r.name, description: r.description, price: r.price, image: r.image_url
});
const mapTimeline = (r) => ({ id: r.id, label: r.label, title: r.title, text: r.text });
const mapSettings = (r) => ({
  businessName: r.business_name, locationLine: r.location_line, address: r.address,
  email: r.email, snapchatHandle: r.snapchat_handle, heroEyebrow: r.hero_eyebrow,
  heroHeadlineTop: r.hero_headline_top, heroHeadlineEm: r.hero_headline_em,
  heroSubhead: r.hero_subhead, legacyQuote: r.legacy_quote, legacyText: r.legacy_text,
  storyIntroTitle: r.story_intro_title, storyIntroText: r.story_intro_text,
  storyOutroText: r.story_outro_text, familyPhoto: r.family_photo_url, workshopPhoto: r.workshop_photo_url
});

// ============ PUBLIC READS (anon client, RLS-enforced) ============
async function getSettings() {
  const { data, error } = await anonClient().from('settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return mapSettings(data);
}

async function getFirearms() {
  const { data, error } = await anonClient().from('firearms').select('*').order('created_at');
  if (error) throw error;
  return data.map(mapFirearm);
}

async function getCustomWork() {
  const { data, error } = await anonClient().from('custom_work').select('*').order('created_at');
  if (error) throw error;
  return data.map(mapCustomWork);
}

async function getAccessories() {
  const { data, error } = await anonClient().from('accessories').select('*').order('created_at');
  if (error) throw error;
  return data.map(mapAccessory);
}

async function getTimeline() {
  const { data, error } = await anonClient().from('timeline').select('*').order('sort_order').order('created_at');
  if (error) throw error;
  return data.map(mapTimeline);
}

async function getRaffleConfig() {
  const client = anonClient();
  const [settingsRes, prizesRes, howRes, termsRes] = await Promise.all([
    client.from('raffle_settings').select('*').eq('id', 1).single(),
    client.from('raffle_prizes').select('*').order('sort_order'),
    client.from('raffle_how_it_works').select('*').order('sort_order'),
    client.from('raffle_terms').select('*').order('sort_order')
  ]);
  if (settingsRes.error) throw settingsRes.error;
  const s = settingsRes.data;
  return {
    ticketPrice: s.ticket_price,
    totalTickets: s.total_tickets,
    maxPerPerson: s.max_per_person,
    durationDays: s.duration_days,
    prizeImage: s.prize_image_url,
    prizes: (prizesRes.data || []).map(p => ({ place: p.place, description: p.description })),
    howItWorks: (howRes.data || []).map(h => h.step_text),
    terms: (termsRes.data || []).map(t => t.term_text)
  };
}

// ============ ADMIN WRITES (service-role client, bypasses RLS) ============
async function updateSettings(fields) {
  const db = adminClient();
  const patch = {};
  if (fields.businessName !== undefined) patch.business_name = fields.businessName;
  if (fields.locationLine !== undefined) patch.location_line = fields.locationLine;
  if (fields.address !== undefined) patch.address = fields.address;
  if (fields.email !== undefined) patch.email = fields.email;
  if (fields.snapchatHandle !== undefined) patch.snapchat_handle = fields.snapchatHandle;
  if (fields.heroEyebrow !== undefined) patch.hero_eyebrow = fields.heroEyebrow;
  if (fields.heroHeadlineTop !== undefined) patch.hero_headline_top = fields.heroHeadlineTop;
  if (fields.heroHeadlineEm !== undefined) patch.hero_headline_em = fields.heroHeadlineEm;
  if (fields.heroSubhead !== undefined) patch.hero_subhead = fields.heroSubhead;
  if (fields.legacyQuote !== undefined) patch.legacy_quote = fields.legacyQuote;
  if (fields.legacyText !== undefined) patch.legacy_text = fields.legacyText;
  if (fields.storyIntroTitle !== undefined) patch.story_intro_title = fields.storyIntroTitle;
  if (fields.storyIntroText !== undefined) patch.story_intro_text = fields.storyIntroText;
  if (fields.storyOutroText !== undefined) patch.story_outro_text = fields.storyOutroText;
  if (fields.familyPhoto !== undefined) patch.family_photo_url = fields.familyPhoto;
  if (fields.workshopPhoto !== undefined) patch.workshop_photo_url = fields.workshopPhoto;
  const { error } = await db.from('settings').update(patch).eq('id', 1);
  if (error) throw error;
}

function crudFactory(table, toRow, mapRow) {
  return {
    add: async (fields) => {
      const { data, error } = await adminClient().from(table).insert(toRow(fields)).select().single();
      if (error) throw error;
      return mapRow(data);
    },
    update: async (id, fields) => {
      const { data, error } = await adminClient().from(table).update(toRow(fields)).eq('id', id).select().single();
      if (error) throw error;
      return mapRow(data);
    },
    delete: async (id) => {
      const { error } = await adminClient().from(table).delete().eq('id', id);
      if (error) throw error;
    }
  };
}

const firearmsCrud = crudFactory('firearms',
  (f) => ({
    name: f.name, price: f.price, brand: f.brand, tag: f.tag,
    description: f.description, engraved: !!f.engraved,
    ...(f.image !== undefined ? { image_url: f.image } : {})
  }),
  mapFirearm
);

const customWorkCrud = crudFactory('custom_work',
  (f) => ({
    title: f.title, tag: f.tag, description: f.description,
    ...(f.image !== undefined ? { image_url: f.image } : {})
  }),
  mapCustomWork
);

const accessoriesCrud = crudFactory('accessories',
  (f) => ({
    name: f.name, price: f.price, description: f.description,
    ...(f.image !== undefined ? { image_url: f.image } : {})
  }),
  mapAccessory
);

const timelineCrud = crudFactory('timeline',
  (f) => ({ label: f.label, title: f.title, text: f.text }),
  mapTimeline
);

async function updateRaffleSettings(fields) {
  const db = adminClient();
  const patch = {};
  if (fields.ticketPrice !== undefined) patch.ticket_price = fields.ticketPrice;
  if (fields.totalTickets !== undefined) patch.total_tickets = fields.totalTickets;
  if (fields.maxPerPerson !== undefined) patch.max_per_person = fields.maxPerPerson;
  if (fields.durationDays !== undefined) patch.duration_days = fields.durationDays;
  if (fields.prizeImage !== undefined) patch.prize_image_url = fields.prizeImage;
  if (Object.keys(patch).length) {
    const { error } = await db.from('raffle_settings').update(patch).eq('id', 1);
    if (error) throw error;
  }

  if (fields.prizes) {
    await db.from('raffle_prizes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (fields.prizes.length) {
      const rows = fields.prizes.map((p, i) => ({ place: p.place, description: p.description, sort_order: i }));
      const { error } = await db.from('raffle_prizes').insert(rows);
      if (error) throw error;
    }
  }
  if (fields.howItWorks) {
    await db.from('raffle_how_it_works').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (fields.howItWorks.length) {
      const rows = fields.howItWorks.map((step_text, i) => ({ step_text, sort_order: i }));
      const { error } = await db.from('raffle_how_it_works').insert(rows);
      if (error) throw error;
    }
  }
  if (fields.terms) {
    await db.from('raffle_terms').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (fields.terms.length) {
      const rows = fields.terms.map((term_text, i) => ({ term_text, sort_order: i }));
      const { error } = await db.from('raffle_terms').insert(rows);
      if (error) throw error;
    }
  }
}

// ---- Raffle codes (admin-only reads, since RLS blocks anon on this table) ----
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode(len = 8) {
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

async function listRaffleCodes() {
  const { data, error } = await adminClient().from('raffle_codes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(c => ({
    id: c.id, code: c.code, status: c.status,
    ticketNumber: c.ticket_number, redeemedAt: c.redeemed_at
  }));
}

async function addRaffleCode(customCode) {
  const db = adminClient();
  let code = (customCode || '').trim().toUpperCase();
  if (!code) code = randomCode();
  const { data, error } = await db.from('raffle_codes').insert({ code }).select().single();
  if (error) {
    if (error.code === '23505') return { error: 'That code already exists.' };
    throw error;
  }
  return { id: data.id, code: data.code };
}

async function generateRaffleCodes(quantity) {
  const created = [];
  for (let i = 0; i < quantity; i++) {
    let result = await addRaffleCode();
    let attempts = 0;
    while (result.error && attempts < 5) { result = await addRaffleCode(); attempts++; }
    created.push(result);
  }
  return created;
}

async function deleteRaffleCode(id) {
  const { error } = await adminClient().from('raffle_codes').delete().eq('id', id).eq('status', 'unused');
  if (error) throw error;
}

async function countRedeemedCodes() {
  const { count, error } = await adminClient()
    .from('raffle_codes').select('id', { count: 'exact', head: true }).eq('status', 'redeemed');
  if (error) throw error;
  return count || 0;
}

// Redemption goes through the SECURITY DEFINER Postgres function via the
// service-role client — see supabase/schema.sql for the atomic logic.
async function redeemRaffleCode(code, userId) {
  const { data, error } = await adminClient().rpc('redeem_raffle_code', {
    input_code: code,
    redeeming_user: userId
  });
  if (error) throw error;
  return data;
}

async function getMyRaffleTickets(userId) {
  const { data, error } = await adminClient()
    .from('raffle_codes')
    .select('ticket_number, redeemed_at')
    .eq('redeemed_by', userId)
    .eq('status', 'redeemed')
    .order('redeemed_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({ ticketNumber: r.ticket_number, redeemedAt: r.redeemed_at }));
}

module.exports = {
  getSettings, getFirearms, getCustomWork, getAccessories, getTimeline, getRaffleConfig,
  updateSettings, updateRaffleSettings,
  firearms: firearmsCrud, customWork: customWorkCrud, accessories: accessoriesCrud, timeline: timelineCrud,
  listRaffleCodes, addRaffleCode, generateRaffleCodes, deleteRaffleCode, countRedeemedCodes, redeemRaffleCode,
  getMyRaffleTickets
};
