import { pathToFileURL } from 'node:url';
import { styleText } from 'node:util';

type Style = Parameters<typeof styleText>[0];

// styleText leaves the text plain when output is not a terminal, or NO_COLOR is set
export const paint = (style: Style, text: string, stream: NodeJS.WriteStream = process.stdout) =>
  styleText(style, text, { stream });

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// Only terminals known to render OSC 8 links get one; others could print the escape codes
function linksWork(stream: NodeJS.WriteStream): boolean {
  const env = process.env;
  if (!stream.isTTY || env.CI) return false;
  if (env.WT_SESSION || Number(env.VTE_VERSION) >= 5000) return true;
  return ['vscode', 'iTerm.app', 'WezTerm', 'ghostty'].includes(env.TERM_PROGRAM ?? '');
}

/** The path, clickable where the terminal supports links. */
export function fileLink(path: string, stream: NodeJS.WriteStream = process.stdout): string {
  return linksWork(stream) ? `\x1b]8;;${pathToFileURL(path).href}\x1b\\${path}\x1b]8;;\x1b\\` : path;
}

export function scoreStyle(score: number): 'green' | 'yellow' | 'red' {
  // Lighthouse's own bands: 90+ good, 50–89 needs work, below 50 poor
  return score >= 90 ? 'green' : score >= 50 ? 'yellow' : 'red';
}

export function bar(score: number, width = 10): string {
  const filled = Math.round((score / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** One line that updates in place in a terminal, and plain stage lines everywhere else (CI logs). */
export function createProgress<Stage extends string>(labels: Record<Stage, string>) {
  const out = process.stdout;
  const live = Boolean(out.isTTY);
  let stage: Stage | null = null;
  let count = '';
  let path = '';
  let frame = 0;
  let timer: NodeJS.Timeout | null = null;

  const render = () => {
    if (!live || !stage) return;
    const label = labels[stage];
    const room = (out.columns ?? 80) - label.length - count.length - 6;
    const shown = room <= 3 ? '' : path.length > room ? `${path.slice(0, room - 1)}…` : path;
    const line = `${paint('cyan', FRAMES[frame++ % FRAMES.length]!)} ${label}${count ? ` ${paint('dim', count)}` : ''}${shown ? ` ${paint('dim', shown)}` : ''}`;
    out.write(`\r\x1b[2K${line}`);
  };
  const finish = () => {
    if (stage && live) out.write(`\r\x1b[2K${paint('green', '✓')} ${labels[stage]}\n`);
  };

  return {
    update(progress: { stage: Stage; done: number; total: number; url?: string }) {
      if (progress.stage !== stage) {
        finish();
        stage = progress.stage;
        if (!live) out.write(`${labels[stage]}…\n`);
      }
      count = progress.total > 1 ? `${Math.min(progress.done + 1, progress.total)}/${progress.total}` : '';
      path = progress.url ? new URL(progress.url).pathname : '';
      if (live && !timer) timer = setInterval(render, 80);
      render();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      finish();
      stage = null;
    },
  };
}
