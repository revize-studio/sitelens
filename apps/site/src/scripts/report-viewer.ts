for (const viewer of document.querySelectorAll<HTMLElement>('[data-viewer]')) {
  const sheets = [...viewer.querySelectorAll<HTMLElement>('[data-sheet]')];
  const thumbs = [...viewer.querySelectorAll<HTMLButtonElement>('[data-go]')];
  const prev = viewer.querySelector<HTMLButtonElement>('[data-step="-1"]');
  const next = viewer.querySelector<HTMLButtonElement>('[data-step="1"]');
  const counter = viewer.querySelector<HTMLElement>('[data-counter]');
  const title = viewer.querySelector<HTMLElement>('[data-title]');
  const desc = viewer.querySelector<HTMLElement>('[data-desc]');
  let current = 0;

  const show = (index: number) => {
    current = Math.max(0, Math.min(sheets.length - 1, index));
    sheets.forEach((sheet, i) => {
      sheet.toggleAttribute('data-active', i === current);
      if (i === current) sheet.removeAttribute('aria-hidden');
      else sheet.setAttribute('aria-hidden', 'true');
    });
    thumbs.forEach((thumb, i) => {
      if (i === current) thumb.setAttribute('aria-current', 'true');
      else thumb.removeAttribute('aria-current');
    });
    const active = thumbs[current];
    if (counter) {
      counter.textContent = (counter.dataset.template ?? '')
        .replace('{n}', String(current + 1))
        .replace('{total}', counter.dataset.total ?? '');
    }
    if (title) title.textContent = active.dataset.title ?? '';
    if (desc) desc.textContent = active.dataset.desc ?? '';
    if (prev) prev.disabled = current === 0;
    if (next) next.disabled = current === sheets.length - 1;
  };

  viewer.setAttribute('data-ready', '');
  show(0);

  prev?.addEventListener('click', () => show(current - 1));
  next?.addEventListener('click', () => show(current + 1));
  thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => show(i)));
  viewer.addEventListener('keydown', (event) => {
    const moves: Record<string, number> = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: sheets.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    show(moves[event.key]);
  });
}
