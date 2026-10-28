// A short-lived pass for one audit. Turnstile tokens work only once, so after the visitor passes
// Turnstile the proxy hands out a signed pass that the page sends with every fetch. Nothing is stored:
// the signature, the expiry time and the audited sites written in the pass are all the proxy checks.

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// The signing key is derived from the Turnstile secret, so the owner sets up one secret, not two
async function signingKey(secret: string): Promise<CryptoKey> {
  const master = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const derived = await crypto.subtle.sign('HMAC', master, encoder.encode('sitelens audit pass'));
  return crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export interface Pass {
  id: string;
  /** Unix time in ms after which the pass is refused */
  exp: number;
  /** The audited site and the sites it redirected to, as host names without www */
  sites: string[];
}

export async function issuePass(secret: string, pass: Omit<Pass, 'id'> & { id?: string }): Promise<string> {
  const body: Pass = { id: pass.id ?? crypto.randomUUID(), exp: pass.exp, sites: pass.sites };
  const payload = base64url(encoder.encode(JSON.stringify(body)));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload)));
  return `${payload}.${base64url(signature)}`;
}

/** The pass when it is genuine and not expired, otherwise null. */
export async function checkPass(secret: string, pass: string, now: number): Promise<Pass | null> {
  const [payload, signature, extra] = pass.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      'HMAC',
      await signingKey(secret),
      fromBase64url(signature),
      encoder.encode(payload),
    );
  } catch {
    return null;
  }
  if (!valid) return null;
  const body = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as Partial<Pass>;
  const fresh = typeof body.exp === 'number' && body.exp > now;
  return fresh && typeof body.id === 'string' && Array.isArray(body.sites) ? (body as Pass) : null;
}
