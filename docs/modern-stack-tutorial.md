# GMEcodes — Modern Stack Tutorial
## Astro + GitHub + Vercel + Supabase + Resend

This guide walks you through migrating GMEcodes from a hand-written HTML site to a
fully automated, SEO-perfect, auto-deploying site with real user accounts and email.

---

## What Each Tool Does for YOUR Site

| Tool | Replaces | What it solves |
|---|---|---|
| **Astro** | Hand-written `games/*.html` | Generates every game page from `games.json` automatically |
| **GitHub** | `update-site.cmd` / `publish-site.ps1` | Central save button; Vercel watches it |
| **Vercel** | Manually pushing files | Rebuilds the site in seconds every time you push to GitHub |
| **Supabase** | `localStorage` users + auth.js | Real database, real accounts, magic-link login emails |
| **Resend** | EmailJS | Delivers the verification emails Supabase sends |

---

## Phase 1 — GitHub (Code Host)

### 1-A  Create a free GitHub account
Go to https://github.com and sign up.

### 1-B  Create a new repository
1. Click **+** → **New repository**.
2. Name it `gmecodes` (or whatever you like).
3. Set it to **Public** (required for the free Vercel tier).
4. Do **not** tick "Add README" — your local files will become the README.
5. Click **Create repository**.

### 1-C  Push your existing site
GitHub will show you commands after creation. Run these in PowerShell from your
`C:\Users\potat\Desktop\FirstSite` folder:

```powershell
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/gmecodes.git
git push -u origin main
```

> Your existing `publish-site.ps1` script already does add/commit/push.
> After this first setup, you can keep using it as-is.

---

## Phase 2 — Vercel (Auto-Deployment)

### 2-A  Create a free Vercel account
Go to https://vercel.com and click **Sign Up** → choose **Continue with GitHub**.
This links the two accounts automatically.

### 2-B  Import your repository
1. On the Vercel dashboard click **Add New → Project**.
2. Find `gmecodes` in the list and click **Import**.
3. For now, leave all settings at their defaults (Framework Preset: **Other**, Output Directory: blank).
4. Click **Deploy**.

Vercel gives you a live URL like `gmecodes.vercel.app` within about 30 seconds.

> From this point on, every `git push` you make (including via `publish-site.ps1`)
> will automatically trigger a new deployment. No extra work needed.

### 2-C  Add your custom domain (optional)
1. In Vercel → your project → **Settings → Domains**.
2. Type `gmecodes.com` and follow the DNS instructions.

---

## Phase 3 — Supabase (Logins & Database)

Supabase replaces your current `localStorage`-based auth system with a real
database and magic-link email login.

### 3-A  Create a free Supabase project
1. Go to https://supabase.com and click **Start your project**.
2. Sign in with GitHub.
3. Click **New project**, give it a name (`gmecodes`), pick the free tier, and
   choose **US East (North Virginia)** — Roblox's player base is largest in the
   US and Roblox's own servers are in that region, so this gives the lowest latency.
4. Set a strong database password and save it somewhere safe.
5. Wait ~2 minutes for the project to spin up.

### 3-B  Get your API keys
In Supabase → **Project Settings → API**:
- Copy **Project URL** → save as `SUPABASE_URL`
- Copy **anon public key** → save as `SUPABASE_ANON_KEY`

You will need these in Phase 4 (Astro) and in your front-end JS.

### 3-C  Set up the users table
Supabase handles authentication automatically via its `auth.users` table.
You only need to create a `profiles` table for extra user info (username, role):

1. Go to **SQL Editor → New query** and paste:

```sql
-- Create profiles table linked to auth users
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  role text default 'user',
  created_at timestamptz default now()
);

-- Allow users to read/update only their own profile
alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

2. Click **Run**.

### 3-D  Set up a comments table (optional but useful for game pages)

```sql
create table comments (
  id bigint generated always as identity primary key,
  game_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

alter table comments enable row level security;

create policy "Anyone can read comments"
  on comments for select using (true);

create policy "Logged-in users can add comments"
  on comments for insert with check (auth.uid() = user_id);
```

### 3-E  Promote yourself to admin
After you first sign up through the site, run this in the SQL editor
(replace with your real email):

```sql
update profiles
set role = 'admin'
where id = (select id from auth.users where email = 'potatus120@gmail.com');
```

---

## Phase 4 — Resend (Email Delivery)

Resend is what actually sends the magic-link / verification emails that
Supabase generates.

### 4-A  Create a free Resend account
Go to https://resend.com and sign up (free plan = 3,000 emails/month).

### 4-B  Add and verify your domain
1. In Resend → **Domains → Add Domain** → type `gmecodes.com`.
2. Resend gives you three DNS records (TXT + MX or CNAME).
3. Add those records in your domain registrar's DNS settings.
4. Wait up to 24 hours for DNS to propagate, then click **Verify** in Resend.

### 4-C  Create an API key
In Resend → **API Keys → Create API Key** → name it `supabase` → copy the key.

### 4-D  Connect Resend to Supabase
1. In Supabase → **Project Settings → Authentication → SMTP Settings**.
2. Toggle **Enable Custom SMTP**.
3. Fill in:
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** *(paste your Resend API key)*
   - **Sender email:** `noreply@gmecodes.com`
   - **Sender name:** `GMEcodes`
4. Click **Save**.

Now Supabase will use Resend to send all auth emails automatically.

---

## Phase 5 — Astro (Auto-Generate Game Pages)

This is the biggest step. Astro lets you define ONE template and generate all
your `games/*.html` pages from `games.json` automatically — no more copy-pasting HTML.

### 5-A  Install Node.js
Download and install Node.js LTS from https://nodejs.org (if not already installed).
Verify in PowerShell:
```powershell
node -v   # should print v20.x.x or higher
npm -v
```

### 5-B  Scaffold a new Astro project inside your repo
```powershell
# From C:\Users\potat\Desktop\FirstSite
npm create astro@latest -- --template minimal --no-install --no-git
# When prompted for a project name, type: astro-site
cd astro-site
npm install
```

### 5-C  Install the Supabase JS client inside astro-site
```powershell
npm install @supabase/supabase-js
```

### 5-D  Add environment variables
Create a file called `.env` inside `astro-site/`:

```
PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

> These are the values you copied in Phase 3-B.
> Prefix with `PUBLIC_` so Astro exposes them to the browser.

Add `.env` to `.gitignore` so you never commit secrets:
```
# astro-site/.gitignore
.env
dist/
node_modules/
```

On Vercel, add the same two variables under:
**Project Settings → Environment Variables**.

### 5-E  Copy your data files
```powershell
# From FirstSite root
Copy-Item data -Destination astro-site/src/data -Recurse
Copy-Item css   -Destination astro-site/public/css -Recurse
Copy-Item images -Destination astro-site/public/images -Recurse
```

### 5-F  Create the Supabase client helper
Create `astro-site/src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);
```

### 5-G  Create the game page template
Create `astro-site/src/pages/games/[slug].astro`:

```astro
---
// This file generates ONE HTML page per game automatically.
import gamesData from '../../data/games.json';
import gameCodesData from '../../data/game-codes.json';

export function getStaticPaths() {
  return gamesData.map((game) => ({
    params: { slug: game.slug },
    props: { game },
  }));
}

const { game } = Astro.props;
const codes = gameCodesData[game.slug] ?? { working: [], expired: [] };
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{game.name} Codes | GMEcodes</title>
  <meta name="description" content={`Working and expired codes for ${game.name} on Roblox.`} />
  <link rel="canonical" href={`https://gmecodes.com/games/${game.slug}`} />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <h1>{game.name} Codes</h1>

  <section>
    <h2>Working Codes</h2>
    <ul>
      {codes.working.map(c => <li><strong>{c.code}</strong> — {c.reward}</li>)}
    </ul>
  </section>

  <section>
    <h2>Expired Codes</h2>
    <ul>
      {codes.expired.map(c => <li><s>{c.code}</s></li>)}
    </ul>
  </section>
</body>
</html>
```

> **Important:** You need to add a `"slug"` field to each entry in `data/games.json`.
> For example, Rivals → `"slug": "rivals"`, Arsenal → `"slug": "arsenal"`.
> The slug becomes the URL: `gmecodes.com/games/rivals`.

### 5-H  Update games.json with slugs
Open `data/games.json` and add a `slug` to each object:

```json
[
  { "slug": "99nights",       "name": "99 Nights in the Forest (Roblox)", "image": "images/logo/99nights2.jpg" },
  { "slug": "rivals",         "name": "Rivals (Roblox)",                  "image": "images/logo/rivals2.jpg" },
  { "slug": "arsenal",        "name": "Arsenal (Roblox)",                 "image": "images/logo/Arsenal2.jpg" },
  { "slug": "fishit",         "name": "Fish it (Roblox)",                 "image": "images/logo/Fishit2.jpg" },
  { "slug": "rerangersx",     "name": "Re:Rangers X (Roblox)",            "image": "images/logo/rerangers2.jpg" },
  { "slug": "bizarrelineage", "name": "Bizarre Lineage (Roblox)",         "image": "images/logo/bizarrelineage2.jpg" }
]
```

### 5-I  Tell Vercel to build from astro-site/
In Vercel → your project → **Settings → General → Build & Development Settings**:
- **Framework Preset:** Astro
- **Root Directory:** `astro-site`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Click **Save**, then push a commit. Vercel will now auto-build Astro pages.

---

## Phase 6 — Replace auth.js with Supabase Auth

Once Supabase is connected, replace `localStorage` auth with real Supabase calls.

### Sign up (magic-link / OTP — no password needed)
```js
import { supabase } from './lib/supabase.js';

// Send a magic link to the user's email
const { error } = await supabase.auth.signInWithOtp({
  email: userEmail,
  options: { emailRedirectTo: 'https://gmecodes.com/html/profile.html' }
});
```

### Check if someone is logged in
```js
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  console.log('Logged in as', session.user.email);
} else {
  console.log('Not logged in');
}
```

### Log out
```js
await supabase.auth.signOut();
```

### Listen for auth state changes (replaces your DOMContentLoaded logic)
```js
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // update navbar to show username
  }
  if (event === 'SIGNED_OUT') {
    // show login button
  }
});
```

---

## Quick-Reference: The Full Workflow After Setup

```
You edit data/game-codes.json   (update codes)
           ↓
git add . ; git commit -m "update codes" ; git push
           ↓
GitHub saves the change
           ↓
Vercel detects the push → runs `npm run build` in astro-site/
           ↓
Astro reads games.json + game-codes.json → generates fresh HTML for every game
           ↓
New pages are live at gmecodes.com within ~30 seconds
```

---

## Checklist (do in order)

- [ ] Create GitHub account and push site (Phase 1)
- [ ] Create Vercel account, import repo, get live URL (Phase 2)
- [ ] Create Supabase project, run SQL for profiles table (Phase 3)
- [ ] Create Resend account, verify domain, connect to Supabase SMTP (Phase 4)
- [ ] Install Node.js and scaffold Astro project (Phase 5-A to 5-C)
- [ ] Add `.env` with Supabase keys (Phase 5-D)
- [ ] Copy assets and create game page template (Phase 5-E to 5-H)
- [ ] Point Vercel at astro-site/ (Phase 5-I)
- [ ] Replace auth.js login logic with Supabase calls (Phase 6)
- [ ] Promote yourself to admin in Supabase SQL editor (Phase 3-E)
