// The glass light follows the pointer over every glass layer under it, so a button and the
// nav around it light up together. The position is kept when the pointer leaves, and CSS
// (--light) fades the light out there instead of snapping it back to a default spot.
const GLASS = '.btn, .lq-btn, .lq, .tile, .glass';

if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.addEventListener(
    'pointermove',
    (event) => {
      let el = (event.target as Element | null)?.closest<HTMLElement>(GLASS) ?? null;
      while (el) {
        const box = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${((event.clientX - box.left) / box.width) * 100}%`);
        el.style.setProperty('--my', `${((event.clientY - box.top) / box.height) * 100}%`);
        el = el.parentElement?.closest<HTMLElement>(GLASS) ?? null;
      }
    },
    { passive: true },
  );
}
