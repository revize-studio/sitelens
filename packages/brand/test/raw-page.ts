import type { RawButton, RawPage } from '../src/raw';

/** A minimal page as extractPage would return it, with only what a test sets filled in. */
export function rawPage(overrides: Partial<RawPage> = {}): RawPage {
  return {
    url: 'https://firma.pl/',
    viewport: { width: 1440, height: 900 },
    scheme: 'light',
    meta: {
      title: 'Firma – meble na wymiar',
      description: null,
      lang: 'pl',
      themeColors: [],
      ogImage: null,
      ogTitle: null,
      siteName: null,
      icons: [],
      manifest: null,
      organization: null,
    },
    base: { htmlBackground: 'rgba(0, 0, 0, 0)', bodyBackground: 'rgb(255, 255, 255)', color: 'rgb(17, 17, 17)', colorScheme: 'normal' },
    tokens: [],
    themeSelectors: [],
    darkMedia: false,
    usage: { background: {}, text: {}, border: {}, radius: {}, shadow: {}, font: {}, size: {}, weight: {} },
    textStyles: {},
    fontFaces: [],
    logos: [],
    buttons: [],
    nav: null,
    siteLinks: [],
    texts: { headings: [], paragraphs: [] },
    effects: { glass: 0, gradients: 0 },
    bodyTextLength: 1000,
    pageHeight: 3000,
    ...overrides,
  };
}

export function rawButton(text: string, overrides: Partial<RawButton> = {}, style: Partial<RawButton['style']> = {}): RawButton {
  return {
    text,
    box: [0, 0, 160, 44],
    emphasis: 5,
    inNav: false,
    inHeader: false,
    isTab: false,
    inConsent: false,
    ...overrides,
    style: {
      background: 'rgb(43, 92, 240)',
      backgroundImage: 'none',
      color: 'rgb(255, 255, 255)',
      borderWidth: '0px',
      borderStyle: 'none',
      borderColor: 'rgb(0, 0, 0)',
      radius: '999px',
      paddingBlock: '10px',
      paddingInline: '20px',
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      fontWeight: '600',
      letterSpacing: 'normal',
      textTransform: 'none',
      shadow: 'none',
      ...style,
    },
  };
}
