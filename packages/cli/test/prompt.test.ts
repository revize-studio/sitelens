import { PassThrough } from 'node:stream';
import { stripVTControlCharacters } from 'node:util';
import { describe, expect, it } from 'vitest';
import { ask, pressEnter, PromptCancelled, select } from '../src/prompt';

function fakeTerminal() {
  const input = Object.assign(new PassThrough(), {
    isTTY: true,
    setRawMode() {
      return input;
    },
  });
  const output = Object.assign(new PassThrough(), { isTTY: true, columns: 80 });
  let screen = '';
  output.on('data', (chunk: Buffer) => (screen += chunk.toString()));
  return {
    io: { input: input as unknown as NodeJS.ReadStream, output: output as unknown as NodeJS.WriteStream },
    type: (keys: string) => setImmediate(() => input.write(keys)),
    screen: () => stripVTControlCharacters(screen),
    async waitFor(text: string) {
      while (!screen.includes(text)) await new Promise((resolve) => setTimeout(resolve, 5));
    },
  };
}

const modes = [
  { label: 'Szybki', value: 1 },
  { label: 'Standardowy', value: 10 },
  { label: 'Dokładny', value: 50 },
];

describe('choosing from a list', () => {
  it('moves the choice with the arrow keys and confirms with Enter', async () => {
    const terminal = fakeTerminal();
    const answer = select('Tryb audytu', modes, { initial: 1, io: terminal.io });
    terminal.type('\x1b[B\r');
    await expect(answer).resolves.toBe(50);
    expect(terminal.screen()).toContain('✓ Tryb audytu: Dokładny');
  });

  it('wraps from the first choice to the last one', async () => {
    const terminal = fakeTerminal();
    const answer = select('Tryb audytu', modes, { io: terminal.io });
    terminal.type('\x1b[A\r');
    await expect(answer).resolves.toBe(50);
  });

  it('stops when the person presses Ctrl+C', async () => {
    const terminal = fakeTerminal();
    const answer = select('Tryb audytu', modes, { io: terminal.io });
    terminal.type('\x03');
    await expect(answer).rejects.toBeInstanceOf(PromptCancelled);
    expect(terminal.screen()).not.toContain('✓');
  });
});

describe('typing an answer', () => {
  it('asks again until the answer passes the check', async () => {
    const terminal = fakeTerminal();
    const answer = ask('Adres strony', (text) => (text.includes('.') ? undefined : 'To nie jest adres'), {
      io: terminal.io,
    });
    terminal.type('abc\r');
    await terminal.waitFor('To nie jest adres');
    terminal.type('abc.pl\r');
    await expect(answer).resolves.toBe('abc.pl');
    expect(terminal.screen()).toContain('✓ Adres strony: abc.pl');
  });
});

describe('opening the report', () => {
  it('opens on Enter', async () => {
    const terminal = fakeTerminal();
    const answer = pressEnter('Naciśnij Enter, żeby otworzyć raport (Esc kończy).', { io: terminal.io });
    terminal.type('\r');
    await expect(answer).resolves.toBe(true);
  });

  it('moves on without opening for any other key', async () => {
    const terminal = fakeTerminal();
    const answer = pressEnter('Naciśnij Enter, żeby otworzyć raport (Esc kończy).', { io: terminal.io });
    terminal.type('q');
    await expect(answer).resolves.toBe(false);
  });
});
