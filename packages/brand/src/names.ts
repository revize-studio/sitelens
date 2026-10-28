import palette from '../data/color-names.json';
import { deltaE, parseColor, type Color } from './color';

const NAMED = palette.colors.map((entry) => ({ ...entry, color: parseColor(entry.hex)! }));

/** The nearest named colour from the brandbook's own list, for sites without tokens and for logo colours. */
export function colorName(color: Color, lang: 'pl' | 'en'): string {
  let best = NAMED[0]!;
  let bestDistance = Infinity;
  for (const entry of NAMED) {
    const distance = deltaE(color, entry.color);
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return best[lang];
}
