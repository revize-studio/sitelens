import type { Brandbook, ColorRole, Suggestion, ToneSection, UiSection } from '@sitelens/brand';
import { plural, type Lang } from '@sitelens/core';

const decimal = (value: number, lang: Lang, digits = 1) =>
  new Intl.NumberFormat(lang === 'pl' ? 'pl-PL' : 'en-GB', { maximumFractionDigits: digits }).format(value);

const pl = {
  brandbook: 'Brandbook',
  coverLead: (host: string) =>
    `Zasady marki odczytane z działającej strony ${host}: logo, kolory, typografia, elementy interfejsu i sposób komunikacji.`,
  generated: 'Wygenerowano narzędziem sitelens',
  footer: (host: string, date: string, mode: string) => `Odczytano automatycznie ze strony ${host} · ${date} · ${mode}`,
  mode: { cli: 'w terminalu', online: 'online' },
  headerTitle: (name: string) => `Brandbook ${name}`,
  continued: 'ciąg dalszy',
  proposal: 'propozycja',
  suggestions: 'sugestie',
  approximate: 'przybliżone',
  limited:
    'Strona buduje treść skryptami, więc online odczytaliśmy tylko to, co jest w jej kodzie HTML. Pełny brandbook zrobisz w terminalu.',
  logo: {
    title: 'Logo',
    lead: 'Znak i logotyp w wersjach znalezionych na stronie.',
    none: 'Na stronie nie znaleźliśmy logo. Poniżej ikony i obraz, które strona podaje przeglądarkom.',
    variant: {
      dark: 'Logo na ciemnym tle',
      light: 'Logo na jasnym tle',
      mark: 'Znak',
      header: 'Logo z nagłówka strony',
      icon: 'Ikona aplikacji',
      share: 'Obraz do udostępniania',
    },
    files: 'Pliki znalezione na stronie',
    inline: 'logo w kodzie strony (SVG)',
    clearSpace: 'Pole ochronne',
    clearSpaceText: (px: number) =>
      `Wokół logo zostaw co najmniej połowę jego wysokości (na stronie to ok. ${px} px). Strona nie określa tego wprost, więc to wartość do zatwierdzenia.`,
    minSize: 'Minimalny rozmiar',
    minSizeText: (lockup: number, mark: number) =>
      `Logo z napisem: min. ${lockup} px szerokości. Sam znak: min. ${mark} px. Mniejsze zastosowania obsługuje favicon.`,
    dont: 'Czego nie robić z logo',
    prohibitions: {
      stretch: 'nie rozciągaj ani nie ściskaj',
      recolour: 'nie zmieniaj kolorów',
      effects: 'nie dodawaj cieni ani efektów',
      rotate: 'nie obracaj',
      busyBackground: 'nie stawiaj na zdjęciach i wzorach bez kontrastu',
    } as Record<string, string>,
    owner: 'Logo i znaki należą do właściciela marki. Brandbook je tylko opisuje.',
  },
  colors: {
    title: 'Kolory',
    lead: 'Paleta odczytana z tokenów CSS strony i pogrupowana według tego, do czego kolory są faktycznie używane.',
    leadPalette: 'Strona nie ma tokenów kolorów, więc paleta pochodzi z kolorów, które widać na stronie głównej.',
    roles: {
      background: 'Tła i powierzchnie',
      text: 'Tekst',
      accent: 'Akcenty',
      line: 'Linie',
      state: 'Kolory stanów',
      neutral: 'Pozostałe neutralne',
    } as Record<ColorRole, string>,
    logo: 'Kolory w znaku',
    share: (percent: number, role: ColorRole) =>
      `${percent}% ${{ background: 'tła', text: 'tekstu', line: 'linii' }[role as 'background' | 'text' | 'line'] ?? 'strony'}`,
    inTokens: 'w tokenach',
    note: (fromTokens: boolean) =>
      `${fromTokens ? 'Nazwy pochodzą z tokenów CSS strony.' : 'Nazwy kolorów dobrał sitelens.'} * CMYK przeliczony orientacyjnie z RGB. Przed drukiem potwierdź kolory z drukarnią (proof lub wzornik Pantone).`,
  },
  practice: {
    title: 'Kolory w praktyce',
    proportions: 'Proporcje kolorów na stronie',
    proportionsNote: 'Udział kolorów w powierzchni tła, tekście i liniach strony głównej.',
    contrast: 'Czytelność par tekst / tło',
    levels: { AA: 'AA', 'AA-large': 'duży tekst', fail: 'za mało' },
    contrastNote: 'AA: kontrast co najmniej 4,5:1 dla zwykłego tekstu, 3:1 dla dużego (WCAG 2.2).',
  },
  type: {
    title: 'Typografia',
    lead: (heading: string | null, body: string | null) =>
      [heading && `Nagłówki: ${heading}.`, body && `Tekst: ${body}.`].filter(Boolean).join(' '),
    styles: { h1: 'Nagłówek 1', h2: 'Nagłówek 2', h3: 'Nagłówek 3', p: 'Tekst', a: 'Link' },
    spacing: (value: number | null, lang: Lang) => `odstęp liter ${value === null ? 'normalny' : `${decimal(value, lang)}%`}`,
    families: 'Kroje',
    shareOfText: (percent: number) => `${percent}% tekstu`,
    weights: (list: string) => `Grubości w użyciu: ${list}.`,
    source: (list: string) => `Źródło plików: ${list}.`,
    sources: { google: 'Google Fonts', adobe: 'Adobe Fonts', bunny: 'Bunny Fonts', self: 'własny serwer', other: 'inny serwer', unknown: 'nie ustalono' },
    sizes: (count: number, list: string) =>
      `Rozmiary tekstu na stronie głównej: ${count} ${plural(count, ['rozmiar', 'różne', 'różnych'], 'pl')} (${list} px).`,
    licence: 'Plików fontów nie dołączamy do brandbooka. Sprawdź licencję każdego kroju przed użyciem poza stroną.',
    images: 'Próbki krojów o nieznanej licencji to obrazy zrobione na stronie, bez osadzania fontu.',
  },
  ui: {
    title: 'Interfejs i wygląd',
    buttons: 'Przyciski z działającej strony',
    nav: 'Nawigacja',
    radii: 'Zaokrąglenia',
    screens: 'Strona na komputerze i telefonie',
    character: 'Charakter',
    rebuilt: 'Online przyciski są odtworzone ze stylów strony, a nie sfotografowane.',
  },
  dark: {
    title: 'Ciemny motyw',
    lead: (toggle: string | null) =>
      toggle
        ? `Strona ma ciemny motyw włączany przełącznikiem (na elemencie <html>: ${toggle}).`
        : 'Strona ma ciemny motyw, który włącza się według ustawienia systemu.',
    pairs: 'Te same tokeny w obu motywach',
    light: 'jasny',
    dark: 'ciemny',
    palette: 'Kolory ciemnego motywu',
    base: (hex: string) => `Tło strony w ciemnym motywie: ${hex}.`,
    screen: 'Strona w ciemnym motywie',
    more: (count: number) => `I ${count} ${plural(count, ['kolejny token', 'kolejne tokeny', 'kolejnych tokenów'], 'pl')} w plikach tokenów.`,
    noShot: 'Online pokazujemy kolory ciemnego motywu bez zrzutu, bo ramka, w której czytamy stronę, nie uruchamia jej skryptów. Zrzut zrobisz w terminalu.',
  },
  tone: {
    title: 'Ton komunikacji i spójność',
    how: 'Jak marka mówi',
    address: 'Zwracanie się do klienta',
    addressValue: { informal: 'na „Ty”', formal: 'na „Pan/Pani”', impersonal: 'bezosobowo', unknown: 'nie ustalono' } as Record<
      ToneSection['address'],
      string
    >,
    sentence: 'Średnia długość zdania',
    // A fraction takes "słowa" in Polish (9,4 słowa), whole numbers follow the usual forms
    words: (n: number, lang: Lang) =>
      `${decimal(n, lang)} ${Number.isInteger(n) ? plural(n, ['słowo', 'słowa', 'słów'], 'pl') : 'słowa'}`,
    headings: 'Wielkość liter w nagłówkach',
    caseValue: {
      sentence: 'zdaniem (wielka litera tylko na początku)',
      title: 'każde słowo wielką literą',
      upper: 'wersalikami',
      mixed: 'różnie',
      unknown: 'nie ustalono',
    } as Record<ToneSection['headingCase'], string>,
    examples: 'Przykłady ze strony',
    ctas: 'Wezwania do działania',
    consistency: 'Spójność marki',
    none: 'Nie znaleźliśmy niespójności.',
  },
  page: {
    sections: 'Sekcje brandbooka',
    format: 'Format kolorów',
    copyHint: 'Kliknij kolor, żeby skopiować jego wartość.',
    copy: 'Kopiuj',
    copied: 'Skopiowano',
    copyStack: 'Kopiuj font-family',
    token: 'token',
    noTypeImage:
      'Próbki bez obrazka są złożone krojem Geist, bo wersja HTML nie osadza fontów marki. Prawdziwy krój widać w PDF (gdy licencja pozwala) i na stronie.',
    tokens: {
      title: 'Tokeny do kodu',
      lead: 'Kolory, kroje, style tekstu i zaokrąglenia jako pliki do projektu. Ciemny motyw włącza ustawienie systemu albo atrybut data-theme="dark", a w Tailwindzie także klasa dark.',
      download: 'Pobierz plik',
      usage: {
        css: (example: string) => `Dołącz plik do strony i używaj zmiennych, np. var(${example}).`,
        json: 'Format Design Tokens (DTCG) dla narzędzi takich jak Style Dictionary. Wartości ciemnego motywu są w $extensions.',
        tailwind: (example: string) => `W pliku CSS: @import "tailwindcss"; i @import "./tailwind.css"; potem klasy, np. ${example}.`,
      },
    },
    footer: (host: string, date: string, mode: string) => `Odczytano automatycznie ze strony ${host} · ${date} · ${mode}. Wygenerowano narzędziem sitelens.`,
  },
  pkg: {
    screenshots: 'zrzuty',
    desktop: 'komputer',
    phone: 'telefon',
    dark: 'ciemny-motyw',
    nav: 'nawigacja',
    logo: 'logo-z-naglowka',
    button: 'przycisk',
    inlineLogo: 'logo-z-kodu-strony',
    sourcesFile: 'ZRODLA.md',
    inlineSource: (url: string) => `logo zapisane w kodzie strony ${url}`,
    sourcesDoc: (host: string, files: { name: string; source: string }[]) =>
      `# Źródła plików logo\n\nPliki pobrane bez zmian ze strony ${host}. Logo i znaki należą do właściciela marki; brandbook je tylko opisuje.\n\n${files.map((f) => `- \`${f.name}\`: ${f.source}`).join('\n')}\n`,
    readme: (book: Brandbook, formats: string[]) => `# Brandbook ${book.name}

Odczytany automatycznie ze strony ${book.url} narzędziem sitelens ${book.mode === 'cli' ? 'w terminalu' : 'online'}, ${book.generatedAt.slice(0, 10)}.

## Co jest w paczce

${[
formats.includes('pdf') && '- `brandbook.pdf`: brandbook do czytania i druku (A4 w poziomie)',
formats.includes('html') && '- `brandbook.html`: wersja interaktywna, działa bez internetu: kopiowanie kolorów i krojów, podgląd tokenów',
formats.includes('tokens') && '- `tokens.json`: tokeny w formacie Design Tokens (DTCG), z wartościami dla ciemnego motywu w `$extensions`',
formats.includes('tokens') && '- `tokens.css`: te same tokeny jako zmienne CSS, z ciemnym motywem',
formats.includes('tokens') && '- `tailwind.css`: motyw dla Tailwind CSS 4 (blok `@theme`), z ciemnym motywem',
'- `logo/`: pliki logo i ikon pobrane bez zmian ze strony, z adresami w `ZRODLA.md`',
'- `zrzuty/`: strona na komputerze i telefonie, ciemny motyw, nawigacja, przyciski (to, co udało się zrobić)',
formats.includes('json') && '- `brandbook.json`: wszystkie odczytane dane',
]
.filter(Boolean)
.join('\n')}

## Fakty i propozycje

To, co odczytaliśmy ze strony (kolory, kroje, logo, przyciski), to fakty. Pole ochronne, minimalne rozmiary, zakazy i opis charakteru to propozycje, oznaczone w brandbooku jako „propozycja”, do zatwierdzenia przez człowieka.

## Licencje

Logo i znaki należą do właściciela marki. Plików fontów nie dołączamy; nazwy krojów i ich źródła są w brandbooku. W PDF osadzamy tylko kroje na otwartych licencjach (np. z Google Fonts), a wersja HTML nie osadza żadnych. Kolory CMYK są przeliczone orientacyjnie; przed drukiem potwierdź je z drukarnią.
`,
  },
  character: (c: UiSection['character']) => {
    const theme = c.theme === 'dark' ? 'Ciemny' : 'Jasny';
    const contrast = { high: 'wysoki kontrast', medium: 'średni kontrast', low: 'niski kontrast' }[c.contrast];
    const palette = { muted: 'stonowana paleta', moderate: 'umiarkowanie nasycona paleta', vivid: 'wyrazista paleta' }[c.saturation];
    const corners = { sharp: 'ostre narożniki', rounded: 'zaokrąglone narożniki', pill: 'przyciski w kształcie pigułki' }[c.corners];
    const extras = [c.glass && 'szklane, rozmyte powierzchnie', c.gradients && 'gradienty'].filter(Boolean).join(' i ');
    const dark = c.hasDarkTheme ? 'Strona ma też ciemny motyw.' : c.theme === 'dark' ? 'Strona ma tylko ciemny motyw.' : '';
    return `${theme} charakter: ${contrast}, ${palette}, ${corners}${extras ? `, ${extras}` : ''}. ${dark}`.trim();
  },
  suggestion: (s: Suggestion, lang: Lang): string => {
    switch (s.kind) {
      case 'near-colors':
        return `Bardzo podobne kolory w tokenach: ${s.pairs.map((p) => `${p.a} i ${p.b} (ΔE ${decimal(p.deltaE, lang)})`).join('; ')}. Różnicy prawie nie widać, więc do rozważenia: czy wszystkie są potrzebne.`;
      case 'stray-colors':
        return `Na stronie są kolory spoza tokenów: ${s.colors.map((c) => c.hex).join(', ')}. Do rozważenia: dodać je do tokenów albo zastąpić istniejącymi.`;
      case 'unused-fonts':
        return `Zadeklarowane, ale nieużywane na stronie głównej kroje: ${s.families.join(', ')}. Jeśli to zamierzone, warto usunąć deklaracje; jeśli nie, strona używa innego kroju, niż zakłada marka.`;
      case 'many-sizes':
        return `Strona używa ${s.count} różnych rozmiarów tekstu. Spójna skala zwykle mieści się w 6–9 rozmiarach.`;
      case 'many-radii':
        return `Na stronie jest ${s.count} różnych zaokrągleń narożników. Kilka wartości ze skali wystarcza.`;
      case 'theme-color':
        return `Kolor paska przeglądarki (theme-color ${s.themeColor}) różni się od tła strony (${s.base}).`;
      case 'pages-differ':
        return `Podstrona ${new URL(s.page).pathname} różni się od strony głównej: ${[
          s.fonts.length && `inne kroje (${s.fonts.join(', ')})`,
          s.buttons.length && `inny kolor głównego przycisku (${s.buttons[1]} zamiast ${s.buttons[0]})`,
        ]
          .filter(Boolean)
          .join(', ')}.`;
    }
  },
};

export type BrandbookStrings = typeof pl;

const en: BrandbookStrings = {
  brandbook: 'Brandbook',
  coverLead: (host) =>
    `Brand rules read from the live website ${host}: logo, colours, typography, interface elements and tone of voice.`,
  generated: 'Made with sitelens',
  footer: (host, date, mode) => `Read automatically from ${host} · ${date} · ${mode}`,
  mode: { cli: 'in the terminal', online: 'online' },
  headerTitle: (name) => `${name} brandbook`,
  continued: 'continued',
  proposal: 'proposal',
  suggestions: 'suggestions',
  approximate: 'approximate',
  limited:
    'The site builds its content with scripts, so online we read only what is in its HTML. Make the full brandbook in the terminal.',
  logo: {
    title: 'Logo',
    lead: 'The mark and the logotype in the versions found on the site.',
    none: 'We found no logo on the site. Below are the icons and the image the site gives browsers.',
    variant: {
      dark: 'Logo on a dark background',
      light: 'Logo on a light background',
      mark: 'Mark',
      header: 'Logo from the site header',
      icon: 'App icon',
      share: 'Share image',
    },
    files: 'Files found on the site',
    inline: 'logo in the page code (SVG)',
    clearSpace: 'Clear space',
    clearSpaceText: (px) =>
      `Leave at least half the logo's height around it (about ${px} px on the site). The site does not state this, so the value needs approval.`,
    minSize: 'Minimum size',
    minSizeText: (lockup, mark) =>
      `Logo with the name: at least ${lockup} px wide. The mark alone: at least ${mark} px. The favicon covers smaller uses.`,
    dont: 'What not to do with the logo',
    prohibitions: {
      stretch: 'do not stretch or squash it',
      recolour: 'do not change its colours',
      effects: 'do not add shadows or effects',
      rotate: 'do not rotate it',
      busyBackground: 'do not place it on photos or patterns without contrast',
    },
    owner: 'The logo and marks belong to the brand owner. This brandbook only describes them.',
  },
  colors: {
    title: 'Colours',
    lead: 'The palette read from the site’s CSS tokens, grouped by what the colours are actually used for.',
    leadPalette: 'The site has no colour tokens, so the palette comes from the colours visible on the homepage.',
    roles: {
      background: 'Backgrounds and surfaces',
      text: 'Text',
      accent: 'Accents',
      line: 'Lines',
      state: 'State colours',
      neutral: 'Other neutrals',
    },
    logo: 'Colours in the mark',
    share: (percent, role) =>
      `${percent}% of ${{ background: 'backgrounds', text: 'text', line: 'lines' }[role as 'background' | 'text' | 'line'] ?? 'the page'}`,
    inTokens: 'in tokens',
    note: (fromTokens) =>
      `${fromTokens ? 'Names come from the site’s CSS tokens.' : 'Colour names chosen by sitelens.'} * CMYK converted roughly from RGB. Before printing, confirm the colours with the printer (a proof or a Pantone guide).`,
  },
  practice: {
    title: 'Colours in use',
    proportions: 'Colour proportions on the site',
    proportionsNote: 'Share of each colour in the backgrounds, text and lines of the homepage.',
    contrast: 'Readability of text and background pairs',
    levels: { AA: 'AA', 'AA-large': 'large text', fail: 'too low' },
    contrastNote: 'AA: contrast of at least 4.5:1 for normal text, 3:1 for large text (WCAG 2.2).',
  },
  type: {
    title: 'Typography',
    lead: (heading, body) => [heading && `Headings: ${heading}.`, body && `Text: ${body}.`].filter(Boolean).join(' '),
    styles: { h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', p: 'Body text', a: 'Link' },
    spacing: (value, lang) => `letter spacing ${value === null ? 'normal' : `${decimal(value, lang)}%`}`,
    families: 'Typefaces',
    shareOfText: (percent) => `${percent}% of text`,
    weights: (list) => `Weights in use: ${list}.`,
    source: (list) => `Files served from: ${list}.`,
    sources: { google: 'Google Fonts', adobe: 'Adobe Fonts', bunny: 'Bunny Fonts', self: 'the site’s own server', other: 'another server', unknown: 'not known' },
    sizes: (count, list) => `Text sizes on the homepage: ${count} different (${list} px).`,
    licence: 'Font files are not included with the brandbook. Check each typeface’s licence before using it outside the site.',
    images: 'Samples of typefaces with an unknown licence are pictures taken on the site, with no font embedded.',
  },
  ui: {
    title: 'Interface and look',
    buttons: 'Buttons from the live site',
    nav: 'Navigation',
    radii: 'Corner radii',
    screens: 'The site on a computer and a phone',
    character: 'Character',
    rebuilt: 'Online, the buttons are rebuilt from the site’s styles rather than photographed.',
  },
  dark: {
    title: 'Dark theme',
    lead: (toggle) =>
      toggle
        ? `The site has a dark theme turned on by a switch (on the <html> element: ${toggle}).`
        : 'The site has a dark theme that follows the system setting.',
    pairs: 'The same tokens in both themes',
    light: 'light',
    dark: 'dark',
    palette: 'Dark theme colours',
    base: (hex) => `Page background in the dark theme: ${hex}.`,
    screen: 'The site in the dark theme',
    more: (count) => `And ${count} more ${count === 1 ? 'token' : 'tokens'} in the token files.`,
    noShot: 'Online we show the dark theme’s colours without a screenshot, because the frame we read the site in does not run its scripts. The terminal takes the screenshot.',
  },
  tone: {
    title: 'Tone of voice and consistency',
    how: 'How the brand speaks',
    address: 'Addressing the customer',
    addressValue: { informal: 'directly (“you”)', formal: 'formally', impersonal: 'impersonally', unknown: 'not known' },
    sentence: 'Average sentence length',
    words: (n, lang) => `${decimal(n, lang)} words`,
    headings: 'Capitalisation of headings',
    caseValue: {
      sentence: 'sentence case',
      title: 'Title Case',
      upper: 'all capitals',
      mixed: 'mixed',
      unknown: 'not known',
    },
    examples: 'Examples from the site',
    ctas: 'Calls to action',
    consistency: 'Brand consistency',
    none: 'We found no inconsistencies.',
  },
  page: {
    sections: 'Brandbook sections',
    format: 'Colour format',
    copyHint: 'Click a colour to copy its value.',
    copy: 'Copy',
    copied: 'Copied',
    copyStack: 'Copy font-family',
    token: 'token',
    noTypeImage:
      'Samples without a picture are set in Geist, because the HTML version embeds no brand fonts. The real typeface shows in the PDF (where the licence allows) and on the site.',
    tokens: {
      title: 'Tokens for code',
      lead: 'Colours, typefaces, text styles and radii as files for your project. The dark theme follows the system setting or the data-theme="dark" attribute, and in Tailwind also the dark class.',
      download: 'Download the file',
      usage: {
        css: (example) => `Link the file and use the variables, for example var(${example}).`,
        json: 'The Design Tokens format (DTCG) for tools such as Style Dictionary. Dark theme values are in $extensions.',
        tailwind: (example) => `In your CSS: @import "tailwindcss"; and @import "./tailwind.css"; then classes such as ${example}.`,
      },
    },
    footer: (host, date, mode) => `Read automatically from ${host} · ${date} · ${mode}. Made with sitelens.`,
  },
  pkg: {
    screenshots: 'screenshots',
    desktop: 'desktop',
    phone: 'phone',
    dark: 'dark-theme',
    nav: 'navigation',
    logo: 'logo-from-header',
    button: 'button',
    inlineLogo: 'logo-from-page-code',
    sourcesFile: 'SOURCES.md',
    inlineSource: (url) => `logo drawn in the code of ${url}`,
    sourcesDoc: (host, files) =>
      `# Sources of the logo files\n\nFiles downloaded unchanged from ${host}. The logo and marks belong to the brand owner; this brandbook only describes them.\n\n${files.map((f) => `- \`${f.name}\`: ${f.source}`).join('\n')}\n`,
    readme: (book, formats) => `# ${book.name} brandbook

Read automatically from ${book.url} with sitelens ${book.mode === 'cli' ? 'in the terminal' : 'online'}, ${book.generatedAt.slice(0, 10)}.

## What is in the package

${[
formats.includes('pdf') && '- `brandbook.pdf`: the brandbook to read and print (A4 landscape)',
formats.includes('html') && '- `brandbook.html`: the interactive version, works offline: copy colours and typefaces, preview the tokens',
formats.includes('tokens') && '- `tokens.json`: tokens in the Design Tokens format (DTCG), with dark theme values in `$extensions`',
formats.includes('tokens') && '- `tokens.css`: the same tokens as CSS variables, with the dark theme',
formats.includes('tokens') && '- `tailwind.css`: a Tailwind CSS 4 theme (an `@theme` block), with the dark theme',
'- `logo/`: logo and icon files downloaded unchanged from the site, with their addresses in `SOURCES.md`',
'- `screenshots/`: the site on a computer and a phone, the dark theme, the navigation, the buttons (whichever could be taken)',
formats.includes('json') && '- `brandbook.json`: all the data that was read',
]
.filter(Boolean)
.join('\n')}

## Facts and proposals

What we read from the site (colours, typefaces, logo, buttons) is fact. Clear space, minimum sizes, the don'ts and the description of the character are proposals, marked "proposal" in the brandbook, for a person to approve.

## Licences

The logo and marks belong to the brand owner. Font files are not included; the typeface names and their sources are in the brandbook. The PDF embeds only typefaces under open licences (for example from Google Fonts), and the HTML version embeds none. CMYK colours are rough conversions; confirm them with the printer before printing.
`,
  },
  character: (c) => {
    const theme = c.theme === 'dark' ? 'Dark' : 'Light';
    const contrast = { high: 'high contrast', medium: 'medium contrast', low: 'low contrast' }[c.contrast];
    const palette = { muted: 'a muted palette', moderate: 'a moderately saturated palette', vivid: 'a vivid palette' }[c.saturation];
    const corners = { sharp: 'sharp corners', rounded: 'rounded corners', pill: 'pill-shaped buttons' }[c.corners];
    const extras = [c.glass && 'frosted glass surfaces', c.gradients && 'gradients'].filter(Boolean).join(' and ');
    const dark = c.hasDarkTheme ? 'The site also has a dark theme.' : c.theme === 'dark' ? 'The site has only a dark theme.' : '';
    return `${theme} character: ${contrast}, ${palette}, ${corners}${extras ? `, ${extras}` : ''}. ${dark}`.trim();
  },
  suggestion: (s, lang) => {
    switch (s.kind) {
      case 'near-colors':
        return `Very similar colours in the tokens: ${s.pairs.map((p) => `${p.a} and ${p.b} (ΔE ${decimal(p.deltaE, lang)})`).join('; ')}. The difference is barely visible, so consider whether all of them are needed.`;
      case 'stray-colors':
        return `The site uses colours outside its tokens: ${s.colors.map((c) => c.hex).join(', ')}. Consider adding them to the tokens or replacing them with existing ones.`;
      case 'unused-fonts':
        return `Typefaces declared but not used on the homepage: ${s.families.join(', ')}. If that is on purpose, remove the declarations; if not, the site uses another typeface than the brand intends.`;
      case 'many-sizes':
        return `The site uses ${s.count} different text sizes. A consistent scale usually fits in 6–9 sizes.`;
      case 'many-radii':
        return `The site uses ${s.count} different corner radii. A few values from a scale are enough.`;
      case 'theme-color':
        return `The browser bar colour (theme-color ${s.themeColor}) differs from the page background (${s.base}).`;
      case 'pages-differ':
        return `The page ${new URL(s.page).pathname} differs from the homepage: ${[
          s.fonts.length && `other typefaces (${s.fonts.join(', ')})`,
          s.buttons.length && `another main button colour (${s.buttons[1]} instead of ${s.buttons[0]})`,
        ]
          .filter(Boolean)
          .join(', ')}.`;
    }
  },
};

export const brandbookStrings: Record<Lang, BrandbookStrings> = { pl, en };

