// robots.txt as Google reads it (RFC 9309): the group for the most specific user agent wins,
// and within a group the longest matching rule wins, with Allow beating Disallow on a tie.

export interface RobotsRule {
  allow: boolean;
  path: string;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

export interface Robots {
  groups: RobotsGroup[];
  sitemaps: string[];
  /** Lines that are not a known directive, for the robots.txt check */
  invalidLines: number[];
}

const DIRECTIVE = /^\s*([A-Za-z-]+)\s*:\s*(.*?)\s*$/;

export function parseRobots(text: string): Robots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  const invalidLines: number[] = [];
  let current: RobotsGroup | null = null;
  let collectingAgents = false;

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.replace(/#.*$/, '');
    if (!line.trim()) return;
    const match = DIRECTIVE.exec(line);
    if (!match) {
      invalidLines.push(index + 1);
      return;
    }
    const key = match[1]!.toLowerCase();
    const value = match[2]!;
    if (key === 'user-agent') {
      if (!current || !collectingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      // An empty User-agent line names no crawler
      if (value) current.agents.push(value.toLowerCase());
      collectingAgents = true;
    } else if (key === 'allow' || key === 'disallow') {
      collectingAgents = false;
      // An empty Disallow allows everything, so it adds no rule
      if (current && value) current.rules.push({ allow: key === 'allow', path: value });
    } else if (key === 'sitemap') {
      if (value) sitemaps.push(value);
    } else if (!['crawl-delay', 'host', 'clean-param', 'noindex', 'request-rate', 'visit-time'].includes(key)) {
      invalidLines.push(index + 1);
    }
  });

  return { groups, sitemaps, invalidLines };
}

/** The rules for one crawler: every group naming it exactly, or else every `*` group (RFC 9309). */
function rulesFor(robots: Robots, agent: string): RobotsRule[] | undefined {
  const name = agent.toLowerCase();
  const named = robots.groups.filter((group) => group.agents.includes(name));
  const groups = named.length ? named : robots.groups.filter((group) => group.agents.includes('*'));
  return groups.length ? groups.flatMap((group) => group.rules) : undefined;
}

// Google's matcher: the set of reachable positions in the path, so time grows with path × pattern and a
// pattern full of `*` cannot make it backtrack. A `$` anchors only at the very end of a pattern.
function ruleMatches(pattern: string, path: string): boolean {
  let positions = [0];
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]!;
    if (char === '$' && i === pattern.length - 1) return positions.includes(path.length);
    if (char === '*') {
      positions = Array.from({ length: path.length - positions[0]! + 1 }, (_, k) => positions[0]! + k);
      continue;
    }
    positions = positions.filter((at) => at < path.length && path[at] === char).map((at) => at + 1);
    if (!positions.length) return false;
  }
  return true;
}

// Rules may be written with or without percent-encoding (/życie or /%C5%BCycie); both sides are brought to
// the same encoded form before matching
function normalize(text: string): string {
  try {
    return encodeURI(decodeURI(text));
  } catch {
    // A malformed escape is compared as written
    return text;
  }
}

export function isAllowed(robots: Robots, url: string, agent: string): boolean {
  const rules = rulesFor(robots, agent);
  if (!rules) return true;
  const { pathname, search } = new URL(url);
  const path = normalize(pathname + search);
  let best: { allow: boolean; length: number } | undefined;
  for (const rule of rules) {
    const pattern = normalize(rule.path);
    if (!ruleMatches(pattern, path)) continue;
    if (!best || pattern.length > best.length || (pattern.length === best.length && rule.allow))
      best = { allow: rule.allow, length: pattern.length };
  }
  return best ? best.allow : true;
}
