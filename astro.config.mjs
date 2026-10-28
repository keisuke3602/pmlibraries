import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pmlibraries.com',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
