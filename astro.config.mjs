// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL || 'https://achtsamkeit-blog.vercel.app',
	output: 'static',
	adapter: vercel(),
	integrations: [mdx(), sitemap()],
});
