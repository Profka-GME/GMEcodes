# How to Add a New Game Page

Follow every step below in order. Nothing is optional — skipping any step will cause
broken search results, missing related-games links, wrong codes data, or bad SEO.

---

## Before you start — gather these things

1. **Game name** — the public display name, e.g. `Pixel Battlegrounds`
2. **Short game-id** — lowercase, no spaces, used internally, e.g. `pixelbg`
3. **HTML filename** — all lowercase, no spaces, e.g. `pixelbg.html`
4. **Canonical URL** — `https://gmecodes.com/games/pixelbg.html`
5. **Hero image** — landscape screenshot, save as `images/pictures/pixelbg.jpg`
6. **Logo/thumbnail** — square-ish crop, save as `images/logo/pixelbg2.jpg`
7. **Redeem steps** — the exact in-game steps to enter a code (game-specific)
8. **One-line description** — used in meta description and JSON-LD, ~155 chars max

> Replace every `pixelbg` / `Pixel Battlegrounds` placeholder below with your real values.

---

## Step 1 — Add the images

Put two image files in the repo:

| File path | Purpose |
|---|---|
| `images/pictures/pixelbg.jpg` | Main hero image shown on the game page |
| `images/logo/pixelbg2.jpg` | Thumbnail shown on homepage browse cards |

Both should be JPG. Keep file sizes reasonable (under 300 KB each if possible).

---

## Step 2 — Create the HTML game page

Copy an existing page as a starting point — `games/rivals.html` is the cleanest template.

Save your copy as `games/pixelbg.html`.

### 2a — Update the `<head>` block

Replace every occurrence of the old game's values with the new ones:

```html
<meta name="description" content="Latest Roblox Pixel Battlegrounds codes including working and expired codes, plus redeem steps.">
<link rel="canonical" href="https://gmecodes.com/games/pixelbg.html">
<meta property="og:title" content="Roblox Pixel Battlegrounds Codes | Working and Expired Codes | GMEcodes">
<meta property="og:description" content="See updated Roblox Pixel Battlegrounds working and expired codes in one place.">
<meta property="og:url" content="https://gmecodes.com/games/pixelbg.html">
<meta property="og:image" content="https://gmecodes.com/images/pictures/pixelbg.jpg">
<meta name="twitter:title" content="Roblox Pixel Battlegrounds Codes | Working and Expired Codes | GMEcodes">
<meta name="twitter:description" content="See updated Roblox Pixel Battlegrounds working and expired codes in one place.">
<meta name="twitter:image" content="https://gmecodes.com/images/pictures/pixelbg.jpg">
<title>Roblox Pixel Battlegrounds Codes | Working and Expired Codes | GMEcodes</title>
```

### 2b — Update the JSON-LD `<script>` block in the head

```json
{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Roblox Pixel Battlegrounds Codes | Working and Expired Codes",
    "description": "Latest Roblox Pixel Battlegrounds codes including working and expired codes, plus redeem steps.",
    "url": "https://gmecodes.com/games/pixelbg.html",
    "image": "https://gmecodes.com/images/pictures/pixelbg.jpg",
    "inLanguage": "en",
    "publisher": {
        "@type": "Organization",
        "name": "GMEcodes",
        "url": "https://gmecodes.com",
        "logo": { "@type": "ImageObject", "url": "https://gmecodes.com/images/logo/Mainlogo.png" }
    }
}
```

**Do not change the publisher block** — that stays identical on every page.

### 2c — Update the `<body>` tag

The `data-comment-storage` and `data-game-id` attributes **must match exactly**.
Use the short game-id you chose (lowercase, no spaces):

```html
<body class="" data-comment-storage="pixelbg" data-game-id="pixelbg">
```

`data-comment-storage` — drives the comment system's localStorage key.\
`data-game-id` — drives `game-codes.js` to know which entry to load from `data/game-codes.json`.

### 2d — Update the hero image section

```html
<img src="../images/pictures/pixelbg.jpg" alt="Pixel Battlegrounds" class="img-fluid my-3" loading="eager" decoding="async" fetchpriority="high">
```

### 2e — Update the page headings and description paragraph

```html
<h1 class="text-center fw-bold">Roblox Pixel Battlegrounds Codes</h1>
...
<h2 class="text-center my-4">Roblox Pixel Battlegrounds Codes</h2>
<p class="szöveg">Write a 2-3 sentence description of what the game is and why codes matter.</p>
```

### 2f — Update the redeem steps

Replace the `<li>` items inside `#redeemStepsList` with the actual in-game steps for your game:

```html
<ol class="list-group-numbered" id="redeemStepsList">
    <li class="list-group-item">Open Pixel Battlegrounds on Roblox.</li>
    <li class="list-group-item">Click the Codes button in the main menu.</li>
    <li class="list-group-item">Type the code and press Redeem.</li>
    <li class="list-group-item">Your reward will be added automatically.</li>
</ol>
```

### 2g — Keep these sections unchanged

The following are identical on every game page — copy them from the template and **do not modify**:

- The entire `<nav>` block
- `#workingCodesList` and `#expiredCodesList` (populated dynamically by `game-codes.js`)
- `#relatedGamesLinks` div (populated dynamically)
- `#lastUpdatedLabel` and `#testedTodayLabel` paragraphs (populated dynamically)
- The login modal (`#loginModal`)
- The register modal (`#registerModal`)
- The comments section (`#commentsSection`) including `<textarea maxlength="100">`
- The login prompt (`#loginPrompt`)
- The `<footer>` block
- The script tags at the bottom:

```html
<script src="../javascipt/game-codes.js"></script>
<script src="../javascipt/rivals.js"></script>
<script src="../javascipt/auth.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" ...></script>
```

---

## Step 3 — Add the game to `data/games.json`

This file drives the homepage browse list and the search bar.

Open `data/games.json` and add a new entry to the JSON array:

```json
{
    "name": "Pixel Battlegrounds(Roblox)",
    "page": "games/pixelbg.html",
    "image": "images/logo/pixelbg2.jpg"
}
```

- `name` — display name shown on cards and in search results
- `page` — relative path from the site root (no leading `./`)
- `image` — relative path to the logo thumbnail from the site root

---

## Step 4 — Add the game to `data/game-codes.json`

Open `data/game-codes.json` and add a new key using the same short game-id you used in `data-game-id`:

```json
"pixelbg": {
    "workingCodes": [],
    "expiredCodes": []
}
```

Start with empty arrays. When you have real codes to add see `docs/game-codes-workflow.md`
for the full codes format.

The key **must exactly match** `data-game-id` in the HTML body tag.
If even the capitalisation differs, no codes will load.

---

## Step 5 — Add the game to `javascipt/home-updates.js`

Open `javascipt/home-updates.js` and find the `gameMeta` object near the top (around line 10).
Add your new entry:

```js
pixelbg: { name: "Pixel Battlegrounds", href: "games/pixelbg.html", image: "images/logo/pixelbg2.jpg" },
```

- `name` — human-readable name used in the "Latest updates" widget on the homepage
- `href` — relative URL from the homepage
- `image` — relative path to the thumbnail

---

## Step 6 — Add the game to `javascipt/search.js`

Open `javascipt/search.js`. There are **two** places to update:

### 6a — Add to `fallbackGames` array (around line 4)

```js
{
name: "Pixel Battlegrounds(Roblox)",
page: "games/pixelbg.html",
image: "images/logo/pixelbg2.jpg"
},
```

### 6b — Add to `availablePages` Set (around line 35)

```js
"games/pixelbg.html",
```

The search bar uses `availablePages` as a whitelist. If a page is not in this set it will
never appear in search results even if it is in `fallbackGames`.

---

## Step 7 — Add the page to `seo/sitemap.xml`

Open `seo/sitemap.xml` and add a `<url>` block after the last existing game entry:

```xml
<url>
  <loc>https://gmecodes.com/games/pixelbg.html</loc>
  <lastmod>2026-03-18</lastmod>
  <changefreq>daily</changefreq>
  <priority>0.9</priority>
</url>
```

Use today's date as `lastmod`. Update it whenever you change the page content.

---

## Step 8 — Verify everything looks right locally

Before pushing, do a quick sanity check:

1. Open `games/pixelbg.html` in your browser (double-click it or use Live Server).
2. Confirm the hero image loads.
3. Confirm the page title and headings say the correct game name.
4. Open `index.html` in the browser — the new game should appear in the browse grid.
5. Type part of the game name in the search bar — it should appear in results.

---

## Step 9 — Push to GitHub / deploy to Vercel

Vercel auto-deploys whenever you push to `main`. Use whichever method you prefer:

### Easiest — double-click
Double-click `update-site.cmd` in the root folder.

### From VS Code terminal
```powershell
.\scripts\publish-site.ps1 "Add Pixel Battlegrounds page"
```

The script stages all changes, commits, pulls, and pushes in one step.
Vercel will pick up the push and deploy within about a minute.

---

## Complete checklist

Run through this before every new game page push:

- [ ] `images/pictures/pixelbg.jpg` added (hero image)
- [ ] `images/logo/pixelbg2.jpg` added (thumbnail)
- [ ] `games/pixelbg.html` created with correct `<head>` SEO tags
- [ ] `<body data-comment-storage="pixelbg" data-game-id="pixelbg">` set
- [ ] JSON-LD Article block correct in `<head>`
- [ ] Hero image `src`, `alt` updated
- [ ] `<h1>`, `<h2>`, description paragraph updated
- [ ] Redeem steps are game-specific
- [ ] `data/games.json` — new entry added
- [ ] `data/game-codes.json` — new key added matching `data-game-id`
- [ ] `javascipt/home-updates.js` — new entry in `gameMeta`
- [ ] `javascipt/search.js` — entry in `fallbackGames` AND in `availablePages`
- [ ] `seo/sitemap.xml` — new `<url>` block added
- [ ] Pushed to GitHub with `update-site.cmd` or the PowerShell script

---

## Common mistakes

| Mistake | Effect |
|---|---|
| `data-game-id` doesn't match the key in `game-codes.json` | Codes section stays empty, "Verified active codes will appear here." forever |
| `data-comment-storage` has capital letters or spaces | Comments save to a different key, users lose old comments |
| Page not added to `availablePages` in `search.js` | Game never appears in search results |
| Logo thumbnail path wrong in `games.json` or `home-updates.js` | Broken image on homepage cards |
| Sitemap not updated | Google won't crawl the new page quickly |
| HTML filename has capital letters | Works on Windows but breaks on Vercel (Linux); always use lowercase filenames |


Run terminal to update Astro

1. command line : cd astro-site
2. command line: npm run build