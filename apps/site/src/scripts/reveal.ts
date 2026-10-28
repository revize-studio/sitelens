// Sections rise out of a blur as they enter the viewport. The class that hides them is added
// only here, so content never stays hidden if this script fails to load.
const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];

if (items.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  for (const el of items) if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in');
  document.documentElement.classList.add('reveal-ready');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
  );
  for (const el of items) if (!el.classList.contains('is-in')) observer.observe(el);
}
