import type { APIRoute } from 'astro';
import { languages, routes } from '../i18n';

export const GET: APIRoute = ({ site }) => {
  const abs = (path: string) => new URL(path, site).href;
  const urls = Object.values(routes).flatMap((page) =>
    languages.map(
      (lang) => `  <url>
    <loc>${abs(page[lang])}</loc>
${languages.map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt}" href="${abs(page[alt])}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(page.pl)}"/>
  </url>`,
    ),
  );
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
