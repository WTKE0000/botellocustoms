-- Seed data — optional, run after schema.sql if you want starter content

-- Settings
update public.settings set
  business_name = 'Cesar Botello Customs',
  location_line = 'Murfreesboro, Tennessee',
  address = '719 Minor St, Murfreesboro, TN',
  email = 'cesarbotellocustoms@gmail.com',
  snapchat_handle = 'cesarbotellocustoms',
  hero_eyebrow = 'Family-Owned',
  hero_headline_top = 'Every piece carries',
  hero_headline_em = 'a mark, and a story.',
  hero_subhead = 'Hand engraving, laser art, and custom metalwork on the firearms you already trust — plus a curated selection ready to take home. Started by our grandfather, carried today by two cousins who still do it by hand.',
  legacy_quote = 'He didn''t teach us to engrave metal. He taught us to slow down and pay attention.',
  legacy_text = 'What started as our grandad''s bench work has become a family business run today by two cousins — same precision, same respect for the craft, same last name on the door.',
  story_intro_title = 'Grandad''s bench.',
  story_intro_text = 'Long before there was a shopfront, there was a bench, a set of hand gravers, and a grandfather who believed a firearm could be a family heirloom, not just a tool. Every piece he touched carried his mark — literally and otherwise.',
  story_outro_text = 'Today the shop is run by two cousins — same last name, same bench discipline, same belief that precision and story belong together. We build for collectors, we build for veterans, and we build for families who want something to pass down.'
where id = 1;

-- Firearms
insert into public.firearms (brand, engraved, name, tag, description, price) values ('glock', false, 'Glock 19 Gen5', 'Glock', '9mm compact, factory finish. Popular daily-carry and range platform.', '$549');
insert into public.firearms (brand, engraved, name, tag, description, price) values ('glock', false, 'Glock 43X', 'Glock', 'Slimline 9mm, ideal for concealed carry.', '$479');
insert into public.firearms (brand, engraved, name, tag, description, price) values ('glock', true, 'Glock 17 — Hand-Engraved Edition', 'Glock · Custom', 'Full slide scrollwork, cerakote base, one-of-one.', '$1,350');
insert into public.firearms (brand, engraved, name, tag, description, price) values ('colt', false, 'Colt 1911 Government .45 ACP', 'Colt', 'Classic government-model 1911, blued steel.', '$999');
insert into public.firearms (brand, engraved, name, tag, description, price) values ('colt', true, 'Colt Python — Nickel Plated & Engraved', 'Colt · Custom', '.357 Magnum, full coverage scroll engraving, nickel plate.', '$3,200');
insert into public.firearms (brand, engraved, name, tag, description, price) values ('sig', false, 'Sig Sauer P320 Compact', 'Sig Sauer', 'Modular striker-fired 9mm, factory night sights.', '$599');
insert into public.firearms (brand, engraved, name, tag, description, price) values ('sig', false, 'Sig Sauer P365', 'Sig Sauer', 'Micro-compact 9mm, high capacity for its size.', '$549');
insert into public.firearms (brand, engraved, name, tag, description, price) values ('draco', false, 'Draco AK-Style Pistol, 7.62x39', 'Draco', 'Factory-configuration AK pistol platform.', '$899');
insert into public.firearms (brand, engraved, name, tag, description, price) values ('draco', true, 'Draco — Laser-Engraved Receiver', 'Draco · Custom', 'Custom laser artwork across the receiver, cerakote finish.', '$1,150');

-- Custom Work
insert into public.custom_work (title, tag, description) values ('Full Coverage Scrollwork', 'Hand Engraving', 'Traditional hand-cut scroll across slide and frame, gold-filled lettering.');
insert into public.custom_work (title, tag, description) values ('In Memory Of — Family Crest', 'Memorial Commission', 'Custom family crest and dates hand engraved for a client''s memorial piece.');
insert into public.custom_work (title, tag, description) values ('American Eagle Receiver Art', 'Laser Art', 'High-detail laser engraving across a full receiver, cerakote sealed.');
insert into public.custom_work (title, tag, description) values ('Unit Insignia & Deployment Dates', 'Veteran Tribute', 'Commissioned by a veteran client to mark their unit and service dates.');
insert into public.custom_work (title, tag, description) values ('Colt Python — Nickel & Scroll', 'Plating + Engraving', 'Full nickel plate with hand-cut scroll engraving, ivory-style grips.');

-- Accessories
insert into public.accessories (name, description, price) values ('OWB Leather Holster', 'Hand-fitted, multiple calibers', '$89');
insert into public.accessories (name, description, price) values ('Hard Case, Foam Lined', 'Fits most full-size pistols', '$45');
insert into public.accessories (name, description, price) values ('Red Dot Optic', 'Pistol-mount, 3 MOA dot', '$249');
insert into public.accessories (name, description, price) values ('Cleaning Kit', 'Full kit, rods, brushes, solvent', '$32');
insert into public.accessories (name, description, price) values ('Extended Magazine', 'Factory & aftermarket options', '$38');
insert into public.accessories (name, description, price) values ('Gun Belt', 'Reinforced leather, CCW rated', '$59');
insert into public.accessories (name, description, price) values ('Weapon Light', 'Rail-mounted, 600 lumen', '$119');
insert into public.accessories (name, description, price) values ('IWB Concealment Holster', 'Kydex, adjustable retention', '$65');

-- Timeline
insert into public.timeline (label, title, text, sort_order) values ('GEN 1', 'Grandad opens the bench', 'What began as hand engraving on the side grew into a trusted name for custom firearm work in the community.', 0);
insert into public.timeline (label, title, text, sort_order) values ('GEN 2', 'The craft is passed down', 'The next generation picks up the graver, learns the trade hands-on, and starts expanding into laser art and plating.', 1);
insert into public.timeline (label, title, text, sort_order) values ('TODAY', 'Two cousins, one shop', 'Now run day-to-day by two cousins in Murfreesboro, TN — combining traditional hand engraving with modern laser precision, alongside firearm and accessory sales.', 2);

-- Raffle settings
update public.raffle_settings set ticket_price = 100, total_tickets = 50, max_per_person = 3, duration_days = 14 where id = 1;

-- Raffle prizes
insert into public.raffle_prizes (place, description, sort_order) values ('1st', 'Custom hand-engraved & plated firearm — retail value $4,500', 0);
insert into public.raffle_prizes (place, description, sort_order) values ('2nd', '$350 cash', 1);
insert into public.raffle_prizes (place, description, sort_order) values ('3rd', '$250 cash', 2);

-- Raffle how it works
insert into public.raffle_how_it_works (step_text, sort_order) values ('Launch. Ticket sales open on Day 1. Each ticket sold is assigned a sequential number, 1 through 50.', 0);
insert into public.raffle_how_it_works (step_text, sort_order) values ('Sales window. Tickets stay on sale for 14 days or until all 50 are sold, whichever comes first.', 1);
insert into public.raffle_how_it_works (step_text, sort_order) values ('Entry confirmation. Every buyer gets confirmation of their ticket number(s) by receipt, email, or text — a clear record for everyone.', 2);
insert into public.raffle_how_it_works (step_text, sort_order) values ('Drawing. At close, three winning ticket numbers are drawn at random. We will be doing this as a live video draw for full transparency.', 3);
insert into public.raffle_how_it_works (step_text, sort_order) values ('Winner notification. Winners are contacted directly and announced publicly on our page/social channels by ticket number — no personal info shared.', 4);
insert into public.raffle_how_it_works (step_text, sort_order) values ('Prize fulfillment. Cash prizes (2nd & 3rd) are paid directly to winners. The firearm (1st place) is not handed over directly — the winner completes the transfer through our licensed FFL, including a standard background check, exactly like any other firearm purchase.', 5);

-- Raffle terms
insert into public.raffle_terms (term_text, sort_order) values ('Ticket price: $100. Total tickets available: 50.', 0);
insert into public.raffle_terms (term_text, sort_order) values ('Raffle runs 14 days from launch date (published at time of sale start) or until sold out.', 1);
insert into public.raffle_terms (term_text, sort_order) values ('Full prize list: 1st — custom hand-engraved & plated firearm ($4,500 value); 2nd — $350 cash; 3rd — $250 cash.', 2);
insert into public.raffle_terms (term_text, sort_order) values ('Winners drawn at random via live video drawing; three winning ticket numbers selected.', 3);
insert into public.raffle_terms (term_text, sort_order) values ('Winners notified directly and announced publicly by ticket number only.', 4);
insert into public.raffle_terms (term_text, sort_order) values ('Firearm prize requires FFL transfer and standard background check — no exceptions.', 5);
insert into public.raffle_terms (term_text, sort_order) values ('Entrants must be 21+ and legally eligible to own a firearm under federal and Tennessee law.', 6);
insert into public.raffle_terms (term_text, sort_order) values ('Limit of 3 tickets per person.', 7);
insert into public.raffle_terms (term_text, sort_order) values ('No purchase necessary where required by state law — contact us for an alternate entry method.', 8);
