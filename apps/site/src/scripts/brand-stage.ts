import { motion } from '../../../../public/brand/tokens.json';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const ZOOM = 1.8;
// ms: the loupe glides to each find and rests on it while the brandbook fills in
const T = { move: 750, rest: 1050, find: 160, stagger: 70, pop: 320 };

interface Point {
  x: number;
  y: number;
}

const pop: Keyframe[] = [
  { opacity: 0, transform: 'translateY(6px) scale(0.92)' },
  { opacity: 1, transform: 'none' },
];

function parts(root: HTMLElement) {
  const page = root.querySelector<HTMLElement>('[data-page]');
  const loupe = root.querySelector<HTMLElement>('[data-loupe]');
  const view = root.querySelector<HTMLElement>('[data-view]');
  return page && loupe && view ? { page, loupe, view } : null;
}

function targets(page: HTMLElement): Point[] {
  const box = page.getBoundingClientRect();
  return [...page.querySelectorAll(':scope > .site [data-target]')]
    .sort((a, b) => Number(a.getAttribute('data-target')) - Number(b.getAttribute('data-target')))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    });
}

// The copy inside the loupe moves the opposite way, so the glass shows what lies under it, enlarged
function at(p: Point, r: number) {
  return {
    loupe: `translate(${p.x - r}px, ${p.y - r}px)`,
    view: `translate(${r - p.x * ZOOM}px, ${r - p.y * ZOOM}px) scale(${ZOOM})`,
  };
}

function rest(root: HTMLElement): void {
  const p = parts(root);
  const last = p && targets(p.page).at(-1);
  if (!p || !last) return;
  const place = at(last, p.loupe.offsetWidth / 2);
  p.loupe.style.transform = place.loupe;
  p.view.style.transform = place.view;
  root.setAttribute('data-placed', '');
}

function play(root: HTMLElement): () => void {
  const p = parts(root);
  if (!p) return () => {};
  const anims: Animation[] = [];
  const run = (el: Element | null, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
    if (el) anims.push(el.animate(frames, { fill: 'both', ...opts }));
  };

  root.removeAttribute('data-played');
  root.removeAttribute('data-replayable');
  root.setAttribute('data-playing', '');

  const r = p.loupe.offsetWidth / 2;
  const points = targets(p.page);
  const start = { x: p.page.clientWidth * 0.2, y: p.page.clientHeight + r * 2 };
  const step = T.move + T.rest;
  const total = points.length * step;

  const loupeFrames: Keyframe[] = [];
  const viewFrames: Keyframe[] = [];
  const add = (offset: number, point: Point, easing: string) => {
    const place = at(point, r);
    loupeFrames.push({ offset, transform: place.loupe, easing });
    viewFrames.push({ offset, transform: place.view, easing });
  };
  points.forEach((point, i) => {
    add((i * step) / total, i === 0 ? start : points[i - 1], motion.spring.easing);
    add((i * step + T.move) / total, point, 'linear');
  });
  add(1, points[points.length - 1], 'linear');
  run(p.loupe, loupeFrames, { duration: total });
  run(p.view, viewFrames, { duration: total });
  root.setAttribute('data-placed', '');

  const readouts = root.querySelectorAll('.readout > span');
  const groups = root.querySelectorAll('[data-step]');
  points.forEach((_, i) => {
    const arrive = i * step + T.move;
    const last = i === points.length - 1;
    run(
      readouts[i] ?? null,
      last
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }],
      { delay: arrive - 120, duration: last ? 240 : T.rest, easing: 'linear' },
    );
    run(p.loupe.firstElementChild, [{ transform: 'none' }, { transform: 'scale(1.07)' }, { transform: 'none' }], {
      delay: arrive,
      duration: 380,
      easing: motion.out.easing,
      fill: 'none',
    });
    groups[i]
      ?.querySelectorAll('.pop')
      .forEach((el, j) =>
        run(el, pop, { delay: arrive + T.find + j * T.stagger, duration: T.pop, easing: motion.out.easing }),
      );
  });
  // The files come last, once everything has been read
  groups[points.length]
    ?.querySelectorAll('.pop')
    .forEach((el, j) =>
      run(el, pop, { delay: total - T.rest / 2 + j * T.stagger, duration: T.pop, easing: motion.out.easing }),
    );

  Promise.all(anims.map((a) => a.finished))
    .then(() => {
      // Hand the final state back to CSS and inline transforms, so nothing stays pinned by fill modes
      root.setAttribute('data-played', '');
      root.removeAttribute('data-playing');
      root.setAttribute('data-replayable', '');
      rest(root);
      for (const a of anims) a.cancel();
    })
    .catch(() => {
      // Animations were cancelled by a replay; the new run owns the state.
    });

  return () => {
    for (const a of anims) a.cancel();
  };
}

for (const stage of document.querySelectorAll<HTMLElement>('[data-bstage]')) {
  let stop = () => {};
  const page = stage.querySelector('[data-page]');
  // The loupe stands on a point measured in pixels, so it follows the page when the layout changes
  if (page)
    new ResizeObserver(() => {
      if (stage.hasAttribute('data-played')) rest(stage);
    }).observe(page);

  if (reduce.matches) {
    stage.setAttribute('data-played', '');
    rest(stage);
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        document.fonts.ready.then(() => {
          stop = play(stage);
        });
      },
      { threshold: 0.35 },
    );
    observer.observe(stage);
  }

  stage.querySelector('[data-replay]')?.addEventListener('click', () => {
    stop();
    stop = play(stage);
  });
}
