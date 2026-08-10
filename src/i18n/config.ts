export const LOCALES = ['no', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'no';

export const LOCALE_LABELS: Record<Locale, string> = {
    no: 'Norsk',
    en: 'English',
};

/** BCP 47 tag for <html lang> and hreflang. */
export const LOCALE_TAGS: Record<Locale, string> = {
    no: 'no',
    en: 'en',
};

export function isLocale(value: string | undefined): value is Locale {
    return value != null && (LOCALES as readonly string[]).includes(value);
}

export function toLocale(value: string | undefined): Locale {
    return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Prefixes a route with the locale segment: localeHref('en', '/builds') -> '/en/builds'. */
export function localeHref(locale: Locale, path: string): string {
    if (path.startsWith('#') || path.startsWith('http')) return path;
    const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
    return `/${locale}${clean}`;
}

/** Swaps the locale segment of a pathname, keeping the rest of the route. */
export function switchLocalePath(pathname: string, next: Locale): string {
    const segments = pathname.split('/').filter(Boolean);
    if (isLocale(segments[0])) {
        segments[0] = next;
        return `/${segments.join('/')}`;
    }
    return `/${next}${pathname === '/' ? '' : pathname}`;
}
