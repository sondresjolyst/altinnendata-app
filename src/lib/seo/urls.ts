import { COMPANY } from '@/lib/company';
import type { Locale } from '@/i18n/config';

/** Leading-slashed, never trailing-slashed. `''` and `'/'` both mean the front page. */
export function normalizePath(path: string): string {
    if (path === '' || path === '/') return '';
    const withSlash = path.startsWith('/') ? path : `/${path}`;
    return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

/** Site-root-relative URL for a page in one locale, e.g. `/no/builds`. Page paths only. */
export function localePath(locale: Locale, path = ''): string {
    return `/${locale}${normalizePath(path)}`;
}

/** Absolute URL on the canonical host, for consumers that cannot resolve a relative one. */
export function absoluteUrl(path = ''): string {
    return new URL(normalizePath(path) || '/', COMPANY.url).toString().replace(/\/$/, '') || COMPANY.url;
}

/** Absolute URL of a page in one locale. */
export function absoluteLocaleUrl(locale: Locale, path = ''): string {
    return absoluteUrl(localePath(locale, path));
}
