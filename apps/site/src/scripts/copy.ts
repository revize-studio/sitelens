const RESET_AFTER = 1800;

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const root = button.closest('[data-copy-root]');
  const status = root?.querySelector('[data-copy-status]');
  let timer: number | undefined;

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
    } catch {
      // Clipboard can be blocked (permissions, insecure context): select the text so Ctrl+C works.
      const code = root?.querySelector('code, pre');
      if (code) getSelection()?.selectAllChildren(code);
      return;
    }
    button.textContent = button.dataset.done ?? '';
    if (status) status.textContent = button.dataset.announcement ?? '';
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      button.textContent = button.dataset.label ?? '';
      if (status) status.textContent = '';
    }, RESET_AFTER);
  });
}
