// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

const site = 'https://sitelens.pl';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'pl',
    locales: ['pl', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  // Subsets made by scripts/subset-fonts.mjs. Family names differ from tokens.css on purpose,
  // so its @font-face rules never trigger a second download; Astro adds metric-matched fallbacks.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Geist Variable',
      cssVariable: '--sl-font-face-sans',
      fallbacks: ['sans-serif'],
      options: {
        variants: [{ src: ['./src/fonts/Geist-subset.woff2'], weight: '400 700', style: 'normal' }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Geist Mono Variable',
      cssVariable: '--sl-font-face-mono',
      fallbacks: ['monospace'],
      options: {
        variants: [
          { src: ['./src/fonts/GeistMono-subset.woff2'], weight: '400 600', style: 'normal' },
        ],
      },
    },
  ],
});
