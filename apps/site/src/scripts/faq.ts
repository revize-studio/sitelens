// Smooth open and close for the FAQ. Without JS, or with reduced motion, <details> opens
// instantly as usual; the answers stay in the page either way, so search and Ctrl+F find them.
import { motion } from '../../../../public/brand/tokens.json';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

for (const details of document.querySelectorAll<HTMLDetailsElement>('[data-faq] details')) {
  const summary = details.querySelector('summary');
  const answer = details.querySelector<HTMLElement>('.answer');
  if (!summary || !answer) continue;
  let running: Animation | null = null;

  summary.addEventListener('click', (event) => {
    if (reduce.matches) return;
    event.preventDefault();
    // A second click mid-way turns the motion around instead of jumping
    if (running) {
      running.reverse();
      details.dataset.state = running.playbackRate > 0 ? 'open' : 'closed';
      return;
    }
    const opening = !details.open;
    details.dataset.state = opening ? 'open' : 'closed';
    details.open = true;
    answer.style.overflow = 'clip';
    running = answer.animate(
      [
        { height: '0px', opacity: 0, transform: 'translateY(-6px)' },
        { height: `${answer.scrollHeight}px`, opacity: 1, transform: 'none' },
      ],
      { duration: 400, easing: motion.out.easing },
    );
    if (!opening) running.reverse();
    running.onfinish = () => {
      const open = (running?.playbackRate ?? 1) > 0;
      running = null;
      answer.style.removeProperty('overflow');
      details.open = open;
    };
  });
}
