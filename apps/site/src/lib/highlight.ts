// Build-time syntax colouring for commands and YAML shown on the site. Output is escaped HTML
// with t-* classes (global.css); no inline styles, so the strict CSP still holds.
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const span = (cls: string, text: string) => `<span class="${cls}">${escape(text)}</span>`;

const COMMANDS = new Set(['npx', 'node', 'npm', 'open', 'start', 'winget', 'brew', 'curl', 'irm', 'iex', 'sh', 'sudo', 'nvm', 'fnm', 'cd']);

// Flags that take a value: the pair stays on one line when a long command wraps
const VALUE_FLAGS = new Set(['--out', '--pages', '--lang', '--fail-under', '--brand', '--psi-key']);
const OPERATOR = /^(\|\||&&|\||;|>)$/;

function argument(part: string): string {
  if (part === 'sitelens' || part === 'sitelens@latest') return span('t-bin', part);
  if (/^--?[\w-]+/.test(part)) return span('t-flag', part);
  // Break opportunities after the slashes, so a long URL wraps at a path step on a phone
  if (/^https?:\/\//.test(part))
    return `<span class="t-url">${escape(part).replace(/(\/+)(?=[^/])/g, '$1<wbr>')}</span>`;
  if (/^\d+(\.\d+)?$/.test(part)) return span('t-num', part);
  return escape(part);
}

export function highlightShell(command: string): string {
  const parts = command.split(/(\s+)/);
  const out: string[] = [];
  let first = true;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.trim()) {
      out.push(part);
    } else if (OPERATOR.test(part)) {
      first = true;
      out.push(span('t-dim', part));
    } else if (first) {
      first = false;
      out.push(COMMANDS.has(part) ? span('t-cmd', part) : span('t-bin', part));
    } else if (VALUE_FLAGS.has(part) && parts[i + 2] && !OPERATOR.test(parts[i + 2])) {
      out.push(`<span class="t-pair">${span('t-flag', part)}${parts[i + 1]}${argument(parts[i + 2])}</span>`);
      i += 2;
    } else {
      out.push(argument(part));
    }
  }
  return out.join('');
}

function yamlValue(value: string): string {
  const trimmed = value.trim();
  const lead = value.slice(0, value.length - value.trimStart().length);
  if (!trimmed) return '';
  if (trimmed === '>' || trimmed === '|') return lead + span('t-dim', trimmed);
  if (/^["'].*["']$/.test(trimmed)) return lead + span('t-str', trimmed);
  if (/^\d+(\.\d+)?$/.test(trimmed)) return lead + span('t-num', trimmed);
  if (/^(npx|npm|node)\b/.test(trimmed)) return lead + highlightShell(trimmed);
  const ref = trimmed.match(/^([\w./-]+)(@[\w.-]+)$/);
  if (ref) return lead + escape(ref[1]) + span('t-url', ref[2]);
  if (/^(true|false|always\(\))$/.test(trimmed)) return lead + span('t-num', trimmed);
  return lead + escape(trimmed);
}

export function highlightYaml(source: string): string {
  return source
    .split('\n')
    .map((line) => {
      const pair = line.match(/^(\s*)(- )?([\w.-]+)(:)(.*)$/);
      if (pair) {
        const [, indent, dash = '', key, colon, rest] = pair;
        return indent + (dash ? span('t-dim', dash) : '') + span('t-key', key) + span('t-dim', colon) + yamlValue(rest);
      }
      const item = line.match(/^(\s*)(- )(.*)$/);
      if (item) return item[1] + span('t-dim', item[2]) + escape(item[3]);
      return escape(line);
    })
    .join('\n');
}
