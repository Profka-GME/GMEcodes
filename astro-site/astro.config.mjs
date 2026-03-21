import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({

  site: 'https://gmecodes.com',
  output: 'static',
  trailingSlash: 'never', // This keeps it clean like /games/arsenal
  integrations: [sitemap()],
  build: {
    format: 'directory'
  }
});