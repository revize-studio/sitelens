import { load } from 'cheerio/slim';

export interface ParsedSitemap {
  kind: 'urlset' | 'index' | 'invalid';
  urls: string[];
}

/** Reads a sitemap or a sitemap index. Anything that is not one of the two counts as invalid. */
export function parseSitemap(xml: string): ParsedSitemap {
  const $ = load(xml, { xml: true });
  const locs = (selector: string) =>
    $(selector)
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

  if ($('urlset').length) return { kind: 'urlset', urls: locs('urlset > url > loc') };
  if ($('sitemapindex').length) return { kind: 'index', urls: locs('sitemapindex > sitemap > loc') };
  return { kind: 'invalid', urls: [] };
}
