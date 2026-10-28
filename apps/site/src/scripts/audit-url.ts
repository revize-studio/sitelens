// Carry the address from ?url=… into the command, so the terminal route is one copy away.
// The command gets pasted into a shell, so anything beyond a plain http(s) address is dropped:
// a crafted link must never be able to smuggle in `;`, `$(…)`, quotes or spaces.
function safeAddress(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
  if (!/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname.includes('.')) return null;
  const address = url.origin + (url.pathname === '/' ? '' : url.pathname);
  return /^[A-Za-z0-9._~:/%-]+$/.test(address) ? address : null;
}

const raw = new URLSearchParams(location.search).get('url')?.trim();
const address = raw ? safeAddress(raw) : null;
if (address) {
  const url = document.querySelector('.audit .cmd .t-url');
  const button = document.querySelector<HTMLButtonElement>('.audit [data-copy]');
  if (url) url.textContent = address;
  if (button) button.dataset.copy = (button.dataset.copy ?? '').replace(/https:\/\/\S+/, address);
}
