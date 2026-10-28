export const pl = {
  lang: 'pl',
  locale: 'pl_PL',
  meta: {
    ogImageAlt:
      'Logo sitelens, hasło „Audyt strony, który zrozumie każdy” i okładka przykładowego raportu PDF z wynikiem 71 na 100.',
    title: 'sitelens – audyt strony, który zrozumie każdy',
    description:
      'Darmowy audyt strony z raportem PDF pisanym prostym językiem: co jest nie tak, dlaczego to ważne i jak to naprawić. Online albo jedną komendą w terminalu.',
  },
  skipLink: 'Przejdź do treści',
  nav: {
    label: 'Główna',
    home: 'sitelens, strona główna',
    links: [
      { href: '/#sprawdza', label: 'Co sprawdza' },
      { href: '/#raport', label: 'Raport' },
      { href: '/#start', label: 'Jak zacząć' },
      { href: '/#faq', label: 'FAQ' },
      { href: '/brandbook/', label: 'Brandbook' },
    ],
    check: 'Sprawdź stronę',
    otherLang: { short: 'EN', label: 'EN – English version', hreflang: 'en' },
    github: 'sitelens na GitHubie',
    menuOpen: 'Menu',
    themeToDark: 'Włącz ciemny motyw',
    themeToLight: 'Włącz jasny motyw',
  },
  hero: {
    title: 'Audyt strony, który zrozumie każdy.',
    lead: 'sitelens sprawdza wydajność, SEO, dostępność i bezpieczeństwo strony, a potem prostym językiem mówi, co poprawić i dlaczego.',
    form: {
      label: 'Adres strony',
      placeholder: 'twojastrona.pl',
      submit: 'Sprawdź stronę',
      privacy:
        'Adres sprawdza Google PageSpeed Insights i nasz serwer, który pobiera publiczną treść strony tylko na czas audytu i niczego nie zapisuje. Sprawdzając stronę, akceptujesz [regulamin]({terms}).',
    },
    terminal: {
      heading: 'Wolisz terminal?',
      command: 'npx sitelens https://twojastrona.pl',
      copy: 'Kopiuj',
      copied: 'Skopiowano',
      copiedAnnouncement: 'Komenda skopiowana do schowka',
      guide: 'Instrukcja dla macOS, Windows i Linuxa',
    },
    stage: {
      caption: 'Przykładowy audyt strony przykladowa-firma.pl',
      replay: 'Odtwórz ponownie',
      coverAlt: 'Okładka przykładowego raportu sitelens dla przykladowa-firma.pl z wynikiem ogólnym 71 na 100',
      command: 'npx sitelens https://przykladowa-firma.pl',
      crawling: 'Sprawdzam 12 podstron',
      categories: [
        { label: 'Wydajność', score: 58 },
        { label: 'SEO', score: 76 },
        { label: 'Dostępność', score: 69 },
        { label: 'Bezpieczeństwo', score: 82 },
      ],
      overall: 71,
      overallLabel: 'Wynik ogólny',
      saved: 'Raport zapisany: raport.pdf',
      mac: {
        windowTitle: 'przykladowa-firma.pl — sitelens',
        menu: ['Terminal', 'Powłoka', 'Edycja', 'Widok', 'Okno', 'Pomoc'],
        time: '9:41',
        terminalTitle: 'Terminal — zsh',
        pdfTitle: 'raport.pdf',
        notifApp: 'sitelens',
        notifTime: 'teraz',
        notifTitle: 'Audyt zakończony',
        notifBody: 'Wynik ogólny 71/100. Raport zapisany na dysku.',
        dock: {
          files: 'Pliki',
          browser: 'Przeglądarka',
          mail: 'Poczta',
          notes: 'Notatki',
          terminal: 'Terminal',
          preview: 'Podgląd',
          settings: 'Ustawienia',
          trash: 'Kosz',
        },
      },
      badges: [
        { icon: 'performance', label: 'Wczytanie głównej treści', value: '4,1 s', state: 'critical' },
        { icon: 'seo', label: 'Opis dla Google', value: 'brak na 8 z 12 podstron', state: 'important' },
        { icon: 'security', label: 'Certyfikat', value: 'ważny do 14.03.2027', state: 'good' },
      ],
    },
  },
  checks: {
    id: 'sprawdza',
    title: 'Co sprawdza sitelens',
    lead: 'Cztery obszary, które decydują o tym, czy klient znajdzie stronę, doczeka się jej i bez kłopotu z niej skorzysta. Każdy wynik pochodzi z konkretnego testu.',
    performance: {
      title: 'Wydajność',
      desc: 'Jak szybko strona pojawia się na telefonie i czy nic na niej nie skacze.',
      items: ['Czas wczytania głównej treści', 'Przesunięcia układu i reakcja na kliknięcie', 'Waga i format zdjęć'],
      specimen: {
        label: 'Przykład: główna treść pojawia się po 4,1 s, a dobry wynik to mniej niż 2,5 s.',
        metric: 'Wczytanie głównej treści',
        value: '4,1 s',
        good: 'Dobrze: poniżej 2,5 s',
        ticks: ['0 s', '2,5 s', '4 s', '5 s'],
      },
    },
    seo: {
      title: 'SEO',
      desc: 'Czy Google dobrze rozumie stronę i może pokazywać ją w wynikach.',
      items: ['Tytuł i opis każdej podstrony', 'Mapa strony i robots.txt', 'Martwe linki i przekierowania'],
      specimen: {
        label: 'Przykład: wynik w Google bez opisu podstrony.',
        url: 'przykladowa-firma.pl › oferta',
        resultTitle: 'Oferta | Przykładowa Firma',
        missing: 'Brak opisu – Google pokaże przypadkowy fragment tekstu',
      },
    },
    accessibility: {
      title: 'Dostępność',
      desc: 'Czy skorzysta z niej każdy, także bez myszki i z czytnikiem ekranu.',
      items: ['Pola formularzy bez opisów', 'Kontrast tekstu', 'Przyciski i linki bez nazwy'],
      specimen: {
        label: 'Przykład: pole formularza bez etykiety. Czytnik ekranu mówi tylko „pole tekstowe”.',
        reads: 'Czytnik ekranu:',
        without: '„pole tekstowe”',
        with: '„E-mail, pole tekstowe”',
        field: 'E-mail',
      },
    },
    security: {
      title: 'Bezpieczeństwo',
      desc: 'Czy połączenie jest szyfrowane i czy serwer chroni odwiedzających.',
      items: ['HTTPS i certyfikat', 'Pliki ładowane bez szyfrowania', 'Nagłówki bezpieczeństwa'],
      specimen: {
        label: 'Przykład: HTTPS działa, ale brakuje polityki bezpieczeństwa treści, a dwa pliki są ładowane bez szyfrowania.',
        rows: [
          { name: 'HTTPS i certyfikat', state: 'good', value: 'ważny do 14.03.2027' },
          { name: 'Strict-Transport-Security', state: 'good', value: 'jest' },
          { name: 'Content-Security-Policy', state: 'important', value: 'brak' },
          { name: 'Pliki przez http://', state: 'important', value: '2' },
        ],
      },
    },
  },
  report: {
    id: 'raport',
    title: 'Raport, który można przekazać dalej',
    lead: 'Sześć stron A4. Najpierw to, od czego zacząć, potem każdy problem po kolei, a na końcu szczegóły techniczne dla developera.',
    region: 'Przykładowy raport',
    prev: 'Poprzednia strona',
    next: 'Następna strona',
    pageOf: 'Strona {n} z {total}',
    thumbs: 'Strony raportu',
    thumb: 'Pokaż stronę {n}: {title}',
    alt: 'Strona {n} przykładowego raportu: {title}',
    download: 'Pobierz przykładowy raport',
    downloadMeta: 'PDF, 400 KB',
    pages: [
      { title: 'Okładka', desc: 'Wynik ogólny, wyniki czterech obszarów i jedno zdanie podsumowania.' },
      { title: 'Najważniejsze w skrócie', desc: 'Liczba problemów według priorytetu, pięć rzeczy na start i to, co działa dobrze.' },
      { title: 'Wydajność', desc: 'Kluczowe metryki z progami i pełne karty problemów: co jest nie tak, dlaczego to ważne, jak to naprawić.' },
      { title: 'SEO', desc: 'Ważniejsze problemy w pełnych kartach, drobne w skrócie.' },
      { title: 'Dostępność i bezpieczeństwo', desc: 'Przy każdym problemie: kto go naprawia i ile to pracy.' },
      { title: 'Załącznik techniczny', desc: 'Identyfikatory, szczegóły i adresy dla developera oraz opis, jak liczymy wynik.' },
    ],
  },
  plain: {
    title: 'Bez żargonu',
    lead: 'Każdy problem opisujemy tak, żeby właściciel strony wiedział, co zrobić, a developer – gdzie szukać.',
    rawLabel: 'Typowe narzędzie',
    raw: 'Largest Contentful Paint exceeds threshold (4.1 s)',
    oursLabel: 'sitelens',
    ours: 'Strona ładuje się za wolno na telefonie. Główna treść pojawia się po 4,1 s, a dobry wynik to mniej niż 2,5 s.',
    meta: 'Kto naprawia: Developer. Nakład pracy: Średni.',
    note: 'Nazwy metryk i szczegóły techniczne są w załączniku raportu.',
  },
  start: {
    id: 'start',
    title: 'Dwie drogi do tego samego raportu',
    lead: 'W przeglądarce, bez instalowania czegokolwiek, albo jedną komendą w terminalu.',
    online: {
      title: 'W przeglądarce',
      steps: ['Wklej adres strony.', 'Poczekaj, aż audyt się skończy.', 'Pobierz raport PDF.'],
      cta: 'Sprawdź stronę online',
    },
    terminal: {
      title: 'W terminalu',
      steps: [
        'Zainstaluj Node.js 22.19 lub nowszy albo sam sitelens jedną komendą z instrukcji.',
        'Uruchom komendę i wybierz strzałkami język, adres i tryb:',
        'Otwórz raport.pdf.',
      ],
      command: 'npx sitelens',
      guide: 'Instrukcja krok po kroku dla macOS, Windows i Linuxa',
    },
    ci: {
      title: 'W GitHub Actions',
      text: 'Dodaj audyt do każdego wdrożenia. Opcja `--fail-under` zatrzyma build, gdy wynik spadnie poniżej progu, a raport trafi do artefaktów.',
      file: '.github/workflows/sitelens.yml',
      yaml: `name: sitelens
on:
  push:
    branches: [main]
  pull_request:
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npx --yes sitelens https://twojastrona.pl --fail-under 80 --out raport.pdf
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: raport-sitelens
          path: raport.pdf`,
    },
    copy: 'Kopiuj',
    copied: 'Skopiowano',
    copiedAnnouncement: 'Skopiowano do schowka',
  },
  brandSection: {
    id: 'brandbook',
    title: 'Brandbook z linku',
    lead: 'Osobne narzędzie sitelens: wklej adres strony, a odczytamy z niej logo, kolory, typografię i ton komunikacji i złożymy brandbook z gotowymi tokenami do kodu.',
    cta: 'Wygeneruj brandbook',
    stage: {
      caption: 'Przykładowy brandbook strony sitelens.pl',
      panel: 'Brandbook',
      groups: { logo: 'Logo', type: 'Typografia', colors: 'Kolory', ui: 'Przyciski i pola', files: 'Pliki' },
      colors: [
        { token: 'accent', name: 'Kobalt' },
        { token: 'text', name: 'Grafit' },
        { token: 'text-2', name: 'Łupek' },
        { token: 'line', name: 'Szron' },
        { token: 'bg', name: 'Mgła' },
        { token: 'surface', name: 'Perła' },
      ],
      fonts: { sans: 'Nagłówki i tekst', mono: 'Komendy i kod' },
      logoOnLight: 'Logo na jasnym tle',
      logoOnAccent: 'Logo na kobalcie',
      summary: '15 kolorów, 2 kroje, ciemny motyw',
    },
  },
  oss: {
    title: 'Otwarty kod na licencji MIT',
    lead: 'Możesz sprawdzić, jak liczymy każdy wynik, zgłosić pomysł albo dopisać własne sprawdzenie. Każde ma kartę porady pisaną prostym językiem.',
    repo: 'Zobacz kod na GitHubie',
    issues: 'Zgłoś pomysł',
    cardLabel: 'Przykładowa karta porady',
    cardFile: 'cards/seo/meta-description.yaml',
    card: `id: seo/meta-description
priority: important
whoFixes: owner
effort: small
pl:
  title: "{count} z {total} podstron nie ma opisu dla Google"
  whatIsWrong: >
    Podstrony nie mają krótkiego opisu, który Google
    pokazuje pod tytułem w wynikach wyszukiwania.
  whyItMatters: >
    Bez opisu Google wybiera przypadkowy fragment tekstu.
  howToFix:
    - Otwórz podstronę w panelu i znajdź pole „Opis”.
    - Napisz jedno lub dwa zdania, do ok. 150 znaków.`,
  },
  faq: {
    id: 'faq',
    title: 'Pytania i odpowiedzi',
    items: [
      {
        q: 'Czy sitelens jest darmowy?',
        a: 'Tak. Wersja online i narzędzie w terminalu są darmowe, a kod jest otwarty na licencji MIT.',
      },
      {
        q: 'Czy potrzebuję klucza API?',
        a: 'Nie. Przy dużym ruchu wersja online może poprosić o własny, darmowy klucz Google PageSpeed Insights. Funkcje AI są opcjonalne i działają tylko na Twoim kluczu Anthropic, który zostaje w przeglądarce.',
      },
      {
        q: 'Czy dane mojej strony są gdzieś wysyłane?',
        a: 'Narzędzie w terminalu działa w całości na Twoim komputerze. W wersji online adres trafia do Google PageSpeed Insights, a publiczna treść strony przechodzi przez nasz serwer tylko na czas audytu i nie jest zapisywana. Wyniki i raport powstają w Twojej przeglądarce. Szczegóły są w [polityce prywatności]({privacy}).',
      },
      {
        q: 'Czy audyt coś zmienia na mojej stronie?',
        a: 'Nie. sitelens pobiera tylko publiczne strony, tak jak zwykły odwiedzający. Niczego nie wysyła do formularzy i niczego nie zapisuje na serwerze.',
      },
      {
        q: 'Czym to się różni od samego Lighthouse?',
        a: 'Lighthouse mierzy jedną podstronę i opisuje wyniki językiem developera. sitelens korzysta z Lighthouse i axe-core, dokłada własne sprawdzenia (np. nagłówki bezpieczeństwa, mapę strony, przekierowania), sprawdza kilka podstron naraz i każdy problem tłumaczy na konkretne kroki w raporcie PDF.',
      },
      {
        q: 'Na jakich systemach działa narzędzie w terminalu?',
        a: 'Na macOS, Windows i Linuxie. Jedna komenda instaluje wszystko, czego sitelens potrzebuje, a jeśli masz Node.js 22.19 lub nowszy, wystarczy `npx sitelens`. Zobacz [instrukcję krok po kroku]({terminal}).',
      },
    ],
  },
  footer: {
    tagline: 'Audyt strony, który zrozumie każdy.',
    product: 'Produkt',
    project: 'Projekt',
    contact: 'Kontakt',
    links: {
      checks: 'Co sprawdza',
      report: 'Przykładowy raport',
      start: 'Jak zacząć',
      terminal: 'Instrukcja dla terminala',
      audit: 'Sprawdź stronę online',
      brandbook: 'Brandbook z linku',
      repo: 'Kod na GitHubie',
      issues: 'Zgłoś pomysł',
      license: 'Licencja MIT',
      privacy: 'Polityka prywatności',
      terms: 'Regulamin',
    },
    oss: 'sitelens to projekt open source na licencji MIT.',
    builtBy: 'Built by Revize Studio',
  },
  terminalPage: {
    title: 'Jak sprawdzić stronę w terminalu – sitelens',
    description:
      'Instrukcja krok po kroku dla macOS, Windows i Linuxa: instalacja sitelens jedną komendą, wybór języka i trybu audytu, raport PDF na dysku.',
    heading: 'Sprawdź stronę w terminalu',
    lead: 'Instrukcja krok po kroku dla macOS, Windows i Linuxa. Zajmie kilka minut, a na końcu masz na dysku raport PDF.',
    tabs: 'System operacyjny',
    mac: {
      name: 'macOS',
      steps: [
        { title: 'Otwórz Terminal', body: 'Naciśnij ⌘ Cmd + spacja, wpisz „Terminal” i naciśnij Enter.' },
        {
          title: 'Zainstaluj sitelens',
          body: 'Wklej komendę i naciśnij Enter. Instalator pobierze Node.js z nodejs.org i sitelens do Twojego folderu domowego (folder .sitelens). Nie potrzeba hasła administratora, a całość trwa około minuty.',
          code: 'curl -fsSL https://sitelens.pl/install.sh | sh',
        },
        { title: 'Otwórz nowe okno Terminala', body: 'Naciśnij ⌘ Cmd + N. Nowe okno zna już komendę sitelens.' },
        {
          title: 'Uruchom sitelens',
          body: 'Wpisz komendę i naciśnij Enter. Strzałkami wybierz język raportu, wklej adres strony i wybierz tryb: szybki, standardowy albo dokładny.',
          code: 'sitelens',
        },
        {
          title: 'Poczekaj na wynik',
          body: 'W terminalu zobaczysz postęp sprawdzania wydajności, SEO, dostępności i bezpieczeństwa. Nie zamykaj okna, dopóki audyt się nie skończy.',
        },
        {
          title: 'Otwórz raport',
          body: 'Na koniec sitelens pokaże, gdzie zapisał raport. Naciśnij Enter, a raport się otworzy. Plik raport.pdf zostaje w Twoim folderze domowym (w Finderze: Idź → Folder domowy).',
        },
      ],
    },
    windows: {
      name: 'Windows',
      steps: [
        { title: 'Otwórz PowerShell', body: 'Kliknij Start, wpisz „PowerShell” i naciśnij Enter.' },
        {
          title: 'Zainstaluj sitelens',
          body: 'Wklej komendę i naciśnij Enter. Instalator pobierze Node.js z nodejs.org i sitelens do Twojego folderu użytkownika. Nie potrzeba uprawnień administratora, a całość trwa około minuty.',
          code: 'irm https://sitelens.pl/install.ps1 | iex',
        },
        {
          title: 'Otwórz nowe okno PowerShella',
          body: 'Zamknij okno i otwórz PowerShell jeszcze raz. Nowe okno zna już komendę sitelens.',
        },
        {
          title: 'Uruchom sitelens',
          body: 'Wpisz komendę i naciśnij Enter. Strzałkami wybierz język raportu, wklej adres strony i wybierz tryb: szybki, standardowy albo dokładny.',
          code: 'sitelens',
        },
        {
          title: 'Poczekaj na wynik',
          body: 'W oknie zobaczysz postęp sprawdzania wydajności, SEO, dostępności i bezpieczeństwa. Nie zamykaj go, dopóki audyt się nie skończy.',
        },
        {
          title: 'Otwórz raport',
          body: 'Na koniec sitelens pokaże, gdzie zapisał raport. Naciśnij Enter, a raport się otworzy. Plik raport.pdf zostaje w Twoim folderze użytkownika (C:\\Users\\Twoja nazwa).',
        },
      ],
    },
    linux: {
      name: 'Linux',
      steps: [
        {
          title: 'Otwórz terminal',
          body: 'Naciśnij Ctrl + Alt + T albo znajdź „Terminal” w menu aplikacji.',
        },
        {
          title: 'Zainstaluj sitelens',
          body: 'Wklej komendę (w terminalu: Ctrl + Shift + V) i naciśnij Enter. Instalator pobierze Node.js z nodejs.org i sitelens do Twojego folderu domowego (folder .sitelens). Nie potrzeba sudo, a całość trwa około minuty. Jeśli system nie ma curl, wpisz `wget -qO- https://sitelens.pl/install.sh | sh`.',
          code: 'curl -fsSL https://sitelens.pl/install.sh | sh',
        },
        {
          title: 'Otwórz nowe okno terminala',
          body: 'Zamknij terminal i otwórz go jeszcze raz. Nowe okno zna już komendę sitelens.',
        },
        {
          title: 'Uruchom sitelens',
          body: 'Wpisz komendę i naciśnij Enter. Strzałkami wybierz język raportu, wklej adres strony i wybierz tryb: szybki, standardowy albo dokładny. sitelens potrzebuje przeglądarki Chrome, Chromium, Edge albo Brave. Jeśli na komputerze jest tylko Firefox, najpierw uruchom `sitelens --install-browser`.',
          code: 'sitelens',
        },
        {
          title: 'Poczekaj na wynik',
          body: 'W terminalu zobaczysz postęp sprawdzania wydajności, SEO, dostępności i bezpieczeństwa. Nie zamykaj okna, dopóki audyt się nie skończy.',
        },
        {
          title: 'Otwórz raport',
          body: 'Na koniec sitelens pokaże, gdzie zapisał raport. Naciśnij Enter, a raport otworzy się w domyślnej przeglądarce PDF. Plik raport.pdf zostaje w Twoim folderze domowym.',
        },
      ],
    },
    alternative: {
      title: 'Masz już Node.js?',
      body: 'Jeśli masz Node.js w wersji 22.19 lub nowszej, instalator nie jest potrzebny: uruchom audyt przez npx. Przy pierwszym uruchomieniu i po każdej aktualizacji npm zapyta, czy pobrać pakiet („Ok to proceed?”), wystarczy nacisnąć Enter. W PowerShellu wpisz `npx.cmd` zamiast `npx`. Node.js zainstalujesz z [nodejs.org](https://nodejs.org), na macOS także przez `brew install node`, a na Windows przez `winget install OpenJS.NodeJS.LTS`. Na Linuxie Node.js z repozytorium dystrybucji bywa za stary, więc sprawdź wersję komendą `node -v`.',
      code: 'npx sitelens',
    },
    expected: 'Tak wygląda zakończony audyt',
    options: {
      title: 'Przydatne opcje',
      items: [
        { code: 'sitelens https://twojastrona.pl', text: 'Audyt bez pytań: rusza od razu dla podanego adresu.' },
        { code: '--pages 20', text: 'Sprawdza więcej podstron. Domyślnie 10, najwyżej 50.' },
        { code: '--lang en', text: 'Raport po angielsku.' },
        { code: '--out raport-sklep.pdf', text: 'Zapisuje raport pod wybraną nazwą lub w wybranym folderze.' },
        { code: '--json', text: 'Zapisuje też surowe wyniki w formacie JSON.' },
      ],
    },
    problems: {
      title: 'Gdy coś nie działa',
      items: [
        {
          q: 'Terminal nie zna komendy sitelens',
          a: 'Otwórz nowe okno terminala, bo to otwarte przed instalacją nie widzi jeszcze nowej komendy. Jeśli to nie pomoże, uruchom komendę instalacyjną jeszcze raz.',
        },
        {
          q: "„command not found: npx” albo „Nazwa 'npx' nie jest rozpoznawana jako polecenie”",
          a: 'Node.js nie jest zainstalowany albo terminal był otwarty przed instalacją. Zamknij terminal, otwórz go ponownie i spróbuj jeszcze raz.',
        },
        {
          q: 'PowerShell: błąd z plikiem „npx.ps1” i odnośnikiem do „about_Execution_Policies”',
          a: 'To domyślne zabezpieczenie Windows, które blokuje skrypty PowerShella. Wpisz `npx.cmd` zamiast `npx` (działa w PowerShellu i w Wierszu polecenia) albo użyj Wiersza polecenia.',
        },
        {
          q: 'Komunikat o brakującej przeglądarce',
          a: 'sitelens otwiera stronę w przeglądarce opartej na Chromium: Chrome, Edge, Brave albo Chromium. Jeśli na komputerze nie ma żadnej, uruchom `sitelens --install-browser` i powtórz audyt.',
        },
        {
          q: 'Linux: Chromium pobrane przez --install-browser się nie uruchamia',
          a: 'Na serwerze bez środowiska graficznego, w WSL albo w minimalnej instalacji systemu może brakować bibliotek, których potrzebuje Chromium. Zainstaluj wtedy Google Chrome z pakietu .deb albo .rpm ze strony [google.com/chrome](https://www.google.com/chrome/): menedżer pakietów doinstaluje, czego brakuje.',
        },
        {
          q: 'Strona nie odpowiada albo audyt się przerywa',
          a: 'Sprawdź, czy adres jest poprawny i czy strona otwiera się w przeglądarce. Stron dostępnych tylko po zalogowaniu nie da się sprawdzić.',
        },
      ],
    },
    online: 'Nie chcesz niczego instalować? [Sprawdź stronę online]({audit}).',
  },
  legal: { toc: 'Spis treści' },
  privacyPage: {
    title: 'Polityka prywatności – sitelens',
    description:
      'Jakie dane przetwarza serwis sitelens, audyt online i brandbook online, w jakim celu, komu je przekazujemy, jak długo je przechowujemy i jakie masz prawa.',
    heading: 'Polityka prywatności',
    updated: 'Wersja z 27 października 2026 r.',
    intro:
      'W skrócie: strona nie używa ciasteczek ani analityki, audyt online i brandbook online nie zapisują treści sprawdzanych stron ani wyników, a narzędzie w terminalu działa w całości na Twoim komputerze. Poniżej szczegóły wymagane przez RODO.',
    numbering: '',
    sections: [
      {
        title: 'Administrator danych',
        body: [
          'Administratorem danych osobowych jest REVIZE STUDIO sp. z o.o. z siedzibą w Lubaniu, ul. Młynarska 6, 59-800 Lubań, KRS 0001208852, NIP 6131598053 („my”).',
          'We wszystkich sprawach dotyczących danych osobowych napisz na [kontakt@revize.pl](mailto:kontakt@revize.pl).',
        ],
      },
      {
        title: 'Czego dotyczy polityka',
        body: [
          'Polityka dotyczy serwisu sitelens („Serwis”), w tym audytu online i generatora brandbooka online („Brandbook online”), oraz kontaktu z nami. Narzędzie sitelens uruchamiane w terminalu („CLI”) działa na Twoim komputerze – opisujemy je w osobnym punkcie.',
        ],
      },
      {
        title: 'Jakie dane, w jakim celu i na jakiej podstawie',
        body: [
          '• Odwiedziny Serwisu: adres IP, informacje o przeglądarce i urządzeniu, data i adres odwiedzanej podstrony, zapisywane technicznie w logach serwera. Cel: dostarczenie Serwisu, jego bezpieczeństwo i wykrywanie nadużyć. Podstawa: nasz prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO).',
          '• Audyt online: adres sprawdzanej strony, adres IP, dane techniczne potrzebne Cloudflare Turnstile do odróżnienia człowieka od bota oraz techniczne dane zapytań do naszego serwera pośredniczącego (bez treści i wyników). Cel: przeprowadzenie audytu na Twoje żądanie i ochrona przed nadużyciami. Podstawa: wykonanie usługi (art. 6 ust. 1 lit. b RODO) oraz prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO).',
          '• Brandbook online: adres strony, z której powstaje brandbook, adres IP, dane techniczne potrzebne Cloudflare Turnstile oraz techniczne dane zapytań do serwera pośredniczącego, który pobiera kod strony, arkusze stylów, fonty i obrazy (bez treści i wyników). Brandbook, tokeny i paczka ZIP powstają w Twojej przeglądarce i trafiają tylko na Twoje urządzenie. Cel i podstawa: jak przy audycie online.',
          '• Treść sprawdzanej strony: publiczne strony mogą zawierać dane osobowe, np. imiona, dane kontaktowe lub zdjęcia osób, które mogą też trafić na zrzuty ekranu w brandbooku. Serwer pośredniczący pobiera je tylko na czas audytu lub brandbooka i niczego nie zapisuje, a analiza odbywa się w Twojej przeglądarce. Podstawa: prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO).',
          '• Kontakt i reklamacje: adres e-mail, imię i treść wiadomości. Cel: odpowiedź, rozpatrzenie reklamacji i ewentualna obrona przed roszczeniami. Podstawa: prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO), a przy reklamacjach także wykonanie usługi i obowiązek prawny (art. 6 ust. 1 lit. b i c RODO).',
        ],
      },
      {
        title: 'Czego nie robimy',
        body: [
          'Nie używamy ciasteczek, narzędzi analitycznych ani pikseli reklamowych. Nie profilujemy, nie sprzedajemy danych i nie podejmujemy wobec Ciebie zautomatyzowanych decyzji wywołujących skutki prawne (art. 22 RODO). Audyt automatycznie ocenia strony internetowe, nie osoby.',
        ],
      },
      {
        title: 'Pamięć przeglądarki',
        body: [
          'W pamięci Twojej przeglądarki (localStorage) zapisujemy wybrany motyw: jasny albo ciemny.',
          'Jeśli podasz własny klucz Google PageSpeed Insights lub Anthropic, zostaje on w Twojej przeglądarce: w sessionStorage do zamknięcia karty albo w localStorage, jeśli zaznaczysz „Zapamiętaj na tym urządzeniu”. Nie wysyłamy go na nasz serwer i możesz go usunąć w każdej chwili.',
          'Na stronach audytu i brandbooka Cloudflare Turnstile może zapisywać w przeglądarce dane niezbędne do sprawdzenia, że korzysta z niej człowiek.',
          'To przechowywanie jest niezbędne do działania funkcji, z których świadomie korzystasz, dlatego zgodnie z przepisami Prawa komunikacji elektronicznej nie wymaga zgody.',
        ],
      },
      {
        title: 'Odbiorcy danych',
        body: [
          '• Vercel Inc. (USA) – hosting Serwisu; przetwarza adres IP i dane techniczne zapytań zapisywane w logach serwera,',
          '• Cloudflare, Inc. – serwer pośredniczący (Cloudflare Workers) i ochrona przed botami (Turnstile),',
          '• Google LLC i Google Ireland Limited – adres sprawdzanej strony trafia do PageSpeed Insights, także przy brandbooku online (po zrzuty ekranu strony),',
          '• Anthropic PBC – tylko gdy korzystasz z funkcji AI na własnym kluczu; dane wysyłasz wtedy bezpośrednio ze swojej przeglądarki, a Anthropic przetwarza je na swoich zasadach,',
          '• GitHub, Inc. – gdy odwiedzasz repozytorium sitelens,',
          '• nasz dostawca poczty e-mail – przy korespondencji,',
          '• organy publiczne – wyłącznie gdy wymagają tego przepisy.',
        ],
      },
      {
        title: 'Przekazywanie danych poza EOG',
        body: [
          'Vercel, Cloudflare, Google, Anthropic i GitHub mogą przetwarzać dane w Stanach Zjednoczonych. Przekazanie odbywa się na podstawie decyzji Komisji Europejskiej stwierdzającej odpowiedni stopień ochrony (EU-US Data Privacy Framework) – w przypadku podmiotów objętych certyfikacją – albo standardowych klauzul umownych zatwierdzonych przez Komisję Europejską.',
        ],
      },
      {
        title: 'Jak długo przechowujemy dane',
        body: [
          '• treść sprawdzanych stron, wyniki audytów i brandbooki – nie przechowujemy ich wcale,',
          '• logi techniczne – przez okres ustawiony w Vercel i Cloudflare, nie dłużej, niż jest to potrzebne do celów bezpieczeństwa,',
          '• korespondencja i reklamacje – do załatwienia sprawy, a potem do upływu terminu przedawnienia roszczeń,',
          '• dane w Twojej przeglądarce – dopóki ich nie usuniesz.',
        ],
      },
      {
        title: 'Twoje prawa',
        body: [
          'Masz prawo dostępu do danych, ich sprostowania, usunięcia i ograniczenia przetwarzania, prawo do przenoszenia danych (gdy podstawą jest umowa) oraz prawo sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie.',
          'Żeby skorzystać z tych praw, napisz na [kontakt@revize.pl](mailto:kontakt@revize.pl). Odpowiemy w ciągu miesiąca.',
          'Masz też prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).',
        ],
      },
      {
        title: 'Czy musisz podać dane',
        body: [
          'Podanie adresu sprawdzanej strony jest dobrowolne, ale bez niego nie przeprowadzimy audytu ani nie przygotujemy brandbooka. Podanie danych w korespondencji jest dobrowolne.',
        ],
      },
      {
        title: 'Narzędzie w terminalu',
        body: [
          'CLI działa w całości na Twoim komputerze i nie wysyła nam żadnych danych, także przy tworzeniu brandbooka (`sitelens brand`), którego zrzuty ekranu robi przeglądarka na Twoim komputerze. Adres strony trafia do Google tylko wtedy, gdy użyjesz opcji `--psi-key`, a wybrane fragmenty treści do Anthropic tylko z opcją `--ai`.',
          'Instalator ze strony (install.sh i install.ps1) pobiera Node.js z serwisu nodejs.org (OpenJS Foundation) i pakiet sitelens z rejestru npm (npm, Inc., część GitHub) prosto na Twój komputer, tak samo jak komenda `npx sitelens`. Te serwisy widzą wtedy Twój adres IP i przetwarzają go na własnych zasadach. My nie dostajemy żadnych danych.',
        ],
      },
      {
        title: 'Bezpieczeństwo',
        body: [
          'Serwis działa wyłącznie przez HTTPS i ma ścisłą politykę bezpieczeństwa treści (CSP). Zbieramy tylko dane niezbędne do działania usług, nie przechowujemy wyników audytów ani brandbooków, a serwer pośredniczący nie łączy się z adresami w sieciach prywatnych.',
        ],
      },
      {
        title: 'Zmiany polityki',
        body: [
          'Aktualna wersja polityki jest zawsze dostępna w Serwisie z datą obowiązywania. O istotnych zmianach informujemy w Serwisie.',
        ],
      },
    ],
  },
  termsPage: {
    title: 'Regulamin serwisu sitelens – audyt stron',
    description:
      'Zasady korzystania z serwisu sitelens, audytu online, brandbooka online i narzędzia w terminalu: usługi, zakazane działania, odpowiedzialność, reklamacje.',
    heading: 'Regulamin',
    updated: 'Wersja z 27 października 2026 r.',
    intro:
      'Najważniejsze w skrócie: usługi są bezpłatne, audyt i brandbook pobierają tylko publiczne strony, raport i brandbook mają charakter informacyjny, a z serwisu nie wolno korzystać w sposób, który szkodzi innym.',
    numbering: '§',
    sections: [
      {
        title: 'Postanowienia ogólne',
        body: [
          'Regulamin określa zasady korzystania z serwisu sitelens („Serwis”), w tym z audytu online i generatora brandbooka online, oraz zasady udostępniania narzędzia sitelens uruchamianego w terminalu („CLI”).',
          'Usługodawcą jest REVIZE STUDIO sp. z o.o. z siedzibą w Lubaniu, ul. Młynarska 6, 59-800 Lubań, wpisana do rejestru przedsiębiorców KRS pod numerem 0001208852, NIP 6131598053 („Usługodawca”, „my”). Kontakt: [kontakt@revize.pl](mailto:kontakt@revize.pl).',
          'Regulamin jest regulaminem, o którym mowa w art. 8 ustawy z dnia 18 lipca 2002 r. o świadczeniu usług drogą elektroniczną. Jest dostępny bezpłatnie w Serwisie w formie, która pozwala go pobrać, utrwalić i wydrukować.',
          'Korzystając z Serwisu, w szczególności uruchamiając audyt online lub generując brandbook, akceptujesz Regulamin. Jeśli go nie akceptujesz, nie korzystaj z Serwisu.',
        ],
      },
      {
        title: 'Definicje',
        body: [
          '• Użytkownik – osoba fizyczna, osoba prawna lub jednostka organizacyjna korzystająca z Serwisu lub CLI.',
          '• Konsument – Użytkownik będący konsumentem w rozumieniu art. 22¹ Kodeksu cywilnego. Postanowienia dotyczące Konsumenta stosuje się także do osoby fizycznej zawierającej umowę bezpośrednio związaną z jej działalnością gospodarczą, gdy umowa nie ma dla niej charakteru zawodowego.',
          '• Audyt – automatyczne sprawdzenie publicznie dostępnej strony internetowej wskazanej przez Użytkownika („Sprawdzana strona”).',
          '• Raport – wynik Audytu w formie podglądu, pliku PDF lub danych JSON.',
          '• Brandbook – automatycznie przygotowane zestawienie identyfikacji wizualnej Sprawdzanej strony (logo, kolory, typografia, wygląd interfejsu i ton komunikacji) w formie podglądu, pliku PDF, tokenów (pliki JSON i CSS) i paczki ZIP.',
          '• Pośrednik – nasz serwer w Cloudflare Workers, który na czas Audytu online lub generowania Brandbooka online pobiera publiczne zasoby Sprawdzanej strony.',
          '• Klucz API – klucz Użytkownika do usług Google PageSpeed Insights lub Anthropic.',
        ],
      },
      {
        title: 'Usługi i wymagania techniczne',
        body: [
          'Nieodpłatnie udostępniamy treści Serwisu, umożliwiamy przeprowadzenie Audytu online i wygenerowanie Brandbooka online – Raport i Brandbook powstają w przeglądarce Użytkownika – oraz udostępniamy kod źródłowy i CLI.',
          'Umowa o przeprowadzenie Audytu online lub wygenerowanie Brandbooka online zostaje zawarta z chwilą jego uruchomienia i wygasa z chwilą jego zakończenia, przerwania lub zamknięcia strony. Przeglądanie Serwisu nie wymaga rejestracji.',
          'CLI działa na urządzeniu Użytkownika. Korzystanie z kodu źródłowego i CLI regulują postanowienia licencji MIT dołączonej do repozytorium, a Regulamin – w zakresie, którego licencja nie reguluje.',
          'Do korzystania z Serwisu potrzebne jest urządzenie z dostępem do internetu i aktualna przeglądarka (Chrome, Edge, Firefox lub Safari) z włączonym JavaScriptem. Do korzystania z CLI potrzebny jest Node.js w wersji 22.19 lub nowszej albo instalator ze strony, który pobiera Node.js sam.',
          'Audyt online i Brandbook online korzystają z usług zewnętrznych (Google PageSpeed Insights, Cloudflare), które mają własne limity. Nie gwarantujemy nieprzerwanej dostępności Serwisu. Możemy ograniczać liczbę Audytów i Brandbooków, przerywać je, czasowo wyłączać Serwis lub jego części (np. na czas prac technicznych, awarii lub w razie nadużyć) i zmieniać zakres funkcji.',
        ],
      },
      {
        title: 'Jak działają Audyt i Brandbook',
        body: [
          'Audyt online jest pasywny: pobiera tylko publiczne zasoby Sprawdzanej strony metodą GET, tak jak zwykły odwiedzający. Nie wysyła formularzy, nie loguje się i nie próbuje obchodzić zabezpieczeń.',
          'Pośrednik łączy się wyłącznie z adresami w sieci publicznej (protokoły http i https, porty 80 i 443), respektuje plik robots.txt i nie zapisuje pobranych treści ani wyników.',
          'Testy aktywne (np. wyszukiwanie publicznie dostępnych plików wrażliwych) są dostępne wyłącznie w CLI po włączeniu opcji `--owner`. Włączając tę opcję, Użytkownik potwierdza, że Sprawdzana strona należy do niego albo że ma zgodę jej właściciela.',
          'Brandbook online działa tak samo pasywnie: Pośrednik pobiera kod strony, jej arkusze stylów, fonty i obrazy, a przeglądarka Użytkownika wyświetla stronę bez uruchamiania jej skryptów i odczytuje z niej logo, kolory i kroje pisma. Zrzuty ekranu pochodzą z Google PageSpeed Insights.',
          'Użytkownik odpowiada za to, jakie strony sprawdza i jak wykorzystuje Raport i Brandbook.',
        ],
      },
      {
        title: 'Zakazane działania',
        body: [
          'Z Serwisu i CLI korzystaj zgodnie z prawem, Regulaminem i dobrymi obyczajami. W szczególności zabronione jest:',
          '• dostarczanie lub wskazywanie treści o charakterze bezprawnym,',
          '• wykorzystywanie Serwisu, Pośrednika lub CLI do działań, które mogą zakłócić działanie Sprawdzanej strony, Serwisu lub infrastruktury innych osób, w tym do ataków typu DoS,',
          '• masowe lub zautomatyzowane uruchamianie Audytów online lub generowanie Brandbooków online (boty, skrypty, scrapery) bez naszej zgody oraz obchodzenie limitów, Cloudflare Turnstile i innych zabezpieczeń,',
          '• używanie Pośrednika jako serwera proxy do celów innych niż Audyt lub Brandbook, w tym do omijania blokad, ukrywania tożsamości lub pobierania zasobów z sieci wewnętrznych,',
          '• próby nieuprawnionego dostępu do Serwisu, jego infrastruktury lub danych oraz testowanie bezpieczeństwa Serwisu bez naszej zgody (podatności zgłaszaj zgodnie z plikiem `/.well-known/security.txt`),',
          '• uruchamianie testów aktywnych CLI wobec stron, do których Użytkownik nie ma uprawnień,',
          '• wykorzystywanie Raportów do przygotowania ataków lub innych działań niezgodnych z prawem,',
          '• przedstawianie Brandbooka jako oficjalnej księgi znaku właściciela marki bez jego zgody oraz wykorzystywanie Brandbooka do podszywania się pod markę, w tym do tworzenia stron lub materiałów, które mogą wprowadzić w błąd co do ich pochodzenia,',
          '• przedstawianie zmienionego Raportu lub Brandbooka jako wyniku wygenerowanego przez sitelens, sugerowanie, że Raport lub Brandbook przygotował lub zatwierdził Usługodawca, oraz używanie oznaczeń „sitelens” i „Revize Studio” w sposób sugerujący naszą rekomendację, współpracę lub certyfikację.',
          'W razie naruszenia Regulaminu lub uzasadnionego podejrzenia nadużycia możemy, także bez uprzedzenia, przerwać Audyt lub generowanie Brandbooka, zablokować dostęp do Serwisu z danego adresu IP lub urządzenia i odmówić dalszego świadczenia usług. Możemy też zawiadomić właściwe organy.',
        ],
      },
      {
        title: 'Charakter Raportu',
        body: [
          'Raport jest wynikiem automatycznych testów przeprowadzonych w określonym momencie i ma charakter wyłącznie informacyjny i edukacyjny.',
          'Raport nie jest poradą prawną, audytem bezpieczeństwa w rozumieniu testów penetracyjnych, certyfikatem zgodności (np. z WCAG, European Accessibility Act lub RODO) ani gwarancją pozycji w wynikach wyszukiwania.',
          'Wyniki mogą różnić się między pomiarami (zwłaszcza wydajność), zależą od dostawców zewnętrznych i mogą nie obejmować wszystkich problemów Sprawdzanej strony.',
          'Zmiany na stronie na podstawie Raportu wprowadzasz na własną odpowiedzialność. Przed zmianami zrób kopię zapasową, a w sprawach prawnych i bezpieczeństwa skonsultuj się ze specjalistą.',
          'Gdy wynik ogólny jest niższy niż 70 na 100, Raport zawiera krótką informację, że poprawkami albo nową stroną może zająć się Usługodawca (Revize Studio), z linkiem do revize.pl. Skorzystanie z tej propozycji jest dobrowolne i nie wpływa na wynik Audytu.',
          'Opcjonalne propozycje tekstów generowane przez AI powstają automatycznie na Kluczu API Użytkownika, mogą być nieprecyzyjne lub nieprawdziwe i wymagają sprawdzenia przed użyciem. Nie wpływają na wynik Audytu.',
        ],
      },
      {
        title: 'Charakter Brandbooka',
        body: [
          'Brandbook powstaje automatycznie z tego, co Sprawdzana strona pokazuje publicznie w chwili generowania. Nie jest oficjalną księgą znaku właściciela marki i nie zastępuje pracy projektanta.',
          'To, co odczytano ze strony (np. kolory, kroje pisma, pliki logo), Brandbook podaje jako fakty. Pole ochronne, minimalne rozmiary logo, zakazy i opisy charakteru marki to propozycje z widoczną etykietą „propozycja”, które przed użyciem musi zatwierdzić człowiek.',
          'Brandbook online jest w części przybliżony (np. przyciski odtworzone ze stylów, brak zrzutu ciemnego motywu, tryb ograniczony dla stron budowanych JavaScriptem). Takie części są w nim oznaczone, a stopka mówi, czy Brandbook powstał online, czy w CLI.',
          'Logo, znaki towarowe, zrzuty ekranu i treści Sprawdzanej strony należą do ich właścicieli, a Brandbook nie daje do nich żadnych praw. Plików fontów nie dołączamy: Brandbook podaje nazwę i źródło kroju, a w pliku PDF osadza krój tylko wtedy, gdy jego licencja na to pozwala.',
          'Z Brandbooka korzystaj zgodnie z prawami właściciela marki: dla własnej marki, za zgodą właściciela albo w zakresie dozwolonym przez prawo, np. do analizy lub w ramach prawa cytatu.',
        ],
      },
      {
        title: 'Klucze API i usługi zewnętrzne',
        body: [
          'Możesz podać własny Klucz API. Klucz jest przechowywany wyłącznie w Twojej przeglądarce, a zapytania z jego użyciem trafiają bezpośrednio do dostawcy, z pominięciem naszego serwera. Nie mamy dostępu do Twojego Klucza API.',
          'Odpowiadasz za bezpieczeństwo Klucza API na swoim urządzeniu, za koszty jego użycia i za przestrzeganie warunków jego dostawcy.',
          'Korzystanie z usług Google, Cloudflare, Anthropic i GitHub podlega także warunkom tych dostawców.',
        ],
      },
      {
        title: 'Odpowiedzialność',
        body: [
          'Usługi świadczymy nieodpłatnie i z należytą starannością, bez gwarancji przydatności Raportu i Brandbooka do określonego celu.',
          'W najszerszym zakresie dopuszczalnym przez prawo nie odpowiadamy za szkody wynikłe z korzystania z Serwisu, CLI, Raportu lub Brandbooka, w tym za utracone korzyści, utratę danych, przerwy w działaniu Sprawdzanej strony lub Serwisu, działania dostawców usług zewnętrznych oraz koszty użycia Kluczy API.',
          'Wobec Użytkowników niebędących Konsumentami nasza łączna odpowiedzialność związana z korzystaniem z Serwisu i CLI jest ograniczona do kwoty 100 zł.',
          'Ograniczenia odpowiedzialności nie dotyczą szkód wyrządzonych umyślnie ani przypadków, w których wyłączenie lub ograniczenie odpowiedzialności jest niedopuszczalne na mocy bezwzględnie obowiązujących przepisów, w szczególności przepisów chroniących Konsumentów.',
          'Użytkownik odpowiada za szkody wyrządzone nam lub osobom trzecim przez korzystanie z Serwisu lub CLI w sposób sprzeczny z prawem lub Regulaminem i – w granicach dopuszczalnych przez prawo – zwalnia nas z odpowiedzialności wobec osób trzecich w tym zakresie.',
        ],
      },
      {
        title: 'Własność intelektualna',
        body: [
          'Kod źródłowy sitelens, w tym biblioteka kart porad, jest udostępniony na licencji MIT. Licencja nie obejmuje prawa do używania nazwy i logo sitelens ani oznaczeń Revize Studio.',
          'Nazwa i logo sitelens, identyfikacja wizualna Serwisu, teksty i grafiki Serwisu oraz przykładowy Raport i przykładowy Brandbook są chronione prawem. Bez naszej zgody nie wolno ich kopiować ani rozpowszechniać poza zakresem dozwolonego użytku.',
          'Raporty i Brandbooki wygenerowane dla sprawdzanych przez Ciebie stron możesz swobodnie wykorzystywać, w tym przekazywać współpracownikom i klientom, z zastrzeżeniem praw właściciela marki do logo, znaków, treści i krojów pisma.',
        ],
      },
      {
        title: 'Dane osobowe',
        body: ['Zasady przetwarzania danych osobowych opisuje [Polityka prywatności]({privacy}).'],
      },
      {
        title: 'Reklamacje',
        body: [
          'Reklamacje dotyczące Serwisu zgłaszaj na adres [kontakt@revize.pl](mailto:kontakt@revize.pl). Opisz problem i podaj adres e-mail do odpowiedzi.',
          'Reklamację rozpatrujemy w ciągu 14 dni od jej otrzymania i odpowiadamy na adres e-mail, z którego przyszło zgłoszenie.',
          'Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń, np. z pomocy miejskiego lub powiatowego rzecznika konsumentów albo wojewódzkiego inspektoratu Inspekcji Handlowej. Informacje są dostępne w serwisie prawakonsumenta.uokik.gov.pl.',
        ],
      },
      {
        title: 'Zmiany Regulaminu',
        body: [
          'Możemy zmienić Regulamin z ważnych przyczyn, w szczególności z powodu zmiany przepisów, zmiany funkcji Serwisu lub potrzeby ochrony przed nadużyciami.',
          'O zmianie informujemy w Serwisie co najmniej 7 dni przed jej wejściem w życie. Do Audytów i Brandbooków uruchomionych wcześniej stosuje się dotychczasowy Regulamin.',
        ],
      },
      {
        title: 'Postanowienia końcowe',
        body: [
          'Regulamin podlega prawu polskiemu. Wybór prawa nie pozbawia Konsumenta ochrony przysługującej mu na podstawie przepisów, których nie można wyłączyć w drodze umowy, obowiązujących w państwie jego zwykłego pobytu.',
          'Spory z Użytkownikami niebędącymi Konsumentami rozstrzyga sąd właściwy dla siedziby Usługodawcy.',
          'Jeśli któreś postanowienie Regulaminu okaże się nieważne, pozostałe pozostają w mocy.',
          'Regulamin obowiązuje od 25 października 2026 r., a postanowienia dotyczące Brandbooka od 27 października 2026 r., kiedy ta usługa została udostępniona. W razie rozbieżności między wersjami językowymi rozstrzyga wersja polska.',
        ],
      },
    ],
  },
  auditPage: {
    title: 'Sprawdź stronę online – sitelens',
    description:
      'Audyt strony online z raportem PDF pisanym prostym językiem. Do czasu startu wersji online sprawdzisz stronę jedną komendą w terminalu.',
    heading: 'Sprawdź stronę online',
    soon: 'Wersja online jest w przygotowaniu. Do tego czasu sprawdzisz stronę na swoim komputerze jedną komendą. Raport będzie taki sam.',
    guide: 'Pierwszy raz w terminalu? [Instrukcja krok po kroku dla macOS, Windows i Linuxa]({terminal}).',
    back: 'Wróć na stronę główną',
    online: {
      description:
        'Wklej adres strony i dostań raport PDF pisany prostym językiem: wydajność, SEO, dostępność i bezpieczeństwo, do 10 podstron.',
      lead: 'Wklej adres strony. Sprawdzimy do 10 podstron, a raport powstanie w Twojej przeglądarce.',
      reportLang: 'Język raportu',
      more: 'W terminalu dostaniesz więcej danych: do 50 podstron zamiast 10, sprawdzenie certyfikatu, pełny zestaw reguł dostępności axe-core na stronie po uruchomieniu JavaScriptu i do 150 sprawdzonych linków. [Jak uruchomić audyt w terminalu]({terminal}).',
      progress: 'Sprawdzam {domain}',
      steps: {
        human: 'Sprawdzam, czy nie jesteś robotem (Cloudflare Turnstile)',
        preflight: 'Łączę się ze stroną',
        discover: 'Szukam podstron',
        pages: 'Pobieram podstrony',
        pagespeed: 'Mierzę szybkość i dostępność (Google PageSpeed Insights)',
        report: 'Tworzę raport',
      },
      done: 'Raport dla {domain}',
      overall: 'Wynik ogólny: {score} na 100.',
      notMeasured: 'Wyniku ogólnego nie dało się policzyć.',
      categories: { performance: 'Wydajność', seo: 'SEO', accessibility: 'Dostępność', security: 'Bezpieczeństwo' },
      categoryNotMeasured: 'nie zmierzono',
      pdf: 'Pobierz PDF',
      pdfHint:
        'W oknie drukowania wybierz „Zapisz jako PDF”. Na iPhonie i iPadzie stuknij w nim ikonę udostępniania i wybierz „Zachowaj w Plikach”.',
      json: 'Pobierz dane (JSON)',
      again: 'Sprawdź inną stronę',
      retry: 'Spróbuj ponownie',
      preview: 'Podgląd raportu',
      partial:
        'Wersja online nie sprawdza certyfikatu, a dostępność ocenia regułami, które uruchamia Lighthouse. Pełny audyt zrobisz na swoim komputerze:',
      warnings: 'Części danych nie udało się zebrać ({count}). Szczegóły są w pliku JSON.',
      errors: {
        'invalid-url': 'To nie wygląda na adres strony. Wpisz go w postaci twojastrona.pl.',
        dns: 'Nie ma takiej domeny: {detail}. Sprawdź, czy w adresie nie ma literówki.',
        unreachable: 'Strona nie odpowiada. Sprawdź, czy otwiera się w przeglądarce, i spróbuj ponownie.',
        robots:
          'Plik robots.txt tej strony nie pozwala robotom jej odwiedzać albo nie da się go teraz odczytać, więc nie sprawdzamy jej online.',
        blocked: 'Tego adresu nie sprawdzimy online, bo nie prowadzi do publicznej strony.',
        tls: 'Certyfikat bezpieczeństwa tej strony jest nieważny, a przeglądarki pokażą przy niej ostrzeżenie. Szczegóły pokaże audyt na Twoim komputerze.',
        'http-error': 'Strona odpowiada błędem {detail}. Jeśli wymaga logowania, sprawdź ją na swoim komputerze.',
        'not-html': 'Pod tym adresem nie ma strony, tylko plik typu {detail}.',
        human: 'Nie udało się potwierdzić, że nie jesteś robotem. Odśwież stronę i spróbuj ponownie.',
        pass: 'Audyt trwał za długo i jego przepustka wygasła. Spróbuj ponownie.',
        limit:
          'Dzienny limit wersji online się wyczerpał albo usługa jest chwilowo niedostępna. Spróbuj jutro albo sprawdź stronę na swoim komputerze.',
        unknown: 'Coś poszło nie tak: {detail}. Spróbuj ponownie albo sprawdź stronę na swoim komputerze.',
      },
      cli: 'Na swoim komputerze sprawdzisz każdą stronę, bez limitów:',
      pagespeed: {
        quota:
          'Dzisiejszy limit Google PageSpeed Insights się wyczerpał, więc szybkości i dostępności nie zmierzyliśmy. Wklej własny darmowy klucz, a dokończymy pomiar.',
        key: 'Klucz PageSpeed Insights nie zadziałał. Sprawdź, czy jest poprawny i czy nie jest ograniczony do innej domeny.',
        finish: 'Dokończ pomiar',
      },
      keys: {
        summary: 'Własny klucz PageSpeed Insights (opcjonalnie)',
        text: 'Domyślnie używamy naszego klucza. Gdy jego dzienny limit się wyczerpie, możesz użyć własnego, darmowego. Klucz zostaje w tej karcie przeglądarki i nie trafia do nas. W Google Cloud ogranicz go tylko do PageSpeed Insights API. [Jak założyć klucz]({howto}).',
        label: 'Klucz API',
        save: 'Używaj tego klucza',
        remove: 'Usuń klucz',
        saved: 'Audyt użyje Twojego klucza.',
      },
    },
  },
  brandbookPage: {
    title: 'Brandbook z linku do strony – sitelens',
    description:
      'Wklej adres strony i dostań brandbook: logo, kolory, typografia, elementy interfejsu i ton komunikacji odczytane z działającej strony, z gotowymi tokenami do kodu.',
    heading: 'Brandbook z linku do strony.',
    lead: 'Logo, kolory, typografia i ton komunikacji odczytane z działającej strony, z gotowymi tokenami do kodu.',
    form: {
      label: 'Adres strony',
      placeholder: 'twojastrona.pl',
      submit: 'Generuj brandbook',
      privacy:
        'Stronę czyta nasz pośrednik, a zrzuty robi Google PageSpeed Insights; niczego nie zapisujemy. Generując brandbook, akceptujesz [regulamin]({terms}).',
    },
    soon: 'Wersja online jest teraz wyłączona. Brandbook zrobisz w terminalu jedną komendą.',
    progress: 'Czytam markę {domain}',
    steps: {
      human: 'Sprawdzam, czy nie jesteś robotem (Cloudflare Turnstile)',
      page: 'Łączę się ze stroną',
      styles: 'Pobieram style, fonty i logo',
      render: 'Odczytuję kolory, typografię i interfejs',
      pages: 'Porównuję podstrony',
      screenshots: 'Robię zrzuty strony (Google PageSpeed Insights)',
      brandbook: 'Składam brandbook',
    },
    done: 'Brandbook {name}',
    summary: '{colors} kolorów, kroje: {fonts}.',
    limited:
      'Ta strona jest budowana przez JavaScript, więc online widać z niej niewiele. Pełny brandbook zrobisz w terminalu.',
    noShots: 'Google PageSpeed Insights nie zrobił zrzutów strony (limit albo błąd), więc brandbook powstał bez nich.',
    pdf: 'Pobierz PDF',
    pdfHint: 'W oknie drukowania wybierz „Zapisz jako PDF”.',
    tokens: 'Pobierz tokeny',
    zip: 'Pobierz paczkę (ZIP)',
    again: 'Zrób brandbook innej strony',
    retry: 'Spróbuj ponownie',
    preview: 'Podgląd brandbooka',
    printFrame: 'Brandbook do druku',
    errors: {
      'invalid-url': 'To nie wygląda na adres strony. Wpisz go w postaci twojastrona.pl.',
      dns: 'Nie ma takiej domeny: {detail}. Sprawdź, czy w adresie nie ma literówki.',
      unreachable: 'Strona nie odpowiada. Sprawdź, czy otwiera się w przeglądarce, i spróbuj ponownie.',
      robots: 'Plik robots.txt tej strony nie pozwala robotom jej odwiedzać, więc nie czytamy jej online.',
      blocked: 'Tego adresu nie przeczytamy online, bo nie prowadzi do publicznej strony.',
      tls: 'Certyfikat bezpieczeństwa tej strony jest nieważny. Brandbook zrobisz w terminalu.',
      'http-error': 'Strona odpowiada błędem {detail}. Jeśli wymaga logowania, zrób brandbook w terminalu.',
      'not-html': 'Pod tym adresem nie ma strony, tylko plik typu {detail}.',
      bot: 'Strona pokazuje zamiast treści test na robota (np. Cloudflare), więc nie da się jej przeczytać online.',
      human: 'Nie udało się potwierdzić, że nie jesteś robotem. Odśwież stronę i spróbuj ponownie.',
      pass: 'Odczyt trwał za długo i jego przepustka wygasła. Spróbuj ponownie.',
      limit:
        'Dzienny limit wersji online się wyczerpał albo usługa jest chwilowo niedostępna. Spróbuj jutro albo zrób brandbook w terminalu.',
      unknown: 'Coś poszło nie tak: {detail}. Spróbuj ponownie albo zrób brandbook w terminalu.',
    },
    sample: {
      id: 'przyklad',
      title: 'Przykładowy brandbook',
      lead: 'Osiem stron A4 w poziomie, odczytanych ze strony sitelens.pl.',
      region: 'Przykładowy brandbook',
      prev: 'Poprzednia strona',
      next: 'Następna strona',
      pageOf: 'Strona {n} z {total}',
      thumbs: 'Strony brandbooka',
      thumb: 'Pokaż stronę {n}: {title}',
      alt: 'Strona {n} przykładowego brandbooka: {title}',
      download: 'Pobierz przykładowy brandbook',
      downloadMeta: 'PDF, 0,9 MB',
      pages: [
        { title: 'Okładka', desc: 'Logo i nazwa marki złożona jej krojem, w kolorach strony.' },
        { title: 'Logo', desc: 'Wersje logo ze strony, pliki źródłowe, pole ochronne i minimalny rozmiar jako propozycje.' },
        { title: 'Kolory', desc: 'Paleta z tokenów CSS według tego, do czego kolory służą, z HEX, RGB i CMYK.' },
        { title: 'Kolory w praktyce', desc: 'Proporcje kolorów na stronie i czytelność par tekst / tło według WCAG.' },
        { title: 'Typografia', desc: 'Kroje z udziałem w tekście, style nagłówków i tekstu, grubości, rozmiary i źródła.' },
        { title: 'Interfejs i wygląd', desc: 'Przyciski i nawigacja ze strony, zaokrąglenia, zrzuty i opis charakteru.' },
        { title: 'Ciemny motyw', desc: 'Te same tokeny w jasnym i ciemnym motywie oraz strona w ciemnym motywie.' },
        { title: 'Ton komunikacji i spójność', desc: 'Jak marka mówi do klienta, wezwania do działania i sugestie spójności.' },
      ],
    },
    terminal: {
      title: 'Wolisz terminal?',
      text: 'W terminalu brandbook ma zrzuty ciemnego motywu, przycisków i nawigacji prosto ze strony, działa też dla stron budowanych JavaScriptem i zapisuje gotowy PDF.',
      command: 'npx sitelens brand https://twojastrona.pl',
      guide: 'Instrukcja krok po kroku dla macOS, Windows i Linuxa',
    },
    compare: {
      title: 'Online czy w terminalu',
      online: 'Online',
      terminal: 'W terminalu',
      rows: [
        { what: 'Logo, kolory, typografia, ton', online: 'tak', terminal: 'tak' },
        { what: 'Wersja interaktywna i tokeny CSS, JSON, Tailwind', online: 'tak', terminal: 'tak' },
        { what: 'Zrzuty strony', online: 'z Google PageSpeed Insights', terminal: 'z przeglądarki na Twoim komputerze' },
        { what: 'Ciemny motyw', online: 'kolory tak, zrzut nie', terminal: 'kolory i zrzut' },
        { what: 'Przyciski i nawigacja', online: 'odtworzone ze stylów strony', terminal: 'zrzuty prawdziwych elementów' },
        { what: 'Strony budowane JavaScriptem', online: 'tryb ograniczony', terminal: 'pełny brandbook' },
        { what: 'PDF', online: 'przez drukowanie w przeglądarce', terminal: 'gotowy plik w paczce' },
      ],
    },
    faq: {
      title: 'Pytania o brandbook',
      items: [
        {
          q: 'Czy mogę zrobić brandbook cudzej strony?',
          a: 'Tak, do analizy, na przykład konkurencji albo strony klienta przed rozpoczęciem projektu. Logo, znaki i fonty należą do ich właścicieli; brandbook tylko je opisuje.',
        },
        {
          q: 'Czy to zastępuje projektanta?',
          a: 'Nie. Brandbook porządkuje to, co już jest na stronie. Tego, czego strona nie mówi wprost (pole ochronne, minimalne rozmiary, opis charakteru), nie zgaduje, tylko oznacza jako propozycję do zatwierdzenia.',
        },
        {
          q: 'Czy coś zapisujecie?',
          a: 'Nie. Strona przechodzi przez nasz pośrednik tylko na czas odczytu, zrzuty robi Google PageSpeed Insights, a brandbook powstaje w Twojej przeglądarce.',
        },
        {
          q: 'Skąd są kolory i fonty?',
          a: 'Kolory pochodzą z tokenów CSS strony, czyli zmiennych w jej arkuszach stylów, a ich role z tego, gdzie i ile ich widać na stronie głównej. Kroje pochodzą z arkuszy stylów i plików fontów, które strona ładuje.',
        },
      ],
    },
  },
  notFound: {
    title: 'Nie ma takiej strony – sitelens',
    description: 'Pod tym adresem nie ma strony.',
    heading: 'Nie ma takiej strony',
    text: 'Adres mógł się zmienić albo zawiera literówkę.',
    home: 'Przejdź na stronę główną',
  },
};

export type Dictionary = typeof pl;
