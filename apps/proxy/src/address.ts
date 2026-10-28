// Which addresses the proxy may connect to. Anything that is not plainly on the public internet
// is refused, so the proxy can never be pointed at a private network or a cloud metadata service.

const V4_BLOCKED: [number, number][] = [
  [0x00000000, 8], // 0.0.0.0/8, "this network"
  [0x0a000000, 8], // 10.0.0.0/8, private
  [0x64400000, 10], // 100.64.0.0/10, carrier-grade NAT
  [0x7f000000, 8], // 127.0.0.0/8, loopback
  [0xa9fe0000, 16], // 169.254.0.0/16, link-local and cloud metadata
  [0xac100000, 12], // 172.16.0.0/12, private
  [0xc0000000, 24], // 192.0.0.0/24, protocol assignments
  [0xc0000200, 24], // 192.0.2.0/24, documentation
  [0xc0586300, 24], // 192.88.99.0/24, 6to4 relay
  [0xc0a80000, 16], // 192.168.0.0/16, private
  [0xc6120000, 15], // 198.18.0.0/15, benchmarking
  [0xc6336400, 24], // 198.51.100.0/24, documentation
  [0xcb007100, 24], // 203.0.113.0/24, documentation
  [0xe0000000, 4], // 224.0.0.0/4, multicast
  [0xf0000000, 4], // 240.0.0.0/4, reserved and broadcast
];

export function parseIPv4(text: string): number | null {
  const parts = text.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return null;
  return parts.reduce((value, part) => value * 256 + Number(part), 0);
}

/** Eight 16-bit groups, or null when the text is not an IPv6 address. Accepts an embedded IPv4 tail. */
export function parseIPv6(text: string): number[] | null {
  let address = text.replace(/^\[|\]$/g, '').toLowerCase();
  if (address.includes('%')) return null;
  const v4Tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (v4Tail) {
    const v4 = parseIPv4(v4Tail[1]!);
    if (v4 === null) return null;
    address = `${address.slice(0, -v4Tail[1]!.length)}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }
  const halves = address.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

function v4Public(value: number): boolean {
  return !V4_BLOCKED.some(([base, bits]) => value >>> (32 - bits) === base >>> (32 - bits));
}

function v6Public(g: number[]): boolean {
  const embedded = (g[6]! << 16) + g[7]!;
  // IPv4-mapped (::ffff:a.b.c.d) and the NAT64 well-known prefix (64:ff9b::/96) carry an IPv4 address
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return v4Public(embedded >>> 0);
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return v4Public(embedded >>> 0);
  const first = g[0]!;
  // Only global unicast (2000::/3) is public, minus the special blocks inside it
  if ((first & 0xe000) !== 0x2000) return false;
  if (first === 0x2001 && g[1]! < 0x0200) return false; // 2001::/23, protocol assignments and Teredo
  if (first === 0x2001 && g[1] === 0x0db8) return false; // 2001:db8::/32, documentation
  if (first === 0x2002) return false; // 2002::/16, 6to4
  if (first === 0x3fff && g[1]! < 0x1000) return false; // 3fff::/20, documentation
  return true;
}

/** True only for an address on the public internet. */
export function isPublicAddress(text: string): boolean {
  const v4 = parseIPv4(text);
  if (v4 !== null) return v4Public(v4);
  const v6 = parseIPv6(text);
  return v6 !== null && v6Public(v6);
}

export function isIpLiteral(hostname: string): boolean {
  return parseIPv4(hostname) !== null || parseIPv6(hostname) !== null;
}

const LOCAL_NAMES = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|home\.arpa|localdomain)$/;

/** Why a host name may not be fetched, or null when it may be resolved and checked. */
export function hostProblem(hostname: string): string | null {
  const name = hostname.replace(/\.$/, '').toLowerCase();
  if (name.split('.').some((label) => !label)) return 'the domain name is not valid';
  if (isIpLiteral(name)) return 'the address is an IP number, not a domain name';
  if (!name.includes('.')) return 'the domain name has no dot';
  if (LOCAL_NAMES.test(name)) return 'the domain name is for local networks';
  return null;
}

/** The name a pass is issued for: lower case, without a trailing dot and without www. */
export function siteOf(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/^www\./, '');
}

/**
 * True when the host is one of the sites, with or without www, the way the crawler counts a site.
 * Other subdomains stay out, so a pass for a shared suffix such as github.io covers nothing else.
 */
export function withinSites(hostname: string, sites: string[]): boolean {
  const host = siteOf(hostname);
  return sites.includes(host);
}
