import { motion } from '../../../../public/brand/tokens.json';

const root = document.documentElement;
const button = document.querySelector<HTMLButtonElement>('.theme-toggle');
const meta = document.querySelector('meta[name="theme-color"]');

type Theme = 'light' | 'dark';

function sync(theme: Theme) {
  if (!button) return;
  const label = theme === 'dark' ? button.dataset.labelLight : button.dataset.labelDark;
  if (label) button.setAttribute('aria-label', label);
  meta?.setAttribute('content', getComputedStyle(root).getPropertyValue('--sl-bg').trim());
}

function apply(theme: Theme) {
  root.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('sitelens-theme', theme);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this page.
  }
  sync(theme);
}

sync(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

function chosenTheme(): string | null {
  try {
    return localStorage.getItem('sitelens-theme');
  } catch {
    return null;
  }
}

// Until a theme is picked with the switch, the site follows the system setting as it changes
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  if (chosenTheme()) return;
  const theme: Theme = event.matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);
  sync(theme);
});

// Colour transitions would otherwise replay inside the new view and trail behind the reveal
// (the dock, buttons and links would change colour after everything else).
function withoutTransitions(change: () => void) {
  root.setAttribute('data-theme-switch', '');
  change();
  return () => root.removeAttribute('data-theme-switch');
}

// A rim of light that rides the edge of the reveal; it exists only while the transition runs.
// The box holds the whole circle, so scaling it never shows a straight edge.
function addWave(x: number, y: number, reach: number) {
  const wave = document.createElement('div');
  wave.className = 'theme-wave';
  wave.setAttribute('aria-hidden', 'true');
  wave.style.setProperty('--wave-x', `${x - reach}px`);
  wave.style.setProperty('--wave-y', `${y - reach}px`);
  wave.style.setProperty('--wave-size', `${reach * 2}px`);
  document.body.append(wave);
  return wave;
}

// WebKit draws this page's transition snapshots shifted once the page is scrolled and loses the
// glass nav until the transition ends, so the pour runs in Chromium only (the same check as .refract)
const pours = root.classList.contains('refract');

button?.addEventListener('click', () => {
  const next: Theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce || !pours) {
    const restore = withoutTransitions(() => apply(next));
    requestAnimationFrame(() => requestAnimationFrame(restore));
    return;
  }

  const r = button.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  // The mask fades over the outer tenth of the circle, so its solid part has to reach the
  // farthest corner by the end, otherwise the old theme lingers there.
  const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) / 0.9;
  const size = reach * 2;
  let restore = () => {};
  let wave: HTMLElement | undefined;
  // Added inside the update, so only the new state has the rim and the old snapshot stays clean
  const transition = document.startViewTransition(() => {
    restore = withoutTransitions(() => apply(next));
    wave = addWave(x, y, reach);
  });
  transition.ready
    .then(() => {
      const mask = 'radial-gradient(closest-side, var(--sl-text) 90%, transparent)';
      const timing = { duration: motion.pour.duration, easing: motion.pour.easing, fill: 'both' } as const;
      root.animate(
        {
          maskImage: [mask, mask],
          maskRepeat: ['no-repeat', 'no-repeat'],
          maskSize: ['0px 0px', `${size}px ${size}px`],
          maskPosition: [`${x}px ${y}px`, `${x - reach}px ${y - reach}px`],
        },
        { ...timing, pseudoElement: '::view-transition-new(root)' },
      );
      // Growing with the same timing as the mask, the rim stays on its edge
      wave?.animate({ transform: ['scale(0)', 'scale(1)'], opacity: [1, 1, 1, 0] }, timing);
    })
    .catch(() => {
      // The browser skipped the transition (e.g. hidden tab); the theme is already applied.
    });
  transition.finished.finally(() => {
    restore();
    wave?.remove();
  });
});
