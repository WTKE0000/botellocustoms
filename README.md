# Cesar Botello Customs — Website, Admin Dashboard & Raffle

A Node.js/Express site backed by Supabase (database, auth, and photo storage),
deployable to Vercel so you can manage everything — content, inventory, and
the raffle — from a phone browser, anywhere.

## What changed from the local version

- Content now lives in a real Supabase (Postgres) database instead of a file
  on disk, so admin edits work when deployed online.
- Customer accounts: buyers must sign up / log in before they can redeem a
  raffle code and spin the wheel.
- Photos upload to Supabase Storage instead of a local folder.
- Admin login uses Supabase Auth (your email + a password you set), not a
  hardcoded default.

---

## Part 1 — Set up Supabase (one time)

You said you already have a Supabase account, so:

1. Open your Supabase project (or create a new one for this site).
2. Go to **SQL Editor → New Query**, paste in the entire contents of
   `supabase/schema.sql`, and click **Run**. This creates every table, the
   raffle redemption logic, and security policies.
3. Optional but recommended: run `supabase/seed.sql` the same way afterward
   — it fills the site with the same starter content you already reviewed
   (firearms, custom work, accessories, timeline, raffle rules) so the site
   isn't empty on first launch. Edit or delete any of it later from the
   admin dashboard.
4. Go to **Storage → Create a new bucket**. Name it exactly `uploads` and
   toggle it **Public**. This is where admin-uploaded photos go.
5. Go to **Project Settings → API**. You'll need three values from this page
   in a minute: **Project URL**, **anon public key**, and
   **service_role key** (click "reveal" to see it — keep this one secret).

### Create your admin login

1. On the live site (once deployed) or running locally, go to `/signup` and
   create an account with your own email and a password — this is a normal
   customer signup, that's fine.
2. Back in Supabase, go to **SQL Editor** and run:
   ```sql
   update public.profiles set is_admin = true where email = 'you@example.com';
   ```
   (use the email you just signed up with)
3. Now `/admin/login` on the site will accept that email + password.

Repeat step 3 for your cousin with their email once they've signed up, so
you both have admin access.

---

## Part 2 — Run it locally first (recommended before deploying)

1. Copy `.env.example` to `.env` and fill in the three Supabase values from
   above:
   ```
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
2. `npm install`
3. `npm start`
4. Visit `http://localhost:3000` — you should see your real Supabase content.
   Log into `/admin/login` with the account you made an admin above.

If this works locally, deploying will work too — it's the same code talking
to the same database.

---

## Part 3 — Deploy to Vercel

You said you already have a Vercel account too, so:

1. Push this project to a GitHub repo (or use the Vercel CLI directly —
   `npx vercel` from this folder also works without GitHub).
2. In Vercel, **New Project → Import** your repo.
3. Before deploying, add the same three environment variables from your
   `.env` file under **Project Settings → Environment Variables**:
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy. Vercel will give you a live URL (e.g. `cesar-botello-customs.vercel.app`),
   which you can later point a custom domain at.

That's it — from then on, you and your cousin manage everything from
`your-domain.com/admin` on your phones, same as the local version worked,
except it's live for real customers.

---

## Part 4 — How the raffle works now (with accounts)

1. **Customer pays.** Raffle page → "Pay via Snapchat" → they send you money
   on Snapchat, same as before.
2. **You generate a code.** Admin → Raffle Codes → Generate → copy the code
   → send it to them on Snapchat.
3. **They redeem it.** Back on the Raffle page, they log in (or sign up if
   it's their first time), enter the code, and hit Spin. The wheel lands on
   a random still-available ticket number, permanently tied to their account
   and that code.
4. They can see their ticket numbers anytime under **My Account**. You can
   see every code's status under **Admin → Raffle Codes**.

Requiring an account before redemption is intentional — it ties every ticket
to a real, verifiable buyer instead of an anonymous code, which is the
credibility you were after.

---

## Admin dashboard — what you can edit

| Section | Controls |
|---|---|
| Site Settings | Business info, homepage hero text, family legacy copy, family & workshop photos |
| Family Timeline | The "three generations" story on the Our Story page |
| Firearms | Add/edit/delete, category, price, photo, hand-engraved flag |
| Custom Work | Your engraving/laser art portfolio |
| Accessories | Holsters, cases, optics, etc. |
| Raffle Settings | Ticket price, total tickets, max per person, duration, prizes, rules, terms, prize photo — launch a new raffle any time by changing these |
| Raffle Codes | Generate/track one-time redemption codes |
| Account | Change your own admin password |

To launch a brand-new raffle later, just update the numbers under **Raffle
Settings** and generate a fresh batch of codes — old redeemed codes stay in
the history, new ones start from ticket #1 again against the new
`totalTickets` count.

---

## Security notes

- The **service role key** bypasses all database security rules — it's only
  ever used on the server (never sent to the browser) and must stay out of
  version control. `.env` is already git-ignored.
- Raffle ticket assignment happens inside the database itself (a Postgres
  function), not in the app code, so two people redeeming codes at the exact
  same moment can never be handed the same ticket number — I tested this
  directly with concurrent requests before shipping it.
- Only accounts you've explicitly flagged `is_admin = true` in Supabase can
  reach `/admin` — a regular customer signup never gets access.

## Project structure

```
server.js              — Express app (also the Vercel entry point via api/index.js)
routes/public.js        — public pages + customer signup/login/account + raffle redemption
routes/admin.js          — admin dashboard routes (protected)
middleware/auth.js        — session verification (Supabase cookies), requireAdmin/requireCustomer
lib/supabase.js            — Supabase client setup (anon + service-role)
lib/auth.js                 — cookie-based session helpers, flash messages
lib/db.js                    — all database reads/writes
lib/upload.js                 — photo uploads to Supabase Storage
supabase/schema.sql            — run this once in Supabase's SQL Editor
supabase/seed.sql                — optional starter content
views/                              — public page templates (EJS)
views/admin/                         — admin dashboard templates (EJS)
public/css/style.css                  — all site styling
public/js/main.js                      — mobile menu, filters, raffle wheel + redemption
vercel.json, api/index.js               — Vercel deployment config
```
