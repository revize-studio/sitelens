import type { PreflightError } from '@sitelens/collect-node';
import { plural, type Lang } from '@sitelens/core';

export type Mode = 'quick' | 'standard' | 'thorough';

export interface Messages {
  help: (version: string) => string;
  checking: (pages: number) => string;
  stages: { preflight: string; discover: string; pages: string; browser: string; lighthouse: string; report: string };
  categories: Record<'performance' | 'seo' | 'accessibility' | 'security', string>;
  overall: string;
  notMeasured: string;
  saved: string;
  savedJson: string;
  warnings: (count: number) => string;
  failUnder: (score: number, limit: number) => string;
  optionLater: (flag: string) => string;
  openKey: string;
  wizard: {
    language: string;
    address: string;
    addressHint: string;
    addressMissing: string;
    mode: string;
    modes: Record<Mode, { label: string; hint: (pages: number) => string }>;
    openFailed: (path: string) => string;
  };
  errors: {
    usage: string;
    noUrl: string;
    badNumber: (flag: string) => string;
    badLang: string;
    invalidUrl: (input: string) => string;
    dns: (host: string) => string;
    unreachable: (detail: string) => string;
    httpError: (status: string) => string;
    notHtml: (type: string) => string;
    noBrowser: string;
    oldNode: (current: string, needed: string) => string;
    write: (path: string, detail: string) => string;
    unexpected: (detail: string) => string;
  };
  brand: {
    help: (version: string) => string;
    stages: Record<'fetch' | 'pages' | 'dark' | 'mobile' | 'logo' | 'analysis' | 'report', string>;
    summary: (name: string, colors: number, fonts: string[]) => string;
    noLogo: string;
    saved: string;
    errors: { botCheck: (url: string) => string; badFormat: (value: string) => string };
  };
  installing: string;
  installed: string;
}

// npx users have to type npx again; the installer and a global install put plain `sitelens` on PATH
const command = process.env.npm_command === 'exec' ? 'npx sitelens' : 'sitelens';

const pl: Messages = {
  help: (version) => `sitelens ${version} – audyt strony z raportem PDF pisanym prostym językiem

Użycie:
  ${command} <adres strony> [opcje]

Bez adresu sitelens zapyta o język raportu, adres strony i tryb (wybór strzałkami).

Opcje:
  --pages <liczba>     ile podstron sprawdzić (domyślnie 10, najwyżej 50)
  --lang pl|en         język raportu (domyślnie pl)
  --out <plik.pdf>     gdzie zapisać raport (domyślnie raport.pdf)
  --json               zapisz też surowe wyniki w formacie JSON
  --fail-under <wynik> zakończ z błędem, gdy wynik ogólny jest niższy (do CI)
  --install-browser    pobierz przeglądarkę Chromium, jeśli na komputerze nie ma Chrome ani Edge
  --version            pokaż wersję
  --help               pokaż tę pomoc

Brandbook z linku do strony: ${command} brand --help

Przykład:
  ${command} https://twojastrona.pl --out raport.pdf`,
  checking: (pages) => (pages === 1 ? 'Sprawdzam stronę główną' : `Sprawdzam do ${pages} podstron`),
  stages: {
    preflight: 'Łączę się ze stroną',
    discover: 'Szukam podstron',
    pages: 'Pobieram podstrony',
    browser: 'Otwieram podstrony w przeglądarce',
    lighthouse: 'Mierzę szybkość (Lighthouse)',
    report: 'Tworzę raport PDF',
  },
  categories: { performance: 'Wydajność', seo: 'SEO', accessibility: 'Dostępność', security: 'Bezpieczeństwo' },
  overall: 'Wynik ogólny',
  notMeasured: 'nie zmierzono',
  saved: 'Raport zapisany',
  savedJson: 'Wyniki JSON',
  warnings: (count) =>
    `${count} ${plural(count, ['element nie dał się sprawdzić', 'elementy nie dały się sprawdzić', 'elementów nie dało się sprawdzić'], 'pl')}; szczegóły w załączniku raportu.`,
  failUnder: (score, limit) => `Wynik ${score} jest niższy niż wymagane ${limit} (--fail-under).`,
  optionLater: (flag) => `Opcja ${flag} będzie dostępna w kolejnej wersji. Audyt działa bez niej.`,
  openKey: 'Naciśnij Enter, żeby otworzyć raport (Esc kończy).',
  wizard: {
    language: 'Język raportu',
    address: 'Adres strony',
    addressHint: 'np. twojastrona.pl',
    addressMissing: 'Wpisz adres strony, np. twojastrona.pl',
    mode: 'Tryb audytu',
    modes: {
      quick: { label: 'Szybki', hint: () => 'tylko strona główna' },
      standard: { label: 'Standardowy', hint: (pages) => `do ${pages} podstron` },
      thorough: { label: 'Dokładny', hint: (pages) => `do ${pages} podstron, trwa dłużej` },
    },
    openFailed: (path) => `Nie udało się otworzyć raportu. Plik jest tutaj: ${path}`,
  },
  errors: {
    usage: `Uruchom „${command} --help”, żeby zobaczyć, jak używać narzędzia.`,
    noUrl: `Podaj adres strony, np. ${command} https://twojastrona.pl`,
    badNumber: (flag) => `${flag} wymaga liczby, np. ${flag} 20.`,
    badLang: '--lang przyjmuje pl albo en.',
    invalidUrl: (input) => `„${input}” nie wygląda na adres strony. Podaj go w postaci https://twojastrona.pl`,
    dns: (host) => `Nie ma takiej domeny: ${host}. Sprawdź, czy adres jest wpisany poprawnie.`,
    unreachable: (detail) => `Strona nie odpowiada (${detail}). Sprawdź, czy otwiera się w przeglądarce.`,
    httpError: (status) => `Strona główna zwraca błąd ${status}. Sprawdź, czy otwiera się w przeglądarce.`,
    notHtml: (type) => `Pod tym adresem nie ma strony internetowej, tylko plik (${type}).`,
    noBrowser: `Nie znalazłem przeglądarki Chrome, Edge, Brave ani Chromium. sitelens potrzebuje jej, żeby otworzyć stronę i zmierzyć szybkość.\nZainstaluj Chrome albo pobierz Chromium komendą:\n  ${command} --install-browser`,
    oldNode: (current, needed) =>
      `sitelens potrzebuje Node.js ${needed} lub nowszego, a masz ${current}. Zainstaluj aktualną wersję LTS z nodejs.org.`,
    write: (path, detail) => `Nie udało się zapisać pliku ${path}: ${detail}`,
    unexpected: (detail) =>
      `Coś poszło nie tak: ${detail}\nJeśli to się powtarza, zgłoś problem: https://github.com/revize-studio/sitelens/issues`,
  },
  brand: {
    help: (version) => `sitelens ${version} – brandbook z linku do strony

Użycie:
  ${command} brand <adres strony> [opcje]

Odczytuje z działającej strony logo, kolory, typografię, elementy interfejsu i ton komunikacji.

Opcje:
  --out <folder>       gdzie zapisać brandbook (domyślnie brandbook-<domena>)
  --lang pl|en         język brandbooka (domyślnie pl)
  --pages <liczba>     ile podstron z nawigacji porównać ze stroną główną (domyślnie 2)
  --format <lista>     pdf,html,tokens,zip,json (domyślnie pdf,html,tokens,zip)

Przykład:
  ${command} brand https://twojastrona.pl`,
    stages: {
      fetch: 'Otwieram stronę główną',
      pages: 'Sprawdzam podstrony',
      dark: 'Sprawdzam ciemny motyw',
      mobile: 'Otwieram stronę na telefonie',
      logo: 'Pobieram logo i ikony',
      analysis: 'Analizuję kolory, typografię, interfejs i ton',
      report: 'Zapisuję brandbook',
    },
    summary: (name, colors, fonts) =>
      `${name}: ${colors} ${plural(colors, ['kolor', 'kolory', 'kolorów'], 'pl')}${fonts.length ? `, ${plural(fonts.length, ['krój', 'kroje', 'krojów'], 'pl')} ${fonts.join(', ')}` : ''}.`,
    noLogo: 'Nie znalazłem logo na stronie. Brandbook powstanie bez niego.',
    saved: 'Brandbook zapisany',
    errors: {
      botCheck: (url) =>
        `${url} pokazuje zamiast strony test na robota (np. Cloudflare). Brandbooka nie da się odczytać; spróbuj później albo z innej sieci.`,
      badFormat: (value) => `Nieznany format „${value}”. Dostępne: pdf, html, tokens, zip, json.`,
    },
  },
  installing: 'Pobieram Chromium (ok. 150 MB, tylko raz)…',
  installed: 'Gotowe. Uruchom audyt jeszcze raz.',
};

const en: Messages = {
  help: (version) => `sitelens ${version} – website audit with a plain-language PDF report

Usage:
  ${command} <website address> [options]

Without an address, sitelens asks for the report language, the website address and the mode (pick with the arrow keys).

Options:
  --pages <number>     how many pages to check (default 10, at most 50)
  --lang pl|en         report language (default pl)
  --out <file.pdf>     where to save the report (default report.pdf)
  --json               also save the raw results as JSON
  --fail-under <score> exit with an error when the overall score is lower (for CI)
  --install-browser    download Chromium if the computer has no Chrome or Edge
  --version            show the version
  --help               show this help

Brandbook from a website address: ${command} brand --help

Example:
  ${command} https://yourwebsite.com --lang en --out report.pdf`,
  checking: (pages) => (pages === 1 ? 'Checking the homepage' : `Checking up to ${pages} pages`),
  stages: {
    preflight: 'Connecting to the site',
    discover: 'Looking for pages',
    pages: 'Downloading pages',
    browser: 'Opening pages in the browser',
    lighthouse: 'Measuring speed (Lighthouse)',
    report: 'Creating the PDF report',
  },
  categories: { performance: 'Performance', seo: 'SEO', accessibility: 'Accessibility', security: 'Security' },
  overall: 'Overall score',
  notMeasured: 'not measured',
  saved: 'Report saved',
  savedJson: 'JSON results',
  warnings: (count) =>
    `${count} ${count === 1 ? 'item' : 'items'} could not be checked; details are in the report appendix.`,
  failUnder: (score, limit) => `Score ${score} is below the required ${limit} (--fail-under).`,
  optionLater: (flag) => `The ${flag} option arrives in a later version. The audit works without it.`,
  openKey: 'Press Enter to open the report (Esc to quit).',
  wizard: {
    language: 'Report language',
    address: 'Website address',
    addressHint: 'e.g. yourwebsite.com',
    addressMissing: 'Type the website address, e.g. yourwebsite.com',
    mode: 'Audit mode',
    modes: {
      quick: { label: 'Quick', hint: () => 'homepage only' },
      standard: { label: 'Standard', hint: (pages) => `up to ${pages} pages` },
      thorough: { label: 'Thorough', hint: (pages) => `up to ${pages} pages, takes longer` },
    },
    openFailed: (path) => `Could not open the report. The file is here: ${path}`,
  },
  errors: {
    usage: `Run “${command} --help” to see how to use the tool.`,
    noUrl: `Give the website address, e.g. ${command} https://yourwebsite.com`,
    badNumber: (flag) => `${flag} needs a number, e.g. ${flag} 20.`,
    badLang: '--lang takes pl or en.',
    invalidUrl: (input) => `“${input}” does not look like a website address. Use the form https://yourwebsite.com`,
    dns: (host) => `There is no such domain: ${host}. Check the address for typos.`,
    unreachable: (detail) => `The site does not respond (${detail}). Check that it opens in a browser.`,
    httpError: (status) => `The homepage returns error ${status}. Check that it opens in a browser.`,
    notHtml: (type) => `This address is a file (${type}), not a web page.`,
    noBrowser: `Could not find Chrome, Edge, Brave or Chromium. sitelens needs one to open the site and measure its speed.\nInstall Chrome, or download Chromium with:\n  ${command} --install-browser`,
    oldNode: (current, needed) =>
      `sitelens needs Node.js ${needed} or newer, and you have ${current}. Install the current LTS from nodejs.org.`,
    write: (path, detail) => `Could not save ${path}: ${detail}`,
    unexpected: (detail) =>
      `Something went wrong: ${detail}\nIf it keeps happening, please report it: https://github.com/revize-studio/sitelens/issues`,
  },
  brand: {
    help: (version) => `sitelens ${version} – a brandbook from a website address

Usage:
  ${command} brand <website address> [options]

Reads the logo, colours, typography, interface elements and tone of voice from the live site.

Options:
  --out <folder>       where to save the brandbook (default brandbook-<domain>)
  --lang pl|en         brandbook language (default pl)
  --pages <number>     how many pages from the navigation to compare with the homepage (default 2)
  --format <list>      pdf,html,tokens,zip,json (default pdf,html,tokens,zip)

Example:
  ${command} brand https://yourwebsite.com --lang en`,
    stages: {
      fetch: 'Opening the homepage',
      pages: 'Checking pages',
      dark: 'Checking the dark theme',
      mobile: 'Opening the site on a phone',
      logo: 'Downloading the logo and icons',
      analysis: 'Analysing colours, typography, interface and tone',
      report: 'Saving the brandbook',
    },
    summary: (name, colors, fonts) =>
      `${name}: ${colors} ${colors === 1 ? 'colour' : 'colours'}${fonts.length ? `, ${fonts.length === 1 ? 'typeface' : 'typefaces'} ${fonts.join(', ')}` : ''}.`,
    noLogo: 'No logo found on the site. The brandbook is made without it.',
    saved: 'Brandbook saved',
    errors: {
      botCheck: (url) =>
        `${url} shows a bot check (e.g. Cloudflare) instead of the page. The brandbook cannot be read; try later or from another network.`,
      badFormat: (value) => `Unknown format "${value}". Available: pdf, html, tokens, zip, json.`,
    },
  },
  installing: 'Downloading Chromium (about 150 MB, only once)…',
  installed: 'Done. Run the audit again.',
};

export const messages: Record<Lang, Messages> = { pl, en };

/** What went wrong before the audit could start, in the user's language. */
export function preflightMessage(error: PreflightError, m: Messages): string {
  switch (error.code) {
    case 'invalid-url':
      return m.errors.invalidUrl(error.detail);
    case 'dns':
      return m.errors.dns(error.detail);
    case 'http-error':
      return m.errors.httpError(error.detail);
    case 'not-html':
      return m.errors.notHtml(error.detail);
    default:
      return m.errors.unreachable(error.detail);
  }
}
