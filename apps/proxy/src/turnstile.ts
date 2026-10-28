const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface Siteverify {
  success?: boolean;
  hostname?: string;
  metadata?: { result_with_testing_key?: boolean };
}

/**
 * Asks Cloudflare whether the Turnstile token from the page is genuine, unused and was solved on one of
 * our hostnames. Cloudflare's test keys accept any token, so their results count only when testing is on.
 */
export async function verifyTurnstile(
  token: string,
  settings: { secret: string; hostnames: string[]; testing: boolean },
  ip: string | null,
  fetcher: typeof fetch,
): Promise<boolean> {
  const form = new FormData();
  form.set('secret', settings.secret);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);
  const response = await fetcher(SITEVERIFY, { method: 'POST', body: form });
  if (!response.ok) return false;
  const result = (await response.json()) as Siteverify;
  if (result.success !== true) return false;
  if (result.metadata?.result_with_testing_key) return settings.testing;
  return settings.testing || settings.hostnames.includes(result.hostname ?? '');
}
