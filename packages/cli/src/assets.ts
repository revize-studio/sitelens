import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ReportAssets } from '@sitelens/report';

// The published package carries the fonts and logo in dist/assets (copied by build.mjs);
// when run from the repository they come straight from their source folders.
function assetPath(name: string, repoPath: string): string {
  const bundled = fileURLToPath(new URL(`./assets/${name}`, import.meta.url));
  if (existsSync(bundled)) return bundled;
  return fileURLToPath(new URL(`../../../${repoPath}`, import.meta.url));
}

const font = (name: string, repoPath = `public/fonts/${name}`) =>
  `data:font/woff2;base64,${readFileSync(assetPath(name, repoPath)).toString('base64')}`;

/** Geist and Geist Mono, which set the brandbook where the brand's own typefaces cannot be embedded. */
export function brandbookFonts(): { fontSans: string; fontMono: string } {
  return {
    fontSans: font('Geist-Variable.woff2', 'packages/report/fonts/Geist-Variable.woff2'),
    fontMono: font('GeistMono-Variable.woff2'),
  };
}

export function reportAssets(): ReportAssets {
  return {
    logoSvg: readFileSync(assetPath('sitelens-logo.svg', 'public/logo/sitelens-logo.svg'), 'utf8').replace(/<\?xml[^>]*>/, ''),
    fontSans: font('InstrumentSans-Variable.woff2'),
    fontMono: font('GeistMono-Variable.woff2'),
  };
}
