import type { APIRoute } from 'astro';
import tokens from '../../../../public/brand/tokens.json';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: 'sitelens',
      short_name: 'sitelens',
      description: 'Audyt strony, który zrozumie każdy.',
      lang: 'pl',
      start_url: '/',
      display: 'browser',
      background_color: tokens.theme.light.bg,
      theme_color: tokens.theme.light.bg,
      icons: [
        { src: '/favicon/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/favicon/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/favicon/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
