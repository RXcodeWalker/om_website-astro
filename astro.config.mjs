// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { nowStalenessIntegration } from './src/integrations/nowStaleness.mjs';

export default defineConfig({
  site: 'https://beyondthebasics.me',
  integrations: [mdx(), sitemap(), nowStalenessIntegration()],
});
