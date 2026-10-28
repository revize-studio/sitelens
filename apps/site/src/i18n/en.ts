import type { Dictionary } from './pl';

export const en: Dictionary = {
  lang: 'en',
  locale: 'en_US',
  meta: {
    ogImageAlt:
      'The sitelens logo, the line “A website audit anyone can understand” and the cover of a sample PDF report scoring 71 out of 100.',
    title: 'sitelens – a website audit anyone can understand',
    description:
      'Free website audit with a PDF report in plain language: what is wrong, why it matters and how to fix it. Online or with one command in the terminal.',
  },
  skipLink: 'Skip to content',
  nav: {
    label: 'Main',
    home: 'sitelens, home page',
    links: [
      { href: '/en/#checks', label: 'What it checks' },
      { href: '/en/#report', label: 'Report' },
      { href: '/en/#start', label: 'Get started' },
      { href: '/en/#faq', label: 'FAQ' },
      { href: '/en/brandbook/', label: 'Brandbook' },
    ],
    check: 'Check a website',
    otherLang: { short: 'PL', label: 'PL – wersja polska', hreflang: 'pl' },
    github: 'sitelens on GitHub',
    menuOpen: 'Menu',
    themeToDark: 'Switch to dark theme',
    themeToLight: 'Switch to light theme',
  },
  hero: {
    title: 'A website audit anyone can understand.',
    lead: 'sitelens checks performance, SEO, accessibility and security, then tells you in plain language what to fix and why.',
    form: {
      label: 'Website address',
      placeholder: 'yourwebsite.com',
      submit: 'Check website',
      privacy:
        'The address is checked by Google PageSpeed Insights and by our server, which fetches the public page content only for the audit and stores nothing. By checking a website you accept the [terms of service]({terms}).',
    },
    terminal: {
      heading: 'Prefer the terminal?',
      command: 'npx sitelens https://yourwebsite.com --lang en',
      copy: 'Copy',
      copied: 'Copied',
      copiedAnnouncement: 'Command copied to clipboard',
      guide: 'Guide for macOS, Windows and Linux',
    },
    stage: {
      caption: 'Sample audit of przykladowa-firma.pl (report in Polish)',
      replay: 'Play again',
      coverAlt: 'Cover of a sample sitelens report for przykladowa-firma.pl with an overall score of 71 out of 100',
      command: 'npx sitelens https://przykladowa-firma.pl',
      crawling: 'Checking 12 pages',
      categories: [
        { label: 'Performance', score: 58 },
        { label: 'SEO', score: 76 },
        { label: 'Accessibility', score: 69 },
        { label: 'Security', score: 82 },
      ],
      overall: 71,
      overallLabel: 'Overall score',
      saved: 'Report saved: report.pdf',
      mac: {
        windowTitle: 'przykladowa-firma.pl — sitelens',
        menu: ['Terminal', 'Shell', 'Edit', 'View', 'Window', 'Help'],
        time: '9:41',
        terminalTitle: 'Terminal — zsh',
        pdfTitle: 'report.pdf',
        notifApp: 'sitelens',
        notifTime: 'now',
        notifTitle: 'Audit finished',
        notifBody: 'Overall score 71/100. Report saved to disk.',
        dock: {
          files: 'Files',
          browser: 'Browser',
          mail: 'Mail',
          notes: 'Notes',
          terminal: 'Terminal',
          preview: 'Preview',
          settings: 'Settings',
          trash: 'Trash',
        },
      },
      badges: [
        { icon: 'performance', label: 'Main content loaded', value: '4.1 s', state: 'critical' },
        { icon: 'seo', label: 'Description for Google', value: 'missing on 8 of 12 pages', state: 'important' },
        { icon: 'security', label: 'Certificate', value: 'valid until 14 Mar 2027', state: 'good' },
      ],
    },
  },
  checks: {
    id: 'checks',
    title: 'What sitelens checks',
    lead: 'Four areas that decide whether customers find your site, wait for it to load and can use it without trouble. Every result comes from a specific test.',
    performance: {
      title: 'Performance',
      desc: 'How fast the page appears on a phone and whether anything jumps around.',
      items: ['Time until the main content loads', 'Layout shifts and response to taps', 'Image size and format'],
      specimen: {
        label: 'Example: the main content appears after 4.1 s; a good result is under 2.5 s.',
        metric: 'Main content loaded',
        value: '4.1 s',
        good: 'Good: under 2.5 s',
        ticks: ['0 s', '2.5 s', '4 s', '5 s'],
      },
    },
    seo: {
      title: 'SEO',
      desc: 'Whether Google understands the site and can show it in search results.',
      items: ['Title and description of every page', 'Sitemap and robots.txt', 'Broken links and redirects'],
      specimen: {
        label: 'Example: a Google result for a page without a description.',
        url: 'przykladowa-firma.pl › offer',
        resultTitle: 'Offer | Sample Company',
        missing: 'No description – Google will show a random piece of text',
      },
    },
    accessibility: {
      title: 'Accessibility',
      desc: 'Whether everyone can use it, including without a mouse or with a screen reader.',
      items: ['Form fields without labels', 'Text contrast', 'Buttons and links without a name'],
      specimen: {
        label: 'Example: a form field without a label. A screen reader only says “edit text”.',
        reads: 'Screen reader:',
        without: '“edit text”',
        with: '“Email, edit text”',
        field: 'Email',
      },
    },
    security: {
      title: 'Security',
      desc: 'Whether the connection is encrypted and the server protects visitors.',
      items: ['HTTPS and certificate', 'Files loaded without encryption', 'Security headers'],
      specimen: {
        label: 'Example: HTTPS works, but the content security policy is missing and two files load without encryption.',
        rows: [
          { name: 'HTTPS and certificate', state: 'good', value: 'valid until 14 Mar 2027' },
          { name: 'Strict-Transport-Security', state: 'good', value: 'present' },
          { name: 'Content-Security-Policy', state: 'important', value: 'missing' },
          { name: 'Files over http://', state: 'important', value: '2' },
        ],
      },
    },
  },
  report: {
    id: 'report',
    title: 'A report you can pass on',
    lead: 'Six A4 pages. First what to start with, then every problem in turn, and technical details for your developer at the end.',
    region: 'Sample report',
    prev: 'Previous page',
    next: 'Next page',
    pageOf: 'Page {n} of {total}',
    thumbs: 'Report pages',
    thumb: 'Show page {n}: {title}',
    alt: 'Page {n} of the sample report: {title}',
    download: 'Download the sample report',
    downloadMeta: 'PDF, 0.4 MB, in Polish',
    pages: [
      { title: 'Cover', desc: 'Overall score, scores for the four areas and a one-sentence summary.' },
      { title: 'Summary', desc: 'Number of problems by priority, five things to start with and what already works well.' },
      { title: 'Performance', desc: 'Key metrics with thresholds and full problem cards: what is wrong, why it matters, how to fix it.' },
      { title: 'SEO', desc: 'Important problems as full cards, minor ones in short.' },
      { title: 'Accessibility and security', desc: 'For every problem: who fixes it and how much work it takes.' },
      { title: 'Technical appendix', desc: 'IDs, details and URLs for your developer, plus how the score is calculated.' },
    ],
  },
  plain: {
    title: 'No jargon',
    lead: 'We describe every problem so the site owner knows what to do and the developer knows where to look.',
    rawLabel: 'A typical tool',
    raw: 'Largest Contentful Paint exceeds threshold (4.1 s)',
    oursLabel: 'sitelens',
    ours: 'The page loads too slowly on phones. The main content appears after 4.1 s, and a good result is under 2.5 s.',
    meta: 'Who fixes it: Developer. Effort: Medium.',
    note: 'Metric names and technical details are in the report appendix.',
  },
  start: {
    id: 'start',
    title: 'Two ways to the same report',
    lead: 'In your browser with nothing to install, or with one command in the terminal.',
    online: {
      title: 'In your browser',
      steps: ['Paste the website address.', 'Wait for the audit to finish.', 'Download the PDF report.'],
      cta: 'Check a website online',
    },
    terminal: {
      title: 'In the terminal',
      steps: [
        'Install Node.js 22.19 or newer, or sitelens itself with one command from the guide.',
        'Run the command and pick the language, address and mode with the arrow keys:',
        'Open report.pdf.',
      ],
      command: 'npx sitelens',
      guide: 'Step-by-step guide for macOS, Windows and Linux',
    },
    ci: {
      title: 'In GitHub Actions',
      text: 'Add the audit to every deployment. The `--fail-under` option stops the build when the score drops below your threshold, and the report is saved as an artifact.',
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
      - run: npx --yes sitelens https://yourwebsite.com --lang en --fail-under 80 --out report.pdf
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: sitelens-report
          path: report.pdf`,
    },
    copy: 'Copy',
    copied: 'Copied',
    copiedAnnouncement: 'Copied to clipboard',
  },
  brandSection: {
    id: 'brandbook',
    title: 'A brandbook from a link',
    lead: 'A separate sitelens tool: paste a website address, and we read its logo, colours, typography and tone of voice and put them into a brandbook with tokens ready for code.',
    cta: 'Make a brandbook',
    stage: {
      caption: 'Sample brandbook of sitelens.pl',
      panel: 'Brandbook',
      groups: { logo: 'Logo', type: 'Typography', colors: 'Colours', ui: 'Buttons and fields', files: 'Files' },
      colors: [
        { token: 'accent', name: 'Cobalt' },
        { token: 'text', name: 'Graphite' },
        { token: 'text-2', name: 'Slate' },
        { token: 'line', name: 'Frost' },
        { token: 'bg', name: 'Mist' },
        { token: 'surface', name: 'Pearl' },
      ],
      fonts: { sans: 'Headings and text', mono: 'Commands and code' },
      logoOnLight: 'Logo on a light background',
      logoOnAccent: 'Logo on cobalt',
      summary: '15 colours, 2 typefaces, dark theme',
    },
  },
  oss: {
    title: 'Open source under the MIT license',
    lead: 'See how every score is calculated, suggest an idea or add your own check. Each one has an advice card written in plain language.',
    repo: 'View the code on GitHub',
    issues: 'Suggest an idea',
    cardLabel: 'Sample advice card',
    cardFile: 'cards/seo/meta-description.yaml',
    card: `id: seo/meta-description
priority: important
whoFixes: owner
effort: small
en:
  title: "{count} of {total} pages have no description for Google"
  whatIsWrong: >
    The pages have no short description, which Google
    shows under the title in search results.
  whyItMatters: >
    Without one, Google picks a random piece of text.
  howToFix:
    - Open the page in your CMS and find the “Description” field.
    - Write one or two sentences, up to about 150 characters.`,
  },
  faq: {
    id: 'faq',
    title: 'Questions and answers',
    items: [
      {
        q: 'Is sitelens free?',
        a: 'Yes. Both the online version and the terminal tool are free, and the code is open source under the MIT license.',
      },
      {
        q: 'Do I need an API key?',
        a: 'No. Under heavy traffic the online version may ask for your own free Google PageSpeed Insights key. AI features are optional and only run on your own Anthropic key, which stays in your browser.',
      },
      {
        q: 'Is my website data sent anywhere?',
        a: 'The terminal tool runs entirely on your computer. In the online version the address goes to Google PageSpeed Insights, and the public page content passes through our server only for the audit and is not stored. Results and the report are created in your browser. Details are in the [privacy policy]({privacy}).',
      },
      {
        q: 'Does the audit change anything on my website?',
        a: 'No. sitelens only fetches public pages, like any visitor. It does not submit forms and does not store anything on the server.',
      },
      {
        q: 'How is it different from Lighthouse alone?',
        a: 'Lighthouse measures one page and describes the results in developer language. sitelens uses Lighthouse and axe-core, adds its own checks (such as security headers, the sitemap and redirects), checks several pages at once and turns every problem into concrete steps in a PDF report.',
      },
      {
        q: 'Which systems does the terminal tool run on?',
        a: 'macOS, Windows and Linux. One command installs everything sitelens needs, and with Node.js 22.19 or newer `npx sitelens` is enough. See the [step-by-step guide]({terminal}).',
      },
    ],
  },
  footer: {
    tagline: 'A website audit anyone can understand.',
    product: 'Product',
    project: 'Project',
    contact: 'Contact',
    links: {
      checks: 'What it checks',
      report: 'Sample report',
      start: 'Get started',
      terminal: 'Terminal guide',
      audit: 'Check a website online',
      brandbook: 'Brandbook from a link',
      repo: 'Code on GitHub',
      issues: 'Suggest an idea',
      license: 'MIT license',
      privacy: 'Privacy policy',
      terms: 'Terms of service',
    },
    oss: 'sitelens is an open source project under the MIT license.',
    builtBy: 'Built by Revize Studio',
  },
  terminalPage: {
    title: 'How to check a website in the terminal – sitelens',
    description:
      'Step-by-step guide for macOS, Windows and Linux: install sitelens with one command, choose the report language and audit mode, get a PDF report on your disk.',
    heading: 'Check a website in the terminal',
    lead: 'A step-by-step guide for macOS, Windows and Linux. It takes a few minutes, and you end up with a PDF report on your disk.',
    tabs: 'Operating system',
    mac: {
      name: 'macOS',
      steps: [
        { title: 'Open Terminal', body: 'Press ⌘ Cmd + Space, type “Terminal” and press Enter.' },
        {
          title: 'Install sitelens',
          body: 'Paste the command and press Enter. The installer downloads Node.js from nodejs.org and sitelens into your home folder (the .sitelens folder). No administrator password is needed, and it takes about a minute.',
          code: 'curl -fsSL https://sitelens.pl/install.sh | sh',
        },
        { title: 'Open a new Terminal window', body: 'Press ⌘ Cmd + N. The new window knows the sitelens command.' },
        {
          title: 'Run sitelens',
          body: 'Type the command and press Enter. Pick the report language with the arrow keys, paste the website address and choose a mode: quick, standard or thorough.',
          code: 'sitelens',
        },
        {
          title: 'Wait for the result',
          body: 'The terminal shows progress for performance, SEO, accessibility and security. Keep the window open until the audit finishes.',
        },
        {
          title: 'Open the report',
          body: 'At the end sitelens shows where it saved the report. Press Enter to open it. report.pdf stays in your home folder (in Finder: Go → Home).',
        },
      ],
    },
    windows: {
      name: 'Windows',
      steps: [
        { title: 'Open PowerShell', body: 'Click Start, type “PowerShell” and press Enter.' },
        {
          title: 'Install sitelens',
          body: 'Paste the command and press Enter. The installer downloads Node.js from nodejs.org and sitelens into your user folder. No administrator rights are needed, and it takes about a minute.',
          code: 'irm https://sitelens.pl/install.ps1 | iex',
        },
        {
          title: 'Open a new PowerShell window',
          body: 'Close the window and open PowerShell again. The new window knows the sitelens command.',
        },
        {
          title: 'Run sitelens',
          body: 'Type the command and press Enter. Pick the report language with the arrow keys, paste the website address and choose a mode: quick, standard or thorough.',
          code: 'sitelens',
        },
        {
          title: 'Wait for the result',
          body: 'The window shows progress for performance, SEO, accessibility and security. Keep it open until the audit finishes.',
        },
        {
          title: 'Open the report',
          body: 'At the end sitelens shows where it saved the report. Press Enter to open it. report.pdf stays in your user folder (C:\\Users\\Your name).',
        },
      ],
    },
    linux: {
      name: 'Linux',
      steps: [
        {
          title: 'Open a terminal',
          body: 'Press Ctrl + Alt + T, or find “Terminal” in the applications menu.',
        },
        {
          title: 'Install sitelens',
          body: 'Paste the command (in a terminal: Ctrl + Shift + V) and press Enter. The installer downloads Node.js from nodejs.org and sitelens into your home folder (the .sitelens folder). No sudo is needed, and it takes about a minute. If the system has no curl, type `wget -qO- https://sitelens.pl/install.sh | sh`.',
          code: 'curl -fsSL https://sitelens.pl/install.sh | sh',
        },
        {
          title: 'Open a new terminal window',
          body: 'Close the terminal and open it again. The new window knows the sitelens command.',
        },
        {
          title: 'Run sitelens',
          body: 'Type the command and press Enter. Pick the report language with the arrow keys, paste the website address and choose a mode: quick, standard or thorough. sitelens needs Chrome, Chromium, Edge or Brave. If the computer has only Firefox, run `sitelens --install-browser` first.',
          code: 'sitelens',
        },
        {
          title: 'Wait for the result',
          body: 'The terminal shows progress for performance, SEO, accessibility and security. Keep the window open until the audit finishes.',
        },
        {
          title: 'Open the report',
          body: 'At the end sitelens shows where it saved the report. Press Enter to open it in your default PDF viewer. report.pdf stays in your home folder.',
        },
      ],
    },
    alternative: {
      title: 'Already have Node.js?',
      body: 'With Node.js 22.19 or newer you do not need the installer: run the audit with npx. The first time, and after each update, npm asks whether to download the package (“Ok to proceed?”); just press Enter. In PowerShell type `npx.cmd` instead of `npx`. You can install Node.js from [nodejs.org](https://nodejs.org), on macOS also with `brew install node`, and on Windows with `winget install OpenJS.NodeJS.LTS`. On Linux the Node.js in your distribution’s repository is often too old, so check the version with `node -v`.',
      code: 'npx sitelens',
    },
    expected: 'What a finished audit looks like',
    options: {
      title: 'Useful options',
      items: [
        {
          code: 'sitelens https://yourwebsite.com',
          text: 'An audit without questions: it starts right away for the address you give.',
        },
        { code: '--pages 20', text: 'Checks more pages. The default is 10, at most 50.' },
        { code: '--lang en', text: 'Report in English. Without it, the report is in Polish.' },
        { code: '--out report-shop.pdf', text: 'Saves the report under a name or in a folder of your choice.' },
        { code: '--json', text: 'Also saves the raw results as JSON.' },
      ],
    },
    problems: {
      title: 'When something goes wrong',
      items: [
        {
          q: 'The terminal does not know the sitelens command',
          a: 'Open a new terminal window: one opened before the installation does not see the new command yet. If that does not help, run the install command again.',
        },
        {
          q: "“command not found: npx” or “'npx' is not recognized as an internal or external command”",
          a: 'Node.js is not installed, or the terminal was open before you installed it. Close the terminal, open it again and retry.',
        },
        {
          q: 'PowerShell: an error about “npx.ps1” and “running scripts is disabled on this system”',
          a: 'This is a default Windows safeguard that blocks PowerShell scripts. Type `npx.cmd` instead of `npx` (it works in PowerShell and in Command Prompt) or use Command Prompt.',
        },
        {
          q: 'A message about a missing browser',
          a: 'sitelens opens the site in a Chromium-based browser: Chrome, Edge, Brave or Chromium. If the computer has none, run `sitelens --install-browser` and repeat the audit.',
        },
        {
          q: 'Linux: Chromium downloaded with --install-browser does not start',
          a: 'On a server without a desktop, in WSL or on a minimal system install, libraries Chromium needs may be missing. Install Google Chrome from the .deb or .rpm package at [google.com/chrome](https://www.google.com/chrome/) instead: the package manager adds what is missing.',
        },
        {
          q: 'The website does not respond or the audit stops',
          a: 'Check that the address is correct and that the site opens in your browser. Pages behind a login cannot be checked.',
        },
      ],
    },
    online: 'Don’t want to install anything? [Check a website online]({audit}).',
  },
  legal: { toc: 'Contents' },
  privacyPage: {
    title: 'Privacy policy – sitelens website audit',
    description:
      'What data the sitelens website, online audit and online brandbook process, why, who receives it, how long we keep it and what your rights are.',
    heading: 'Privacy policy',
    updated: 'Version of 27 October 2026. The Polish version prevails.',
    intro:
      'In short: the website uses no cookies or analytics, the online audit and the online brandbook store neither the content of checked pages nor the results, and the terminal tool runs entirely on your computer. Below are the details required by the GDPR.',
    numbering: '',
    sections: [
      {
        title: 'Data controller',
        body: [
          'The controller of personal data is REVIZE STUDIO sp. z o.o., ul. Młynarska 6, 59-800 Lubań, Poland, KRS 0001208852, tax ID (NIP) 6131598053 (“we”).',
          'For anything related to personal data, write to [kontakt@revize.pl](mailto:kontakt@revize.pl).',
        ],
      },
      {
        title: 'Scope',
        body: [
          'This policy covers the sitelens website (“Website”), including the online audit and the online brandbook generator (“Online brandbook”), and contacting us. The sitelens terminal tool (“CLI”) runs on your computer and is described in a separate section.',
        ],
      },
      {
        title: 'What data, why and on what legal basis',
        body: [
          '• Visiting the Website: IP address, browser and device details, date and address of the visited page, technically recorded in server logs. Purpose: delivering the Website, its security and detecting abuse. Legal basis: our legitimate interest (Art. 6(1)(f) GDPR).',
          '• Online audit: the address of the checked website, IP address, technical data Cloudflare Turnstile needs to tell humans from bots, and technical data of requests to our proxy server (without content or results). Purpose: running the audit at your request and protecting against abuse. Legal basis: performing the service (Art. 6(1)(b) GDPR) and legitimate interest (Art. 6(1)(f) GDPR).',
          '• Online brandbook: the address of the website the brandbook is made from, IP address, technical data Cloudflare Turnstile needs, and technical data of requests to the proxy server, which fetches the page code, stylesheets, fonts and images (without content or results). The brandbook, tokens and ZIP package are built in your browser and go only to your device. Purpose and legal basis: as for the online audit.',
          '• Content of the checked website: public pages may contain personal data, such as names, contact details or photos of people, which may also appear in brandbook screenshots. The proxy server fetches them only for the audit or brandbook and stores nothing; the analysis runs in your browser. Legal basis: legitimate interest (Art. 6(1)(f) GDPR).',
          '• Contact and complaints: email address, name and message content. Purpose: replying, handling complaints and defending against claims. Legal basis: legitimate interest (Art. 6(1)(f) GDPR) and, for complaints, also performing the service and legal obligations (Art. 6(1)(b) and (c) GDPR).',
        ],
      },
      {
        title: 'What we do not do',
        body: [
          'We use no cookies, analytics tools or advertising pixels. We do not profile you, sell data or make automated decisions with legal effects about you (Art. 22 GDPR). The audit automatically assesses websites, not people.',
        ],
      },
      {
        title: 'Browser storage',
        body: [
          'In your browser storage (localStorage) we keep the theme you chose: light or dark.',
          'If you enter your own Google PageSpeed Insights or Anthropic key, it stays in your browser: in sessionStorage until you close the tab, or in localStorage if you tick “Remember on this device”. We never send it to our server, and you can delete it at any time.',
          'On the audit and brandbook pages, Cloudflare Turnstile may store data in your browser that is needed to confirm a human is using it.',
          'This storage is strictly necessary for features you choose to use, so it does not require consent under Polish electronic communications law.',
        ],
      },
      {
        title: 'Recipients',
        body: [
          '• Vercel Inc. (USA) – hosting of the Website; processes IP addresses and technical request data kept in server logs,',
          '• Cloudflare, Inc. – the proxy server (Cloudflare Workers) and bot protection (Turnstile),',
          '• Google LLC and Google Ireland Limited – the checked website address goes to PageSpeed Insights, also for the online brandbook (for screenshots of the website),',
          '• Anthropic PBC – only when you use AI features with your own key; you then send the data straight from your browser and Anthropic processes it under its own terms,',
          '• GitHub, Inc. – when you visit the sitelens repository,',
          '• our email provider – for correspondence,',
          '• public authorities – only where the law requires it.',
        ],
      },
      {
        title: 'Transfers outside the EEA',
        body: [
          'Vercel, Cloudflare, Google, Anthropic and GitHub may process data in the United States. Transfers rely on the European Commission adequacy decision (EU-US Data Privacy Framework) for certified companies, or on standard contractual clauses approved by the European Commission.',
        ],
      },
      {
        title: 'How long we keep data',
        body: [
          '• content of checked websites, audit results and brandbooks – not stored at all,',
          '• technical logs – for the period set at Vercel and Cloudflare, no longer than needed for security,',
          '• correspondence and complaints – until the matter is closed, then until claims become time-barred,',
          '• data in your browser – until you delete it.',
        ],
      },
      {
        title: 'Your rights',
        body: [
          'You have the right to access, rectify and erase your data, to restrict processing, to data portability (where processing is based on a contract) and to object to processing based on legitimate interest.',
          'To exercise these rights, write to [kontakt@revize.pl](mailto:kontakt@revize.pl). We reply within one month.',
          'You may also lodge a complaint with the Polish data protection authority (Prezes Urzędu Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa).',
        ],
      },
      {
        title: 'Do you have to provide data',
        body: [
          'Providing the address of the website to check is voluntary, but we cannot run the audit or make the brandbook without it. Providing data in correspondence is voluntary.',
        ],
      },
      {
        title: 'The terminal tool',
        body: [
          'The CLI runs entirely on your computer and sends us no data, also when making a brandbook (`sitelens brand`), whose screenshots are taken by a browser on your computer. The website address goes to Google only if you use the `--psi-key` option, and selected parts of the content go to Anthropic only with the `--ai` option.',
          'The installer on the Website (install.sh and install.ps1) downloads Node.js from nodejs.org (OpenJS Foundation) and the sitelens package from the npm registry (npm, Inc., part of GitHub) straight to your computer, just like the `npx sitelens` command. Those services then see your IP address and process it under their own terms. We receive no data.',
        ],
      },
      {
        title: 'Security',
        body: [
          'The Website runs over HTTPS only and has a strict content security policy (CSP). We collect only the data needed to provide the services, we do not store audit results or brandbooks, and the proxy server does not connect to addresses in private networks.',
        ],
      },
      {
        title: 'Changes to this policy',
        body: [
          'The current version is always available on the Website with its effective date. We announce material changes on the Website.',
        ],
      },
    ],
  },
  termsPage: {
    title: 'Terms of service – sitelens website audit',
    description:
      'Rules for using the sitelens website, online audit, online brandbook and terminal tool: services, prohibited use, liability and complaints.',
    heading: 'Terms of service',
    updated: 'Version of 27 October 2026. The Polish version prevails.',
    intro:
      'In short: the services are free, the audit and the brandbook only fetch public pages, the report and the brandbook are for information only, and the website must not be used in ways that harm others.',
    numbering: '§',
    sections: [
      {
        title: 'General provisions',
        body: [
          'These terms set out the rules for using the sitelens website (“Website”), including the online audit and the online brandbook generator, and for providing the sitelens terminal tool (“CLI”).',
          'The service provider is REVIZE STUDIO sp. z o.o., ul. Młynarska 6, 59-800 Lubań, Poland, entered in the National Court Register (KRS) under number 0001208852, tax ID (NIP) 6131598053 (“Provider”, “we”). Contact: [kontakt@revize.pl](mailto:kontakt@revize.pl).',
          'These are the terms referred to in Article 8 of the Polish Act of 18 July 2002 on providing services by electronic means. They are available free of charge on the Website in a form that allows downloading, saving and printing.',
          'By using the Website, in particular by starting an online audit or making a brandbook, you accept these terms. If you do not accept them, do not use the Website.',
        ],
      },
      {
        title: 'Definitions',
        body: [
          '• User – a natural person, legal person or organisational unit using the Website or the CLI.',
          '• Consumer – a User who is a consumer within the meaning of Article 22¹ of the Polish Civil Code. Provisions on Consumers also apply to a natural person concluding a contract directly related to their business where the contract is not of a professional nature for them.',
          '• Audit – an automated check of a publicly available website indicated by the User (“Checked website”).',
          '• Report – the result of an Audit as a preview, a PDF file or JSON data.',
          '• Brandbook – an automatically prepared overview of the Checked website’s visual identity (logo, colours, typography, interface and tone of voice) as a preview, a PDF file, tokens (JSON and CSS files) and a ZIP package.',
          '• Proxy – our server on Cloudflare Workers that fetches public resources of the Checked website during an online Audit or while making an online Brandbook.',
          '• API key – the User’s key for Google PageSpeed Insights or Anthropic.',
        ],
      },
      {
        title: 'Services and technical requirements',
        body: [
          'Free of charge, we provide the Website content, online Audits and online Brandbooks – the Report and the Brandbook are generated in the User’s browser – and the source code and CLI.',
          'The contract for an online Audit or an online Brandbook is concluded when the Audit starts and expires when it finishes, is interrupted or the page is closed. Browsing the Website requires no registration.',
          'The CLI runs on the User’s device. Use of the source code and CLI is governed by the MIT license included in the repository, and by these terms where the license is silent.',
          'Using the Website requires a device with internet access and an up-to-date browser (Chrome, Edge, Firefox or Safari) with JavaScript enabled. Using the CLI requires Node.js 22.19 or newer, or the installer on the Website, which downloads Node.js itself.',
          'The online Audit and the online Brandbook rely on external services (Google PageSpeed Insights, Cloudflare) with their own limits. We do not guarantee uninterrupted availability. We may limit the number of Audits and Brandbooks, stop them, temporarily disable the Website or parts of it (for maintenance, failures or abuse) and change its features.',
        ],
      },
      {
        title: 'How the Audit and the Brandbook work',
        body: [
          'The online Audit is passive: it only fetches public resources of the Checked website with GET requests, like any visitor. It does not submit forms, log in or try to bypass protections.',
          'The Proxy connects only to addresses on the public internet (http and https, ports 80 and 443), respects robots.txt and stores neither fetched content nor results.',
          'Active tests (such as looking for publicly exposed sensitive files) are available only in the CLI with the `--owner` option. By enabling it, the User confirms that they own the Checked website or have its owner’s permission.',
          'The online Brandbook is just as passive: the Proxy fetches the page code, its stylesheets, fonts and images, and the User’s browser displays the page without running its scripts and reads its logo, colours and typefaces. Screenshots come from Google PageSpeed Insights.',
          'The User is responsible for which websites they check and how they use the Report and the Brandbook.',
        ],
      },
      {
        title: 'Prohibited use',
        body: [
          'Use the Website and the CLI lawfully, in line with these terms and good practice. In particular, it is prohibited to:',
          '• provide or point to unlawful content,',
          '• use the Website, the Proxy or the CLI in ways that may disrupt the Checked website, the Website or anyone else’s infrastructure, including denial-of-service attacks,',
          '• run online Audits or make online Brandbooks in bulk or automatically (bots, scripts, scrapers) without our consent, or bypass limits, Cloudflare Turnstile or other safeguards,',
          '• use the Proxy as a proxy server for anything other than an Audit or a Brandbook, including bypassing blocks, hiding identity or reaching resources in internal networks,',
          '• attempt unauthorised access to the Website, its infrastructure or data, or test the Website’s security without our consent (report vulnerabilities as described in `/.well-known/security.txt`),',
          '• run the CLI’s active tests against websites the User is not authorised to test,',
          '• use Reports to prepare attacks or other unlawful acts,',
          '• present a Brandbook as the brand owner’s official brand guidelines without their consent, or use a Brandbook to impersonate a brand, including creating websites or materials that may mislead people about their origin,',
          '• present a modified Report or Brandbook as one generated by sitelens, suggest that the Provider prepared or approved a Report or Brandbook, or use the “sitelens” and “Revize Studio” names in a way that suggests our endorsement, cooperation or certification.',
          'If these terms are breached or abuse is reasonably suspected, we may, also without notice, stop an Audit or a Brandbook, block access to the Website from an IP address or device and refuse further service. We may also notify the competent authorities.',
        ],
      },
      {
        title: 'Nature of the Report',
        body: [
          'The Report is the result of automated tests run at a given moment and is for information and educational purposes only.',
          'The Report is not legal advice, a security audit in the sense of penetration testing, a certificate of compliance (for example with WCAG, the European Accessibility Act or the GDPR) or a guarantee of search rankings.',
          'Results may vary between runs (performance in particular), depend on external providers and may not cover every problem of the Checked website.',
          'You make changes to a website based on the Report at your own risk. Back up before changing anything, and consult a specialist on legal and security matters.',
          'When the overall score is below 70 out of 100, the Report includes a short note that the Service Provider (Revize Studio) can take care of the fixes or build a new site, with a link to revize.pl. Taking up this offer is voluntary and does not affect the Audit result.',
          'Optional AI text suggestions are generated automatically with the User’s API key, may be inaccurate or untrue and must be checked before use. They do not affect the Audit result.',
        ],
      },
      {
        title: 'Nature of the Brandbook',
        body: [
          'The Brandbook is generated automatically from what the Checked website shows publicly at the time. It is not the brand owner’s official brand guidelines and does not replace a designer’s work.',
          'What is read from the website (such as colours, typefaces and logo files) is given as fact. Clear space, minimum logo sizes, don’ts and descriptions of the brand’s character are proposals with a visible “proposal” label that a person must approve before use.',
          'The online Brandbook is approximate in parts (for example buttons rebuilt from styles, no dark theme screenshot, a limited mode for websites built with JavaScript). Such parts are marked, and the footer says whether the Brandbook was made online or in the CLI.',
          'Logos, trademarks, screenshots and content of the Checked website belong to their owners, and the Brandbook grants no rights to them. We include no font files: the Brandbook gives the typeface name and source, and embeds a typeface in the PDF only where its license allows it.',
          'Use the Brandbook in line with the brand owner’s rights: for your own brand, with the owner’s consent, or as far as the law allows, for example for analysis or quotation.',
        ],
      },
      {
        title: 'API keys and external services',
        body: [
          'You may enter your own API key. It is stored only in your browser, and requests using it go straight to the provider, bypassing our server. We have no access to your API key.',
          'You are responsible for keeping your API key secure on your device, for the costs of its use and for complying with its provider’s terms.',
          'Use of Google, Cloudflare, Anthropic and GitHub services is also subject to their terms.',
        ],
      },
      {
        title: 'Liability',
        body: [
          'We provide the services free of charge and with due care, without any warranty that the Report or the Brandbook is fit for a particular purpose.',
          'To the fullest extent permitted by law, we are not liable for damage resulting from using the Website, the CLI, a Report or a Brandbook, including lost profits, data loss, downtime of the Checked website or the Website, acts of external service providers and costs of API key use.',
          'Towards Users who are not Consumers, our total liability related to the Website and the CLI is limited to PLN 100.',
          'These limitations do not apply to damage caused intentionally or where excluding or limiting liability is not permitted by mandatory law, in particular law protecting Consumers.',
          'The User is liable for damage caused to us or third parties by using the Website or the CLI in breach of the law or these terms and, to the extent permitted by law, indemnifies us against third-party claims in that respect.',
        ],
      },
      {
        title: 'Intellectual property',
        body: [
          'The sitelens source code, including the advice card library, is available under the MIT license. The license does not grant the right to use the sitelens name and logo or the Revize Studio marks.',
          'The sitelens name and logo, the Website’s visual identity, texts and graphics, and the sample Report and sample Brandbook are protected by law. They may not be copied or distributed beyond permitted use without our consent.',
          'You may freely use Reports and Brandbooks generated for the websites you check, including sharing them with colleagues and clients, subject to the brand owner’s rights to logos, marks, content and typefaces.',
        ],
      },
      {
        title: 'Personal data',
        body: ['How we process personal data is described in the [privacy policy]({privacy}).'],
      },
      {
        title: 'Complaints',
        body: [
          'Send complaints about the Website to [kontakt@revize.pl](mailto:kontakt@revize.pl). Describe the problem and give an email address for our reply.',
          'We handle complaints within 14 days of receipt and reply to the email address the complaint came from.',
          'Consumers may use out-of-court complaint and redress procedures, for example help from a municipal or district consumer ombudsman or the regional Trade Inspection. Information is available at prawakonsumenta.uokik.gov.pl.',
        ],
      },
      {
        title: 'Changes to these terms',
        body: [
          'We may change these terms for important reasons, in particular changes in the law, changes to the Website’s features or the need to protect against abuse.',
          'We announce changes on the Website at least 7 days before they take effect. Audits and Brandbooks started earlier remain subject to the previous terms.',
        ],
      },
      {
        title: 'Final provisions',
        body: [
          'These terms are governed by Polish law. The choice of law does not deprive a Consumer of protection under mandatory provisions of the country of their habitual residence.',
          'Disputes with Users who are not Consumers are settled by the court competent for the Provider’s registered office.',
          'If any provision of these terms proves invalid, the remaining provisions stay in force.',
          'These terms apply from 25 October 2026, and the provisions on the Brandbook from 27 October 2026, when that service became available. In case of discrepancies between language versions, the Polish version prevails.',
        ],
      },
    ],
  },
  auditPage: {
    title: 'Check a website online – sitelens',
    description:
      'Online website audit with a PDF report in plain language. Until the online version launches, you can check a website with one command in the terminal.',
    heading: 'Check a website online',
    soon: 'The online version is on its way. Until then, you can check a website on your computer with one command. The report is the same.',
    guide: 'First time in the terminal? [Step-by-step guide for macOS, Windows and Linux]({terminal}).',
    back: 'Back to the home page',
    online: {
      description:
        'Paste a website address and get a plain-language PDF report on performance, SEO, accessibility and security, for up to 10 pages.',
      lead: 'Paste a website address. We check up to 10 pages, and the report is made in your browser.',
      reportLang: 'Report language',
      more: 'The terminal gives you more data: up to 50 pages instead of 10, a certificate check, the full set of axe-core accessibility rules on each page after its JavaScript runs, and up to 150 links checked. [How to run the audit in the terminal]({terminal}).',
      progress: 'Checking {domain}',
      steps: {
        human: 'Checking you are not a robot (Cloudflare Turnstile)',
        preflight: 'Connecting to the site',
        discover: 'Looking for pages',
        pages: 'Downloading pages',
        pagespeed: 'Measuring speed and accessibility (Google PageSpeed Insights)',
        report: 'Creating the report',
      },
      done: 'Report for {domain}',
      overall: 'Overall score: {score} out of 100.',
      notMeasured: 'The overall score could not be calculated.',
      categories: { performance: 'Performance', seo: 'SEO', accessibility: 'Accessibility', security: 'Security' },
      categoryNotMeasured: 'not measured',
      pdf: 'Download PDF',
      pdfHint:
        'In the print window, choose “Save as PDF”. On an iPhone or iPad, tap the share icon in it and choose “Save to Files”.',
      json: 'Download data (JSON)',
      again: 'Check another website',
      retry: 'Try again',
      preview: 'Report preview',
      partial:
        'The online version does not check the certificate and judges accessibility by the rules Lighthouse runs. You can run the full audit on your computer:',
      warnings: 'Some data could not be collected ({count}). The details are in the JSON file.',
      errors: {
        'invalid-url': 'That does not look like a website address. Type it like yourwebsite.com.',
        dns: 'There is no such domain: {detail}. Check the address for typos.',
        unreachable: 'The site does not answer. Check that it opens in your browser and try again.',
        robots:
          'The robots.txt file of this site asks robots not to visit it or cannot be read right now, so we do not check it online.',
        blocked: 'We cannot check this address online because it does not lead to a public website.',
        tls: 'The security certificate of this site is invalid, and browsers will show a warning on it. An audit on your computer shows the details.',
        'http-error': 'The site answers with error {detail}. If it needs a login, check it on your computer.',
        'not-html': 'This address is not a web page but a {detail} file.',
        human: 'We could not confirm you are not a robot. Reload the page and try again.',
        pass: 'The audit took too long and its pass expired. Try again.',
        limit:
          'The online version has used up its daily limit or is unavailable for a moment. Try again tomorrow or check the site on your computer.',
        unknown: 'Something went wrong: {detail}. Try again or check the site on your computer.',
      },
      cli: 'On your computer you can check any website, with no limits:',
      pagespeed: {
        quota:
          "Today's Google PageSpeed Insights limit is used up, so speed and accessibility were not measured. Paste your own free key and we will finish the measurement.",
        key: 'The PageSpeed Insights key did not work. Check that it is correct and not restricted to another domain.',
        finish: 'Finish the measurement',
      },
      keys: {
        summary: 'Your own PageSpeed Insights key (optional)',
        text: 'We use our key by default. When its daily limit runs out, you can use your own free one. The key stays in this browser tab and never reaches us. In Google Cloud, restrict it to the PageSpeed Insights API only. [How to get a key]({howto}).',
        label: 'API key',
        save: 'Use this key',
        remove: 'Remove the key',
        saved: 'The audit will use your key.',
      },
    },
  },
  brandbookPage: {
    title: 'A brandbook from a website address – sitelens',
    description:
      'Paste a website address and get a brandbook: the logo, colours, typography, interface elements and tone of voice read from the live site, with tokens ready for code.',
    heading: 'A brandbook from a website address.',
    lead: 'The logo, colours, typography and tone of voice read from the live site, with tokens ready for code.',
    form: {
      label: 'Website address',
      placeholder: 'yourwebsite.com',
      submit: 'Make a brandbook',
      privacy:
        'Our proxy reads the site and Google PageSpeed Insights takes the screenshots; we store nothing. By making a brandbook you accept the [terms]({terms}).',
    },
    soon: 'The online version is off right now. You can make the brandbook in the terminal with one command.',
    progress: 'Reading the {domain} brand',
    steps: {
      human: 'Checking you are not a robot (Cloudflare Turnstile)',
      page: 'Connecting to the site',
      styles: 'Downloading styles, fonts and the logo',
      render: 'Reading colours, typography and the interface',
      pages: 'Comparing pages',
      screenshots: 'Taking screenshots (Google PageSpeed Insights)',
      brandbook: 'Putting the brandbook together',
    },
    done: '{name} brandbook',
    summary: '{colors} colours, typefaces: {fonts}.',
    limited: 'This site is built by JavaScript, so little of it shows online. Make the full brandbook in the terminal.',
    noShots: 'Google PageSpeed Insights took no screenshots (a limit or an error), so the brandbook has none.',
    pdf: 'Download PDF',
    pdfHint: 'In the print window, choose “Save as PDF”.',
    tokens: 'Download tokens',
    zip: 'Download the package (ZIP)',
    again: 'Make a brandbook of another site',
    retry: 'Try again',
    preview: 'Brandbook preview',
    printFrame: 'Brandbook for printing',
    errors: {
      'invalid-url': 'That does not look like a website address. Type it as yourwebsite.com.',
      dns: 'There is no such domain: {detail}. Check the address for typos.',
      unreachable: 'The site does not respond. Check that it opens in your browser and try again.',
      robots: 'This site’s robots.txt does not allow robots, so we do not read it online.',
      blocked: 'We cannot read this address online because it does not lead to a public website.',
      tls: 'This site’s security certificate is not valid. Make the brandbook in the terminal.',
      'http-error': 'The site answers with error {detail}. If it needs a login, make the brandbook in the terminal.',
      'not-html': 'There is no web page at this address, only a file of type {detail}.',
      bot: 'The site shows a bot check (for example Cloudflare) instead of its content, so it cannot be read online.',
      human: 'We could not confirm you are not a robot. Reload the page and try again.',
      pass: 'Reading took too long and its pass expired. Try again.',
      limit:
        'The daily limit of the online version is used up or the service is unavailable for a moment. Try tomorrow or make the brandbook in the terminal.',
      unknown: 'Something went wrong: {detail}. Try again or make the brandbook in the terminal.',
    },
    sample: {
      id: 'sample',
      title: 'A sample brandbook',
      lead: 'Eight landscape A4 pages, read from sitelens.pl.',
      region: 'Sample brandbook',
      prev: 'Previous page',
      next: 'Next page',
      pageOf: 'Page {n} of {total}',
      thumbs: 'Brandbook pages',
      thumb: 'Show page {n}: {title}',
      alt: 'Page {n} of the sample brandbook: {title}',
      download: 'Download the sample brandbook',
      downloadMeta: 'PDF, 0.9 MB, in Polish',
      pages: [
        { title: 'Cover', desc: 'The logo and the brand name set in its typeface, in the site’s colours.' },
        { title: 'Logo', desc: 'Logo versions from the site, source files, clear space and minimum size as proposals.' },
        { title: 'Colours', desc: 'The palette from the CSS tokens by what each colour is for, with HEX, RGB and CMYK.' },
        { title: 'Colours in use', desc: 'Colour proportions on the site and how readable text and background pairs are (WCAG).' },
        { title: 'Typography', desc: 'Typefaces with their share of text, heading and text styles, weights, sizes and sources.' },
        { title: 'Interface and look', desc: 'Buttons and navigation from the site, corner radii, screenshots and the character.' },
        { title: 'Dark theme', desc: 'The same tokens in the light and the dark theme, and the site in the dark theme.' },
        { title: 'Tone of voice and consistency', desc: 'How the brand speaks to customers, calls to action and consistency suggestions.' },
      ],
    },
    terminal: {
      title: 'Prefer the terminal?',
      text: 'In the terminal the brandbook gets screenshots of the dark theme, the buttons and the navigation straight from the site, works for sites built by JavaScript too, and saves a ready PDF.',
      command: 'npx sitelens brand https://yourwebsite.com --lang en',
      guide: 'Step-by-step guide for macOS, Windows and Linux',
    },
    compare: {
      title: 'Online or in the terminal',
      online: 'Online',
      terminal: 'In the terminal',
      rows: [
        { what: 'Logo, colours, typography, tone', online: 'yes', terminal: 'yes' },
        { what: 'Interactive version and CSS, JSON and Tailwind tokens', online: 'yes', terminal: 'yes' },
        { what: 'Screenshots', online: 'from Google PageSpeed Insights', terminal: 'from the browser on your computer' },
        { what: 'Dark theme', online: 'colours yes, screenshot no', terminal: 'colours and a screenshot' },
        { what: 'Buttons and navigation', online: 'rebuilt from the site’s styles', terminal: 'screenshots of the real elements' },
        { what: 'Sites built by JavaScript', online: 'limited mode', terminal: 'full brandbook' },
        { what: 'PDF', online: 'by printing in the browser', terminal: 'a ready file in the package' },
      ],
    },
    faq: {
      title: 'Questions about the brandbook',
      items: [
        {
          q: 'Can I make a brandbook of someone else’s site?',
          a: 'Yes, for analysis, for example of a competitor or of a client’s site before a project. The logo, marks and fonts belong to their owners; the brandbook only describes them.',
        },
        {
          q: 'Does it replace a designer?',
          a: 'No. The brandbook organises what is already on the site. What the site does not state (clear space, minimum sizes, the character), it does not guess but marks as a proposal to approve.',
        },
        {
          q: 'Do you store anything?',
          a: 'No. The site passes through our proxy only while it is read, Google PageSpeed Insights takes the screenshots, and the brandbook is made in your browser.',
        },
        {
          q: 'Where do the colours and fonts come from?',
          a: 'The colours come from the site’s CSS tokens, the variables in its stylesheets, and their roles from where and how much they show on the homepage. The typefaces come from the stylesheets and the font files the site loads.',
        },
      ],
    },
  },
  notFound: {
    title: 'Page not found – sitelens',
    description: 'There is no page at this address.',
    heading: 'Page not found',
    text: 'The address may have changed or contain a typo.',
    home: 'Go to the home page',
  },
};
