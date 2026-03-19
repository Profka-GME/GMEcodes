import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const astroRoot = process.cwd();
const repoRoot = path.resolve(astroRoot, '..');
const publicDir = path.join(astroRoot, 'public');

const directoriesToCopy = [
  'css',
  'data',
  'html',
  'images',
  'javascipt'
];

const filesToCopy = [
  { from: path.join('seo', 'robots.txt'), to: 'robots.txt' },
  { from: path.join('seo', 'sitemap.xml'), to: 'sitemap.xml' }
];

async function copyDirectory(name) {
  const source = path.join(repoRoot, name);
  const destination = path.join(publicDir, name);
  await cp(source, destination, { recursive: true, force: true });
}

async function copyFileEntry(entry) {
  const source = path.join(repoRoot, entry.from);
  const destination = path.join(publicDir, entry.to);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { force: true });
}

await mkdir(publicDir, { recursive: true });
await Promise.all(directoriesToCopy.map(copyDirectory));
await Promise.all(filesToCopy.map(copyFileEntry));

console.log('Synced static assets into astro-site/public.');
