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

const gamesDatabase = readJson('data/game-codes.json');
const gamesListing = readJson('data/games.json');
const gameCodesMeta = gamesDatabase && typeof gamesDatabase._meta === 'object' ? gamesDatabase._meta : {};

const GAME_PAGE_DETAILS = [
  {
    slug: '99nights',
    codeKey: '99nights',
    commentStorage: '99nights',
    gameId: '99nights',
    title: '99 Nights in the Forest Codes | Working and Expired Codes | GMEcodes',
    metaDescription: 'Updated 99 Nights in the Forest codes with active rewards, expired codes, and redeem instructions.',
    ogDescription: 'Find working and expired 99 Nights in the Forest codes with regular updates.',
    canonical: 'https://gmecodes.com/games/99nights.html',
    ogImage: 'https://gmecodes.com/images/pictures/99nights.jpg',
    heroImage: '../images/pictures/99nights.jpg',
    heroAlt: '99 Nights in the Forest',
    heading: 'Roblox 99 Nights in the Forest Codes',
    sectionHeading: 'Roblox 99 Nights in the Forest Codes',
    intro: '99 Nights in the Forest is a Roblox survival-horror game focused on base building, resource gathering, and making it through each dangerous night. Codes usually reward Gems and other progression items, so this page keeps the current working and expired 99 Nights in the Forest codes together with redeem instructions.',
    redeemHeading: 'How to Redeem Roblox 99 Nights in the Forest Codes?',
    redeemLead: 'To redeem Roblox 99 Nights in the Forest codes, follow these steps:',
    redeemSteps: [
      'Launch the 99 Nights in the Forest game on Roblox',
      'Click the Gems button on the bottom left and go to the Codes option.',
      'Enter the code you want to redeem in the text box.',
      'Click the "Submit" button to claim your reward.',
      'If the code is valid and active, you will receive a confirmation message and the reward will be added to your account.'
    ],
    mainStyle: 'background-color: rgb(82, 101, 134);'
  },
  {
    slug: 'rivals',
    codeKey: 'rivals',
    commentStorage: 'rivals',
    gameId: 'rivals',
    title: 'Roblox Rivals Codes | Working and Expired Codes | GMEcodes',
    metaDescription: 'Updated Roblox Rivals codes list with active working codes, expired codes, and quick redeem steps.',
    ogDescription: 'See working and expired Roblox Rivals codes with frequent updates.',
    canonical: 'https://gmecodes.com/games/rivals.html',
    ogImage: 'https://gmecodes.com/images/pictures/rivals.jpg',
    heroImage: '../images/pictures/rivals.jpg',
    heroAlt: 'Rivals',
    heading: 'Roblox Rivals Codes',
    sectionHeading: 'Roblox Rivals Codes',
    intro: 'Roblox Rivals is a competitive shooter built around quick 1v1 duels and 5v5 team matches. Developers occasionally release Rivals codes for free keys, wraps, and cosmetic rewards, so this page tracks the latest working and expired codes in one place.',
    redeemHeading: 'How to Redeem Roblox Rivals Codes?',
    redeemLead: 'To redeem Roblox Rivals codes, follow these steps:',
    redeemSteps: [
      'Go to the Roblox Rivals game page on Roblox.',
      'Click on the "Rewards" button, on the bottom of the screen.',
      'Enter the code you want to redeem in the text box.',
      'Click the "Redeem" button to claim your reward.',
      'If the code is valid and active, you will receive a confirmation message and the reward will be added to your account.'
    ]
  },
  {
    slug: 'Arsenal',
    codeKey: 'arsenal',
    commentStorage: 'arsenal',
    gameId: 'arsenal',
    title: 'Roblox Arsenal Codes | Working and Expired Codes | GMEcodes',
    metaDescription: 'Latest Roblox Arsenal codes including currently working and expired codes, plus redeem steps.',
    ogDescription: 'See updated Roblox Arsenal working and expired codes in one place.',
    canonical: 'https://gmecodes.com/games/Arsenal.html',
    ogImage: 'https://gmecodes.com/images/pictures/Arsenal.jpg',
    heroImage: '../images/pictures/Arsenal.jpg',
    heroAlt: 'Arsenal',
    heading: 'Roblox Arsenal Codes',
    sectionHeading: 'Roblox Arsenal Codes',
    intro: 'Arsenal is a popular Roblox first-person shooter from ROLVe where players rotate through weapons in fast competitive matches. Arsenal codes are released by the developers for free announcers, skins, and other cosmetic rewards, so this page tracks both active and expired codes in one place.',
    redeemHeading: 'How to Redeem Roblox Arsenal Codes?',
    redeemLead: 'To redeem Roblox Arsenal codes, follow these steps:',
    redeemSteps: [
      'Open Arsenal on Roblox.',
      'Select the Gift Icon (Codes button).',
      'Enter the code you want to redeem in the text box.',
      'Click the "Redeem" button to claim your reward.',
      'If the code is valid and active, you will receive a confirmation message and the reward will be added to your account.'
    ],
    mainStyle: 'background-color: rgb(82, 101, 134);'
  },
  {
    slug: 'fishit',
    codeKey: 'fishit',
    commentStorage: 'fishit',
    gameId: 'fishit',
    title: 'Roblox Fish It Codes | Working and Expired Codes | GMEcodes',
    metaDescription: 'Updated Roblox Fish It codes with active rewards, expired codes, and quick redeem help.',
    ogDescription: 'Browse the latest working and expired Roblox Fish It codes.',
    canonical: 'https://gmecodes.com/games/fishit.html',
    ogImage: 'https://gmecodes.com/images/pictures/fishit.jpg',
    heroImage: '../images/pictures/fishit.jpg',
    heroAlt: 'Fish It',
    heading: 'Roblox Fish It Codes',
    sectionHeading: 'Roblox Fish It Codes',
    intro: 'Fish It is a Roblox fishing game where players unlock better gear, explore new areas, and chase rarer catches as they progress. Fish It codes usually give free rewards that help with progression, so this page keeps the latest working and expired codes alongside quick redeem steps.',
    redeemHeading: 'How to Redeem Roblox Fish It Codes?',
    redeemLead: 'To redeem Roblox Fish It codes, follow these steps:',
    redeemSteps: [
      'Open Fish It in Roblox',
      'Tap the Shop icon at the top of the screen',
      'Scroll all the way down',
      'Copy and paste one of the codes into the box and hit Redeem',
      'If the code is valid and active, you will receive a confirmation message and the reward will be added to your account.'
    ]
  },
  {
    slug: 'ReRangersX',
    codeKey: 'rerangers',
    commentStorage: 'rerangers',
    gameId: 'rerangers',
    title: 'Roblox Re:Rangers X Codes | Working and Expired Codes | GMEcodes',
    metaDescription: 'Updated Roblox Re:Rangers X codes with active rewards, expired codes, and redeem instructions.',
    ogDescription: 'See working and expired Roblox Re:Rangers X codes with frequent updates.',
    canonical: 'https://gmecodes.com/games/ReRangersX.html',
    ogImage: 'https://gmecodes.com/images/pictures/rerangers.jpg',
    heroImage: '../images/pictures/rerangers.jpg',
    heroAlt: 'Re:Rangers X',
    heading: 'Roblox Re:Rangers X Codes',
    sectionHeading: 'Roblox Re:Rangers X Codes',
    intro: 'Re:Rangers X is a Roblox tower-defense and gacha game where players build teams, reroll traits, and push through tougher stages. Re:Rangers X codes often reward Gems, Trait Rerolls, Soul Fragments, Gold, and other progression items, so this page keeps the current working and expired codes together with redeem steps.',
    redeemHeading: 'How to Redeem Roblox Re:Rangers X Codes?',
    redeemLead: 'To redeem Roblox Re:Rangers X codes, follow these steps:',
    redeemSteps: [
      'Open RE Rangers X in the Roblox app.',
      'Click the Code button on the left side of the screen.',
      'Enter the code you want to redeem in the text box.',
      'Click the "Redeem" button to claim your reward.',
      'If the code is valid and active, you will receive a confirmation message and the reward will be added to your account.'
    ]
  },
  {
    slug: 'bizarrelineage',
    codeKey: 'bizlineage',
    commentStorage: 'bizlineage',
    gameId: 'bizlineage',
    title: 'Roblox Bizarre Lineage Codes | Working and Expired Codes | GMEcodes',
    metaDescription: 'Updated Roblox Bizarre Lineage codes with active rewards, expired codes, and redeem instructions.',
    ogDescription: 'See working and expired Roblox Bizarre Lineage codes with frequent updates.',
    canonical: 'https://gmecodes.com/games/bizarrelineage.html',
    ogImage: 'https://gmecodes.com/images/pictures/bizarrelineage.jpg',
    heroImage: '../images/pictures/bizarrelineage.jpg',
    heroAlt: 'Bizarre Lineage',
    heading: 'Roblox Bizarre Lineage Codes',
    sectionHeading: 'Roblox Bizarre Lineage Codes',
    intro: 'Bizarre Lineage is a JoJo-inspired Roblox RPG focused on character builds, Stand progression, and difficult combat. Bizarre Lineage codes usually reward essences, reroll resources, and other progression items, so this page tracks the latest active and expired codes in one place.',
    redeemHeading: 'How to Redeem Roblox Bizarre Lineage Codes?',
    redeemLead: 'To redeem Roblox Bizarre Lineage codes, follow these steps:',
    redeemSteps: [
      'Join the Bizarre Collective group and Like the game.',
      'Open the game and open the Chat Box (top-left or press /).',
      'Enter the code you want to redeem in the text box.',
      'Press Enter to claim your reward.',
      'If the code is valid and active, you will receive a confirmation message and the reward will be added to your account.'
    ]
  },
  {
    slug: 'sailorpiece',
    codeKey: 'sailorpiece',
    commentStorage: 'sailorpiece',
    gameId: 'sailorpiece',
    title: 'Roblox Sailor Piece Codes | Working and Expired Codes | GMEcodes',
    metaDescription: 'Updated Roblox Sailor Piece codes with active rewards, expired codes, and redeem instructions.',
    ogDescription: 'Find working and expired Roblox Sailor Piece codes with regular updates.',
    canonical: 'https://gmecodes.com/games/sailorpiece.html',
    ogImage: 'https://gmecodes.com/images/pictures/sailorpiece.jpg',
    heroImage: '../images/pictures/sailorpiece.jpg',
    heroAlt: 'Sailor Piece',
    heading: 'Roblox Sailor Piece Codes',
    sectionHeading: 'Roblox Sailor Piece Codes',
    intro: 'Sailor Piece is a Roblox anime-inspired game where players explore, complete quests, and collect rewards. Codes usually reward gems and other in-game items, so this page keeps the current working and expired Sailor Piece codes together with redeem instructions.',
    redeemHeading: 'How to Redeem Roblox Sailor Piece Codes?',
    redeemLead: 'To redeem Roblox Sailor Piece codes, follow these steps:',
    redeemSteps: [
      'Launch the Sailor Piece game on Roblox',
      'Look for the Codes menu in-game.',
      'Enter the code you want to redeem in the text box.',
      'Click the "Redeem" or "Submit" button to claim your reward.',
      'If the code is valid and active, you will receive a confirmation message and the reward will be added to your account.'
    ]
  }
];

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
