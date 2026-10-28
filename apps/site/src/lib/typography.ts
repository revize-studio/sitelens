// Polish typography: keep one-letter words (a, i, o, u, w, z) on the same line as the next word.
const ORPHAN = /(^|[\s(„])([aiouwzAIOUWZ])\s+/g;

export function noOrphans(text: string): string {
  // Run twice so consecutive one-letter words (“a w”) are both bound.
  return text.replace(ORPHAN, '$1$2 ').replace(ORPHAN, '$1$2 ');
}
