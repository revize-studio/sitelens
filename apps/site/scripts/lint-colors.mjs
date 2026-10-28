import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
// theme.css is the one place allowed to define site-level colour tokens.
const allowedFiles = new Set(['styles/theme.css']);
// Keywords count only on their own: `white-space`, `.da-white` and `--sl-app-white` are names.
const colour = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab|lch)\(|(?<![-\w])(?:white|black)\b(?!-)/gi;

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (/\.(astro|css|ts|mjs)$/.test(entry.name)) yield path;
  }
}

const problems = [];
for (const file of files(root)) {
  const name = relative(root, file);
  if (allowedFiles.has(name)) continue;
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      // SVG masks and displacement maps hold data, not painted colours.
      if (line.includes('<mask') || line.includes('lint-colors-ignore')) return;
      for (const match of line.matchAll(colour)) problems.push(`${name}:${i + 1}  ${match[0]}`);
    });
}

if (problems.length) {
  console.error(`Hard-coded colours found (use var(--sl-*) tokens):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('No hard-coded colours.');
