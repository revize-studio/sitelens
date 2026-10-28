// The source fonts ship thousands of glyphs we never use; the full files were the slowest
// part of the mobile LCP. Re-run after changing a source font.
import { readFileSync, writeFileSync } from 'node:fs';
import subsetFont from 'subset-font';

// Basic Latin, Latin-1 punctuation, Polish letters, typographic quotes and dashes, a few symbols.
const ranges = [
  [0x20, 0x7e],
  [0xa0, 0xbf],
];
const extra = 'ÓóÉéÄäÖöÜü×ĄąĆćĘęŁłŃńŚśŹźŻż–—‘’‚“”„•…‹›€™←↑→↓⌘';
const text =
  ranges
    .flatMap(([from, to]) => Array.from({ length: to - from + 1 }, (_, i) => String.fromCodePoint(from + i)))
    .join('') + extra;

const fonts = [
  { from: '../src/fonts/source/Geist-Variable.woff2', to: 'Geist-subset.woff2', axes: { wght: { min: 400, max: 700 } } },
  { from: '../../../public/fonts/GeistMono-Variable.woff2', to: 'GeistMono-subset.woff2', axes: { wght: { min: 400, max: 600 } } },
];

for (const font of fonts) {
  const source = readFileSync(new URL(font.from, import.meta.url));
  const subset = await subsetFont(source, text, { targetFormat: 'woff2', variationAxes: font.axes });
  writeFileSync(new URL(`../src/fonts/${font.to}`, import.meta.url), subset);
  console.log(`${font.to}: ${Math.round(source.length / 1024)} KB → ${Math.round(subset.length / 1024)} KB`);
}
