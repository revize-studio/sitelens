export const REPO_URL = 'https://github.com/revize-studio/sitelens';

export const ISSUES_URL = `${REPO_URL}/issues`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const CONTACT_EMAIL = 'kontakt@revize.pl';
export const STUDIO_URL = 'https://revize.pl';
export const STUDIO_NAME = 'REVIZE STUDIO sp. z o.o.';
export const SAMPLE_REPORT_URL = '/raport/przykladowy-raport.pdf';
export const SAMPLE_BRANDBOOK_URL = '/brandbook/przykladowy-brandbook.pdf';

// The online audit switches on when all three are set at build time (Vercel environment variables).
// All three are public by design: the proxy address, the Turnstile site key and a PageSpeed Insights
// key restricted to sitelens.pl. Secrets stay in the Worker.
export const ONLINE_AUDIT = {
  proxyUrl: (import.meta.env.PUBLIC_PROXY_URL as string | undefined) ?? '',
  turnstileSiteKey: (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined) ?? '',
  psiKey: (import.meta.env.PUBLIC_PSI_KEY as string | undefined) ?? '',
};
export const onlineAuditReady = Boolean(ONLINE_AUDIT.proxyUrl && ONLINE_AUDIT.turnstileSiteKey && ONLINE_AUDIT.psiKey);
export const PSI_KEY_HOWTO_URL = 'https://developers.google.com/speed/docs/insights/v5/get-started';
