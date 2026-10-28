import { motion } from '../../../../public/brand/tokens.json';

const stage = document.querySelector<HTMLElement>('[data-stage]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// Offsets in ms from the start of the sequence.
const T = { typeFor: 1100, crawl: 1200, cats: [1500, 1950, 2400, 2850], check: 420, ring: 3500, reveal: 4400 };
const rise: Keyframe[] = [
  { opacity: 0, transform: 'translateY(4px)' },
  { opacity: 1, transform: 'none' },
];
// Starts a hair past the full length so the round cap leaves no dot before the tick is drawn
const draw: Keyframe[] = [{ strokeDashoffset: 1.02 }, { strokeDashoffset: 0 }];

function play(root: HTMLElement): () => void {
  const q = (sel: string) => root.querySelector<HTMLElement>(sel);
  const anims: Animation[] = [];
  const run = (el: Element | null, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
    if (el) anims.push(el.animate(frames, { fill: 'both', ...opts }));
  };
  const out = { easing: motion.out.easing, duration: 300 };
  const chars = q('.typed')?.textContent?.length ?? 1;

  root.removeAttribute('data-played');
  root.removeAttribute('data-revealed');
  root.removeAttribute('data-replayable');
  root.setAttribute('data-playing', '');

  const typing = { duration: T.typeFor, easing: `steps(${chars}, end)` };
  run(q('.typed'), [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], typing);
  run(q('.caret-track'), [{ transform: 'translateX(-100%)' }, { transform: 'none' }], typing);
  run(q('.caret'), [{ opacity: 1 }, { opacity: 1, offset: 0.97 }, { opacity: 0 }], { duration: T.reveal, easing: 'linear' });
  run(q('.crawling'), rise, { ...out, delay: T.crawl });

  root.querySelectorAll('.cat').forEach((cat, i) => {
    const at = T.cats[i] ?? T.cats[T.cats.length - 1];
    run(cat, rise, { ...out, delay: at });
    run(cat.querySelector('.spinner'), [{ opacity: 1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], {
      duration: T.check,
      delay: at,
      easing: 'linear',
      fill: 'none',
    });
    run(cat.querySelector('.check'), [{ opacity: 0 }, { opacity: 1 }], {
      duration: 120,
      delay: at + T.check,
      easing: 'linear',
    });
    run(cat.querySelector('.check path'), draw, { duration: 340, delay: at + T.check, easing: motion.out.easing });
    run(cat.querySelector('.score'), [{ opacity: 0 }, { opacity: 1 }], { ...out, delay: at + T.check });
    run(cat.querySelector('.meter-fill'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], {
      duration: 600,
      delay: at + T.check,
      easing: motion.out.easing,
    });
  });

  const arc = q('.ring-arc');
  run(q('.overall'), rise, { ...out, delay: T.ring - 100 });
  run(arc, [{ strokeDashoffset: 100 }, { strokeDashoffset: Number(arc?.getAttribute('stroke-dashoffset')) }], {
    duration: motion.draw.duration,
    delay: T.ring,
    easing: motion.draw.easing,
  });
  run(q('.saved'), rise, { ...out, delay: T.reveal });
  run(q('.saved-check path'), draw, { duration: 340, delay: T.reveal + 120, easing: motion.out.easing });

  // The report window, the dock bounce and the notification are CSS transitions keyed off this attribute.
  const reveal = window.setTimeout(() => root.setAttribute('data-revealed', ''), T.reveal);

  Promise.all(anims.map((a) => a.finished))
    .then(() => {
      // Hand the final state back to CSS so nothing stays pinned by fill modes.
      root.setAttribute('data-played', '');
      root.removeAttribute('data-playing');
      root.setAttribute('data-replayable', '');
      for (const a of anims) a.cancel();
    })
    .catch(() => {
      // Animations were cancelled by a replay; the new run owns the state.
    });

  return () => {
    clearTimeout(reveal);
    for (const a of anims) a.cancel();
  };
}

if (stage) {
  let stop = () => {};

  if (reduce.matches) {
    stage.setAttribute('data-played', '');
    stage.setAttribute('data-revealed', '');
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
