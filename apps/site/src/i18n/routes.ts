export const languages = ['pl', 'en'] as const;
export type Lang = (typeof languages)[number];

export const routes = {
  home: { pl: '/', en: '/en/' },
  terminal: { pl: '/terminal/', en: '/en/terminal/' },
  brandbook: { pl: '/brandbook/', en: '/en/brandbook/' },
  privacy: { pl: '/polityka-prywatnosci/', en: '/en/privacy/' },
  terms: { pl: '/regulamin/', en: '/en/terms/' },
  audit: { pl: '/audyt/', en: '/en/audit/' },
} as const;

export type PageKey = keyof typeof routes;
