# Pinpoint 📍

Plan trips day by day. Share the journey in real time.

---

## Stack

- **React** (Create React App)
- **Supabase** — database, auth, row-level security
- **Mapbox GL** — colour-coded map pins
- **TanStack Query** — data fetching & caching
- **Vercel** — hosting

---

## Setup (step by step)

### 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New project** — give it a name (e.g. "pinpoint"), set a database password, choose a region
3. Wait ~2 minutes for it to spin up
4. Go to **SQL Editor** (left sidebar) → click **New query**
5. Paste the entire contents of `supabase/migrations/001_schema.sql` and click **Run**
6. Go to **Settings → API** and copy:
   - **Project URL** → `REACT_APP_SUPABASE_URL`
   - **anon public key** → `REACT_APP_SUPABASE_ANON_KEY`

### 2. Get a Mapbox token (free)

1. Go to [mapbox.com](https://mapbox.com) and create a free account
2. Go to **Account → Access tokens** → copy your **Default public token**
3. → `REACT_APP_MAPBOX_TOKEN`

### 3. Set up your .env file

```bash
cp .env.example .env
```

Open `.env` and fill in your three keys from steps 1 and 2.

### 4. Install and run locally

```bash
npm install
npm start
```

App opens at `http://localhost:3000`.

---

## Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked about environment variables, add your three keys.

### Option B — GitHub + Vercel dashboard

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. In **Environment Variables**, add:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_MAPBOX_TOKEN`
4. Click **Deploy**

Vercel gives you a live URL (e.g. `pinpoint-xyz.vercel.app`). That's your shareable link base.

---

## How the share link works

Every trip gets a random `share_token` (e.g. `a3f8c2d1`) generated automatically by Supabase.

The share URL is: `https://your-app.vercel.app/share/a3f8c2d1`

- No login required to view
- Updates every 60 seconds automatically
- Shows flights, hotel, day-by-day places, and completed status
- Supabase RLS ensures viewers can only read — never write

---

## Project structure

```
src/
  pages/
    Auth.js          — Sign in / sign up
    Dashboard.js     — Trip list + create trip
    Builder.js       — Trip builder (sidebar + map)
    SharedView.js    — Public read-only family view
  components/
    Nav.js           — Top navigation bar
  hooks/
    useAuth.js       — Auth context + session management
  lib/
    supabase.js      — Supabase client + category config
    api.js           — All database functions
  styles/
    global.css       — Design tokens + shared styles
supabase/
  migrations/
    001_schema.sql   — Full database schema + RLS policies
```

---

## What's ready in v1

- ✅ Sign up / sign in
- ✅ Create trips with date range (auto-generates Day records)
- ✅ Trip dashboard with progress bars
- ✅ Day-by-day place builder
- ✅ Add places with name, address, lat/long, category, notes
- ✅ Mark places as visited (with timestamp)
- ✅ Colour-coded map pins by category
- ✅ Flights + hotel logistics (outbound, return, hotel)
- ✅ One-click share link (no login required for viewers)
- ✅ Auto-refreshing shared view (60s)
- ✅ Vercel-ready deployment

## What to build next (v2)

- Drag-to-reorder places within a day
- Google Places autocomplete for address search (fills lat/long automatically)
- Move places between days
- Multiple hotels per trip
- Push notifications for family followers
- Trip cover photo upload
