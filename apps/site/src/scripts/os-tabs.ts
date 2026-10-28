// Tabs only with JS; without it both guides stay visible one after another.
for (const root of document.querySelectorAll<HTMLElement>('[data-os-guide]')) {
  const list = root.querySelector<HTMLElement>('[data-tablist]');
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  if (!list) continue;

  const select = (id: string, focus = false) => {
    root.dataset.show = id;
    for (const tab of tabs) {
      const on = tab.dataset.tab === id;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    }
  };

  for (const panel of panels) {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${panel.dataset.panel}`);
    panel.tabIndex = 0;
  }
  list.hidden = false;
  select(document.documentElement.dataset.os ?? 'mac');

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab.dataset.tab ?? 'mac'));
    tab.addEventListener('keydown', (event) => {
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length];
      select(target.dataset.tab ?? 'mac', true);
    });
  });
}
