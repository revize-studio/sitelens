import { plural, type Category, type Effort, type Lang, type Severity, type WhoFixes } from '@sitelens/core';

const pluralPl = (count: number, forms: [string, string, string]) => `${count} ${plural(count, forms, 'pl')}`;

/** Every word the report template prints that does not come from an advice card. */
export interface ReportStrings {
  auditOf: string;
  pagesChecked: (count: number) => string;
  devices: string;
  overallLabel: string;
  howToReadTitle: string;
  howToRead: string;
  preparedWith: string;
  headerTitle: (domain: string) => string;
  pageOf: (page: number | string, total: number | string) => string;
  summaryTitle: string;
  summaryLead: (problems: number) => string;
  summaryLeadClean: string;
  topTitle: string;
  worksWell: string;
  noTopProblems: string;
  severity: Record<Exclude<Severity, 'suggestion'>, string>;
  severityCount: Record<'critical' | 'important' | 'minor' | 'pass', string>;
  categories: Partial<Record<Category, { name: string; heading: string; description: string }>>;
  otherSection: { heading: string; description: string };
  notMeasured: string;
  partial: string;
  whatIsWrong: string;
  whyItMatters: string;
  howToFix: string;
  whoFixes: string;
  effort: string;
  where: string;
  whoFixesValue: Record<WhoFixes, string>;
  effortValue: Record<Effort, string>;
  shortMeta: (who: string, effort: string) => string;
  homepage: string;
  wholeSite: string;
  andMore: (list: string, more: number) => string;
  metrics: { lcp: string; cls: string; tbt: string; good: (limit: string) => string };
  noProblemsInCategory: string;
  appendixTitle: string;
  appendixLead: string;
  appendixColumns: [string, string, string, string];
  scoringTitle: string;
  scoring: string;
  methodTitle: string;
  helpTitle: string;
  help: string;
  method: (details: { date: string; pages: number; versions: string }) => string;
  skipped: (checks: string) => string;
  summarySentence: (overall: number, weakest: string | null) => string;
}

const pl: ReportStrings = {
  auditOf: 'Audyt strony internetowej',
  pagesChecked: (count) => pluralPl(count, ['sprawdzona podstrona', 'sprawdzone podstrony', 'sprawdzonych podstron']),
  devices: 'Telefon i komputer',
  overallLabel: 'Wynik ogólny na 100',
  howToReadTitle: 'Jak czytać ten raport.',
  howToRead:
    'Na następnej stronie jest pięć rzeczy, od których warto zacząć. Dalej opisujemy każdy problem: co jest nie tak, dlaczego to ważne i jak to naprawić. Szczegóły techniczne dla developera są w załączniku na końcu.',
  preparedWith: 'Przygotowano narzędziem sitelens',
  headerTitle: (domain) => `Audyt strony ${domain}`,
  pageOf: (page, total) => `Strona ${page} z ${total}`,
  summaryTitle: 'Najważniejsze w skrócie',
  summaryLead: (problems) =>
    `Znaleźliśmy ${pluralPl(problems, ['rzecz', 'rzeczy', 'rzeczy'])} do poprawy. Te na górze listy najbardziej wpływają na to, ilu klientów do Ciebie trafia i czy zostają na stronie. Zacznij od nich.`,
  summaryLeadClean:
    'Nie znaleźliśmy ważnych problemów. Poniżej jest lista drobnych rzeczy, które warto poprawić przy okazji.',
  topTitle: 'Pięć rzeczy, od których warto zacząć',
  worksWell: 'Co działa dobrze',
  noTopProblems: 'Brak problemów do pokazania.',
  severity: { critical: 'Krytyczne', important: 'Ważne', minor: 'Drobne', pass: 'Działa dobrze' },
  severityCount: { critical: 'Krytyczne', important: 'Ważne', minor: 'Drobne', pass: 'Działa dobrze' },
  categories: {
    performance: {
      name: 'Wydajność',
      heading: 'Wydajność',
      description: 'Jak szybko strona się ładuje i reaguje. Mierzone na telefonie przy przeciętnym połączeniu.',
    },
    seo: {
      name: 'SEO',
      heading: 'SEO',
      description: 'Czy Google dobrze rozumie Twoją stronę i może ją pokazywać w wynikach wyszukiwania.',
    },
    accessibility: {
      name: 'Dostępność',
      heading: 'Dostępność',
      description: 'Czy ze strony wygodnie skorzysta każdy, także osoba słabowidząca lub obsługująca ją bez myszki.',
    },
    security: {
      name: 'Bezpieczeństwo',
      heading: 'Bezpieczeństwo i technika',
      description: 'Czy połączenie ze stroną jest bezpieczne i czy strona jest poprawnie skonfigurowana.',
    },
  },
  otherSection: {
    heading: 'Kontakt i prywatność',
    description: 'Dane kontaktowe, polityka prywatności i działające zdjęcia. Te punkty nie wpływają jeszcze na wynik.',
  },
  notMeasured: 'Nie zmierzono',
  partial: 'sprawdzono częściowo',
  whatIsWrong: 'Co jest nie tak',
  whyItMatters: 'Dlaczego to ważne',
  howToFix: 'Jak naprawić',
  whoFixes: 'Kto naprawia',
  effort: 'Nakład pracy',
  where: 'Dotyczy',
  whoFixesValue: { owner: 'Ty, w panelu strony', developer: 'Developer' },
  effortValue: { small: 'Mały', medium: 'Średni', large: 'Duży' },
  shortMeta: (who, effort) => `Kto naprawia: ${who}. Nakład pracy: ${effort.toLowerCase()}.`,
  homepage: 'strona główna',
  wholeSite: 'cała strona',
  andMore: (list, more) => `${list} i ${pluralPl(more, ['inna', 'inne', 'innych'])}`,
  metrics: {
    lcp: 'Wczytanie głównej treści',
    cls: 'Stabilność układu',
    tbt: 'Reakcja na kliknięcie',
    good: (limit) => `Dobrze: najwyżej ${limit}`,
  },
  noProblemsInCategory: 'W tym obszarze nie znaleźliśmy problemów.',
  appendixTitle: 'Załącznik techniczny',
  appendixLead:
    'Dane dla osoby, która będzie wprowadzać poprawki. Identyfikator każdego problemu pozwala znaleźć go w wynikach w formacie JSON.',
  appendixColumns: ['Identyfikator', 'Priorytet', 'Szczegóły', 'Gdzie'],
  scoringTitle: 'Jak liczymy wynik',
  scoring:
    'Wydajność to średnia wyników narzędzia Lighthouse ze sprawdzonych podstron. Na stronie głównej telefon liczy się w 70%, a komputer w 30%, inne podstrony mierzymy tylko na telefonie. SEO, dostępność i bezpieczeństwo zaczynają od 100 punktów, a każdy problem zabiera część tego, co zostało: krytyczny 25%, ważny 10%, drobny 3%, mniej, gdy dotyczy tylko części podstron. Wynik ogólny to średnia czterech kategorii, a gdy którejś nie udało się zmierzyć, średnia pozostałych. Dostępność sprawdzamy narzędziem axe-core i własnymi testami sitelens (język, powiększanie, dopasowanie do telefonu), a SEO i bezpieczeństwo własnymi testami sitelens.',
  methodTitle: 'Jak przeprowadzono audyt',
  helpTitle: 'Nie masz komu przekazać poprawek?',
  help: 'Revize Studio, które rozwija sitelens, naprawia strony po takich audytach albo projektuje nowe, gdy poprawianie starej się nie opłaca:',
  method: ({ date, pages, versions }) =>
    `Audyt z ${date}, ${pages} podstron, przeglądarka na tym komputerze. Wersje narzędzi: ${versions}.`,
  skipped: (checks) => `Nie sprawdzono, bo w tym trybie brakowało danych: ${checks}.`,
  summarySentence: (overall, weakest) => {
    const tail = weakest ? ` Najwięcej do poprawy jest w obszarze: ${weakest.toLowerCase()}.` : '';
    if (overall >= 90) return `Strona jest w bardzo dobrym stanie. Zostało kilka drobnych rzeczy do poprawy.${tail}`;
    if (overall >= 70) return `Strona działa poprawnie, ale ma braki, przez które traci część klientów.${tail}`;
    if (overall >= 50)
      return `Strona ma poważne problemy, które odstraszają klientów albo utrudniają znalezienie jej w Google.${tail}`;
    return `Strona wymaga pilnych poprawek: problemy dotyczą podstaw, od których zależy, czy klienci w ogóle z niej skorzystają.${tail}`;
  },
};

const en: ReportStrings = {
  auditOf: 'Website audit',
  pagesChecked: (count) => `${count} ${count === 1 ? 'page' : 'pages'} checked`,
  devices: 'Phone and computer',
  overallLabel: 'Overall score out of 100',
  howToReadTitle: 'How to read this report.',
  howToRead:
    'The next page lists five things to start with. After that we describe every problem: what is wrong, why it matters and how to fix it. Technical details for the developer are in the appendix at the end.',
  preparedWith: 'Prepared with sitelens',
  headerTitle: (domain) => `Audit of ${domain}`,
  pageOf: (page, total) => `Page ${page} of ${total}`,
  summaryTitle: 'Summary',
  summaryLead: (problems) =>
    `We found ${problems} ${problems === 1 ? 'thing' : 'things'} to fix. The ones at the top affect most how many customers find you and whether they stay. Start with those.`,
  summaryLeadClean: 'We found no important problems. Below are minor things worth fixing along the way.',
  topTitle: 'Five things to start with',
  worksWell: 'What works well',
  noTopProblems: 'No problems to show.',
  severity: { critical: 'Critical', important: 'Important', minor: 'Minor', pass: 'Working well' },
  severityCount: { critical: 'Critical', important: 'Important', minor: 'Minor', pass: 'Working well' },
  categories: {
    performance: {
      name: 'Performance',
      heading: 'Performance',
      description: 'How fast the site loads and responds. Measured on a phone over an average connection.',
    },
    seo: {
      name: 'SEO',
      heading: 'SEO',
      description: 'Whether Google understands your site and can show it in search results.',
    },
    accessibility: {
      name: 'Accessibility',
      heading: 'Accessibility',
      description:
        'Whether everyone can use the site comfortably, including people with low vision or without a mouse.',
    },
    security: {
      name: 'Security',
      heading: 'Security and set-up',
      description: 'Whether the connection to the site is secure and the site is configured correctly.',
    },
  },
  otherSection: {
    heading: 'Contact and privacy',
    description: 'Contact details, the privacy policy and images that load. These points do not affect the score yet.',
  },
  notMeasured: 'Not measured',
  partial: 'partly checked',
  whatIsWrong: 'What is wrong',
  whyItMatters: 'Why it matters',
  howToFix: 'How to fix it',
  whoFixes: 'Who fixes it',
  effort: 'Effort',
  where: 'Affects',
  whoFixesValue: { owner: 'You, in the admin panel', developer: 'Developer' },
  effortValue: { small: 'Small', medium: 'Medium', large: 'Large' },
  shortMeta: (who, effort) => `Who fixes it: ${who}. Effort: ${effort.toLowerCase()}.`,
  homepage: 'homepage',
  wholeSite: 'whole site',
  andMore: (list, more) => `${list} and ${more} more`,
  metrics: {
    lcp: 'Main content loaded',
    cls: 'Layout stability',
    tbt: 'Response to taps',
    good: (limit) => `Good: ${limit} or less`,
  },
  noProblemsInCategory: 'We found no problems in this area.',
  appendixTitle: 'Technical appendix',
  appendixLead: 'Data for whoever makes the fixes. Each problem ID matches the results in JSON format.',
  appendixColumns: ['ID', 'Priority', 'Details', 'Where'],
  scoringTitle: 'How we score',
  scoring:
    'Performance is the average Lighthouse score of the pages checked. On the homepage the phone counts for 70% and the computer for 30%; other pages are measured on a phone only. SEO, accessibility and security start at 100 points, and each problem takes a share of what is left: critical 25%, important 10%, minor 3%, less when it affects only some of the pages. The overall score is the average of the four categories, or of those that could be measured. Accessibility is tested with axe-core and sitelens tests (language, zoom, fit to a phone screen), SEO and security with sitelens tests.',
  methodTitle: 'How the audit was run',
  helpTitle: 'No one to hand the fixes to?',
  help: 'Revize Studio, the team behind sitelens, fixes websites after audits like this one, or designs a new site when fixing the old one is not worth it:',
  method: ({ date, pages, versions }) =>
    `Audit of ${date}, ${pages} pages, browser on this computer. Tool versions: ${versions}.`,
  skipped: (checks) => `Not checked, because this mode had no data for them: ${checks}.`,
  summarySentence: (overall, weakest) => {
    const tail = weakest ? ` The most work is needed in: ${weakest.toLowerCase()}.` : '';
    if (overall >= 90) return `The site is in very good shape. A few minor things are left to fix.${tail}`;
    if (overall >= 70) return `The site works, but it has gaps that cost it some customers.${tail}`;
    if (overall >= 50)
      return `The site has serious problems that put customers off or make it hard to find in Google.${tail}`;
    return `The site needs urgent fixes: the problems concern the basics that decide whether customers can use it at all.${tail}`;
  },
};

export const strings: Record<Lang, ReportStrings> = { pl, en };
