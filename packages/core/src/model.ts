export type Mode = 'cli' | 'online';
export type Lang = 'pl' | 'en';
export type Category = 'performance' | 'seo' | 'accessibility' | 'security' | 'privacy' | 'content' | 'brand' | 'tech';
export type Severity = 'critical' | 'important' | 'minor' | 'suggestion' | 'pass';
export type Confidence = 'certain' | 'likely';
export type Stage = 'mvp' | '1.0' | '2.0';

/** Everything a check may need. A check whose data is missing in the current mode is skipped and reported. */
export type DataKey =
  | 'rawHtml'
  | 'rendered'
  | 'network'
  | 'cookies'
  | 'axe'
  | 'lighthouse'
  | 'crux'
  | 'tls'
  | 'dns'
  | 'robots'
  | 'sitemap'
  | 'hosts'
  | 'favicon';

export interface AuditInput {
  url: string;
  pages: number;
  lang: Lang;
}

export interface Redirect {
  from: string;
  to: string;
  status: number;
}

export interface TextResource {
  url: string;
  status: number;
  body: string;
  contentType?: string;
}

/** One of the http/https × www/no-www entry points and where it ends up. */
export interface HostProbe {
  url: string;
  finalUrl?: string;
  status?: number;
  redirects: Redirect[];
  error?: string;
}

export interface SitemapResource extends TextResource {
  urls: string[];
}

export interface TlsInfo {
  authorized: boolean;
  error?: string;
  protocol?: string;
  issuer?: string;
  subject?: string;
  altNames: string[];
  validFrom?: string;
  validTo?: string;
}

export interface SiteLevel {
  /** Where the site really lives after redirects, e.g. https://www.example.com */
  origin: string;
  finalUrl: string;
  hosts: HostProbe[];
  robotsTxt?: TextResource;
  sitemaps: SitemapResource[];
  favicon?: { url: string; status: number; contentType?: string };
  tls?: TlsInfo;
}

export interface Template {
  id: string;
  /** Path pattern such as /blog/* */
  pattern: string;
  pages: string[];
}

export interface NetworkEntry {
  url: string;
  type: string;
  status: number;
  /** Bytes over the wire, when the browser reports them */
  transferSize?: number;
  mimeType?: string;
  failed?: string;
}

export interface CookieEntry {
  name: string;
  domain: string;
  path: string;
  expires?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
}

export interface ConsoleEntry {
  type: 'error' | 'warning';
  text: string;
}

export interface AxeNode {
  target: string;
  html: string;
  summary?: string;
  /** Measured colours for color-contrast failures */
  contrast?: { ratio: number; expected: number; fg: string; bg: string };
}

export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  help: string;
  tags: string[];
  nodes: AxeNode[];
  /** Affected elements before the node list was trimmed for the snapshot */
  count?: number;
}

export interface AxeResults {
  violations: AxeViolation[];
  passes: string[];
}

export interface RenderedPage {
  html: string;
  network: NetworkEntry[];
  cookies: CookieEntry[];
  console: ConsoleEntry[];
  axe?: AxeResults;
}

export interface LighthouseMetrics {
  lcp?: number;
  cls?: number;
  tbt?: number;
  fcp?: number;
  speedIndex?: number;
  ttfb?: number;
}

export interface LighthouseItem {
  url: string;
  totalBytes?: number;
  wastedBytes?: number;
  wastedMs?: number;
}

/** The part of a Lighthouse result sitelens uses; the same shape comes from local runs and from PSI. */
export interface LighthouseResult {
  formFactor: 'mobile' | 'desktop';
  lighthouseVersion: string;
  /** 0–100 */
  performance?: number;
  metrics: LighthouseMetrics;
  lcpElement?: string;
  totalBytes?: number;
  resourceSummary: { type: string; bytes: number; count: number }[];
  oversizedImages: LighthouseItem[];
  legacyFormatImages: LighthouseItem[];
  renderBlocking: LighthouseItem[];
  uncompressed: LighthouseItem[];
}

export interface FieldMetric {
  p75: number;
  category: 'FAST' | 'AVERAGE' | 'SLOW';
}

export interface FieldMetrics {
  lcp?: FieldMetric;
  cls?: FieldMetric;
  inp?: FieldMetric;
}

export interface PageSnapshot {
  url: string;
  finalUrl: string;
  status: number;
  redirects: Redirect[];
  headers: Record<string, string>;
  contentType?: string;
  rawHtml: string;
  templateId: string;
  /** Clicks from the homepage */
  depth: number;
  rendered?: RenderedPage;
  lighthouse?: { mobile?: LighthouseResult; desktop?: LighthouseResult };
  crux?: FieldMetrics;
}

/** Internal links seen while crawling that were not audited in full, checked for broken targets. */
export interface LinkStatus {
  url: string;
  status: number;
  foundOn: string[];
  error?: string;
}

export interface SiteSnapshot {
  input: AuditInput;
  mode: Mode;
  startedAt: string;
  versions: Record<string, string>;
  available: DataKey[];
  site: SiteLevel;
  templates: Template[];
  pages: PageSnapshot[];
  links: LinkStatus[];
  /** Pages found in total while crawling, before the sample was taken */
  discovered: number;
}

export interface Finding {
  checkId: string;
  /** Which text of the advice card applies, e.g. "missing" or "duplicate"; "default" for single-text cards */
  variant: string;
  category: Category;
  severity: Severity;
  confidence: Confidence;
  /** Affected pages; empty when the finding concerns the whole site */
  pages: string[];
  templateIds: string[];
  /** Values the advice card puts into its text */
  evidence: Record<string, string | number>;
  /** One line for the technical appendix */
  details?: string;
}

export interface AuditContext {
  /** Number of pages the audit looked at, the denominator for "x of y pages" */
  pageCount: number;
}

export interface CheckDefinition {
  id: string;
  category: Category;
  stage: Stage;
  requires: DataKey[];
  run(site: SiteSnapshot, ctx: AuditContext): Finding[];
}
