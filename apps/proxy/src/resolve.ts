import { isPublicAddress } from './address';

export type Resolution = { kind: 'public' } | { kind: 'missing' } | { kind: 'private'; address: string };

interface DnsAnswer {
  Status: number;
  Answer?: { type: number; data: string }[];
}

const A = 1;
const AAAA = 28;

async function lookup(name: string, type: number, fetcher: typeof fetch): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const response = await fetcher(url, { headers: { accept: 'application/dns-json' } });
  if (!response.ok) throw new Error(`DNS over HTTPS answered ${response.status}`);
  const answer = (await response.json()) as DnsAnswer;
  return (answer.Answer ?? []).filter((record) => record.type === type).map((record) => record.data);
}

/**
 * Resolves a host name the way the fetch will and says whether every address is public. The fetch
 * resolves again by itself, but Cloudflare does not route Workers to private networks either.
 */
export async function resolveHost(hostname: string, fetcher: typeof fetch): Promise<Resolution> {
  const [v4, v6] = await Promise.all([lookup(hostname, A, fetcher), lookup(hostname, AAAA, fetcher)]);
  const addresses = [...v4, ...v6];
  if (!addresses.length) return { kind: 'missing' };
  const blocked = addresses.find((address) => !isPublicAddress(address));
  return blocked ? { kind: 'private', address: blocked } : { kind: 'public' };
}
