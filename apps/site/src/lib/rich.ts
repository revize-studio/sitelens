// Dictionary texts are plain strings; this turns `code`, [label](href) and {name}
// into HTML so translators never have to write markup.
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function fill(text: string, vars: Record<string, string | number> = {}): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export function rich(text: string, vars: Record<string, string | number> = {}): string {
  return escape(fill(text, vars))
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
      const external = /^https?:\/\//.test(href);
      return `<a href="${href}"${external ? ' rel="noopener"' : ''}>${label}</a>`;
    });
}
