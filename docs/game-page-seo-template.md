# Game Page SEO Template

Use this template when creating a new game code page.

## 1) Head Tags (replace placeholders)

```html
<title>Roblox {{GAME_NAME}} Codes | Working and Expired Codes | GMEcodes</title>
<meta name="description" content="Updated Roblox {{GAME_NAME}} codes with active rewards, expired codes, and redeem steps.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://gmecodes.com/games/{{GAME_SLUG}}.html">
<meta property="og:type" content="article">
<meta property="og:title" content="Roblox {{GAME_NAME}} Codes | Working and Expired Codes | GMEcodes">
<meta property="og:description" content="Find working and expired Roblox {{GAME_NAME}} codes with regular updates.">
<meta property="og:url" content="https://gmecodes.com/games/{{GAME_SLUG}}.html">
<meta property="og:image" content="https://gmecodes.com/images/pictures/{{GAME_IMAGE_FILE}}">
```

## 2) H1 Section Labels

```html
<h1 class="text-center fw-bold">Roblox {{GAME_NAME}} Codes</h1>
<p id="lastUpdatedLabel" class="text-center small text-info mb-2">Last updated: {{MONTH DAY, YEAR}}</p>
<p id="testedTodayLabel" class="text-center small text-info mb-2">Tested: {{MONTH DAY, YEAR}}</p>
```

## 3) Required Data Attributes

- `data-game-id="{{GAME_ID}}"`
- `data-comment-storage="{{GAME_ID}}"`

## 4) JSON Meta Updates in data/game-codes.json

- Add/update `gameLastUpdated.{{GAME_ID}}`
- Add/update `gameLastTested.{{GAME_ID}}`
- Add page data block `{{GAME_ID}}` with `workingCodes` and `expiredCodes`
- Use empty arrays when verified codes are not available yet. Do not leave placeholder `x` values in the JSON.

## 5) Sitemap Updates

Add the page URL with:
- `<loc>https://gmecodes.com/games/{{GAME_SLUG}}.html</loc>`
- `<lastmod>{{YYYY-MM-DD}}</lastmod>`
- `<changefreq>daily</changefreq>`
- `<priority>0.9</priority>`
