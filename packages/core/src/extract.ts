import { load, type CheerioAPI } from 'cheerio/slim';
import type { PageSnapshot } from './model';
import { normalizeUrl } from './url';

export interface ImageFact {
  src: string;
  alt: string | null;
  /** alt="", role=presentation/none or aria-hidden: meant to be skipped by screen readers */
  decorative: boolean;
}

export interface LinkFact {
  href: string;
  text: string;
}

export interface FormFact {
  action: string;
  method: string;
  hasPassword: boolean;
}

/** What sitelens reads from a page's HTML; checks work on these facts, not on markup. */
export interface PageFacts {
  lang: string;
  title: string | null;
  titleCount: number;
  description: string | null;
  descriptionCount: number;
  canonical: string | null;
  robots: string;
  viewport: string | null;
  headings: { level: number; text: string }[];
  images: ImageFact[];
  links: LinkFact[];
  /** Text of buttons, which some sites built in the browser use for navigation instead of links */
  buttons: string[];
  telLinks: number;
  mailtoLinks: number;
  forms: FormFact[];
  meta: Record<string, string>;
  icons: string[];
  generator: string | null;
  insecureResources: string[];
  textLength: number;
  /** Phone numbers and e-mail addresses written as plain text, not as tel:/mailto: links */
  plainPhones: number;
  plainEmails: number;
}

const serverCache = new WeakMap<PageSnapshot, PageFacts>();
const visibleCache = new WeakMap<PageSnapshot, PageFacts>();

function cached(cache: WeakMap<PageSnapshot, PageFacts>, page: PageSnapshot, html: string): PageFacts {
  let facts = cache.get(page);
  if (!facts) {
    facts = extractFacts(html, page.finalUrl);
    cache.set(page, facts);
  }
  return facts;
}

/** Facts from the HTML the server sent: what link previews and crawlers that do not run JavaScript see. */
export function factsOf(page: PageSnapshot): PageFacts {
  return cached(serverCache, page, page.rawHtml);
}

/** Facts from what a visitor sees: the page after its scripts ran when it was rendered, otherwise the server HTML. */
export function visibleFactsOf(page: PageSnapshot): PageFacts {
  return page.rendered?.html ? cached(visibleCache, page, page.rendered.html) : factsOf(page);
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();
// Polish and international formats: +48 600 700 800, 600-700-800, (22) 123 45 67
// Polish numbers: mobile 600 100 200, landline (22) 123 45 67, either with an optional +48 or 0048
const PHONE =
  /(?<![\d/.-])(?:(?:\+|00)48[\s-]?)?(?:\d{3}[\s-]?\d{3}[\s-]?\d{3}|\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})(?![\d/.-])/g;
// Company numbers have the same shape as phone numbers but come right after their label
const COMPANY_ID = /(NIP|REGON|KRS|PESEL|BDO)[\s:.]*$/i;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

function baseUrl($: CheerioAPI, pageUrl: string): string {
  const base = $('base[href]').attr('href');
  if (!base) return pageUrl;
  try {
    return new URL(base, pageUrl).toString();
  } catch {
    return pageUrl;
  }
}

export function extractFacts(html: string, pageUrl: string): PageFacts {
  const $ = load(html);
  const base = baseUrl($, pageUrl);
  const absolute = (value: string | undefined): string | null => {
    if (!value) return null;
    try {
      return new URL(value.trim(), base).toString();
    } catch {
      return null;
    }
  };
  const meta: Record<string, string> = {};
  $('meta[property], meta[name]').each((_, el) => {
    const key = ($(el).attr('property') ?? $(el).attr('name') ?? '').toLowerCase();
    const content = $(el).attr('content');
    if (key && content !== undefined && !(key in meta)) meta[key] = content.trim();
  });

  const titles = $('head title');
  const descriptions = $('meta[name="description" i]');
  const robots = $('meta[name="robots" i], meta[name="googlebot" i]')
    .map((_, el) => $(el).attr('content') ?? '')
    .get()
    .join(',')
    .toLowerCase();

  const headings = $('h1, h2, h3, h4, h5, h6')
    .map((_, el) => ({ level: Number(el.tagName.slice(1)), text: squash($(el).text()) }))
    .get();

  const images = $('img')
    .map((_, el) => {
      const img = $(el);
      const alt = img.attr('alt');
      const role = (img.attr('role') ?? '').toLowerCase();
      return {
        src: absolute(img.attr('src') ?? img.attr('data-src')) ?? '',
        alt: alt === undefined ? null : alt,
        decorative: alt === '' || role === 'presentation' || role === 'none' || img.attr('aria-hidden') === 'true',
      };
    })
    .get();

  const links: LinkFact[] = [];
  let telLinks = 0;
  let mailtoLinks = 0;
  $('a[href]').each((_, el) => {
    const raw = ($(el).attr('href') ?? '').trim();
    if (/^tel:/i.test(raw)) telLinks++;
    else if (/^mailto:/i.test(raw)) mailtoLinks++;
    const href = normalizeUrl(raw, base);
    if (href) links.push({ href, text: squash($(el).text()) || ($(el).attr('aria-label') ?? '') });
  });

  const forms = $('form')
    .map((_, el) => ({
      action: absolute($(el).attr('action') || pageUrl) ?? pageUrl,
      method: ($(el).attr('method') ?? 'get').toLowerCase(),
      hasPassword: $(el).find('input[type="password" i]').length > 0,
    }))
    .get();

  const icons = $('link[rel]')
    .filter((_, el) => /(^|\s)(icon|apple-touch-icon)(\s|$)/i.test($(el).attr('rel') ?? ''))
    .map((_, el) => absolute($(el).attr('href')))
    .get()
    .filter((href): href is string => Boolean(href));

  const insecureResources = $(
    'img[src], script[src], iframe[src], source[src], video[src], audio[src], link[rel~="stylesheet"][href]',
  )
    .map((_, el) => absolute($(el).attr('src') ?? $(el).attr('href')))
    .get()
    .filter((url): url is string => typeof url === 'string' && url.startsWith('http:'));

  const body = $('body').clone();
  body.find('script, style, noscript, template, svg').remove();
  body.find('a[href^="tel:" i], a[href^="mailto:" i]').remove();
  const text = squash(body.text());

  return {
    lang: ($('html').attr('lang') ?? '').trim(),
    title: titles.length ? squash(titles.first().text()) : null,
    titleCount: titles.length,
    description: descriptions.length ? squash(descriptions.first().attr('content') ?? '') : null,
    descriptionCount: descriptions.length,
    canonical: absolute($('link[rel="canonical" i]').first().attr('href')),
    robots,
    viewport: $('meta[name="viewport" i]').attr('content') ?? null,
    headings,
    images,
    links,
    buttons: $('button, [role="button"], [role="link"]')
      .map((_, el) => squash($(el).text()))
      .get()
      .filter(Boolean),
    telLinks,
    mailtoLinks,
    forms,
    meta,
    icons,
    generator: meta.generator ?? null,
    insecureResources: [...new Set(insecureResources)],
    textLength: text.length,
    plainPhones: [...text.matchAll(PHONE)].filter(
      (m) => !COMPANY_ID.test(text.slice(Math.max(0, m.index - 12), m.index)),
    ).length,
    plainEmails: (text.match(EMAIL) ?? []).length,
  };
}
