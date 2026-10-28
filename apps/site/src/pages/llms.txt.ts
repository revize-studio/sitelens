import type { APIRoute } from 'astro';
import { routes } from '../i18n';

export const GET: APIRoute = ({ site }) => {
  const abs = (path: string) => new URL(path, site).href;
  const body = `# sitelens

> Open source website audit (MIT). Checks performance, SEO, accessibility and security, and writes a PDF report in plain language for site owners. Runs online or as a CLI: \`npx sitelens https://example.com\`. A separate tool makes a brandbook from a website address: \`npx sitelens brand https://example.com\`.

## Pages

- [Home (Polish)](${abs(routes.home.pl)})
- [Home (English)](${abs(routes.home.en)})
- [Brandbook from a website address](${abs(routes.brandbook.en)})
- [Terminal guide for macOS, Windows and Linux](${abs(routes.terminal.en)})
- [Privacy policy](${abs(routes.privacy.en)})
- [Sample report (PDF, Polish)](${abs('/raport/przykladowy-raport.pdf')})
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
