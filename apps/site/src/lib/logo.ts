import raw from '../../../../public/logo/sitelens-logo-animowane.svg?raw';

export const LOGO_SVG = raw;
export const LOGO_VIEWBOX = raw.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 654 236';
