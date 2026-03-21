import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../..');

function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const raw = readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function clean(value) {
  return String(value || '').trim();
}

function normalizeDisplayName(name) {
  return clean(name).replace(/\s*\(Roblox\)\s*/gi, '').replace(/\s+/g, ' ').trim();
}

function pageSlugFromEntry(page) {
  return path.posix.basename(clean(page), '.html');
}

// 1. Read and parse the main games list
const gamesData = fs.readFileSync('./public/data/games.json', 'utf-8').trim();
const gamesListing = JSON.parse(gamesData);

// 2. Read and parse the specific game codes database
const codesData = fs.readFileSync('./public/data/game-codes.json', 'utf-8').trim();
const gamesDatabase = JSON.parse(codesData);

const gameCodesMeta = gamesDatabase && typeof gamesDatabase._meta === 'object' ? gamesDatabase._meta : {};

// Generate GAME_PAGE_DETAILS from gamesListing
const GAME_PAGE_DETAILS = gamesListing.map((entry) => {
  const slug = entry.slug || pageSlugFromEntry(entry.page);
  const canonical = `https://gmecodes.com/${entry.page}`;
  const ogImage = `https://gmecodes.com/${entry.picture}`;
  const heroImage = `../${entry.picture}`;
  const displayName = normalizeDisplayName(entry.name);
  
  return {
    slug,
    codeKey: entry.codeKey || slug,
    commentStorage: entry.codeKey || slug,
    gameId: entry.codeKey || slug,
    title: entry.title || `Roblox ${displayName} Codes | Working and Expired Codes | GMEcodes`,
    metaDescription: entry.metaDescription,
    ogDescription: entry.ogDescription,
    canonical,
    ogImage,
    heroImage,
    heroAlt: displayName,
    heading: `Roblox ${displayName} Codes`,
    sectionHeading: `Roblox ${displayName} Codes`,
    intro: entry.intro,
    redeemHeading: `How to Redeem Roblox ${displayName} Codes?`,
    redeemLead: `To redeem Roblox ${displayName} codes, follow these steps:`,
    redeemSteps: entry.redeemSteps || [],
    mainStyle: entry.mainStyle
  };
});

function withDates(game) {
  const gameEntry = gamesDatabase && typeof gamesDatabase[game.codeKey] === 'object' ? gamesDatabase[game.codeKey] : {};
  const lastUpdated = clean(gameEntry.lastUpdated) || clean(gameCodesMeta.gameLastUpdated && gameCodesMeta.gameLastUpdated[game.codeKey]) || clean(gameCodesMeta.lastUpdated);
  const lastTested = clean(gameEntry.lastTested) || clean(gameCodesMeta.gameLastTested && gameCodesMeta.gameLastTested[game.codeKey]) || clean(gameCodesMeta.lastTested) || lastUpdated;
  return {
    ...game,
    lastUpdated,
    lastTested
  };
}

export function getGamePages() {
  return GAME_PAGE_DETAILS.map(withDates);
}

export function getGamePage(slug) {
  const normalized = clean(slug).toLowerCase();
  return getGamePages().find((game) => game.slug.toLowerCase() === normalized) || null;
}

export function getGameCodesMeta() {
  return { ...gameCodesMeta };
}

export function getHomeGames() {
  return gamesListing.map((entry) => {
    const slug = pageSlugFromEntry(entry.page);
    const gamePage = getGamePage(slug);
    const displayName = normalizeDisplayName(entry.name);
    return {
      slug,
      name: displayName,
      page: clean(entry.page),
      image: clean(entry.image),
      summary: 'Working codes, expired codes, and redeem steps for ' + displayName + '.',
      title: displayName + ' Codes',
      codeKey: gamePage ? gamePage.codeKey : slug.toLowerCase()
    };
  });
}
