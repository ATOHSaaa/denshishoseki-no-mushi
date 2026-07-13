import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import { remarkProductEmbed } from './src/plugins/remark-product-embed.ts';

/** XMLサイトマップから除外するパス */
function isExcludedFromSitemap(pathname) {
  if (pathname.includes('404')) return true;
  return false;
}

export default defineConfig({
  site: 'https://densho.tadeku.net',
  base: '/',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !isExcludedFromSitemap(new URL(page).pathname),
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        if (pathname === '/') {
          return { ...item, changefreq: 'weekly', priority: 1 };
        }
        if (pathname === '/posts/') {
          return { ...item, changefreq: 'weekly', priority: 0.9 };
        }
        if (pathname.startsWith('/category/')) {
          return { ...item, changefreq: 'weekly', priority: 0.7 };
        }
        if (pathname === '/about/' || pathname === '/privacy/' || pathname === '/contact/') {
          return { ...item, changefreq: 'yearly', priority: 0.5 };
        }
        if (pathname.startsWith('/posts/') && pathname !== '/posts/') {
          return { ...item, changefreq: 'monthly', priority: 0.8 };
        }
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
    remarkPlugins: [remarkProductEmbed],
  },
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      cssMinify: true,
    },
  },
});
