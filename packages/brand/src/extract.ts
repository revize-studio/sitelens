import type { Box, RawButton, RawFontFace, RawLogo, RawPage, RawTextStyle, RawToken, RawUsage } from './raw';

export interface ExtractOptions {
  /** Source of a case-insensitive regular expression for logo hints in class, id, alt, src or aria-label */
  logoHint: string;
  /** Source of a case-insensitive regular expression for cookie banners and consent tools */
  consent: string;
  /** Source of a case-insensitive regular expression for the text of skip links */
  skipLink: string;
  /** How far down the page backgrounds are sampled, in CSS pixels */
  maxHeight: number;
  /** Distance between background sample points, in CSS pixels */
  sampleStep: number;
  scheme: 'light' | 'dark';
  toggle?: string;
  /** The page's real address when the document has another one, as in a srcdoc frame */
  pageUrl?: string;
}

/**
 * Reads everything the brandbook needs from a rendered page. The same function runs in the CLI
 * (page.evaluate) and online (on the document of the sandboxed frame), so it must not use anything
 * from outside its own body: page.evaluate sends only its source text.
 */
export function extractPage(
  options: ExtractOptions,
  doc: Document = document,
  win: Window & typeof globalThis = window,
): RawPage {
  const pageUrl = options.pageUrl ?? win.location.href;
  const origin = new URL(pageUrl).origin;
  const root = doc.documentElement;
  const body = doc.body ?? root;
  const css = (el: Element) => win.getComputedStyle(el);
  const scrollX = win.scrollX;
  const scrollY = win.scrollY;
  const pageHeight = Math.max(root.scrollHeight, body.scrollHeight);
  const sampledHeight = Math.min(pageHeight, options.maxHeight);
  const logoHint = new RegExp(options.logoHint, 'i');
  const consent = new RegExp(options.consent, 'i');
  const skipLink = new RegExp(options.skipLink, 'i');
  const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
  const textOf = (el: Element) => ((el as HTMLElement).innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const absolute = (url: string | null | undefined, base?: string | null) => {
    if (!url) return null;
    try {
      return new URL(url, base ?? options.pageUrl ?? doc.baseURI).href;
    } catch {
      return null;
    }
  };
  const boxOf = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return [r.left + scrollX, r.top + scrollY, r.width, r.height];
  };
  const visible = (el: Element, style: CSSStyleDeclaration) => {
    const r = el.getBoundingClientRect();
    // 1 px boxes are screen-reader-only text, and boxes above or left of the page are skip links
    if (r.width <= 1 || r.height <= 1) return false;
    if (r.bottom + scrollY <= 0 || r.right + scrollX <= 0) return false;
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) return false;
    // The usual ways of hiding text from the eye while keeping it for screen readers
    if (style.clip === 'rect(0px, 0px, 0px, 0px)' || style.clipPath === 'inset(50%)') return false;
    const check = (el as Element & { checkVisibility?: (o: object) => boolean }).checkVisibility;
    return check ? check.call(el, { opacityProperty: true, visibilityProperty: true }) : true;
  };
  const alphaOf = (color: string) => {
    if (color === 'transparent') return 0;
    const legacy = /^rgba\([^)]*,\s*([\d.]+)\s*\)$/.exec(color);
    if (legacy) return Number(legacy[1]);
    const modern = /\/\s*([\d.]+)(%?)\s*\)$/.exec(color);
    if (modern) return Number(modern[1]) / (modern[2] ? 100 : 1);
    return 1;
  };
  const add = (map: Record<string, number>, key: string, weight: number) => {
    if (key) map[key] = (map[key] ?? 0) + weight;
  };

  const usage: RawUsage = { background: {}, text: {}, border: {}, radius: {}, shadow: {}, font: {}, size: {}, weight: {} };
  const layers: { box: Box; color: string; media: boolean }[] = [];
  let glass = 0;
  let gradients = 0;

  for (const el of body.querySelectorAll('*')) {
    const style = css(el);
    if (!visible(el, style)) continue;
    const box = boxOf(el);
    const tag = el.tagName.toLowerCase();
    const media = ['img', 'video', 'canvas', 'picture', 'iframe', 'object', 'embed'].includes(tag);
    if (media) layers.push({ box, color: 'media', media: true });
    else if (alphaOf(style.backgroundColor) > 0) layers.push({ box, color: style.backgroundColor, media: false });
    if (/gradient\(/.test(style.backgroundImage)) gradients++;
    const backdrop = style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter');
    if (backdrop && backdrop !== 'none') glass++;

    let ownText = 0;
    for (const node of el.childNodes) if (node.nodeType === 3) ownText += (node.textContent ?? '').trim().length;
    if (ownText) {
      add(usage.text, style.color, ownText);
      add(usage.font, style.fontFamily, ownText);
      add(usage.size, style.fontSize, ownText);
      add(usage.weight, style.fontWeight, ownText);
    }
    const sides: [string, string, string, number][] = [
      [style.borderTopWidth, style.borderTopStyle, style.borderTopColor, box[2]],
      [style.borderBottomWidth, style.borderBottomStyle, style.borderBottomColor, box[2]],
      [style.borderLeftWidth, style.borderLeftStyle, style.borderLeftColor, box[3]],
      [style.borderRightWidth, style.borderRightStyle, style.borderRightColor, box[3]],
    ];
    let framed = media || alphaOf(style.backgroundColor) > 0 || style.boxShadow !== 'none';
    for (const [width, kind, color, length] of sides)
      if (parseFloat(width) > 0 && kind !== 'none' && alphaOf(color) > 0) {
        add(usage.border, color, length);
        framed = true;
      }
    // Radii and shadows only count on boxes a visitor can see the edges of
    if (framed && style.borderRadius !== '0px') add(usage.radius, style.borderRadius, 1);
    if (style.boxShadow !== 'none') add(usage.shadow, style.boxShadow, 1);
  }

  // The visible background at each grid point, approximated by document order
  const width = Math.max(root.clientWidth, 1);
  for (let y = options.sampleStep / 2; y < sampledHeight; y += options.sampleStep)
    for (let x = options.sampleStep / 2; x < width; x += options.sampleStep) {
      let stack: string[] = [];
      for (const layer of layers) {
        const [lx, ly, lw, lh] = layer.box;
        if (x < lx || x >= lx + lw || y < ly || y >= ly + lh) continue;
        if (layer.media || alphaOf(layer.color) >= 0.999) stack = [layer.color];
        else stack.push(layer.color);
      }
      if (stack[0] !== 'media') add(usage.background, stack.length ? stack.join('|') : 'base', 1);
    }

  const tokens = new Map<string, RawToken>();
  const themeSelectors = new Set<string>();
  let darkMedia = false;
  const fontFaceRules: RawFontFace[] = [];
  const rootSelector = /(^|[\s,>~+(])(:root|html|body)(?![\w-])/;
  const themeLike = /^(\.[\w-]+|\[data-[\w-]+(=[^\]]+)?\])$/;
  const walk = (rules: CSSRuleList, sheetHref: string | null) => {
    for (const rule of rules) {
      if (rule instanceof win.CSSImportRule && rule.styleSheet) {
        try {
          walk(rule.styleSheet.cssRules, rule.styleSheet.href);
        } catch {
          // An imported sheet from another origin cannot be read either
        }
        continue;
      }
      if (rule instanceof win.CSSMediaRule && /prefers-color-scheme:\s*dark/.test(rule.conditionText)) darkMedia = true;
      if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) walk((rule as CSSGroupingRule).cssRules, sheetHref);
      if (rule instanceof win.CSSFontFaceRule) {
        const src = rule.style.getPropertyValue('src');
        fontFaceRules.push({
          family: rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim(),
          weight: rule.style.getPropertyValue('font-weight') || 'normal',
          style: rule.style.getPropertyValue('font-style') || 'normal',
          status: 'declared',
          sources: [...src.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)]
            .map((m) => absolute(m[1], sheetHref))
            .filter((u): u is string => Boolean(u)),
        });
      }
      if (!(rule instanceof win.CSSStyleRule)) continue;
      // Tailwind and others put the dark theme on a bare class or attribute set on <html>
      if (!rootSelector.test(rule.selectorText) && !themeLike.test(rule.selectorText.trim())) continue;
      let setsTokens = false;
      for (const name of rule.style) {
        if (!name.startsWith('--')) continue;
        setsTokens = true;
        if (!tokens.has(name)) tokens.set(name, { name, value: '', source: 'css' });
      }
      if (setsTokens && /dark|light|theme|mode|night|scheme/i.test(rule.selectorText)) themeSelectors.add(rule.selectorText);
    }
  };
  for (const sheet of doc.styleSheets) {
    try {
      walk(sheet.cssRules, sheet.href);
    } catch {
      // A stylesheet from another origin cannot be read; its tokens still show in the computed style below
    }
  }
  const rootStyle = css(root);
  const bodyStyle = css(body);
  // Chromium lists custom properties in the computed style, which also catches tokens from unreadable sheets
  for (const name of rootStyle)
    if (name.startsWith('--') && !tokens.has(name)) tokens.set(name, { name, value: '', source: 'computed' });
  for (const token of tokens.values())
    token.value = (rootStyle.getPropertyValue(token.name) || bodyStyle.getPropertyValue(token.name)).trim();

  const fontFaces: RawFontFace[] = [];
  for (const face of doc.fonts) {
    const family = face.family.replace(/["']/g, '').trim();
    const declared = fontFaceRules.find((r) => r.family === family && r.weight === face.weight);
    fontFaces.push({ family, weight: face.weight, style: face.style, status: face.status, sources: declared?.sources ?? [] });
  }
  for (const rule of fontFaceRules)
    if (!fontFaces.some((f) => f.family === rule.family && f.weight === rule.weight)) fontFaces.push(rule);

  const firstVisible = (selector: string, accept: (el: Element) => boolean = () => true) =>
    [...doc.querySelectorAll(selector)].find((el) => visible(el, css(el)) && accept(el));
  const textStyle = (el: Element | undefined): RawTextStyle | undefined => {
    if (!el) return undefined;
    const s = css(el);
    return {
      text: clip(textOf(el), 160),
      box: boxOf(el),
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      color: s.color,
      textTransform: s.textTransform,
    };
  };
  const longEnough = (el: Element) => textOf(el).length >= 40;
  const inChrome = (el: Element) => Boolean(el.closest('footer, nav, aside, [role="contentinfo"], [role="navigation"]'));
  // The style most headings of a level share, not the first one, which is often a small label in a demo
  const typical = (selector: string) => {
    const groups = new Map<string, Element[]>();
    for (const el of doc.querySelectorAll(selector)) {
      if (inChrome(el) || !visible(el, css(el)) || !textOf(el)) continue;
      const s = css(el);
      const key = `${s.fontFamily}|${s.fontSize}|${s.fontWeight}`;
      groups.set(key, [...(groups.get(key) ?? []), el]);
    }
    const best = [...groups.values()].sort(
      (a, b) => b.length - a.length || parseFloat(css(b[0]!).fontSize) - parseFloat(css(a[0]!).fontSize),
    )[0];
    return best?.[0];
  };
  const textStyles: RawPage['textStyles'] = {
    h1: textStyle(firstVisible('h1')),
    h2: textStyle(typical('h2')),
    h3: textStyle(typical('h3')),
    p: textStyle(firstVisible('main p', longEnough) ?? firstVisible('p', longEnough)),
    a: textStyle(
      firstVisible('main a[href], article a[href], section a[href]', (el) => !el.closest('nav') && textOf(el).length > 2),
    ),
  };

  const homePath = /^\/([a-z]{2}(-[a-z]{2})?\/?)?$/i;
  const isHomeLink = (link: Element | null) => {
    const href = absolute(link?.getAttribute('href'));
    if (!href) return false;
    const url = new URL(href);
    return url.origin === origin && homePath.test(url.pathname);
  };
  const areaOf = (el: Element): RawLogo['area'] =>
    el.closest('header, [role="banner"]')
      ? 'header'
      : el.closest('nav, [role="navigation"]')
        ? 'nav'
        : el.closest('footer, [role="contentinfo"]')
          ? 'footer'
          : el.closest('main')
            ? 'main'
            : 'other';
  const behind = (el: Element) => {
    const stack: string[] = [];
    for (let node = el.parentElement; node; node = node.parentElement) {
      const color = css(node).backgroundColor;
      if (alphaOf(color) <= 0) continue;
      stack.unshift(color);
      if (alphaOf(color) >= 0.999) break;
    }
    return stack;
  };
  const describe = (el: Element) =>
    [
      typeof el.className === 'string' ? el.className : (el.getAttribute('class') ?? ''),
      el.id,
      el.getAttribute('alt'),
      el.getAttribute('src'),
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
    ].join(' ');
  const SHAPES = 'path, rect, circle, ellipse, polygon, polyline, line, text, use, g';
  const svgSource = (svg: SVGSVGElement) => {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    // Fills often come from the page's stylesheet; written into the copy, the logo keeps its colours alone
    const originals = [...svg.querySelectorAll(SHAPES)];
    [...copy.querySelectorAll(SHAPES)].forEach((shape, i) => {
      const source = originals[i];
      if (!source) return;
      const s = css(source);
      if (s.fill && !s.fill.startsWith('url(')) shape.setAttribute('fill', s.fill);
      if (s.stroke && s.stroke !== 'none' && !s.stroke.startsWith('url(')) shape.setAttribute('stroke', s.stroke);
      if (s.opacity !== '1') shape.setAttribute('opacity', s.opacity);
    });
    // Sprites, gradients and masks often live in another <svg> on the page; the copy carries them along
    const defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const carried = new Set<string>();
    const carry = (node: Element) => {
      const refs: string[] = [];
      for (const el of [node, ...node.querySelectorAll('*')])
        for (const attr of el.attributes) {
          if (/^(xlink:)?href$/.test(attr.name) && attr.value.startsWith('#')) refs.push(attr.value.slice(1));
          for (const m of attr.value.matchAll(/url\(\s*["']?#([^"')]+)["']?\s*\)/g)) refs.push(m[1]!);
        }
      for (const id of refs) {
        const target = doc.getElementById(id);
        if (!target || carried.has(id) || svg.contains(target)) continue;
        carried.add(id);
        const clone = target.cloneNode(true) as Element;
        defs.appendChild(clone);
        carry(clone);
      }
    };
    carry(copy);
    if (defs.childNodes.length) copy.insertBefore(defs, copy.firstChild);
    // The copy is saved as a file people may open, so only drawing elements survive and links may
    // point only inside the file (or, for <image>, at an embedded picture)
    const allowed =
      /^(svg|g|defs|symbol|use|path|rect|circle|ellipse|line|polyline|polygon|text|tspan|textpath|title|desc|lineargradient|radialgradient|stop|pattern|clippath|mask|marker|image|style|filter|fe[a-z]+)$/;
    for (const el of [...copy.querySelectorAll('*')].reverse()) {
      const name = el.tagName.toLowerCase();
      if (name === 'a') el.replaceWith(...el.childNodes);
      else if (!allowed.test(name)) el.remove();
    }
    for (const el of [copy, ...copy.querySelectorAll('*')]) {
      for (const attr of [...el.attributes]) {
        // Browsers ignore tabs, newlines and other control characters inside a URL scheme
        const value = [...attr.value].filter((ch) => ch.charCodeAt(0) > 32).join('').toLowerCase();
        const link = /(^|:)href$/i.test(attr.name);
        const embedded = el.tagName.toLowerCase() === 'image' && /^data:image\/(png|jpe?g|gif|webp);/.test(value);
        if (/^on/i.test(attr.name) || /(javascript|vbscript):/.test(value) || (link && !value.startsWith('#') && !embedded))
          el.removeAttribute(attr.name);
      }
      if (el.tagName.toLowerCase() === 'style') el.textContent = (el.textContent ?? '').replace(/@import[^;]*;?/gi, '');
    }
    // Inline SVG in HTML needs no namespace, but the same markup as a file or an image does
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (/xlink:/.test(copy.innerHTML)) copy.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    const s = css(svg);
    if (!copy.getAttribute('color') && s.color) copy.setAttribute('color', s.color);
    return clip(copy.outerHTML, 200_000);
  };
  const svgFills = (svg: Element) => {
    const fills: Record<string, number> = {};
    for (const shape of svg.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line, text, use')) {
      // Masks and clip paths are drawn in black and white to cut shapes, not as colours of the logo
      if (shape.closest('mask, clipPath, defs, pattern, marker')) continue;
      const s = css(shape);
      let opacity = 1;
      for (let node: Element | null = shape; node && node !== svg.parentElement; node = node.parentElement)
        opacity *= Number(css(node).opacity);
      // Faint shapes are shadows and glows, not colours of the mark
      if (s.display === 'none' || s.visibility === 'hidden' || opacity < 0.2) continue;
      const r = shape.getBoundingClientRect();
      const area = Math.max(r.width * r.height, 1);
      if (s.fill && s.fill !== 'none' && !s.fill.startsWith('url(') && Number(s.fillOpacity) >= 0.2) add(fills, s.fill, area);
      if (s.stroke && s.stroke !== 'none' && !s.stroke.startsWith('url(') && parseFloat(s.strokeWidth) > 0)
        add(fills, s.stroke, area * 0.2);
    }
    return fills;
  };

  const logoElements = new Set<Element>();
  const consider = (el: Element | null) => {
    if (!el) return;
    const tag = el.tagName.toLowerCase();
    if (tag === 'img' || tag === 'svg') {
      if (!el.closest('svg') || el === el.closest('svg')) logoElements.add(el);
    } else {
      const inner = el.querySelector('img, svg');
      if (inner) logoElements.add(inner);
      else if (/url\(/.test(css(el).backgroundImage)) logoElements.add(el);
    }
  };
  for (const el of doc.querySelectorAll('[class*="logo" i], [id*="logo" i], [alt*="logo" i], [aria-label*="logo" i]'))
    consider(el);
  for (const link of doc.querySelectorAll('a[href]')) if (isHomeLink(link)) consider(link);
  for (const el of doc.querySelectorAll('header img, header svg, nav img, nav svg, footer img, footer svg')) {
    if (logoHint.test(describe(el)) || logoHint.test(describe(el.closest('a') ?? el))) consider(el);
  }

  const logos: RawLogo[] = [];
  for (const el of logoElements) {
    const style = css(el);
    const shown = visible(el, style);
    const tag = el.tagName.toLowerCase();
    const link = el.closest('a');
    const hint = logoHint.test(describe(el)) || (link ? logoHint.test(describe(link)) : false);
    // A hidden logo is usually the variant for the other theme, worth keeping when it says it is a logo
    if (!shown && !hint && !isHomeLink(link)) continue;
    const box = boxOf(el);
    if (shown && (box[2] < 8 || box[3] < 8 || box[2] > 900)) continue;
    logos.push({
      kind: tag === 'img' ? 'img' : tag === 'svg' ? 'svg' : 'css',
      src:
        tag === 'img'
          ? absolute((el as HTMLImageElement).currentSrc || el.getAttribute('src'))
          : tag === 'svg'
            ? null
            : absolute(/url\(\s*["']?([^"')]+)["']?\s*\)/.exec(style.backgroundImage)?.[1]),
      svg: tag === 'svg' ? svgSource(el as SVGSVGElement) : null,
      alt: el.getAttribute('alt'),
      label: el.getAttribute('aria-label') ?? link?.getAttribute('aria-label') ?? el.querySelector('title')?.textContent ?? null,
      hint,
      visible: shown,
      area: areaOf(el),
      inHomeLink: isHomeLink(link),
      box,
      natural:
        tag === 'img' && (el as HTMLImageElement).naturalWidth
          ? [(el as HTMLImageElement).naturalWidth, (el as HTMLImageElement).naturalHeight]
          : tag === 'svg' && (el as SVGSVGElement).viewBox?.baseVal?.width
            ? [(el as SVGSVGElement).viewBox.baseVal.width, (el as SVGSVGElement).viewBox.baseVal.height]
            : null,
      fills: tag === 'svg' ? svgFills(el) : {},
      behind: behind(el),
    });
    if (logos.length >= 12) break;
  }

  const buttons: RawButton[] = [];
  for (const el of doc.querySelectorAll('button, a[href], [role="button"], input[type="submit"], input[type="button"]')) {
    const s = css(el);
    if (!visible(el, s)) continue;
    const text = clip(el instanceof win.HTMLInputElement ? el.value : textOf(el), 60);
    if (text.length < 2) continue;
    if (el.getAttribute('href')?.startsWith('#') && skipLink.test(text)) continue;
    const bordered = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && alphaOf(s.borderTopColor) > 0;
    const filled = alphaOf(s.backgroundColor) > 0.1 || /gradient\(/.test(s.backgroundImage);
    const roomy = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight) >= 16;
    const emphasis =
      (filled ? 3 : 0) + (bordered ? 1.5 : 0) + (s.boxShadow !== 'none' ? 1 : 0) + (roomy ? 1 : 0) + (s.borderRadius !== '0px' ? 0.5 : 0);
    // A plain text link is not a button, however it is styled otherwise
    if (el.tagName.toLowerCase() === 'a' && !filled && !bordered) continue;
    if (emphasis < 2) continue;
    buttons.push({
      text,
      box: boxOf(el),
      emphasis,
      inNav: Boolean(el.closest('nav, [role="navigation"]')),
      inHeader: Boolean(el.closest('header, [role="banner"]')),
      isTab: Boolean(el.closest('[role="tablist"]')) || el.getAttribute('role') === 'tab',
      inConsent: (() => {
        for (let node: Element | null = el; node && node !== body; node = node.parentElement)
          if (consent.test(`${describe(node)} ${node.getAttribute('aria-describedby') ?? ''}`)) return true;
        return false;
      })(),
      style: {
        background: s.backgroundColor,
        backgroundImage: s.backgroundImage,
        color: s.color,
        borderWidth: s.borderTopWidth,
        borderStyle: s.borderTopStyle,
        borderColor: s.borderTopColor,
        radius: s.borderTopLeftRadius,
        paddingBlock: s.paddingTop,
        paddingInline: s.paddingLeft,
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        letterSpacing: s.letterSpacing,
        textTransform: s.textTransform,
        shadow: s.boxShadow,
      },
    });
    if (buttons.length >= 24) break;
  }

  const navElement =
    firstVisible('header nav, [role="banner"] nav') ?? firstVisible('nav, [role="navigation"]') ?? firstVisible('header');
  const nav = navElement
    ? {
        box: boxOf(navElement.closest('header') ?? navElement),
        links: [...navElement.querySelectorAll('a[href]')]
          .filter((a) => visible(a, css(a)))
          .map((a) => ({ text: clip(textOf(a), 60), href: absolute(a.getAttribute('href')) ?? '' }))
          .filter((l) => l.href)
          .slice(0, 30),
      }
    : null;
  const siteLinks = [
    ...new Set(
      [...doc.querySelectorAll('header a[href], nav a[href], footer a[href], [role="navigation"] a[href]')]
        .map((a) => absolute(a.getAttribute('href')))
        .filter((href): href is string => Boolean(href && new URL(href).origin === origin)),
    ),
  ].slice(0, 60);

  const meta = (name: string) =>
    doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute('content')?.trim() || null;
  let organization: RawPage['meta']['organization'] = null;
  const findOrganization = (node: unknown): void => {
    if (organization || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(findOrganization);
    const item = node as Record<string, unknown>;
    const types = ([] as unknown[]).concat(item['@type'] ?? []).map(String);
    if (types.some((t) => /Organization|Corporation|LocalBusiness|Brand/.test(t))) {
      const logo = item.logo;
      const logoUrl = typeof logo === 'string' ? logo : (logo as Record<string, unknown> | undefined)?.url;
      organization = { name: typeof item.name === 'string' ? item.name : null, logo: absolute(typeof logoUrl === 'string' ? logoUrl : null) };
      return;
    }
    for (const value of Object.values(item)) findOrganization(value);
  };
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      findOrganization(JSON.parse(script.textContent ?? ''));
    } catch {
      // Broken structured data is the site's problem; the logo is looked for elsewhere too
    }
  }

  return {
    url: pageUrl,
    viewport: { width: win.innerWidth, height: win.innerHeight },
    scheme: options.scheme,
    ...(options.toggle ? { toggle: options.toggle } : {}),
    meta: {
      title: doc.title.trim(),
      description: meta('description'),
      lang: root.getAttribute('lang') ?? '',
      themeColors: [...doc.querySelectorAll('meta[name="theme-color"]')].map((m) => ({
        content: m.getAttribute('content') ?? '',
        media: m.getAttribute('media'),
      })),
      ogImage: absolute(meta('og:image')),
      ogTitle: meta('og:title'),
      siteName: meta('og:site_name') ?? meta('application-name'),
      icons: [...doc.querySelectorAll('link[rel~="icon" i], link[rel="apple-touch-icon" i], link[rel="mask-icon" i]')].map(
        (l) => ({
          rel: l.getAttribute('rel') ?? '',
          href: absolute(l.getAttribute('href')) ?? '',
          sizes: l.getAttribute('sizes'),
          type: l.getAttribute('type'),
        }),
      ),
      manifest: absolute(doc.querySelector('link[rel="manifest"]')?.getAttribute('href')),
      organization,
    },
    base: {
      htmlBackground: rootStyle.backgroundColor,
      bodyBackground: bodyStyle.backgroundColor,
      color: bodyStyle.color,
      colorScheme: rootStyle.colorScheme,
    },
    tokens: [...tokens.values()].filter((t) => t.value),
    themeSelectors: [...themeSelectors].slice(0, 20),
    darkMedia,
    usage,
    textStyles,
    fontFaces,
    logos,
    buttons,
    nav,
    siteLinks,
    texts: {
      headings: [...doc.querySelectorAll('h1, h2, h3')]
        .filter((h) => !inChrome(h) && visible(h, css(h)))
        .map((h) => ({ level: Number(h.tagName[1]), text: clip(textOf(h), 160), transform: css(h).textTransform }))
        .filter((h) => h.text)
        .slice(0, 24),
      paragraphs: [...doc.querySelectorAll('p')]
        .filter((p) => visible(p, css(p)) && longEnough(p))
        .map((p) => clip(textOf(p), 600))
        .slice(0, 16),
    },
    effects: { glass, gradients },
    bodyTextLength: textOf(body).length,
    pageHeight,
  };
}
