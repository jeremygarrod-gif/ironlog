# IRONLOG

A workout tracker built around top-set / back-off training with percentage-based
warm-ups. Runs as a web app, installs to a phone home screen, and stores data in
Supabase so it syncs across devices.

---

## Deploying

Three steps. Budget about 25 minutes the first time.

### 0. If you already deployed once

Run `migration-002.sql` in the SQL Editor. It only adds tables — your sessions
are untouched. Skip the step below; that one wipes and rebuilds.

### 1. Run the database schema (first deploy only)

In your Supabase dashboard: **SQL Editor → New query**. Paste the whole of
`ironlog-schema.sql`, click **Run**. It should report success.

This drops and recreates the tables, so run it before you have data you care
about — or skip it if you have already run this exact version.

Also check **Authentication → Providers → Email** and make sure *Confirm email*
is off. The free tier only sends a handful of emails per hour, so leaving it on
will strand people at signup.

### 2. Put the code on GitHub

- Go to github.com and click **New repository**
- Name it `ironlog`, leave it private or public, **don't** tick "add a README"
- On the empty repo page, click **uploading an existing file**
- Drag in everything from this folder **except** `node_modules` and `dist`
- Click **Commit changes**

### 3. Deploy on Vercel

- Go to vercel.com, sign in **with GitHub**
- **Add New → Project**, pick your `ironlog` repo, click **Import**
- Leave every setting alone — Vercel detects Vite on its own
- Click **Deploy**

A minute later you have a live URL. That link is the app. Anyone can open it,
create an account, and their data stays entirely their own.

---

## Installing on a phone

Open the Vercel URL on the phone, then:

- **iPhone** — Share button → *Add to Home Screen*
- **Android** — ⋮ menu → *Add to Home Screen*

It then behaves like an installed app: own icon, no browser chrome.

---

## Moving your existing data across

In the old browser-storage version, hit **Export backup** and save the JSON
file. In the new app, sign up, then **Import backup** and pick that file. Your
workouts, templates, schemes and logged sessions all come across.

---

## Making changes later

Edit the file on GitHub (click the file, then the pencil icon) and commit.
Vercel redeploys automatically within a minute or so. Refresh the app to see it.

---

## Adding Google sign-in

Worth doing once the app is live, since Google needs the final URL.

1. In Google Cloud Console, create a project, then **APIs & Services →
   Credentials → Create OAuth client ID → Web application**
2. Under *Authorized redirect URIs* add:
   `https://fxmrramezfqfawdoxqus.supabase.co/auth/v1/callback`
3. Copy the client ID and secret into Supabase under
   **Authentication → Providers → Google**, and enable it
4. Tell me it's on and I'll add the button to the login screen

Accounts created with email and password keep working — this only adds another
way in.

---

## How it fits together

| File | What it does |
| --- | --- |
| `src/App.jsx` | Auth gate, loads data once, routes between screens |
| `src/supabase.js` | Every database call, plus backup import/export |
| `src/utils.js` | Percentage maths, rep grading, date handling |
| `src/styles.js` | Colours and shared style objects |
| `src/components.jsx` | Inputs shared across screens |
| `src/screens/` | One file per screen |

Two design notes worth knowing if you come back to this later:

**The exercise library is derived, not stored.** It is computed from your
sessions each time the app loads. That is why editing or deleting a session can
no longer leave stale entries behind the way it did in the earlier version.

**Weights follow the exercise, not the workout.** When a lift appears on more
than one day, the app pre-fills from the last time you did *that lift* anywhere,
while still showing you separately how it went last time on *this* day.

**Streaks only ever encourage.** Nothing announces a broken streak or a missed
week. A declared pause bridges a gap without counting toward the total, so the
number describes weeks you actually completed rather than time that passed.
