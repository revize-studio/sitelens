// A language picked with the switch is remembered, so the site stops choosing it by location
for (const link of document.querySelectorAll<HTMLAnchorElement>('a[hreflang]')) {
  link.addEventListener('click', () => {
    try {
      localStorage.setItem('sitelens-lang', link.hreflang);
    } catch {
      // Storage can be blocked (private mode); the switch still opens the other language
    }
  });
}
