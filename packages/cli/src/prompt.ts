import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { stripVTControlCharacters } from 'node:util';
import { paint } from './ui';

export interface Choice<T> {
  label: string;
  hint?: string;
  value: T;
}

export interface PromptStreams {
  input: NodeJS.ReadStream;
  output: NodeJS.WriteStream;
}

/** The person pressed Ctrl+C or Esc instead of answering. */
export class PromptCancelled extends Error {}

const terminal: PromptStreams = { input: process.stdin, output: process.stdout };
// The classic Windows console font has no ❯
const POINTER = process.platform === 'win32' ? '>' : '❯';
const KEYS = '↑ ↓, Enter';

export function canPrompt({ input, output }: PromptStreams = terminal): boolean {
  return Boolean(input.isTTY && output.isTTY);
}

function rowsOf(text: string, columns: number): number {
  return text
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(stripVTControlCharacters(line).length / columns)), 0);
}

function erase(output: NodeJS.WriteStream, rows: number) {
  if (rows) output.write(`\x1b[${rows}A\r\x1b[0J`);
}

/** A list to pick from with the arrow keys. */
export function select<T>(
  message: string,
  choices: Choice<T>[],
  { initial = 0, done = (choice: Choice<T>) => `${message}: ${choice.label}`, io = terminal } = {},
): Promise<T> {
  const { input, output } = io;
  const width = Math.max(...choices.map((choice) => choice.label.length));
  let index = initial;
  let rows = 0;

  const draw = () => {
    const lines = [
      `${paint('cyan', '?', output)} ${paint('bold', message, output)} ${paint('dim', `(${KEYS})`, output)}`,
    ];
    choices.forEach((choice, i) => {
      const active = i === index;
      const label = choice.hint ? choice.label.padEnd(width + 3) : choice.label;
      lines.push(
        `${active ? paint('cyan', POINTER, output) : ' '} ${active ? paint(['cyan', 'bold'], label, output) : label}${choice.hint ? paint('dim', choice.hint, output) : ''}`,
      );
    });
    const text = lines.join('\n');
    erase(output, rows);
    output.write(`${text}\n`);
    rows = rowsOf(text, output.columns || 80);
  };

  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      input.off('keypress', onKey);
      input.setRawMode(false);
      input.pause();
      erase(output, rows);
      output.write('\x1b[?25h');
      if (error) return reject(error);
      const choice = choices[index]!;
      output.write(`${paint('green', '✓', output)} ${done(choice)}\n`);
      resolve(choice.value);
    };
    const onKey = (_text: string | undefined, key: { name?: string; ctrl?: boolean } = {}) => {
      if ((key.ctrl && key.name === 'c') || key.name === 'escape') return finish(new PromptCancelled());
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'up' || key.name === 'k') index = (index + choices.length - 1) % choices.length;
      else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') index = (index + 1) % choices.length;
      else return;
      draw();
    };

    emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    input.on('keypress', onKey);
    output.write('\x1b[?25l');
    draw();
  });
}

/** Shows `message` and waits for one key: true for Enter, false for anything else (Esc, Ctrl+C, q…). */
export function pressEnter(message: string, { io = terminal } = {}): Promise<boolean> {
  const { input, output } = io;
  return new Promise((resolve) => {
    const onKey = (_text: string | undefined, key: { name?: string } = {}) => {
      input.off('keypress', onKey);
      input.setRawMode(false);
      input.pause();
      output.write('\n');
      resolve(key.name === 'return' || key.name === 'enter');
    };
    output.write(`${paint('cyan', '›', output)} ${message} `);
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    input.on('keypress', onKey);
  });
}

/** A typed answer; `check` returns what is wrong with it, or nothing when it is fine. */
export async function ask(
  message: string,
  check: (answer: string) => string | undefined,
  { hint = '', io = terminal } = {},
): Promise<string> {
  const { input, output } = io;
  const rl = createInterface({ input, output, terminal: true });
  const cancel = new AbortController();
  rl.on('SIGINT', () => cancel.abort());
  const question = `${paint('cyan', '?', output)} ${paint('bold', message, output)}${hint ? ` ${paint('dim', `(${hint})`, output)}` : ''}: `;
  try {
    for (;;) {
      const answer = (await rl.question(question, { signal: cancel.signal })).trim();
      const problem = check(answer);
      if (!problem) {
        erase(output, rowsOf(question + answer, output.columns || 80));
        output.write(`${paint('green', '✓', output)} ${message}: ${paint('cyan', answer, output)}\n`);
        return answer;
      }
      output.write(`${paint('red', problem, output)}\n`);
    }
  } catch (error) {
    if (cancel.signal.aborted) throw new PromptCancelled();
    throw error;
  } finally {
    rl.close();
  }
}
