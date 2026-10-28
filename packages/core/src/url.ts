const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|gbraid|wbraid|msclkid|mc_cid|mc_eid|_hsenc|_hsmi|yclid)$/i;
const NON_PAGE_EXTENSIONS =
  /\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|pdf|zip|rar|7z|gz|tar|docx?|xlsx?|pptx?|odt|ods|mp[34]|m4a|wav|ogg|webm|mov|avi|woff2?|ttf|otf|eot|css|js|mjs|json|xml|txt|rss|atom|csv|exe|dmg|apk)$/i;

/**
 * Turns a link into the form used to tell pages apart: absolute, no fragment, lower-case host,
 * no default port, no tracking parameters and no trailing slash (except for the root).
 */
export function normalizeUrl(href: string, base?: string): string | null {
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443'))
    url.port = '';
  for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

/** www.example.com and example.com count as the same site. */
export function siteHost(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
}

export function isSameSite(url: string, origin: string): boolean {
  try {
    return siteHost(url) === siteHost(origin);
  } catch {
    return false;
  }
}

/** Links worth opening as pages: not images, documents, archives or code files. */
export function looksLikePage(url: string): boolean {
  return !NON_PAGE_EXTENSIONS.test(new URL(url).pathname);
}

export function pathOf(url: string): string {
  const { pathname, search } = new URL(url);
  return pathname + search;
}

export function isHomepage(url: string): boolean {
  const { pathname, search } = new URL(url);
  return (pathname === '/' || pathname === '') && !search;
}
